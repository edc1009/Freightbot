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
            const result = await processEmailWithAgent(keyToUse, emailData, shipments);
            console.log('🎉 Agent result:', result);

            // 1. Common Analysis (Email Type, Drafts, etc.)
            // The 'email_analysis' and 'email_draft' apply to the Batch as a whole usually,
            // or we assume they apply to the primary intent.
            const emailType = result.email_analysis?.type || 'UNKNOWN';

            // 2. Iterate through Processed Shipments (Batch Support)
            // If legacy output (single object), wrap in array.
            const processedList = result.processed_shipments || [result.shipment_match || {}];

            // STRICT WORKFLOW RULE (用戶要求):
            // If email type is 'CARRIER_AN', we MUST have a matching existing shipment (Step 1: Order Intake).
            // We cannot create a NEW shipment from a Carrier AN. It must be an update.
            let validItems = processedList;
            let skippedCount = 0;

            if (emailType === 'CARRIER_AN') {
                console.log('🔒 Strict Workflow: Filtering Carrier ANs to only match existing shipments.');
                validItems = processedList.filter(item => {
                    const isFound = item.match_result === 'FOUND';
                    if (!isFound) skippedCount++;
                    return isFound;
                });
            }

            // DE-DUPLICATION (防止同一封信的多個附件導致重複建單)
            // Group by Reference (B/L or Booking Ref)
            const uniqueItemsMap = new Map();
            validItems.forEach(item => {
                // Use BL as primary key, fallback to Reference
                const key = item.extracted_data?.bl_number || item.reference;
                if (!uniqueItemsMap.has(key)) {
                    uniqueItemsMap.set(key, item);
                } else {
                    // If we have duplicates, we might want to merge data, but for now taking the first one is safer
                    console.log(`⚠️ Duplicate item found in batch for key ${key}, skipping duplicate.`);
                }
            });
            const uniqueItems = Array.from(uniqueItemsMap.values());


            let newShipmentsToAdd = [];
            let updatedShipmentsList = [...shipments];

            uniqueItems.forEach(shipmentItem => {
                const matchResult = shipmentItem.match_result || 'NOT_FOUND';
                const extractedData = shipmentItem.extracted_data || result.shipment_data || {};

                // Construct the email object for this specific transaction
                const transactionEmail = {
                    id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    category: result.playbook?.current_step || 1,
                    direction: 'inbound',
                    from: emailData.from,
                    to: 'Agent',
                    subject: emailData.subject,
                    body: emailData.body,
                    timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    read: true,
                    autoLevel: 'manual',
                    attachments: emailData.attachments || [] // Store attachments
                };

                // --- Scenario A: UPDATE Existing Shipment ---
                if (matchResult === 'FOUND' && shipmentItem.shipment_id) {
                    console.log(`🔄 Updating Shipment ${shipmentItem.shipment_id}`);
                    updatedShipmentsList = updatedShipmentsList.map(s => {
                        if (s.id === shipmentItem.shipment_id) {
                            // Force Step 3 (Verify AN Data) if we receive a Carrier AN and we are at Step 2
                            let nextStep = result.playbook?.current_step || s.step;
                            let nextStepName = result.playbook?.step_name || s.stepName;

                            if (emailType === 'CARRIER_AN' && s.step === 2) {
                                console.log('📍 Carrier AN received for Step 2 shipment. Forcing advance to Step 3.');
                                nextStep = 3;
                                nextStepName = 'Verify AN Data';
                            }

                            return {
                                ...s,
                                origin: (s.origin === 'TBD' || !s.origin) ? (extractedData.origin || s.origin) : s.origin,
                                destination: (s.destination === 'TBD' || !s.destination) ? (extractedData.destination || s.destination) : s.destination,
                                eta: (s.eta === 'TBD' || !s.eta) ? (extractedData.eta || s.eta) : s.eta,
                                vessel: (s.vessel === 'TBD' || !s.vessel) ? (extractedData.vessel || s.vessel) : s.vessel,
                                // Update HBL if found
                                hbl: (!s.hbl && extractedData.hbl_number) ? extractedData.hbl_number : s.hbl,
                                firmsCode: (!s.firmsCode && extractedData.firms_code) ? extractedData.firms_code : s.firmsCode,
                                // Merge financials (charges) from API result - FIX for Issue #2
                                financials: result.financials || s.financials,
                                // Merge party info from extracted data - FIX for Issue #3
                                shipper: extractedData.shipper || s.shipper,
                                consignee: extractedData.consignee || s.consignee,
                                notifyParty: extractedData.notify_party || s.notifyParty,
                                // IMPORTANT: Merge Email History
                                emails: [transactionEmail, ...(s.emails || [])],
                                // Update Status based on Agent's Playbook Analysis
                                status: (emailType === 'CARRIER_AN' || nextStep > s.step) ? 'in-progress' : s.status,
                                step: Math.max(s.step, nextStep),
                                stepName: nextStepName,
                            };
                        }
                        return s;
                    });

                    // Add Activity Log for Update
                    const updateActivity = {
                        id: Date.now() + Math.random(),
                        timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        type: 'update',
                        shipment: shipmentItem.reference || shipmentItem.shipment_id,
                        message: `Updated with new email/data: ${result.email_analysis?.summary || 'New info received'}`,
                        // Attach the full email object so ActivityModal can show body & attachments
                        email: transactionEmail
                    };
                    setActivities(prev => [updateActivity, ...prev]);

                }
                // --- Scenario B: CREATE New Shipment ---
                else {
                    console.log(`✨ Creating New Shipment for ${shipmentItem.reference}`);
                    // Generate reference
                    let reference = shipmentItem.reference;
                    if (!reference) {
                        const subjectMatch = emailData.subject?.match(/([A-Z]{2,}\d{6,})/);
                        if (subjectMatch) reference = subjectMatch[1];
                        else reference = `REF-${Date.now()}`;
                    }

                    // Double check if we already added this reference in THIS batch (newShipmentsToAdd)
                    const alreadyInBatch = newShipmentsToAdd.find(s => s.reference === reference || s.bl === extractedData.bl_number);
                    if (alreadyInBatch) {
                        console.log(`⚠️ Duplicate reference ${reference} in current batch processing, skipping.`);
                        return;
                    }

                    const newShipment = {
                        id: generateShipmentId(),
                        reference: reference,
                        customer: result.email_analysis?.sender?.name || emailData.from.split('@')[0],
                        origin: extractedData.origin || 'TBD',
                        destination: extractedData.destination || 'TBD',
                        status: 'new',
                        step: result.playbook?.current_step || 1,
                        eta: extractedData.eta || 'TBD',
                        alerts: result.escalation?.required ? 1 : 0,
                        vessel: extractedData.vessel || 'TBD',
                        bl: extractedData.bl_number || reference,
                        container: extractedData.container_number || '',
                        hbl: extractedData.hbl_number || '',
                        firmsCode: extractedData.firms_code || '', // Map FIRMS Code
                        ref: extractedData.booking_number || '',
                        // Party Information - FIX for Issue #3
                        shipper: extractedData.shipper || '',
                        consignee: extractedData.consignee || '',
                        notifyParty: extractedData.notify_party || '',
                        // Financials - FIX for Issue #2
                        financials: result.financials || null,
                        isfFiled: false,
                        playbook: result.playbook?.selected || 'free-hand',
                        stepName: result.playbook?.step_name || 'Order Intake',
                        pendingActions: [],
                        emailType: emailType,
                        agentAnalysis: result.email_analysis,
                        agentAction: result.action,
                        suggestReason: result.email_analysis?.summary,
                        emails: [transactionEmail]
                    };

                    // Add Pending Actions (Approve/Escalate)
                    if (result.action?.authority === 'APPROVE') {
                        newShipment.pendingActions.push({
                            type: 'approve',
                            step: newShipment.step,
                            action: result.action?.type || 'review',
                            title: result.action?.description || 'Review required',
                            desc: result.email_draft?.subject || result.email_analysis?.summary || 'Approve action',
                            // Store the draft here so we can auto-send on approve
                            draft: result.email_draft,
                            recipients: result.email_draft?.to || [],
                            riskReason: result.email_analysis?.summary || 'Agent drafted response'
                        });
                    }

                    if (result.escalation?.required || result.action?.authority === 'MANUAL') {
                        newShipment.pendingActions.push({
                            type: 'manual',
                            step: newShipment.step,
                            action: 'escalation',
                            title: 'Human Review Required',
                            desc: result.escalation?.reason || result.action?.description || 'Needs human attention',
                            riskReason: `Urgency: ${result.escalation?.urgency || 'MEDIUM'}`
                        });
                        newShipment.alerts = 1;
                    }

                    newShipmentsToAdd.push(newShipment);
                }
            });

            // Update State Once
            setShipments([...updatedShipmentsList, ...newShipmentsToAdd]);

            // Add General Activity
            const newActivity = {
                id: Date.now(),
                timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                type: 'email-received',
                shipment: newShipmentsToAdd.length > 0 ? newShipmentsToAdd[0].reference : (uniqueItems.length > 0 ? uniqueItems[0].reference : 'Batch Update'),
                message: `${emailType} processed. Updated: ${updatedShipmentsList.length - shipments.length + (uniqueItems.length - newShipmentsToAdd.length)}, Created: ${newShipmentsToAdd.length}${skippedCount > 0 ? `, Skipped (No Match): ${skippedCount}` : ''}`,
                // Link the first email for context, though this is a batch log
                email: uniqueItems.length > 0 ? {
                    id: `e-${Date.now()}-batch`,
                    category: 1,
                    direction: 'inbound',
                    from: emailData.from,
                    to: 'Agent',
                    subject: emailData.subject,
                    body: '(Batch Processed) ' + emailData.body,
                    timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    read: true,
                    autoLevel: 'manual',
                    attachments: emailData.attachments || []
                } : null
            };
            setActivities(prev => [newActivity, ...prev]);

            // Add draft message if needed (only one draft supported per email for now)
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

    // Auto-Send Logic in handleApprove
    const handleApprove = (id, actionIndex) => {
        console.log('Approved action for:', id);

        setShipments(prev => prev.map(s => {
            if (s.id === id) {
                const actionToApprove = s.pendingActions[actionIndex];

                // AUTO-SEND EMAIL:
                let newEmails = [...s.emails];
                if (actionToApprove && (actionToApprove.draft || (actionToApprove.recipients && actionToApprove.recipients.length > 0))) {
                    console.log('📧 Auto-sending email on Approve');
                    const sentEmail = {
                        id: `e-${Date.now()}-sent`,
                        category: s.step,
                        direction: 'outbound',
                        from: 'Agent',
                        to: actionToApprove.recipients?.join(', ') || actionToApprove.draft?.to?.join(', ') || 'Customer',
                        subject: actionToApprove.draft?.subject || 'Shipment Update',
                        body: actionToApprove.draft?.body || 'Content approved and sent.',
                        timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        read: true,
                        autoLevel: 'auto',
                        attachments: actionToApprove.draft?.attachments || []
                    };
                    newEmails.unshift(sentEmail);

                    // Log Activity specifically for this sent email
                    const sentActivity = {
                        id: Date.now() + 1,
                        timestamp: formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        type: 'email-sent',
                        shipment: s.reference,
                        message: `Auto-sent email to ${sentEmail.to}: ${sentEmail.subject}`,
                        email: sentEmail
                    };
                    setActivities(prevAct => [sentActivity, ...prevAct]);
                }

                // Remove the action
                const newActions = s.pendingActions.filter((_, i) => i !== actionIndex);

                // Update Step Logic
                const currentStep = s.step;
                let nextStep = currentStep;
                let nextStepName = s.stepName;

                // Advance step if "Order Intake" (1) and approved -> "Await Carrier AN" (2)
                if (currentStep === 1) {
                    nextStep = 2;
                    nextStepName = 'Await Carrier AN';
                }

                const updatedS = {
                    ...s,
                    alerts: Math.max(0, s.alerts - 1),
                    step: nextStep,
                    stepName: nextStepName,
                    pendingActions: newActions,
                    emails: newEmails
                };

                if (selectedShipment?.id === id) {
                    setSelectedShipment(updatedS);
                }

                return updatedS;
            }
            return s;
        }));
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
                            onApprove={handleApprove} // Pass to Action Center too if needed
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
                        onApprove={handleApprove}
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
