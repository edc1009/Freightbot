import React, { useState, useEffect } from 'react';

// Import constants and data
import { designSystemCSS, animationCSS, PLAYBOOKS } from './constants';
import { initialShipments, initialActivities, initialMessages } from './data';
import { formatDate } from './utils';

// Import services
import { processEmailWithAgent, getApiKey } from './services/geminiService';

// Email Type to Activity Log Category Mapping
// This maps Agent-detected email types to the correct Activity Log step/category
const EMAIL_TYPE_TO_CATEGORY = {
    'NEW_FREEHAND_INTENT': 1,    // ISF Filing
    'CARRIER_AN': 2,             // Await Carrier AN
    'TRUCKER_CONFIRM': 3,        // Truck Scheduling
    'CUSTOMS_CONFIRM': 4,        // Customs Coordination
    'DOCUMENT_SUBMISSION': 4,    // Customs Coordination (customer docs)
    'WAREHOUSE_CONFIRM': 5,      // Warehouse Coordination
    'STATUS_UPDATE': 6,          // Shipment Delivery
    'PAYMENT_CONFIRM': 7,        // Billing & Collection
    'PAYMENT_FOLLOWUP': 7,       // Billing & Collection
    'CUSTOMS_CONFIRM_RESPONSE': 4, // Explicit mapping for our new internal type
    // Fallbacks for other types to avoid getting stuck in wrong step
    'INQUIRY': null,             // Use current step
    'UNKNOWN': null              // Use current step
};

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
        setShipments(prev => {
            const updated = prev.map(s => {
                if (s.id === shipmentId) {
                    const action = s.pendingActions[actionIndex];
                    // Remove the action
                    const newActions = s.pendingActions.filter((_, i) => i !== actionIndex);

                    // Special handling for Payment Confirmation
                    if (action?.action === 'confirm_payment') {
                        addActivityLog({
                            type: 'payment',
                            shipment: s.reference,
                            message: `Payment confirmed`,
                            detail: action.desc
                        });

                        // Create Freight Release pending action and advance step
                        const newShipment = {
                            ...s,
                            pendingActions: [
                                ...newActions,
                                {
                                    type: 'physical',
                                    action: 'freight_release',
                                    title: 'Pending Freight Release',
                                    desc: action.desc,
                                    riskReason: 'Cargo Release'
                                }
                            ],
                            step: 5, // Advance to Freight Release
                            paymentConfirmed: true,
                            status: 'in-progress'
                        };
                        // Sync selectedShipment if this is the one being viewed
                        if (selectedShipment?.id === shipmentId) {
                            setSelectedShipment(newShipment);
                        }
                        return newShipment;
                    }

                    // Special handling for Freight Release - mark as COMPLETED
                    if (action?.action === 'freight_release') {
                        addActivityLog({
                            type: 'status',
                            shipment: s.reference,
                            message: `Shipment Released & Completed`,
                            detail: 'Freight release approved'
                        });

                        const newShipment = {
                            ...s,
                            pendingActions: newActions,
                            status: 'completed'
                        };
                        // Sync selectedShipment
                        if (selectedShipment?.id === shipmentId) {
                            setSelectedShipment(newShipment);
                        }
                        return newShipment;
                    }


                    // Default handling
                    addActivityLog({
                        type: 'action',
                        shipment: s.reference,
                        message: `Approved: ${action?.title}`,
                        user: 'Operator'
                    });

                    const newShipment = { ...s, pendingActions: newActions };
                    if (selectedShipment?.id === shipmentId) {
                        setSelectedShipment(newShipment);
                    }
                    return newShipment;
                }
                return s;
            });
            return updated;
        });
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

                // Extract financials from top-level result (Agent returns charges here)
                const extractedFinancials = result.financials || { charges: [], payments: [] };

                result.processed_shipments.forEach(processed => {
                    if (processed.action === 'CREATE') {
                        // Create new shipment
                        // CRITICAL: Different playbooks start at different steps
                        const detectedPlaybook = processed.playbook || 'free-hand';
                        let initialStep;
                        if (detectedPlaybook === 'import-fcl' || detectedPlaybook === 'import-lcl') {
                            // FCL/LCL: Start at step 1 (ISF Filing needs approval)
                            initialStep = 1;
                        } else {
                            // free-hand: Order Intake is auto, start at step 2
                            initialStep = 2;
                        }

                        const newShipment = {
                            id: processed.shipment_id || `sh-${Date.now()}`,
                            status: 'new',
                            step: initialStep,
                            reference: processed.reference,
                            playbook: detectedPlaybook,
                            ...(processed.extracted_data || {}),
                            bl: processed.extracted_data?.bl_number || processed.extracted_data?.bl,
                            hbl: processed.extracted_data?.hbl_number || processed.extracted_data?.hbl,
                            container_number: processed.extracted_data?.container_number,
                            // Explicitly map party fields to prevent loss
                            notify_party: processed.extracted_data?.notify_party || null,
                            consignee: processed.extracted_data?.consignee || null,
                            shipper: processed.extracted_data?.shipper || null,
                            // Add financials from Agent response
                            financials: {
                                charges: extractedFinancials.charges || [],
                                payments: extractedFinancials.payments || [],
                                total_amount: extractedFinancials.total_amount || null
                            },
                            pendingActions: [],
                            // Record the triggering email in shipment.emails for Activity Log
                            emails: [{
                                id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                category: 1, // Order Intake step
                                direction: 'inbound',
                                from: emailData.from || 'Unknown Sender',
                                to: 'Agent',
                                subject: emailData.subject || 'No Subject',
                                body: emailData.body || '',
                                timestamp: new Date().toISOString(),
                                attachments: emailData.attachments?.map(a => ({
                                    name: a.name,
                                    type: a.type,
                                    content: a.content
                                })) || []
                            }],
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
                            const existing = updatedShipments[existingIdx];
                            const previousStep = existing.step;

                            // Merge financials: append new charges to existing ones
                            const existingFinancials = existing.financials || { charges: [], payments: [] };
                            const newCharges = extractedFinancials.charges || [];
                            const newPayments = extractedFinancials.payments || [];

                            // Extract email type from Agent's response for category assignment
                            let detectedEmailType = processed.email_analysis?.type || result.email_analysis?.type;
                            console.log(`Processing Update for ${existing.reference}: Detected Type=${detectedEmailType}`);

                            // HEURISTIC OVERRIDE: 7501 Customer Confirmation
                            // If email body mentions "7501" AND "confirm" or "proceed", and it's NOT a broker sending the 7501 itself.
                            const bodyLower = (emailData.body || '').toLowerCase();
                            const subjectLower = (emailData.subject || '').toLowerCase();
                            const isConfirmation = (bodyLower.includes('confirm') || bodyLower.includes('proceed') || bodyLower.includes('ok')) &&
                                (bodyLower.includes('7501') || subjectLower.includes('7501') || previousStep === 4);

                            // If it's a confirmation but the Agent called it 'STATUS_UPDATE' or 'SHIPMENT_DELIVERY' (Step 6), force it back to Step 4 logic
                            if (isConfirmation && (detectedEmailType === 'STATUS_UPDATE' || detectedEmailType === 'SHIPMENT_DELIVERY' || !detectedEmailType)) {
                                console.log('Heuristic Override: Detected 7501 Customer Confirmation');
                                detectedEmailType = 'CUSTOMS_CONFIRM_RESPONSE'; // Internal type for handling
                            }

                            // Create email record for Activity Log
                            // Use EMAIL_TYPE_TO_CATEGORY for correct category based on Agent-detected type
                            // CRITICAL: If type is explicitly mapped, force that category (overriding current step)
                            let emailCategory = EMAIL_TYPE_TO_CATEGORY[detectedEmailType];
                            if (emailCategory === undefined || emailCategory === null) {
                                emailCategory = previousStep; // Fallback to current step only if no explicit mapping
                            }

                            const incomingEmail = {
                                id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                category: emailCategory, // Based on email type, not shipment step
                                direction: 'inbound',
                                from: emailData.from || 'Unknown Sender',
                                to: 'Agent',
                                subject: emailData.subject || 'No Subject',
                                body: emailData.body || '',
                                timestamp: new Date().toISOString(),
                                emailType: detectedEmailType, // Store for reference
                                attachments: emailData.attachments?.map(a => ({
                                    name: a.name,
                                    type: a.type,
                                    content: a.content
                                })) || []
                            };

                            // Calculate new step
                            const newStep = ((previousStep <= 2) && (processed.extracted_data?.firms_code || processed.extracted_data?.firmsCode || processed.extracted_data?.eta))
                                ? 3
                                : previousStep;

                            updatedShipments[existingIdx] = {
                                ...existing,
                                // Selectively update fields - DO NOT use spread on extracted_data
                                // This protects against Carrier AN overwriting HBL party data
                                origin: processed.extracted_data?.origin || existing.origin,
                                destination: processed.extracted_data?.destination || existing.destination,
                                vessel: processed.extracted_data?.vessel || existing.vessel,
                                voyage: processed.extracted_data?.voyage || existing.voyage,
                                eta: processed.extracted_data?.eta || existing.eta,
                                etd: processed.extracted_data?.etd || existing.etd,
                                weight: processed.extracted_data?.weight || existing.weight,
                                volume: processed.extracted_data?.volume || existing.volume,
                                package_count: processed.extracted_data?.package_count || existing.package_count,
                                goods_description: processed.extracted_data?.goods_description || existing.goods_description,
                                // PROTECTED FIELDS: Existing value takes priority (preserve HBL data, reject Carrier AN overwrite)
                                shipper: existing.shipper || processed.extracted_data?.shipper,
                                consignee: existing.consignee || processed.extracted_data?.consignee,
                                notify_party: existing.notify_party || processed.extracted_data?.notify_party,
                                bl: processed.extracted_data?.bl_number || processed.extracted_data?.bl || existing.bl,
                                hbl: processed.extracted_data?.hbl_number || processed.extracted_data?.hbl || existing.hbl,
                                firmsCode: processed.extracted_data?.firms_code || processed.extracted_data?.firmsCode || existing.firmsCode,
                                container_number: processed.extracted_data?.container_number || existing.container_number,
                                // Append email to shipment.emails for Activity Log
                                emails: [...(existing.emails || []), incomingEmail],
                                // Merge financials - append new charges/payments to existing
                                financials: {
                                    charges: [...existingFinancials.charges, ...newCharges],
                                    payments: [...existingFinancials.payments, ...newPayments],
                                    total_amount: extractedFinancials.total_amount || existingFinancials.total_amount
                                },
                                // Auto-advance step when Carrier AN data is received
                                step: newStep,
                                // Also update status from 'new' to 'in-progress' when AN is received
                                status: (existing.status === 'new' && (processed.extracted_data?.firms_code || processed.extracted_data?.firmsCode))
                                    ? 'in-progress'
                                    : existing.status
                            };

                            // Log shipment update
                            addActivityLog({
                                type: 'shipment',
                                shipment: updatedShipments[existingIdx].reference,
                                message: `Shipment Updated via Agent`,
                                detail: `Updated details from ${emailData.subject}`
                            });

                            // Log playbook progress if step changed
                            if (newStep !== previousStep) {
                                const playbook = PLAYBOOKS[existing.playbook];
                                const stepName = playbook?.steps[newStep - 1]?.name || `Step ${newStep}`;
                                addActivityLog({
                                    type: 'playbook-progress',
                                    shipment: existing.reference,
                                    message: `Playbook advanced: ${stepName}`,
                                    detail: `Step ${previousStep} → ${newStep}`
                                });
                            }
                        }
                    } else if (processed.action === 'ESCALATE') {
                        // ESCALATE: Carrier AN received but no matching shipment found
                        // Do NOT create new shipment, only log an alert
                        addActivityLog({
                            type: 'alert',
                            message: `ESCALATION: Carrier AN received but no matching shipment found`,
                            detail: `Reference: ${processed.reference}. Manual review required. Email: ${emailData.subject}`
                        });
                    }

                    // PAYMENT_CONFIRM: Special handling for payment receipts
                    if (processed.email_analysis?.type === 'PAYMENT_CONFIRM' || result.email_analysis?.type === 'PAYMENT_CONFIRM') {
                        const payment = extractedFinancials.payments?.[0];
                        const targetIdx = updatedShipments.findIndex(s =>
                            s.reference === processed.reference || s.id === processed.shipment_id
                        );

                        if (payment && targetIdx >= 0) {
                            const shipment = updatedShipments[targetIdx];

                            // 1. Calculate total charges
                            const totalCharges = (shipment.financials?.charges || [])
                                .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                            const paymentAmount = parseFloat(payment.amount || 0);

                            // 2. Detect Bulk Payment (payment exceeds charges by >10%)
                            const isBulk = paymentAmount > totalCharges * 1.1;
                            if (isBulk) {
                                payment.isBulk = true;
                                payment.note = `Bulk Payment - exceeds charges ($${totalCharges.toFixed(2)})`;
                            }

                            // 3. Check if internal notification (auto-approve)
                            const isInternal = emailData.from?.toLowerCase().includes('@pioneerlogistics.com');

                            if (isInternal) {
                                // Auto-approve: advance to Freight Release
                                updatedShipments[targetIdx] = {
                                    ...shipment,
                                    step: 5,
                                    paymentConfirmed: true,
                                    status: 'in-progress',
                                    pendingActions: [
                                        ...(shipment.pendingActions || []),
                                        {
                                            type: 'physical',
                                            action: 'freight_release',
                                            title: 'Pending Freight Release',
                                            desc: `Payment auto-confirmed: ${payment.amount} ${payment.currency} (Ref: ${payment.reference})`,
                                            riskReason: 'Cargo Release'
                                        }
                                    ]
                                };
                                addActivityLog({
                                    type: 'payment',
                                    shipment: shipment.reference,
                                    message: `Payment auto-confirmed (internal notification)`,
                                    detail: `${payment.amount} ${payment.currency} via ${payment.type}`
                                });
                            } else {
                                // Require user approval
                                updatedShipments[targetIdx] = {
                                    ...shipment,
                                    pendingActions: [
                                        ...(shipment.pendingActions || []),
                                        {
                                            type: 'approve',
                                            action: 'confirm_payment',
                                            step: shipment.step,
                                            title: 'Confirm Payment Received',
                                            desc: `${payment.amount} ${payment.currency} via ${payment.type} (Ref: ${payment.reference})${isBulk ? ' BULK' : ''}`,
                                            riskReason: isBulk ? 'Bulk Payment - verify allocation' : 'Payment Verification',
                                            paymentData: payment,
                                            // Store the triggering email for review before approval
                                            sourceEmail: {
                                                from: emailData.from || 'Unknown Sender',
                                                subject: emailData.subject || 'Payment Receipt',
                                                body: emailData.body || '',
                                                attachments: emailData.attachments || [],
                                                timestamp: new Date().toISOString()
                                            }
                                        }
                                    ]
                                };
                                addActivityLog({
                                    type: 'payment',
                                    shipment: shipment.reference,
                                    message: `Payment received - pending confirmation`,
                                    detail: `${payment.amount} ${payment.currency} via ${payment.type}${isBulk ? ' (BULK)' : ''}`
                                });
                            }
                        }
                    }

                    // CONFIRMATION HANDLING: Use Agent's email_analysis.type (supports any language)
                    // This is more reliable than keyword matching
                    let emailType = processed.email_analysis?.type || result.email_analysis?.type;

                    // RE-APPLY HEURISTIC OVERRIDE for this scope
                    // If email body mentions "7501" AND "confirm" or "proceed", and it's NOT a broker sending the 7501 itself.
                    const bodyLower = (emailData.body || '').toLowerCase();
                    const subjectLower = (emailData.subject || '').toLowerCase();
                    const isConfirmation = (bodyLower.includes('confirm') || bodyLower.includes('proceed') || bodyLower.includes('ok')) &&
                        (bodyLower.includes('7501') || subjectLower.includes('7501'));

                    if (isConfirmation && (emailType === 'STATUS_UPDATE' || emailType === 'SHIPMENT_DELIVERY' || !emailType)) {
                        emailType = 'CUSTOMS_CONFIRM_RESPONSE';
                    }

                    // Find shipment that matches this email
                    const targetShipmentIdx = updatedShipments.findIndex(s =>
                        s.reference === processed.reference || s.id === processed.shipment_id
                    );

                    if (targetShipmentIdx >= 0) {
                        const shipment = updatedShipments[targetShipmentIdx];
                        const completedTasks = shipment.completedTasks || [];

                        // TRUCKER_CONFIRM: Mark truck_scheduling as complete AND trigger Warehouse Coordination
                        if (emailType === 'TRUCKER_CONFIRM' && !completedTasks.includes('truck_scheduling')) {
                            // Step 1: Extract delivery time from email or agent response
                            const deliveryTime = processed.extracted_data?.delivery_time ||
                                emailData.body?.match(/(\d{1,2}\/\d{1,2})/)?.[1] ||
                                'TBD';

                            // Step 2: Find Warehouse stakeholder
                            const warehouseEntry = (shipment.stakeholders || []).find(s => s.role === 'Warehouse');
                            const warehouseEmail = warehouseEntry?.email;

                            // Step 3: Create outbound email to Warehouse (if email exists)
                            let warehouseEmailDraft = null;
                            if (warehouseEmail) {
                                warehouseEmailDraft = {
                                    id: `e-${Date.now()}-warehouse`,
                                    category: 5, // Step 5: Warehouse Coordination
                                    direction: 'outbound',
                                    from: 'Agent',
                                    to: warehouseEmail,
                                    subject: `Delivery Notification - ${shipment.reference || shipment.hbl || 'Shipment'}`,
                                    body: `Dear Warehouse Team,

Please be advised of the following delivery:

Reference: ${shipment.reference || 'N/A'}
HBL: ${shipment.hbl || 'N/A'}
Container: ${shipment.container_number || 'TBD'}

**Scheduled Delivery Date: ${deliveryTime}**

Please confirm receipt availability.

Best regards,
Pioneer Global Logistics`,
                                    timestamp: new Date().toISOString(),
                                    read: true,
                                    autoLevel: 'auto'
                                };
                            }

                            updatedShipments[targetShipmentIdx] = {
                                ...shipment,
                                completedTasks: [...completedTasks, 'truck_scheduling'],
                                // Store the confirmed delivery time
                                confirmedDeliveryTime: deliveryTime,
                                // Add warehouse email if generated
                                emails: warehouseEmailDraft
                                    ? [...(shipment.emails || []), warehouseEmailDraft]
                                    : (shipment.emails || []),
                                // Mark warehouse_coordination as "waiting" (email sent, awaiting confirmation)
                                waitingTasks: warehouseEmail
                                    ? [...(shipment.waitingTasks || []).filter(w => w.key !== 'warehouse_coordination'),
                                    { key: 'warehouse_coordination', sentAt: new Date().toISOString() }]
                                    : (shipment.waitingTasks || []),
                                // Auto-Advance to Step 4 (Customs)
                                step: 4
                            };
                            addActivityLog({
                                type: 'auto-confirm',
                                shipment: shipment.reference,
                                message: `✅ Trucker Confirmation Detected by Agent`,
                                detail: `Truck Scheduling marked as complete. Delivery scheduled for ${deliveryTime}.`
                            });

                            // Log warehouse coordination trigger (if email was sent)
                            if (warehouseEmail) {
                                addActivityLog({
                                    type: 'email-sent',
                                    shipment: shipment.reference,
                                    message: `Warehouse Pre-Alert Sent`,
                                    detail: `Delivery notification sent to ${warehouseEmail} for ${deliveryTime}`,
                                    email: warehouseEmailDraft
                                });
                            }
                        }

                        // CUSTOMS_CONFIRM (7501 Received): Per SOP Step 4.3
                        // When Broker sends 7501, Agent should:
                        // 1. Draft email (attach 7501) to CUSTOMER for confirmation
                        // 2. Type: AUTO - Sent immediately to customer
                        // 3. Only mark customs_coordination as complete AFTER customer confirms
                        if (emailType === 'CUSTOMS_CONFIRM') {
                            // Extract 7501 attachment if present
                            const attachments7501 = (emailData.attachments || []).filter(a => {
                                const name = (a.name || '').toLowerCase();
                                return name.includes('7501') || name.includes('duty') || name.includes('customs');
                            });

                            // Find Consignee/Customer email from stakeholders or shipment data
                            const consigneeEntry = (shipment.stakeholders || []).find(s =>
                                s.role === 'Consignee' || s.role === 'Customer'
                            );
                            const customerEmail = consigneeEntry?.email || shipment.consigneeEmail;

                            // Extract duty amount - priority: Agent's response > email body regex
                            // Agent should return financials.total_amount or parsed duty from email
                            const agentDuty = processed.financials?.total_amount ||
                                processed.financials?.charges?.find(c => c.description?.toLowerCase().includes('duty'))?.amount;
                            const bodyDutyMatch = emailData.body?.match(/(?:duty|amount|total)[:\s]*\$?([\d,]+\.?\d*)/i);
                            const dutyAmount = agentDuty || (bodyDutyMatch ? bodyDutyMatch[1] : 'See attached 7501');

                            if (customerEmail) {
                                // Create AUTO-SEND email to Customer (per workflow: auto-forward 7501 for customer confirmation)
                                const customerDutyEmail = {
                                    id: `e-${Date.now()}-duty-confirm`,
                                    category: 4, // Step 4: Customs Coordination
                                    direction: 'outbound',
                                    from: 'Agent',
                                    to: customerEmail,
                                    subject: `Customs Duty Confirmation Required - ${shipment.reference || shipment.hbl || 'Shipment'}`,
                                    body: `Dear Customer,

The customs clearance for your shipment is in progress.

**CUSTOMS DUTY CONFIRMATION REQUIRED**

Reference: ${shipment.reference || 'N/A'}
HBL: ${shipment.hbl || 'N/A'}
Container: ${shipment.container_number || 'TBD'}

Duty Amount: $${dutyAmount}

Please review the attached Form 7501 and confirm the duty amount so we can proceed with customs clearance.

Upon your confirmation, we will arrange payment to U.S. Customs.

Best regards,
Pioneer Global Logistics`,
                                    timestamp: new Date().toISOString(),
                                    read: true, // Auto-sent
                                    autoLevel: 'auto', // Auto-send to customer
                                    attachments: attachments7501.length > 0
                                        ? attachments7501.map(a => ({ name: a.name, type: a.type, content: a.content }))
                                        : [{ name: 'Form_7501.pdf', type: 'application/pdf', note: 'Please attach 7501 from broker' }]
                                };

                                // Add to shipment: emails and waitingTasks (await customer confirmation)
                                updatedShipments[targetShipmentIdx] = {
                                    ...updatedShipments[targetShipmentIdx],
                                    emails: [...(updatedShipments[targetShipmentIdx].emails || []), customerDutyEmail],
                                    waitingTasks: [
                                        ...(updatedShipments[targetShipmentIdx].waitingTasks || []).filter(w => w.key !== 'customs_duty_confirm'),
                                        { key: 'customs_duty_confirm', sentAt: new Date().toISOString() }
                                    ],
                                    // Store 7501 data for reference
                                    customs7501: {
                                        receivedAt: new Date().toISOString(),
                                        dutyAmount: dutyAmount,
                                        attachments: attachments7501
                                    }
                                };

                                addActivityLog({
                                    type: 'email-sent',
                                    shipment: shipment.reference,
                                    message: `7501 Duty Confirmation Sent to Customer`,
                                    detail: `Auto-forwarded 7501 (Duty: $${dutyAmount}) to ${customerEmail}. Awaiting customer confirmation.`,
                                    email: customerDutyEmail
                                });
                            } else {
                                // No customer email - still log the 7501 receipt
                                addActivityLog({
                                    type: 'alert',
                                    shipment: shipment.reference,
                                    message: `7501 Received but No Customer Email`,
                                    detail: `Please add Consignee/Customer email to stakeholders, then manually forward 7501 for confirmation.`
                                });
                            }

                            // Explicit feedback for Auto-Send (User Request)
                            console.log('✅ 7501 Auto-Send workflow executed.');
                            // Optional: Show a toast or non-blocking alert if needed, but console log confirms execution logic.
                        }

                        // WAREHOUSE_CONFIRM: Mark warehouse_coordination as complete
                        if (emailType === 'WAREHOUSE_CONFIRM' && !completedTasks.includes('warehouse_coordination')) {
                            updatedShipments[targetShipmentIdx] = {
                                ...updatedShipments[targetShipmentIdx],
                                completedTasks: [...(updatedShipments[targetShipmentIdx].completedTasks || []), 'warehouse_coordination'],
                                // Auto-Advance to Step 6 (Delivery)
                                step: 6
                            };
                            addActivityLog({
                                type: 'auto-confirm',
                                shipment: shipment.reference,
                                message: `✅ Warehouse Delivery Confirmed by Agent`,
                                detail: `Warehouse Coordination marked as complete. Advanced to Shipment Delivery.`
                            });
                        }

                        // CUSTOMS_CONFIRM_RESPONSE: Customer confirmed 7501
                        // Action: Mark customs_coordination as COMPLETE
                        if (emailType === 'CUSTOMS_CONFIRM_RESPONSE') {
                            const currentTasks = updatedShipments[targetShipmentIdx].completedTasks || [];
                            // Only mark if not already marked
                            if (!currentTasks.includes('customs_coordination')) {
                                updatedShipments[targetShipmentIdx] = {
                                    ...updatedShipments[targetShipmentIdx],
                                    completedTasks: [...currentTasks, 'customs_coordination'],
                                    // Remove the waiting task
                                    waitingTasks: (updatedShipments[targetShipmentIdx].waitingTasks || []).filter(w => w.key !== 'customs_duty_confirm'),
                                    // Auto-Advance to Step 5 (Warehouse/Freight Release)
                                    step: 5
                                };
                                addActivityLog({
                                    type: 'auto-confirm',
                                    shipment: shipment.reference,
                                    message: `✅ Customer Confirmed 7501 Duty`,
                                    detail: `Customs Coordination marked as complete. Advanced to Freight Release.`
                                });
                            }
                        }

                        // POD / DELIVERY CONFIRMATION
                        // Logic: If email is STATUS_UPDATE or TRUCKER_CONFIRM (fallback)
                        // AND (contains "POD" or "proof of delivery" or attachment has "POD")
                        const bodyLower = (emailData.body || '').toLowerCase();
                        const subjectLower = (emailData.subject || '').toLowerCase();
                        const hasPODKeyword = bodyLower.includes('pod') || bodyLower.includes('proof of delivery') || subjectLower.includes('pod');
                        const hasDeliveryKeyword = bodyLower.includes('delivered') || bodyLower.includes('delivery complete');
                        const hasPODAttachment = (emailData.attachments || []).some(a => a.name.toLowerCase().includes('pod') || a.name.toLowerCase().includes('proof'));

                        // Enhanced POD trigger condition
                        if ((emailType === 'STATUS_UPDATE' || emailType === 'TRUCKER_CONFIRM' || hasPODKeyword) &&
                            (hasPODKeyword || hasDeliveryKeyword || hasPODAttachment)) {

                            const currentTasks = updatedShipments[targetShipmentIdx].completedTasks || [];

                            // Only act if not already marked complete
                            if (!currentTasks.includes('shipment_delivery')) {
                                updatedShipments[targetShipmentIdx] = {
                                    ...updatedShipments[targetShipmentIdx],
                                    completedTasks: [...currentTasks, 'shipment_delivery'],
                                    // Auto-Advance to Step 7 (Billing & Collection)
                                    step: 7
                                };
                                addActivityLog({
                                    type: 'auto-confirm',
                                    shipment: shipment.reference,
                                    message: `✅ Proof of Delivery (POD) Received`,
                                    detail: `Shipment Delivery marked as complete. Advanced to Billing.`
                                });
                            }
                        }

                        // DOCUMENT_SUBMISSION: Auto-forward documents to Customs Broker
                        // Per agentops-skill.md Section 4.2, we forward:
                        // 1. Commercial Invoice (from Customer)
                        // 2. Packing / Weight List (from Customer)
                        // 3. TLX B/L (from Customer)
                        // 4. Our Arrival Notice (generated PDF)
                        // 5. Product Images (from Customer)
                        if (emailType === 'DOCUMENT_SUBMISSION') {
                            const rawAttachments = emailData.attachments || [];

                            // Filter out 7501 - it comes FROM broker, not sent TO broker
                            // 7501 flow: Broker → Us → Customer for confirmation
                            const customerAttachments = rawAttachments.filter(a => {
                                const name = (a.name || '').toLowerCase();
                                return !name.includes('7501');
                            });

                            // Find Customs Broker email from stakeholders
                            const brokerEntry = (shipment.stakeholders || []).find(s => s.role === 'Customs Broker');
                            const brokerEmail = brokerEntry?.email;

                            if (brokerEmail) {
                                // Build attachment list: Customer docs + Our Arrival Notice
                                const allAttachments = [
                                    ...customerAttachments.map(a => ({ name: a.name, type: a.type })),
                                    { name: `Arrival_Notice_${shipment.reference || shipment.hbl || 'Shipment'}.pdf`, type: 'application/pdf', source: 'generated' }
                                ];

                                // Create outbound email to Broker
                                const brokerEmailDraft = {
                                    id: `e-${Date.now()}-broker`,
                                    category: 4, // Step 4: Customs Coordination
                                    direction: 'outbound',
                                    from: 'Agent',
                                    to: brokerEmail,
                                    subject: `Customs Filing Documents - ${shipment.reference || shipment.hbl || 'Shipment'}`,
                                    body: `Dear Customs Broker,

Please find attached the customs filing documents for the following shipment:

Reference: ${shipment.reference || 'N/A'}
HBL: ${shipment.hbl || 'N/A'}
Container: ${shipment.container_number || 'TBD'}
Vessel: ${shipment.vessel || 'TBD'}
ETA: ${shipment.eta || 'TBD'}

Attached Documents:
${customerAttachments.length > 0 ? customerAttachments.map(a => `• ${a.name}`).join('\n') : '• (Customer documents from forwarded email)'}
• Arrival Notice (Our Reference)

Please proceed with customs filing and advise the duty amount upon clearance.

Best regards,
Pioneer Global Logistics`,
                                    timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    read: true,
                                    autoLevel: 'auto',
                                    attachments: allAttachments
                                };

                                // Add to shipment emails
                                updatedShipments[targetShipmentIdx] = {
                                    ...updatedShipments[targetShipmentIdx],
                                    emails: [...(updatedShipments[targetShipmentIdx].emails || []), brokerEmailDraft]
                                };

                                addActivityLog({
                                    type: 'email-sent',
                                    shipment: shipment.reference,
                                    message: `Customs Documents Sent to Broker`,
                                    detail: `Forwarded ${customerAttachments.length} customer doc(s) + Arrival Notice to ${brokerEmail}`,
                                    email: brokerEmailDraft
                                });
                            } else {
                                // No broker email - log warning
                                addActivityLog({
                                    type: 'alert',
                                    shipment: shipment.reference,
                                    message: `Customs Documents Received but No Broker Email`,
                                    detail: `Please add Customs Broker contact to stakeholders.`
                                });
                            }
                        }
                    }
                });

                setShipments([...newShipments, ...updatedShipments]);

                // FIX: If selectedShipment was updated, update the state too so the Modal reflects changes
                if (selectedShipment) {
                    const match = updatedShipments.find(s => s.id === selectedShipment.id) ||
                        newShipments.find(s => s.id === selectedShipment.id);
                    if (match) {
                        setSelectedShipment(match);
                    }
                }
            }

            // NEW: Add Agent Thinking to Activity Log
            addActivityLog({
                type: 'agent-thinking',
                message: `Agent Processed: ${emailData.subject}`,
                // Structured thinking process for UI display
                thinking: {
                    initial_thought: result.thought_start || null,
                    reasoning: result.reasoning || null,
                    email_type: result.email_analysis?.type || 'UNKNOWN',
                    confidence: result.email_analysis?.confidence || null,
                    action: result.action?.type || null,
                    action_authority: result.action?.authority || null
                },
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
                        console.log('Clearing all shipments...');
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
