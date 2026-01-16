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

export default function ShipmentDetailModal({
    shipment,
    onClose,
    onViewActivityLog,
    shipments,
    setShipments,
    setSelectedShipment,
    toggleISFFiled,
    onApprove
}) {
    const playbook = PLAYBOOKS[shipment.playbook];
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState({});

    // PDF Preview State
    const [showPdfPreview, setShowPdfPreview] = React.useState(false);
    const [pdfUrl, setPdfUrl] = React.useState(null);

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
                // Financials - charges are managed separately in the charges editor below
                financials: shipment.financials || { charges: [] },
            });
        }
    }, [isEditing, shipment]);

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
        setShowPdfPreview(true);
    };

    const handleSendAN = () => {
        // Simulate sending
        const updated = shipments.map(s => {
            if (s.id === shipment.id) {
                return {
                    ...s,
                    // Advance step logic could go here
                    // playbook: ...
                };
            }
            return s;
        });
        setShipments(updated);
        // setSelectedShipment(...)

        setShowPdfPreview(false);
        // Log activity (In a real app, we'd call an API)
        alert('Arrival Notice Sent to Customer & Activity Logged!');
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
                    {shipment.pendingActions?.length > 0 && (
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
                    {(!shipment.pendingActions || shipment.pendingActions.length === 0) && (
                        <div style={{ padding: 20, background: 'oklch(0.96 0.03 160)', borderRadius: 12, border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <CheckCircle style={{ width: 24, height: 24, color: 'var(--primary)' }} />
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>All caught up!</p>
                                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Agent is handling this shipment automatically</p>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {[
                            { label: 'Origin', key: 'origin', value: shipment.origin },
                            { label: 'Destination', key: 'destination', value: shipment.destination },
                            { label: 'Vessel', key: 'vessel', value: shipment.vessel },
                            { label: 'B/L', key: 'bl', value: shipment.bl },
                            { label: 'ETA', key: 'eta', value: shipment.eta },
                            { label: 'HBL', key: 'hbl', value: shipment.hbl || '-' },
                            { label: 'CY Location', key: 'firmsCode', value: shipment.firmsCode || '-' },
                            { label: 'Reference', key: 'ref', value: shipment.reference || '-' },
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

                    {/* Playbook Timeline */}
                    <PlaybookTimeline shipment={shipment} playbook={playbook} />

                    <div style={{ display: 'flex', gap: 14 }}>
                        <button onClick={onViewActivityLog} style={{ flex: 1, padding: 16, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>View Activity Log</button>

                        {/* New Generate AN Button */}
                        <button
                            onClick={handleGenerateAN}
                            style={{ flex: 1, padding: 16, background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <FileText size={18} /> Generate Arrival Notice
                        </button>

                        <button style={{ padding: '16px 28px', background: 'transparent', color: 'var(--sidebar-foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Override</button>
                    </div>
                </div>
            </div>

            {/* PDF Preview Modal */}
            {showPdfPreview && (
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
                            <div style={{ width: 350, borderLeft: '1px solid var(--border)', padding: 20, background: 'var(--background)' }}>
                                <h4 style={{ marginTop: 0 }}>Email Preview</h4>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>To:</label>
                                    <input value={shipment.consigneeEmail || "consignee@example.com"} readOnly style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Subject:</label>
                                    <input value={`Arrival Notice - ${shipment.hbl || shipment.bl}`} readOnly style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Body:</label>
                                    <textarea
                                        readOnly
                                        style={{ ...inputStyle, height: 200, resize: 'none' }}
                                        value={`Dear Customer,\n\nPlease find attached the Arrival Notice for shipment ${shipment.hbl || shipment.bl}.\n\nVessel: ${shipment.vessel}\nETA: ${shipment.eta}\n\nPlease arrange payment and customs clearance.\n\nBest regards,\nPioneer Global Logistics`}
                                    />
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
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} /> Action Required
            </h3>
            {shipment.pendingActions.map((action, idx) => (
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
                                <button onClick={() => toggleISFFiled(shipment.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--foreground)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    <ExternalLink style={{ width: 14, height: 14 }} /> Go to CBP
                                </button>
                            )}
                            {action.type === 'manual' && !action.title.includes('ISF') && (
                                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--destructive)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    <ExternalLink style={{ width: 14, height: 14 }} /> Handle in Gmail
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PlaybookTimeline({ shipment, playbook }) {
    return (
        <div>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: '0 0 18px 0' }}>Playbook Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(playbook?.steps || stepLabels.map(s => ({ name: s, default: 'auto' }))).map((step, idx) => {
                    const StepIcon = stepIcons[idx] || FileText;
                    const isShipmentCompleted = shipment.status === 'completed';
                    const isComplete = isShipmentCompleted || idx + 1 < shipment.step || (idx === 0 && shipment.status !== 'new');
                    const isCurrent = !isShipmentCompleted && idx + 1 === shipment.step;
                    const stepName = typeof step === 'string' ? step : step.name;
                    const stepLevel = typeof step === 'string' ? 'auto' : step.default;
                    const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
                    return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? 'var(--primary)' : isCurrent ? 'var(--primary)' : 'var(--muted)' }}>
                                {isComplete ? <CheckCircle style={{ width: 20, height: 20, color: 'var(--primary-foreground)' }} /> : isCurrent ? <Loader style={{ width: 20, height: 20, color: 'white', animation: 'spin 1s linear infinite' }} /> : <StepIcon style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />}
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
