import React, { useState, useEffect } from 'react';

// Import constants and data
import { designSystemCSS, animationCSS } from './constants';
import { initialShipments, initialActivities, initialMessages } from './data';
import { formatDate } from './utils';

// Import services
import { processEmailWithAgent, getApiKey } from './services/geminiService';

// Import components
import Header from './components/Header';
import Navigation from './components/Navigation';

// Import pages
import ActionCenter from './pages/ActionCenter';
import ShipmentsPage from './pages/ShipmentsPage';
import ActivityPage from './pages/ActivityPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';

// Import modals
import ShipmentDetailModal from './pages/modals/ShipmentDetailModal';
import ActivityLogModal from './pages/modals/ActivityLogModal';
import TestAgentModal from './pages/modals/TestAgentModal';

export default function AgentOpsUI() {
    const [currentPage, setCurrentPage] = useState('actions');
    const [shipments, setShipments] = useState(initialShipments);
    const [activities, setActivities] = useState(initialActivities);
    const [messages, setMessages] = useState(initialMessages);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [showCommunications, setShowCommunications] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [currentDate] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingAction, setEditingAction] = useState(null);

    // New states for Agent testing
    const [showTestAgentModal, setShowTestAgentModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    // Initialize API key from environment variable or localStorage
    const [apiKey, setApiKey] = useState(() => {
        const envKey = getApiKey();
        if (envKey && envKey !== 'YOUR_API_KEY_HERE') return envKey;
        return localStorage.getItem('gemini_api_key') || '';
    });

    // Save API key to localStorage when changed
    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        }
    }, [apiKey]);

    // Generate unique shipment ID
    const generateShipmentId = () => {
        const num = shipments.length + 1;
        return `SHP-${String(num).padStart(3, '0')}`;
    };

    // Process email with Gemini Agent
    const handleProcessEmail = async (emailData) => {
        // Use env key, localStorage key, or prompt for settings
        const keyToUse = apiKey || getApiKey();

        if (!keyToUse || keyToUse === 'YOUR_API_KEY_HERE') {
            alert('請先配置 Gemini API Key！\n\n方式 1: 在 .env 文件中設置 VITE_GEMINI_API_KEY\n方式 2: 在 Settings 頁面輸入');
            setCurrentPage('settings');
            setShowTestAgentModal(false);
            return;
        }

        setIsProcessing(true);

        try {
            const result = await processEmailWithAgent(keyToUse, emailData);
            console.log('🎉 Agent result:', result);

            // Handle new Free-hand Skill schema
            // New schema uses 'shipment_match' instead of 'shipment'
            const shipmentMatch = result.shipment_match || result.shipment || {};
            const refs = shipmentMatch.references_found || {};
            const emailType = result.email_analysis?.type || 'UNKNOWN';

            // Generate reference from extracted references
            let reference = refs.bl_number || refs.container_number || refs.booking_number || refs.po_number;
            if (!reference) {
                // Try to extract from email subject
                const subjectMatch = emailData.subject?.match(/([A-Z]{2,}\d{6,})/);
                if (subjectMatch) reference = subjectMatch[1];
                else reference = `REF-${Date.now()}`;
            }

            const newShipment = {
                id: generateShipmentId(),
                reference: reference,
                customer: result.email_analysis?.sender?.name || emailData.from.split('@')[0],
                origin: 'TBD',
                destination: 'TBD',
                status: result.status_update?.new_status || 'new',
                step: result.playbook?.current_step || 1,
                eta: 'TBD',
                alerts: result.escalation?.required ? 1 : 0,
                vessel: 'TBD',
                bl: refs.bl_number || reference,
                container: refs.container_number || '',
                isfFiled: false,
                playbook: result.playbook?.selected || 'free-hand',
                stepName: result.playbook?.step_name || 'Order Intake',
                pendingActions: [],
                // Store Agent analysis
                emailType: emailType,
                agentAnalysis: result.email_analysis,
                agentAction: result.action,
                suggestReason: result.email_analysis?.summary,
                emails: [
                    // Add initial email
                    {
                        id: `e-${Date.now()}`,
                        category: result.playbook?.current_step || 1,
                        direction: 'inbound',
                        from: emailData.from,
                        to: 'Agent',
                        subject: emailData.subject,
                        body: emailData.body,
                        timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        read: true,
                        autoLevel: 'manual'
                    }
                ]
            };


            // Add pending action if approval needed
            if (result.action?.authority === 'APPROVE') {
                newShipment.pendingActions.push({
                    type: 'approve',
                    step: 1,
                    action: result.action?.type || 'review',
                    title: result.action?.description || 'Review required',
                    desc: result.email_draft?.subject || result.email_analysis?.summary || 'Approve action',
                    recipients: result.email_draft?.to || [],
                    riskReason: result.email_analysis?.summary || 'Agent drafted response'
                });
            }

            // Add manual action if escalation required
            if (result.escalation?.required || result.action?.authority === 'MANUAL') {
                newShipment.pendingActions.push({
                    type: 'manual',
                    step: 1,
                    action: 'escalation',
                    title: 'Human Review Required',
                    desc: result.escalation?.reason || result.action?.description || 'Needs human attention',
                    riskReason: `Urgency: ${result.escalation?.urgency || 'MEDIUM'}`
                });
                newShipment.alerts = 1;
            }

            console.log('📦 Creating shipment:', newShipment);
            setShipments(prev => [...prev, newShipment]);

            // Add activity
            const newActivity = {
                id: Date.now(),
                timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                type: 'email-received',
                shipment: newShipment.reference,
                message: `${emailType} processed: ${result.email_analysis?.summary || 'Created shipment entry'}`
            };
            setActivities(prev => [newActivity, ...prev]);

            // Add message if email draft exists
            if (result.email_draft?.should_send) {
                const newMessage = {
                    id: Date.now(),
                    from: 'Agent',
                    to: result.email_draft?.to?.[0] || emailData.from,
                    subject: result.email_draft?.subject || 'RE: ' + emailData.subject,
                    preview: result.email_draft?.body?.substring(0, 100) + '...',
                    read: false
                };
                setMessages(prev => [newMessage, ...prev]);
            }

            setShowTestAgentModal(false);
            setCurrentPage('shipments');

        } catch (error) {
            console.error('❌ Agent Error:', error);
            alert(`Agent Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Delete shipment
    const deleteShipment = (id) => {
        console.log('🗑️ Delete requested for shipment:', id);
        if (window.confirm('Are you sure you want to delete this shipment?')) {
            console.log('🗑️ Confirmed, deleting...');
            setShipments(prev => prev.filter(s => s.id !== id));
            if (selectedShipment?.id === id) {
                setSelectedShipment(null);
            }
        } else {
            console.log('🗑️ Cancelled');
        }
    };

    // Toggle ISF Filed
    const toggleISFFiled = (id) => {
        setShipments(shipments.map(s => s.id === id ? { ...s, isfFiled: !s.isfFiled } : s));
        if (selectedShipment?.id === id) setSelectedShipment({ ...selectedShipment, isfFiled: !selectedShipment.isfFiled });
    };

    const stats = {
        total: shipments.length,
        inProgress: shipments.filter(s => s.status === 'in-progress').length,
        waiting: shipments.filter(s => s.status === 'waiting').length,
        alerts: shipments.filter(s => s.status === 'alert').length,
        completed: shipments.filter(s => s.status === 'completed').length,
        new: shipments.filter(s => s.status === 'new').length,
    };

    return (
        <>
            <style>{designSystemCSS}</style>
            <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
                <Header
                    currentDate={currentDate}
                    onOpenTestAgent={() => setShowTestAgentModal(true)}
                    onClearAllShipments={() => {
                        console.log('🗑️ Clearing all shipments...');
                        setShipments([]);
                        setActivities([]);
                        setMessages([]);
                        setSelectedShipment(null);
                        console.log('✅ All cleared');
                    }}
                    shipmentCount={shipments.length}
                />

                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
                    <Navigation
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        stats={stats}
                        shipments={shipments}
                        messages={messages}
                    />

                    {currentPage === 'actions' && (
                        <ActionCenter
                            shipments={shipments}
                            setShipments={setShipments}
                            setSelectedShipment={setSelectedShipment}
                            editingAction={editingAction}
                            setEditingAction={setEditingAction}
                        />
                    )}

                    {currentPage === 'shipments' && (
                        <ShipmentsPage
                            shipments={shipments}
                            filterStatus={filterStatus}
                            setFilterStatus={setFilterStatus}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            setSelectedShipment={setSelectedShipment}
                            onDeleteShipment={deleteShipment}
                        />
                    )}

                    {currentPage === 'activity' && (
                        <ActivityPage activities={activities} />
                    )}

                    {currentPage === 'messages' && (
                        <MessagesPage messages={messages} />
                    )}

                    {currentPage === 'settings' && (
                        <SettingsPage apiKey={apiKey} setApiKey={setApiKey} />
                    )}
                </div>

                {/* Test Agent Modal */}
                {showTestAgentModal && (
                    <TestAgentModal
                        onClose={() => setShowTestAgentModal(false)}
                        onProcessEmail={handleProcessEmail}
                        isProcessing={isProcessing}
                    />
                )}

                {/* Shipment Detail Modal */}
                {selectedShipment && !showCommunications && (
                    <ShipmentDetailModal
                        shipment={selectedShipment}
                        onClose={() => setSelectedShipment(null)}
                        onViewActivityLog={() => { setShowCommunications(true); setExpandedCategory(null); setSelectedEmail(null); }}
                        shipments={shipments}
                        setShipments={setShipments}
                        setSelectedShipment={setSelectedShipment}
                        toggleISFFiled={toggleISFFiled}
                    />
                )}

                {/* Activity Log Modal */}
                {showCommunications && selectedShipment && (
                    <ActivityLogModal
                        shipment={selectedShipment}
                        onClose={() => setShowCommunications(false)}
                        onBack={() => setShowCommunications(false)}
                        expandedCategory={expandedCategory}
                        setExpandedCategory={setExpandedCategory}
                        selectedEmail={selectedEmail}
                        setSelectedEmail={setSelectedEmail}
                    />
                )}

                <style>{animationCSS}</style>
            </div>
        </>
    );
}
