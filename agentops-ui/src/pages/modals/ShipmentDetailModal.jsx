import React from 'react';
import {
    X, Zap, FileText, Bell, Check, ExternalLink, CheckCircle, Loader,
    Shield, Edit3, Package, ChevronDown, ChevronUp, Mail
} from 'lucide-react';
import { PLAYBOOKS, AUTOMATION_LEVELS, stepLabels, stepIcons } from '../../constants';
import { getStatusStyle } from '../../utils';

// Add input styles constant
const inputStyle = {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: 15,
    fontWeight: 600,
    width: '100%'
};

import { generateArrivalNoticePDF, generatePickupInstructionPDF } from '../../services/pdfGenerator';

const getStakeholderEmail = (shipment, role) => {
    return shipment.stakeholders?.find(s => s.role === role)?.email;
};

export default function ShipmentDetailModal({
    shipment,
    onClose,
    onViewActivityLog,
    shipments,
    setShipments,
    setSelectedShipment,
    toggleISFFiled,
    onApprove,
    onAddActivity
}) {
    const playbook = PLAYBOOKS[shipment.playbook];
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState({});

    // PDF Preview State
    const [showPdfPreview, setShowPdfPreview] = React.useState(false);
    const [pdfUrl, setPdfUrl] = React.useState(null);
    const [emailDraft, setEmailDraft] = React.useState({ to: '', subject: '', body: '' });
    const [includePD, setIncludePD] = React.useState(false);
    const [previewMode, setPreviewMode] = React.useState('arrival'); // 'arrival' or 'pickup'

    // Default P&D Template
    const pdTemplate = `\n\n*** PICK-UP & DELIVERY INSTRUCTIONS ***\nPlease ensure the driver has a valid CDL and TWIC card.\nTerminal: LONG BEACH CONTAINER TERMINAL\nFirms Code: WAC4\nAvailability: Available for pickup`;

    // Initialize edit data when entering edit mode
    React.useEffect(() => {
        if (isEditing) {
            setEditData({
                origin: shipment.origin,
                destination: shipment.destination,
                vessel: shipment.vessel,
                bl: shipment.bl,
                eta: shipment.eta,
                hbl: shipment.hbl || '',
                firmsCode: shipment.firmsCode || '',
                container_number: shipment.container_number || '',
                ref: shipment.reference || '',
                // Party Information
                shipper: shipment.shipper || '',
                consignee: shipment.consignee || '',
                notifyParty: shipment.notifyParty || '',
                // Quantitative Data
                weight: shipment.weight || '',
                volume: shipment.volume || '',
                package_count: shipment.package_count || '',
                // Financials - charges are managed separately in the charges editor below
                financials: shipment.financials || { charges: [] },
                // Stakeholders
                stakeholders: shipment.stakeholders || [
                    ...(shipment.agent ? [{ role: 'Oversea Agent', name: shipment.agent, email: 'agent@example.com' }] : [])
                ]
            });
        }
    }, [isEditing, shipment]);

    // --- NEW: Handle Playbook Step Click ---
    const handleStepClick = (stepNumber) => {
        setIsEditing(true);

        setTimeout(() => {
            let targetId = '';
            if (stepNumber === 1 || stepNumber === 2) {
                targetId = 'general-info-section';
            } else if ([3, 4, 5, 6, 7, 8].includes(stepNumber)) {
                // Determine specific needs. 
                // Step 3 (AN) often relies on Party Info -> General Info or Stakeholders. 
                // Step 4, 5, 7 rely on Stakeholders.
                targetId = 'stakeholders-section';
            }

            if (targetId) {
                document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const handleSave = () => {

        const updated = shipments.map(s => s.id === shipment.id ? { ...s, ...editData, reference: editData.ref } : s);
        setShipments(updated);
        setSelectedShipment({ ...shipment, ...editData, reference: editData.ref });
        setIsEditing(false);
    };

    const handleGenerateAN = () => {
        const doc = generateArrivalNoticePDF(shipment);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Resolve Email Recipients from Stakeholders
        const stakeholders = shipment.stakeholders || [];
        const consigneeEmail = stakeholders.find(s => s.role === 'Consignee')?.email;
        const notifyEmail = stakeholders.find(s => s.role === 'Notify Party')?.email; // Use 'Notify Party' role if it exists, or check standard fields

        // Fallback logic
        const targetEmail = consigneeEmail || notifyEmail || shipment.consigneeEmail || "customer@example.com";

        // Initialize Draft
        setEmailDraft({
            to: targetEmail,
            subject: `Arrival Notice - ${shipment.hbl || shipment.bl}`,
            body: `Dear Customer,\n\nPlease find attached the Arrival Notice for shipment ${shipment.hbl || shipment.bl}.\n\nVessel: ${shipment.vessel}\nETA: ${shipment.eta}\n\nPlease arrange payment and customs clearance.\n\nBest regards,\nPioneer Global Logistics`
        });
        setPreviewMode('arrival');
        setIncludePD(false);
        setShowPdfPreview(true);

        // Log Activity for Generation
        if (onAddActivity) {
            onAddActivity({
                type: 'document',
                shipment: shipment.reference,
                message: 'Arrival Notice Generated',
                timestamp: new Date().toISOString()
            });
        }
    };

    const handleSendAN = () => {
        // Create the Sent Email Object
        const sentEmail = {
            id: `e-${Date.now()}-an`,
            category: 3, // Step 3: Arrival Notice (was 4/Trucker incorrectly)
            direction: 'outbound',
            from: 'Agent',
            to: emailDraft.to,
            subject: emailDraft.subject,
            body: emailDraft.body,
            timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: true,
            autoLevel: 'auto',
            attachments: []
        };

        // Simulate sending
        const updated = shipments.map(s => {
            if (s.id === shipment.id) {
                return {
                    ...s,
                    status: 'in-progress',
                    step: 4, // Advance to Payment Collection
                    emails: [sentEmail, ...(s.emails || [])] // Push to history
                };
            }
            return s;
        });
        setShipments(updated);
        // setSelectedShipment(...) update locally to reflect immediately
        setSelectedShipment(prev => ({
            ...prev,
            status: 'in-progress',
            step: 4,
            emails: [sentEmail, ...(prev.emails || [])]
        }));

        setShowPdfPreview(false);
        if (onAddActivity) {
            console.log('Adding Activity Log for Send AN:', shipment.reference);
            const finalBody = emailDraft.body + (includePD ? `\n\n${pdTemplate}` : '');
            onAddActivity({
                type: 'email-sent',
                shipment: shipment.reference,
                message: `Arrival Notice sent to ${emailDraft.to}`,
                email: sentEmail
            });
        }
    };

    const handleGeneratePickup = () => {
        // Get Trucker email from stakeholders
        const stakeholders = shipment.stakeholders || [];
        const truckerEntry = stakeholders.find(s => s.role === 'Trucker');
        const truckerEmail = truckerEntry?.email || '';

        if (!truckerEmail) {
            alert('Please add Trucker contact information first (click Edit button)');
            return;
        }

        // Generate PDF
        const doc = generatePickupInstructionPDF(shipment);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Build pickup instruction email
        const pickupBody = `Dear Trucker,

Please find attached the Pick-Up & Delivery Instruction for shipment ${shipment.reference || shipment.hbl || shipment.bl}.

Container: ${shipment.container_number || 'TBD'}
Terminal: ${shipment.firmsCode || 'TBD'}
Delivery To: ${shipment.consignee || shipment.destination || 'TBD'}

Please confirm receipt and advise pickup schedule.

Best regards,
Pioneer Global Logistics`;

        setEmailDraft({
            to: truckerEmail,
            subject: `Pick-Up & Delivery Instruction - ${shipment.reference || shipment.hbl || shipment.bl}`,
            body: pickupBody
        });
        setPreviewMode('pickup');
        setIncludePD(false);
        setShowPdfPreview(true);

        if (onAddActivity) {
            onAddActivity({
                type: 'document',
                shipment: shipment.reference,
                message: 'Pick-Up & Delivery Instruction PDF Generated',
                timestamp: new Date().toISOString()
            });
        }
    };

    const handleSendPickup = () => {
        const sentEmail = {
            id: `e-${Date.now()}-pickup`,
            category: 3, // Step 3: Truck Scheduling
            direction: 'outbound',
            from: 'Agent',
            to: emailDraft.to,
            subject: emailDraft.subject,
            body: emailDraft.body,
            timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: true,
            autoLevel: 'auto'
        };

        // Update shipment - mark Truck Scheduling as sent, waiting for confirmation
        const updated = shipments.map(s => {
            if (s.id === shipment.id) {
                const currentWaiting = s.waitingTasks || [];
                return {
                    ...s,
                    emails: [sentEmail, ...(s.emails || [])],
                    waitingTasks: [...currentWaiting.filter(w => w.key !== 'truck_scheduling_sent'), { key: 'truck_scheduling_sent', sentAt: new Date().toISOString() }]
                };
            }
            return s;
        });
        setShipments(updated);
        setSelectedShipment(prev => ({
            ...prev,
            emails: [sentEmail, ...(prev.emails || [])],
            waitingTasks: [...(prev.waitingTasks || []).filter(w => w.key !== 'truck_scheduling_sent'), { key: 'truck_scheduling_sent', sentAt: new Date().toISOString() }]
        }));

        setShowPdfPreview(false);
        if (onAddActivity) {
            onAddActivity({
                type: 'email-sent',
                shipment: shipment.reference,
                message: `Pick-Up Instruction sent to Trucker (${emailDraft.to})`,
                email: sentEmail
            });
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ padding: 26, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--card)', borderRadius: '18px 18px 0 0', zIndex: 10 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{shipment.reference}</h2>
                            <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, ...getStatusStyle(shipment.status) }}>{shipment.status.replace('-', ' ')}</span>
                        </div>
                        <p style={{ color: 'var(--sidebar-foreground)', margin: '6px 0 0 0', fontSize: 15 }}>{shipment.customer}</p>
                        {/* Playbook Selector */}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                            <select
                                value={shipment.playbook}
                                onChange={(e) => {
                                    const updated = shipments.map(s => s.id === shipment.id ? { ...s, playbook: e.target.value } : s);
                                    setShipments(updated);
                                    setSelectedShipment({ ...shipment, playbook: e.target.value });
                                }}
                                style={{ padding: '4px 8px', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                            >
                                {Object.values(PLAYBOOKS).map(pb => (
                                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                                ))}
                            </select>
                            {shipment.status === 'new' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 4, fontSize: 11, fontWeight: 600 }} title={shipment.suggestReason || 'Auto-detected from email'}>
                                    <Zap style={{ width: 10, height: 10 }} /> Agent suggested
                                </span>
                            )}
                        </div>
                        {shipment.status === 'new' && shipment.suggestReason && (
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '6px 0 0 0', fontStyle: 'italic' }}>{shipment.suggestReason}</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            style={{ padding: 10, background: isEditing ? 'var(--primary)' : 'var(--muted)', color: isEditing ? 'white' : 'var(--foreground)', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                            {isEditing ? <Check style={{ width: 16, height: 16 }} /> : <Edit3 style={{ width: 16, height: 16 }} />}
                            {isEditing ? 'Save' : 'Edit'}
                        </button>
                        <button onClick={onClose} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                            <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 26 }}>
                    {/* Pending Actions */}
                    {/* Show if: has pending actions OR needs ISF (step 1) OR needs stakeholder info (step 3 for import FCL/LCL) */}
                    {(shipment.pendingActions?.length > 0 ||
                        (shipment.step === 1 && !shipment.isfFiled) ||
                        ((shipment.playbook === 'import-fcl' || shipment.playbook === 'import-lcl') && shipment.step === 3)
                    ) && (
                            <PendingActionsSection
                                shipment={shipment}
                                shipments={shipments}
                                setShipments={setShipments}
                                setSelectedShipment={setSelectedShipment}
                                toggleISFFiled={toggleISFFiled}
                                onApprove={onApprove}
                                setIsEditing={setIsEditing}
                                onAddActivity={onAddActivity}
                            />
                        )}

                    {/* No Pending Actions - Hide if needs stakeholder info at step 3 */}
                    {(!shipment.pendingActions || shipment.pendingActions.length === 0) &&
                        !(shipment.step === 1 && !shipment.isfFiled) &&
                        !((shipment.playbook === 'import-fcl' || shipment.playbook === 'import-lcl') && shipment.step === 3) && (
                            <div style={{ padding: 20, background: 'oklch(0.96 0.03 160)', borderRadius: 12, border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle style={{ width: 24, height: 24, color: 'var(--primary)' }} />
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>All caught up!</p>
                                    <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Agent is handling this shipment automatically</p>
                                </div>
                            </div>
                        )}

                    <div id="general-info-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {[
                            { label: 'Origin', key: 'origin', value: shipment.origin },
                            { label: 'Destination', key: 'destination', value: shipment.destination },
                            { label: 'Vessel', key: 'vessel', value: shipment.vessel },
                            { label: 'B/L', key: 'bl', value: shipment.bl },
                            { label: 'ETA', key: 'eta', value: shipment.eta },
                            { label: 'HBL', key: 'hbl', value: shipment.hbl || '-' },
                            { label: 'CY Location', key: 'firmsCode', value: shipment.firmsCode || '-' },
                            { label: 'Cntr number', key: 'container_number', value: shipment.container_number || '-' },
                            { label: 'Reference', key: 'ref', value: shipment.reference || '-' },
                            { label: 'Weight', key: 'weight', value: shipment.weight || '-' },
                            { label: 'Volume', key: 'volume', value: shipment.volume || '-' },
                            { label: 'Packages', key: 'package_count', value: shipment.package_count || '-' },
                            { label: 'Step', value: playbook?.steps[shipment.step - 1]?.name || stepLabels[shipment.step - 1] }
                        ].map(item => (
                            <div key={item.label} style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>{item.label}</p>
                                {isEditing && item.key ? (
                                    <input
                                        value={editData[item.key] || ''}
                                        onChange={(e) => setEditData({ ...editData, [item.key]: e.target.value })}
                                        style={inputStyle}
                                    />
                                ) : (
                                    <p style={{ fontWeight: 600, margin: '6px 0 0 0', fontSize: 15 }}>{item.value}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Stakeholders Section */}
                    <div id="stakeholders-section" style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>Stakeholders</p>
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const newStakeholders = [...(editData.stakeholders || []), { role: 'Trucker', name: '', email: '' }];
                                        setEditData({ ...editData, stakeholders: newStakeholders });
                                    }}
                                    style={{ fontSize: 11, padding: '4px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                                >
                                    + Add Contact
                                </button>
                            )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            {(isEditing ? (editData.stakeholders || []) : (shipment.stakeholders || [])).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {/* Header Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 24px', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', padding: '0 4px' }}>
                                        <span>Role</span>
                                        <span>Name / Company</span>
                                        <span>Email</span>
                                        <span></span>
                                    </div>

                                    {(isEditing ? (editData.stakeholders || []) : (shipment.stakeholders || [])).map((s, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 24px', gap: 8, alignItems: 'center' }}>
                                            {isEditing ? (
                                                <>
                                                    <select
                                                        value={s.role}
                                                        onChange={(e) => {
                                                            const newStakeholders = [...editData.stakeholders];
                                                            newStakeholders[i] = { ...newStakeholders[i], role: e.target.value };
                                                            setEditData({ ...editData, stakeholders: newStakeholders });
                                                        }}
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    >
                                                        {['Oversea Agent', 'Customs Broker', 'Consignee', 'Trucker', 'Warehouse'].map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        value={s.name}
                                                        onChange={(e) => {
                                                            const newStakeholders = [...editData.stakeholders];
                                                            newStakeholders[i] = { ...newStakeholders[i], name: e.target.value };
                                                            setEditData({ ...editData, stakeholders: newStakeholders });
                                                        }}
                                                        placeholder="Company Name"
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    />
                                                    <input
                                                        value={s.email}
                                                        onChange={(e) => {
                                                            const newStakeholders = [...editData.stakeholders];
                                                            newStakeholders[i] = { ...newStakeholders[i], email: e.target.value };
                                                            setEditData({ ...editData, stakeholders: newStakeholders });
                                                        }}
                                                        placeholder="email@example.com"
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newStakeholders = editData.stakeholders.filter((_, idx) => idx !== i);
                                                            setEditData({ ...editData, stakeholders: newStakeholders });
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: 12, padding: '2px 6px', background: 'var(--background)', borderRadius: 4, border: '1px solid var(--border)', width: 'fit-content' }}>{s.role}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                                                    <span style={{ fontSize: 13, color: 'var(--foreground)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        {s.email}
                                                    </span>
                                                    <span></span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--sidebar-foreground)', fontStyle: 'italic' }}>No stakeholders added.</p>
                            )}
                        </div>
                    </div>
                    {/* Party Information Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 14 }}>
                        {[
                            { label: 'Shipper', key: 'shipper', value: shipment.shipper || '-' },
                            { label: 'Consignee', key: 'consignee', value: shipment.consignee || '-' },
                            { label: 'Notify Party', key: 'notifyParty', value: shipment.notifyParty || '-' }
                        ].map(item => (
                            <div key={item.label} style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>{item.label}</p>
                                {isEditing && item.key ? (
                                    <textarea
                                        value={editData[item.key] || ''}
                                        onChange={(e) => setEditData({ ...editData, [item.key]: e.target.value })}
                                        style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                                        rows={2}
                                    />
                                ) : (
                                    <p style={{ fontWeight: 600, margin: '6px 0 0 0', fontSize: 15, whiteSpace: 'pre-wrap' }}>{item.value}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Financials / Charges Section */}
                    <div style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>Charges {isEditing ? '(Editable)' : '(Auto-extracted)'}</p>
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const newCharges = [...(editData.financials?.charges || []), { description: '', amount: '', currency: 'USD', prepaid_or_collect: 'Collect' }];
                                        setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                    }}
                                    style={{ fontSize: 11, padding: '4px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                                >
                                    + Add Charge
                                </button>
                            )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            {(isEditing ? (editData.financials?.charges || []) : (shipment.financials?.charges || [])).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {/* Header Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 24px', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', padding: '0 4px' }}>
                                        <span>Description</span>
                                        <span>Amount</span>
                                        <span>Curr</span>
                                        <span>Type</span>
                                        <span></span>
                                    </div>

                                    {(isEditing ? (editData.financials?.charges || []) : (shipment.financials?.charges || [])).map((c, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 24px', gap: 8, alignItems: 'center' }}>
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        value={c.description}
                                                        onChange={(e) => {
                                                            const newCharges = [...editData.financials.charges];
                                                            newCharges[i] = { ...newCharges[i], description: e.target.value };
                                                            setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                                        }}
                                                        placeholder="Description"
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    />
                                                    <input
                                                        value={c.amount}
                                                        onChange={(e) => {
                                                            const newCharges = [...editData.financials.charges];
                                                            newCharges[i] = { ...newCharges[i], amount: e.target.value };
                                                            setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                                        }}
                                                        placeholder="0.00"
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    />
                                                    <select
                                                        value={c.currency}
                                                        onChange={(e) => {
                                                            const newCharges = [...editData.financials.charges];
                                                            newCharges[i] = { ...newCharges[i], currency: e.target.value };
                                                            setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                                        }}
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    >
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="CNY">CNY</option>
                                                    </select>
                                                    <select
                                                        value={c.prepaid_or_collect}
                                                        onChange={(e) => {
                                                            const newCharges = [...editData.financials.charges];
                                                            newCharges[i] = { ...newCharges[i], prepaid_or_collect: e.target.value };
                                                            setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                                        }}
                                                        style={{ ...inputStyle, padding: '4px', fontSize: 13 }}
                                                    >
                                                        <option value="Collect">Collect</option>
                                                        <option value="Prepaid">Prepaid</option>
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            const newCharges = editData.financials.charges.filter((_, idx) => idx !== i);
                                                            setEditData({ ...editData, financials: { ...editData.financials, charges: newCharges } });
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.description}</span>
                                                    <span style={{ fontSize: 13 }}>{c.amount}</span>
                                                    <span style={{ fontSize: 13 }}>{c.currency}</span>
                                                    <span style={{ fontSize: 12, padding: '2px 6px', background: c.prepaid_or_collect === 'Prepaid' ? 'oklch(0.95 0.04 160)' : 'oklch(0.95 0.04 32)', color: c.prepaid_or_collect === 'Prepaid' ? 'oklch(0.4 0.1 160)' : 'oklch(0.4 0.1 32)', borderRadius: 4 }}>{c.prepaid_or_collect}</span>
                                                    <span></span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--sidebar-foreground)' }}>
                                        {isEditing ? 'No charges yet. Click "+ Add Charge" to begin.' : 'No charges extracted.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financials / Payments Section */}
                    <div style={{ padding: 18, background: 'var(--muted)', borderRadius: 12, marginTop: 14 }}>
                        <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0', fontWeight: 500 }}>Payments Received</p>
                        {(shipment.financials?.payments || []).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', padding: '0 4px' }}>
                                    <span>Reference</span>
                                    <span>Amount</span>
                                    <span>Curr</span>
                                    <span>Type</span>
                                </div>
                                {(shipment.financials?.payments || []).map((p, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.reference || '-'}</span>
                                        <span style={{ fontSize: 13, color: 'oklch(0.5 0.2 140)' }}>{p.amount}</span>
                                        <span style={{ fontSize: 13 }}>{p.currency}</span>
                                        <span style={{ fontSize: 12 }}>{p.type}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--sidebar-foreground)', fontStyle: 'italic' }}>No payments recorded.</p>
                        )}
                    </div>

                    {/* Playbook Timeline */}
                    <PlaybookTimeline shipment={shipment} playbook={playbook} onStepClick={handleStepClick} />

                    <div style={{ display: 'flex', gap: 14 }}>
                        <button onClick={onViewActivityLog} style={{ flex: 1, padding: 16, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>View Activity Log</button>

                        {/* New Generate AN Button */}
                        <button
                            onClick={handleGenerateAN}
                            style={{ flex: 1, padding: 16, background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <FileText size={18} /> Generate Arrival Notice
                        </button>

                        {/* Generate Pick and Delivery Instruction Button */}
                        <button
                            onClick={handleGeneratePickup}
                            style={{ flex: 1, padding: 16, background: '#60a5fa', color: '#000000', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <FileText size={18} color="#000000" /> Generate Pick-Up Instruction
                        </button>

                        {/* Freight Release button: ONLY for free-hand playbook at step 5 */}
                        {shipment.playbook === 'free-hand' && shipment.step === 5 ? (
                            <button
                                onClick={() => {
                                    if (window.confirm('Confirm Freight Release?\n\nThis will mark the shipment as COMPLETED and remove it from the active list.')) {
                                        const completedShipment = { ...shipment, status: 'completed' };
                                        setShipments(prev => prev.map(s => {
                                            if (s.id === shipment.id) {
                                                return completedShipment;
                                            }
                                            return s;
                                        }));
                                        setSelectedShipment(completedShipment);
                                        if (onAddActivity) {
                                            onAddActivity({
                                                type: 'status',
                                                shipment: shipment.reference,
                                                message: 'Shipment Released & Completed',
                                            });
                                        }
                                        onClose();
                                    }
                                }}
                                style={{ padding: '16px 28px', background: 'oklch(0.6 0.15 150)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <CheckCircle size={18} /> Freight Release
                            </button>
                        ) : null}
                    </div>
                </div>
            </div >

            {/* PDF Preview Modal */}
            {
                showPdfPreview && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '95%', height: '95%', background: 'var(--card)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{previewMode === 'pickup' ? 'Review Pick-Up Instruction' : 'Review Arrival Notice'}</h3>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => setShowPdfPreview(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                                    <button
                                        onClick={previewMode === 'pickup' ? handleSendPickup : handleSendAN}
                                        style={{ padding: '8px 24px', borderRadius: 8, background: previewMode === 'pickup' ? '#60a5fa' : 'var(--primary)', color: previewMode === 'pickup' ? '#000' : 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <Zap size={16} /> Approve & Send Email
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                                {/* PDF Viewer - Only show for Arrival Notice */}
                                {/* PDF Viewer - Show for both arrival and pickup */}
                                <div style={{ flex: 1, background: '#525659', padding: 20, display: 'flex', justifyContent: 'center' }}>
                                    <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, background: 'white' }} title="PDF Preview" />
                                </div>

                                {/* Email Draft Side Panel */}
                                <div style={{
                                    width: 350,
                                    borderLeft: '1px solid var(--border)',
                                    padding: 20,
                                    background: 'var(--background)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <h4 style={{ marginTop: 0 }}>Email Preview</h4>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>To: <span style={{ fontWeight: 400, color: 'var(--muted-foreground)' }}>(可用逗號分隔多個 email)</span></label>
                                        <input
                                            value={emailDraft.to}
                                            onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })}
                                            style={inputStyle}
                                            placeholder="email1@example.com, email2@example.com"
                                        />
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Subject:</label>
                                        <input
                                            value={emailDraft.subject}
                                            onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Body:</label>
                                        <textarea
                                            style={{ ...inputStyle, flex: 1, resize: 'none', marginBottom: 12, minHeight: previewMode === 'pickup' ? 300 : 'auto' }}
                                            value={emailDraft.body}
                                            onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                                        />
                                        {previewMode === 'arrival' && (
                                            <>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: 8, background: 'var(--muted)', borderRadius: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={includePD}
                                                        onChange={(e) => setIncludePD(e.target.checked)}
                                                    />
                                                    Include Pick-Up & Delivery Instr.
                                                </label>
                                                {includePD && (
                                                    <div style={{ marginTop: 8, padding: 8, background: 'oklch(0.97 0.02 140)', borderRadius: 6, fontSize: 11, color: 'var(--muted-foreground)' }}>
                                                        Preview adds:<br />
                                                        {pdTemplate.replace(/\n/g, ' ')}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

function PendingActionsSection({ shipment, shipments, setShipments, setSelectedShipment, toggleISFFiled, onApprove, setIsEditing, onAddActivity }) {
    // Dynamic ISF Action Injection Logic
    // CRITICAL: Only inject ISF Filing for import-fcl playbook, NOT for free-hand
    const displayActions = [...(shipment.pendingActions || [])];
    const needsISF = shipment.playbook === 'import-fcl' || shipment.playbook === 'import-lcl';
    if (needsISF && shipment.step === 1 && !shipment.isfFiled && !displayActions.some(a => a.title?.includes('ISF'))) {
        displayActions.unshift({
            type: 'manual',
            title: 'Action Required: ISF Filing',
            desc: 'Importer Security Filing must be filed 24h prior to loading.',
            action: 'isf_filing'
        });
    }

    // STAKEHOLDER INFO PROMPT: After receiving Carrier AN (Step 3)
    // CRITICAL: Only for import-fcl and import-lcl playbooks
    // NOTE: Step 3 in new workflow is "Truck Scheduling", Carrier AN is completed at step 2
    const needsStakeholderPrompt = needsISF && shipment.step >= 3;
    if (needsStakeholderPrompt) {
        // Check stakeholder contacts (need role + email in stakeholders array)
        const stakeholders = shipment.stakeholders || [];
        const requiredContacts = ['Customs Broker', 'Trucker', 'Warehouse'];
        const missingContacts = requiredContacts.filter(role => {
            return !stakeholders.some(s => s.role === role && s.email);
        });

        // Only show prompt if CONTACTS are missing (Trucker, Broker, Warehouse)
        // NOTE: Consignee, Shipper, Notify Party are in shipment.* fields, NOT stakeholders
        if (missingContacts.length > 0 && !displayActions.some(a => a.action === 'fill_stakeholder_info')) {
            displayActions.unshift({
                type: 'manual',
                title: 'Action Required: Fill Stakeholder Information',
                desc: `Carrier AN received. Please add contact emails for: ${missingContacts.join(', ')} to proceed with Truck Scheduling and Customs Coordination.`,
                action: 'fill_stakeholder_info',
                missingRoles: missingContacts,
                isStakeholderPrompt: true
            });
        }
    }

    // Dynamic Parallel Coordination Logic (Steps 4+)
    // CRITICAL: Only for import-fcl and import-lcl playbooks, NOT for free-hand
    // These tasks should only appear AFTER stakeholder info is filled (Step 4+)
    // At Step 3, only "Fill Stakeholder Information" should appear
    const needsCoordination = shipment.playbook === 'import-fcl' || shipment.playbook === 'import-lcl';
    if (needsCoordination && shipment.step >= 4 && shipment.status !== 'completed') {
        const coordinationTasks = [
            {
                stepIdx: 3,
                key: 'truck_scheduling',  // Match key used in App.jsx and TASK_MAP
                title: 'Trucker Coordination',
                desc: 'Arrange pickup and delivery with trucker.',
                role: 'Trucker'
            },
            {
                stepIdx: 4,
                key: 'customs_coordination',
                title: 'Customs Broker',
                desc: 'Submit documents for customs clearance.',
                role: 'Customs Broker'
            },
            {
                stepIdx: 5,
                key: 'warehouse_coordination',
                title: 'Warehouse Alert',
                desc: 'Pre-alert warehouse of incoming cargo.',
                role: 'Warehouse'
            }
        ];

        coordinationTasks.forEach(task => {
            // 1. Check if stakeholder data exists
            const stakeholders = shipment.stakeholders || [];
            const hasStakeholder = stakeholders.some(s => s.role === task.role && s.email);

            // 2. Check current status of this task
            const isCompleted = (shipment.completedTasks || []).includes(task.key);
            const pendingIndex = displayActions.findIndex(a => a.action === task.key);
            const alreadyExists = pendingIndex !== -1;

            if (!isCompleted) {
                if (!hasStakeholder) {
                    // CRITICAL: If data missing, we MUST show "Provide Details"
                    // If the coordination task is already pending (e.g. from backend), we should REPLACE it or PREPEND the data requirement
                    // Here we will simply add the data requirement.
                    // To avoid duplicates, check if "provide_..." action exists
                    const provideKey = `provide_${task.role.toLowerCase().replace(' ', '_')}`;
                    if (!displayActions.some(a => a.action === provideKey)) {
                        // If the coordination task is erroneously there, remove it to force data entry first
                        if (alreadyExists) {
                            displayActions.splice(pendingIndex, 1);
                        }

                        displayActions.push({
                            type: 'manual',
                            title: `Action Required: Provide ${task.role} Details`,
                            desc: `Please add ${task.role} contact info to proceed with coordination.`,
                            action: provideKey,
                            role: task.role,
                            stepIdx: task.stepIdx,
                            isMissingData: true
                        });
                    }
                } else {
                    // Data exists. If task not pending and not completed, add it.
                    if (!alreadyExists) {
                        displayActions.push({
                            type: 'manual',
                            title: `Action Required: ${task.title}`,
                            desc: task.desc,
                            action: task.key,
                            role: task.role,
                            stepIdx: task.stepIdx
                        });
                    }
                }
            }
        });
    }

    // State to track which actions have their Related Email expanded
    const [expandedActions, setExpandedActions] = React.useState({});
    const [previewImage, setPreviewImage] = React.useState(null);

    // Helper to toggle expand state
    const toggleExpanded = (idx) => {
        setExpandedActions(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Helper to check if attachment is an image
    const isImageAttachment = (attachment) => {
        const name = (attachment.name || '').toLowerCase();
        const type = (attachment.type || '').toLowerCase();
        return type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp');
    };

    // Helper to get sourceEmail with fallback to shipment's emails
    const getActionSourceEmail = (action) => {
        if (action.sourceEmail) return action.sourceEmail;

        // Fallback: find related email from shipment's emails array if sourceEmail not attached
        if (action.action === 'confirm_payment' && shipment?.emails?.length > 0) {
            const paymentEmails = shipment.emails.filter(e =>
                e.direction === 'inbound' &&
                (e.subject?.toLowerCase().includes('payment') ||
                    e.subject?.toLowerCase().includes('receipt') ||
                    e.body?.toLowerCase().includes('payment') ||
                    e.attachments?.length > 0)
            );
            if (paymentEmails.length > 0) {
                const latestPaymentEmail = paymentEmails[paymentEmails.length - 1];
                return {
                    from: latestPaymentEmail.from || 'Unknown Sender',
                    subject: latestPaymentEmail.subject || 'Payment Receipt',
                    body: latestPaymentEmail.body || '',
                    attachments: latestPaymentEmail.attachments || [],
                    timestamp: latestPaymentEmail.timestamp || new Date().toISOString()
                };
            }
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} /> Action Required
            </h3>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <img
                        src={previewImage.startsWith('data:') ? previewImage : `data:image/png;base64,${previewImage}`}
                        alt="Preview"
                        style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }}
                    />
                    <button
                        onClick={() => setPreviewImage(null)}
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            background: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>
            )}

            {displayActions.map((action, idx) => (
                <div key={idx} style={{ padding: 16, background: action.type === 'manual' ? 'oklch(0.96 0.04 32)' : action.type === 'physical' ? 'var(--muted)' : 'oklch(0.97 0.04 70)', borderRadius: 12, border: `1px solid ${action.type === 'manual' ? 'var(--destructive)' : 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: action.type === 'manual' ? 'var(--destructive)' : action.type === 'physical' ? 'var(--foreground)' : 'oklch(0.65 0.12 70)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {action.type === 'manual' ? <Shield style={{ width: 18, height: 18, color: 'white' }} /> : action.type === 'physical' ? <Package style={{ width: 18, height: 18, color: 'white' }} /> : <Edit3 style={{ width: 18, height: 18, color: 'white' }} />}
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>{action.title}</p>
                                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{action.desc}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {action.type === 'approve' && (
                                <button
                                    onClick={() => {
                                        // Find correct index in shipment.pendingActions
                                        const actionIndex = (shipment.pendingActions || []).findIndex(
                                            a => a.action === action.action && a.type === action.type
                                        );
                                        if (actionIndex !== -1) onApprove(shipment.id, actionIndex);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Check style={{ width: 14, height: 14 }} /> Approve
                                </button>
                            )}
                            {action.type === 'physical' && (
                                <button
                                    onClick={() => {
                                        // Find correct index in shipment.pendingActions and use onApprove
                                        const actionIndex = (shipment.pendingActions || []).findIndex(
                                            a => a.action === action.action && a.type === action.type
                                        );
                                        if (actionIndex !== -1) onApprove(shipment.id, actionIndex);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Check style={{ width: 14, height: 14 }} /> Mark as Done
                                </button>
                            )}
                            {action.type === 'manual' && action.title.includes('ISF') && (
                                <>
                                    <button
                                        onClick={() => {
                                            const updated = shipments.map(s => {
                                                if (s.id === shipment.id) {
                                                    const newShipment = {
                                                        ...s,
                                                        isfFiled: true,
                                                        step: 2, // Auto-advance to next step (Ocean Tracking)
                                                        pendingActions: s.pendingActions.filter(a => a.action !== action.action)
                                                    };
                                                    setSelectedShipment(newShipment);
                                                    return newShipment;
                                                }
                                                return s;
                                            });
                                            setShipments(updated);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'black', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        <Check style={{ width: 14, height: 14 }} /> Mark as Filed
                                    </button>
                                </>
                            )}
                            {action.isMissingData && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        // Ideally scroll to stakeholders section
                                        document.getElementById('stakeholders-section')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--chart-4)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Edit3 style={{ width: 14, height: 14 }} /> Add Info
                                </button>
                            )}

                            {action.isStakeholderPrompt && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        // Scroll to stakeholders section
                                        setTimeout(() => {
                                            document.getElementById('stakeholders-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: '#000000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Edit3 style={{ width: 14, height: 14, color: '#000000' }} /> Fill Stakeholder Info
                                </button>
                            )}

                            {action.type === 'manual' && ['truck_scheduling', 'customs_coordination', 'warehouse_coordination'].includes(action.action) && !action.isMissingData && (
                                <>
                                    <button
                                        onClick={() => {
                                            // Negotiation: Log activity and update to "Waiting"
                                            // In a real app, this would open email client or modal
                                            alert(`Email logged for ${action.role}. Status updated to Waiting.`);

                                            const updated = shipments.map(s => {
                                                if (s.id === shipment.id) {
                                                    const currentWaiting = s.waitingTasks || [];
                                                    if (!currentWaiting.some(w => w.key === action.action)) {
                                                        const newShipment = {
                                                            ...s,
                                                            waitingTasks: [...currentWaiting, { key: action.action, sentAt: new Date().toISOString() }]
                                                        };
                                                        setSelectedShipment(newShipment);
                                                        return newShipment;
                                                    }
                                                }
                                                return s;
                                            });
                                            setShipments(updated);

                                            if (onAddActivity) {
                                                onAddActivity({
                                                    type: 'email-sent',
                                                    shipment: shipment.reference,
                                                    message: `Manual email sent to ${action.role}`,
                                                    timestamp: new Date().toISOString()
                                                });
                                            }
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        <ExternalLink style={{ width: 14, height: 14 }} /> Contact / Log Email
                                    </button>
                                    <button
                                        onClick={() => {
                                            const updated = shipments.map(s => {
                                                if (s.id === shipment.id) {
                                                    // Mark this specific parallel action as resolved
                                                    const completedTasks = s.completedTasks || [];
                                                    const newCompleted = [...completedTasks, action.action];

                                                    // Check if ALL parallel tasks are done
                                                    const requiredParams = ['truck_scheduling', 'customs_coordination', 'warehouse_coordination'];
                                                    const allDone = requiredParams.every(k => newCompleted.includes(k));

                                                    // Remove from Waiting list since it's resolved
                                                    const newWaiting = (s.waitingTasks || []).filter(w => w.key !== action.action);

                                                    // AUTO-TRIGGER: If truck_scheduling is being completed, trigger warehouse_coordination
                                                    let warehouseEmailDraft = null;
                                                    let updatedWaiting = newWaiting;
                                                    let updatedEmails = s.emails || [];

                                                    if (action.action === 'truck_scheduling') {
                                                        // Find Warehouse stakeholder
                                                        const warehouseEntry = (s.stakeholders || []).find(st => st.role === 'Warehouse');
                                                        const warehouseEmail = warehouseEntry?.email;

                                                        // Get confirmed delivery time (from trucker's reply or stored value)
                                                        const deliveryTime = s.confirmedDeliveryTime || 'TBD (Please confirm)';

                                                        if (warehouseEmail && !completedTasks.includes('warehouse_coordination')) {
                                                            warehouseEmailDraft = {
                                                                id: `e-${Date.now()}-warehouse`,
                                                                category: 5, // Step 5: Warehouse Coordination
                                                                direction: 'outbound',
                                                                from: 'Agent',
                                                                to: warehouseEmail,
                                                                subject: `Delivery Notification - ${s.reference || s.hbl || 'Shipment'}`,
                                                                body: `Dear Warehouse Team,

Please be advised of the following delivery:

Reference: ${s.reference || 'N/A'}
HBL: ${s.hbl || 'N/A'}
Container: ${s.container_number || 'TBD'}

**Scheduled Delivery Date: ${deliveryTime}**

Please confirm receipt availability.

Best regards,
Pioneer Global Logistics`,
                                                                timestamp: new Date().toISOString(),
                                                                read: true,
                                                                autoLevel: 'auto'
                                                            };

                                                            updatedEmails = [...updatedEmails, warehouseEmailDraft];
                                                            updatedWaiting = [...updatedWaiting.filter(w => w.key !== 'warehouse_coordination'),
                                                            { key: 'warehouse_coordination', sentAt: new Date().toISOString() }];
                                                        }
                                                    }

                                                    const newShipment = {
                                                        ...s,
                                                        completedTasks: newCompleted,
                                                        waitingTasks: updatedWaiting,
                                                        emails: updatedEmails,
                                                        // Only advance to Step 8 (Billing) if ALL parallel tasks are complete
                                                        step: allDone ? 8 : s.step
                                                    };
                                                    setSelectedShipment(newShipment);

                                                    // Log activity for warehouse trigger
                                                    if (warehouseEmailDraft && onAddActivity) {
                                                        onAddActivity({
                                                            type: 'email-sent',
                                                            shipment: s.reference,
                                                            message: `Warehouse Pre-Alert Sent`,
                                                            detail: `Delivery notification auto-triggered by trucker completion`,
                                                            email: warehouseEmailDraft
                                                        });
                                                    }

                                                    return newShipment;
                                                }
                                                return s;
                                            });
                                            setShipments(updated);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        <Check style={{ width: 14, height: 14 }} /> Mark as Resolved
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Expandable Related Email Section - Only for actions with sourceEmail or fallback */}
                    {(() => {
                        const actionSourceEmail = getActionSourceEmail(action);
                        return actionSourceEmail && (
                            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                <div
                                    onClick={() => toggleExpanded(idx)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 0' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {expandedActions[idx] ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />}
                                        <Mail style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>Related Email</span>
                                        {actionSourceEmail.attachments?.length > 0 && (
                                            <span style={{ fontSize: 11, color: 'var(--sidebar-foreground)', background: 'var(--muted)', padding: '2px 6px', borderRadius: 4 }}>
                                                {actionSourceEmail.attachments.length} attachment{actionSourceEmail.attachments.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--sidebar-foreground)' }}>
                                        {actionSourceEmail.timestamp ? new Date(actionSourceEmail.timestamp).toLocaleDateString() : ''}
                                    </span>
                                </div>

                                {expandedActions[idx] && (
                                    <div style={{ marginTop: 8, padding: 12, background: 'var(--muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        {/* Email Header */}
                                        <div style={{ marginBottom: 10, fontSize: 13 }}>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                                <span style={{ color: 'var(--muted-foreground)', minWidth: 60 }}>From:</span>
                                                <span style={{ fontWeight: 500 }}>{actionSourceEmail.from}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                                <span style={{ color: 'var(--muted-foreground)', minWidth: 60 }}>Subject:</span>
                                                <span style={{ fontWeight: 500 }}>{actionSourceEmail.subject}</span>
                                            </div>
                                        </div>

                                        {/* Email Body Preview */}
                                        {actionSourceEmail.body && (
                                            <div style={{ marginBottom: 12, padding: 10, background: 'var(--card)', borderRadius: 6, border: '1px solid var(--border)', maxHeight: 100, overflowY: 'auto' }}>
                                                <p style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--foreground)' }}>
                                                    {actionSourceEmail.body.length > 200 ? actionSourceEmail.body.substring(0, 200) + '...' : actionSourceEmail.body}
                                                </p>
                                            </div>
                                        )}

                                        {/* Attachments with Thumbnails */}
                                        {actionSourceEmail.attachments && actionSourceEmail.attachments.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <FileText style={{ width: 14, height: 14 }} /> Attachments:
                                                </p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                    {actionSourceEmail.attachments.map((att, i) => (
                                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            {isImageAttachment(att) && att.content ? (
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(att.content); }}
                                                                    style={{
                                                                        width: 80,
                                                                        height: 80,
                                                                        borderRadius: 6,
                                                                        border: '2px solid var(--primary)',
                                                                        overflow: 'hidden',
                                                                        cursor: 'pointer',
                                                                        background: 'var(--card)'
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={att.content.startsWith('data:') ? att.content : `data:${att.type};base64,${att.content}`}
                                                                        alt={att.name}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    width: 60,
                                                                    height: 60,
                                                                    borderRadius: 6,
                                                                    border: '1px solid var(--border)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: 'var(--card)'
                                                                }}>
                                                                    <FileText style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />
                                                                </div>
                                                            )}
                                                            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                                {att.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            ))}
        </div>
    );
}

function PlaybookTimeline({ shipment, playbook, onStepClick }) {
    // TASK_MAP for parallel steps (import-fcl/lcl only)
    // New 7-step workflow:
    // idx 0: ISF Filing
    // idx 1: Await Carrier AN
    // idx 2: Truck Scheduling (PARALLEL)
    // idx 3: Customs Coordination (PARALLEL)
    // idx 4: Warehouse Coordination
    // idx 5: Shipment Delivery
    // idx 6: Billing & Collection
    const isImportPlaybook = shipment.playbook === 'import-fcl' || shipment.playbook === 'import-lcl';
    const PARALLEL_STEPS = isImportPlaybook ? [2, 3] : []; // Step 3 & 4 are parallel (idx 2 & 3)
    const TASK_MAP = isImportPlaybook ? {
        2: 'truck_scheduling',      // Step 3: Truck Scheduling
        3: 'customs_coordination',  // Step 4: Customs Coordination
        4: 'warehouse_coordination' // Step 5: Warehouse Coordination
    } : {};

    return (
        <div>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: '0 0 18px 0' }}>Playbook Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(playbook?.steps || stepLabels.map(s => ({ name: s, default: 'auto' }))).map((step, idx) => {
                    const StepIcon = stepIcons[idx] || FileText;
                    const isShipmentCompleted = shipment.status === 'completed';

                    // Completion Logic
                    let isComplete = isShipmentCompleted;
                    if (!isShipmentCompleted) {
                        if (TASK_MAP[idx]) {
                            // Parallel/Tracked Step: Check named task in completedTasks
                            isComplete = (shipment.completedTasks || []).includes(TASK_MAP[idx]);
                        } else {
                            // Sequential Step: Complete when step pointer > idx+1
                            isComplete = idx + 1 < shipment.step;
                        }
                    }

                    // Current/In-Progress Logic
                    let isCurrent = false;
                    if (!isShipmentCompleted && !isComplete) {
                        if (PARALLEL_STEPS.includes(idx)) {
                            // Parallel Steps (3 & 4): Both are "current" when shipment.step === 3
                            isCurrent = shipment.step === 3;
                        } else {
                            // Sequential: Current when step pointer matches
                            isCurrent = idx + 1 === shipment.step;
                        }
                    }

                    const stepName = typeof step === 'string' ? step : step.name;
                    const stepLevel = typeof step === 'string' ? 'auto' : step.default;
                    const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;

                    // Determine if clickable
                    const isInteractive = [2, 3, 4].includes(idx);

                    return (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14
                            }}
                        >
                            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? 'var(--primary)' : isCurrent ? 'oklch(0.95 0.04 160)' : 'var(--muted)' }}>
                                {isComplete ? <CheckCircle style={{ width: 20, height: 20, color: 'var(--primary-foreground)' }} /> : isCurrent ? <Loader style={{ width: 20, height: 20, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} /> : <StepIcon style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <p style={{ fontWeight: 600, margin: 0, color: isComplete || isCurrent ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{idx + 1}. {stepName}</p>
                                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                                </div>
                                {isCurrent && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>In progress...</p>}
                                {isComplete && <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>✓ Completed by Agent</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

