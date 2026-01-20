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
    // State Definitions
    const [currentPage, setCurrentPage] = useState('actions');
    const [shipments, setShipments] = useState(initialShipments);
    const [activities, setActivities] = useState(initialActivities);
    const [messages, setMessages] = useState(initialMessages);

    // UI State
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [showCommunications, setShowCommunications] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [selectedEmail, setSelectedEmail] = useState(null);

    // Filter/Search State
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingAction, setEditingAction] = useState(null);

    // Modal State
    const [showTestAgentModal, setShowTestAgentModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Config
    const [apiKey, setApiKey] = useState(getApiKey());
    const [currentDate, setCurrentDate] = useState(new Date());

    // Stats Calculation
    const stats = {
        total: shipments.length,
        attention: shipments.filter(s => s.status === 'new' || s.pendingActions?.length > 0).length,
        pending: shipments.filter(s => s.status !== 'completed').length,
        completed: shipments.filter(s => s.status === 'completed').length
    };

    // --- Helpers ---

    const addActivityLog = (activity) => {
        const newActivity = {
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...activity
        };
        setActivities(prev => [newActivity, ...prev]);
    };

    const deleteShipment = (id) => {
        if (window.confirm('Are you sure you want to delete this shipment?')) {
            setShipments(prev => prev.filter(s => s.id !== id));
            if (selectedShipment?.id === id) {
                setSelectedShipment(null);
            }
            addActivityLog({
                type: 'system',
                message: 'Shipment deleted manually',
                shipmentId: id
            });
        }
    };

    const toggleISFFiled = (shipmentId) => {
        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                const newVal = !s.isfFiled;
                addActivityLog({
                    type: 'system',
                    shipment: s.reference,
                    message: `ISF Filing marked as ${newVal ? 'Filed' : 'Pending'}`,
                    category: 'compliance'
                });
                return { ...s, isfFiled: newVal };
            }
            return s;
        }));
    };

    const handleApprove = (shipmentId, actionIndex) => {
        setShipments(prev => prev.map(s => {
            if (s.id === shipmentId) {
                const action = s.pendingActions[actionIndex];
                // Remove the action
                const newActions = s.pendingActions.filter((_, i) => i !== actionIndex);

                // Add to history if needed or just log
                addActivityLog({
                    type: 'action',
                    shipment: s.reference,
                    message: `Approved: ${action.title}`,
                    user: 'Operator'
                });

                return { ...s, pendingActions: newActions };
            }
            return s;
        }));
        setEditingAction(null);
    };

    const handleProcessEmail = async (emailData) => {
        setIsProcessing(true);
        try {
            console.log(" Processing Email...", emailData);
            const result = await processEmailWithAgent(apiKey, emailData, shipments);

            if (!result) throw new Error("No result from agent");

            // Process the result
            // 1. Add processed shipments
            if (result.processed_shipments?.length > 0) {
                const newShipments = [];
                const updatedShipments = [...shipments];

                result.processed_shipments.forEach(processed => {
                    if (processed.action === 'CREATE') {
                        // Create new shipment
                        const newShipment = {
                            id: processed.shipment_id || `sh-${Date.now()}`,
                            status: 'new',
                            step: 1, // Pre-alert received
                            reference: processed.reference,
                            ...processed.extracted_data,
                            pendingActions: [],
                            emails: [],
                            created_at: new Date().toISOString()
                        };
                        newShipments.push(newShipment);

                        addActivityLog({
                            type: 'shipment',
                            shipment: newShipment.reference,
                            message: `New Shipment Created via Agent: ${processed.reference}`,
                            detail: `Detected from email: ${emailData.subject}`
                        });

                    } else if (processed.action === 'UPDATE') {
                        // Update existing
                        const existingIdx = updatedShipments.findIndex(s => s.reference === processed.reference || s.id === processed.shipment_id);
                        if (existingIdx >= 0) {
                            updatedShipments[existingIdx] = {
                                ...updatedShipments[existingIdx],
                                ...processed.extracted_data
                            };
                            addActivityLog({
                                type: 'shipment',
                                shipment: updatedShipments[existingIdx].reference,
                                message: `Shipment Updated via Agent`,
                                detail: `Updated details from ${emailData.subject}`
                            });
                        }
                    }
                });

                setShipments([...newShipments, ...updatedShipments]);
            }

            // 2. Add Email to Activity/Messages (Mock logic as we don't have full email structure)
            addActivityLog({
                type: 'email',
                message: `Processed Email: ${emailData.subject}`,
                detail: result.email_analysis?.summary || 'No summary'
            });

            alert(`Agent processing complete!\n${result.processed_shipments?.length || 0} shipments processed.`);
            setShowTestAgentModal(false);

        } catch (error) {
            console.error(error);
            alert('Error processing email: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
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
                            onApprove={handleApprove}
                            activities={activities}
                            toggleISFFiled={toggleISFFiled}
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
                        onAddActivity={addActivityLog}
                    />
                )}

                {showCommunications && selectedShipment && (
                    <ActivityLogModal
                        shipment={selectedShipment}
                        onClose={() => setShowCommunications(false)}
                        onBack={() => setShowCommunications(false)}
                        expandedCategory={expandedCategory}
                        setExpandedCategory={setExpandedCategory}
                        selectedEmail={selectedEmail}
                        setSelectedEmail={setSelectedEmail}
                        activities={activities}
                    />
                )}

                <style>{animationCSS}</style>
            </div>
        </>
    );
}
