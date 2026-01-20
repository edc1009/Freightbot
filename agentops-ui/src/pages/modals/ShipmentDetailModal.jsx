import React from 'react';
import {
    X, Zap, FileText, Bell, Check, ExternalLink, CheckCircle, Loader,
    Shield, Edit3, Package
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

import { generateArrivalNoticePDF } from '../../services/pdfGenerator';

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
            console.log('📧 Adding Activity Log for Send AN:', shipment.reference);
            const finalBody = emailDraft.body + (includePD ? `\n\n${pdTemplate}` : '');
            onAddActivity({
                type: 'email-sent',
                shipment: shipment.reference,
                message: `Arrival Notice sent to ${emailDraft.to}`,
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
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '6px 0 0 0', fontStyle: 'italic' }}>💡 {shipment.suggestReason}</p>
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
                    {(shipment.pendingActions?.length > 0 || (shipment.step === 1 && !shipment.isfFiled)) && (
                        <PendingActionsSection
                            shipment={shipment}
                            shipments={shipments}
                            setShipments={setShipments}
                            setSelectedShipment={setSelectedShipment}
                            toggleISFFiled={toggleISFFiled}
                            onApprove={onApprove}
                        />
                    )}

                    {/* No Pending Actions */}
                    {(!shipment.pendingActions || shipment.pendingActions.length === 0) && !(shipment.step === 1 && !shipment.isfFiled) && (
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
                                                    <span style={{ fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
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

                        {shipment.step === 5 ? (
                            <button
                                onClick={() => {
                                    if (window.confirm('Confirm Freight Release?\n\nThis will mark the shipment as COMPLETED and remove it from the active list.')) {
                                        setShipments(prev => prev.map(s => {
                                            if (s.id === shipment.id) {
                                                return { ...s, status: 'completed' };
                                            }
                                            return s;
                                        }));
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
                                <h3 style={{ margin: 0 }}>Review Arrival Notice</h3>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => setShowPdfPreview(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                                    <button
                                        onClick={handleSendAN}
                                        style={{ padding: '8px 24px', borderRadius: 8, background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <Zap size={16} /> Approve & Send Email
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                                {/* PDF Viewer */}
                                <div style={{ flex: 1, background: '#525659', padding: 20, display: 'flex', justifyContent: 'center' }}>
                                    <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, background: 'white' }} title="PDF Preview" />
                                </div>

                                {/* Email Draft Side Panel */}
                                <div style={{ width: 350, borderLeft: '1px solid var(--border)', padding: 20, background: 'var(--background)', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ marginTop: 0 }}>Email Preview</h4>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>To:</label>
                                        <input
                                            value={emailDraft.to}
                                            onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })}
                                            style={inputStyle}
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
                                            style={{ ...inputStyle, flex: 1, resize: 'none', marginBottom: 12 }}
                                            value={emailDraft.body}
                                            onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                                        />
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

function PendingActionsSection({ shipment, shipments, setShipments, setSelectedShipment, toggleISFFiled, onApprove }) {
    // Dynamic ISF Action Injection Logic
    const displayActions = [...(shipment.pendingActions || [])];
    if (shipment.step === 1 && !shipment.isfFiled && !displayActions.some(a => a.title?.includes('ISF'))) {
        displayActions.unshift({
            type: 'manual',
            title: 'Action Required: ISF Filing',
            desc: 'Importer Security Filing must be filed 24h prior to loading.',
            action: 'isf_filing'
        });
    }

    // Dynamic Parallel Coordination Logic (Steps 4-7)
    if (shipment.step >= 4 && shipment.status !== 'completed') {
        const coordinationTasks = [
            {
                stepIdx: 4,
                key: 'trucker_coordination',
                title: 'Trucker Coordination',
                desc: 'Arrange pickup and delivery with trucker.',
                role: 'Trucker'
            },
            {
                stepIdx: 5,
                key: 'customs_coordination',
                title: 'Customs Broker',
                desc: 'Submit documents for customs clearance.',
                role: 'Customs Broker'
            },
            {
                stepIdx: 7,
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} /> Action Required
            </h3>
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
                                    onClick={() => onApprove(shipment.id, idx)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Check style={{ width: 14, height: 14 }} /> Approve
                                </button>
                            )}
                            {action.type === 'physical' && (
                                <button
                                    onClick={() => {
                                        const updated = shipments.map(s => {
                                            if (s.id === shipment.id) {
                                                const newShipment = {
                                                    ...s,
                                                    status: 'completed',
                                                    pendingActions: s.pendingActions.filter(a => a.action !== action.action)
                                                };
                                                setSelectedShipment(newShipment);
                                                return newShipment;
                                            }
                                            return s;
                                        });
                                        setShipments(updated);
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

                            {action.type === 'manual' && ['trucker_coordination', 'customs_coordination', 'warehouse_coordination'].includes(action.action) && !action.isMissingData && (
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
                                                    const requiredParams = ['trucker_coordination', 'customs_coordination', 'warehouse_coordination'];
                                                    const allDone = requiredParams.every(k => newCompleted.includes(k));

                                                    // Remove from Waiting list since it's resolved
                                                    const newWaiting = (s.waitingTasks || []).filter(w => w.key !== action.action);

                                                    const newShipment = {
                                                        ...s,
                                                        completedTasks: newCompleted,
                                                        waitingTasks: newWaiting,
                                                        // Only advance to Step 8 (Billing) if ALL parallel tasks are complete
                                                        step: allDone ? 8 : s.step
                                                    };
                                                    setSelectedShipment(newShipment);
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
                </div>
            ))}
        </div>
    );
}

function PlaybookTimeline({ shipment, playbook, onStepClick }) {
    const TASK_MAP = {
        3: 'trucker_coordination', // Step 4
        4: 'customs_coordination', // Step 5
        6: 'warehouse_coordination' // Step 7
    };

    return (
        <div>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: '0 0 18px 0' }}>Playbook Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(playbook?.steps || stepLabels.map(s => ({ name: s, default: 'auto' }))).map((step, idx) => {
                    const StepIcon = stepIcons[idx] || FileText;
                    const isShipmentCompleted = shipment.status === 'completed';

                    // Modified Completion Logic for Parallel Steps
                    let isComplete = isShipmentCompleted;
                    if (!isShipmentCompleted) {
                        if (TASK_MAP[idx]) {
                            // Parallel Step: Check named task
                            isComplete = (shipment.completedTasks || []).includes(TASK_MAP[idx]);
                        } else {
                            // Sequential Step: Check numeric step pointer
                            isComplete = idx + 1 < shipment.step || (idx === 0 && shipment.status !== 'new');
                        }
                    }

                    const isCurrent = !isShipmentCompleted && !isComplete && (
                        (TASK_MAP[idx]) ? shipment.step >= 4 && shipment.step < 8 : idx + 1 === shipment.step
                    );

                    const stepName = typeof step === 'string' ? step : step.name;
                    const stepLevel = typeof step === 'string' ? 'auto' : step.default;
                    const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;

                    // Determine if clickable (Parallel steps 3,4,5,7 usually need data)
                    const isInteractive = [2, 3, 4, 6].includes(idx); // 0-indexed: 2=Step3(AN), 3=Step4(Truck), 4=Step5(Customs), 6=Step7(Warehouse)

                    return (
                        <div
                            key={idx}
                            onClick={() => isInteractive && onStepClick && onStepClick(idx + 1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                cursor: isInteractive ? 'pointer' : 'default',
                                opacity: isInteractive ? 1 : 0.9
                            }}
                            title={isInteractive ? "Click to manage data" : ""}
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
