import React from 'react';
import { Edit3, Package, Shield, Zap, Check, ChevronRight, Send, RefreshCw, Ship, FileText, Mail, X, Plus } from 'lucide-react';
import { autoHandledItems } from '../data';

export default function ActionCenter({
    shipments,
    setShipments,
    setSelectedShipment,
    editingAction,
    setEditingAction,
    autoHandledCount = 0
}) {
    const pendingApprovals = shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'approve').length || 0), 0);
    const physicalActions = shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'physical').length || 0), 0);
    const manualActions = shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'manual').length || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <SummaryCard icon={Edit3} label="Pending Approvals" value={pendingApprovals} color="var(--chart-4)" />
                <SummaryCard icon={Package} label="Physical Actions" value={physicalActions} color="var(--foreground)" />
                <SummaryCard icon={Shield} label="Needs Attention" value={manualActions} color="var(--destructive)" />
                <SummaryCard icon={Zap} label="Auto-handled Today" value={autoHandledCount} color="var(--primary)" />
            </div>

            {/* Pending Approvals Section */}
            {shipments.some(s => s.pendingActions?.some(a => a.type === 'approve')) && (
                <ActionSection
                    title="Pending Approvals"
                    icon={Edit3}
                    count={pendingApprovals}
                    badgeColor="var(--chart-4)"
                >
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'approve').map(action => ({ ...action, shipment: s, uniqueId: `${s.id}-${action.step}-${action.action}` }))).map((item) => (
                        <ApprovalCard
                            key={item.uniqueId}
                            item={item}
                            isEditing={editingAction === item.uniqueId}
                            onEdit={() => setEditingAction(editingAction === item.uniqueId ? null : item.uniqueId)}
                            onCloseEdit={() => setEditingAction(null)}
                            onApprove={() => {
                                const updated = shipments.map(s => {
                                    if (s.id === item.shipment.id) {
                                        return {
                                            ...s,
                                            pendingActions: s.pendingActions.filter(a => a.action !== item.action),
                                            step: Math.min(s.step + 1, 5),
                                            status: 'in-progress'
                                        };
                                    }
                                    return s;
                                });
                                setShipments(updated);
                                setEditingAction(null);
                            }}
                        />
                    ))}
                </ActionSection>
            )}

            {/* Physical Actions Section */}
            {shipments.some(s => s.pendingActions?.some(a => a.type === 'physical')) && (
                <ActionSection
                    title="Physical Actions"
                    icon={Package}
                    count={physicalActions}
                    badgeColor="var(--foreground)"
                >
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'physical').map(action => ({ ...action, shipment: s }))).map((item, idx) => (
                        <PhysicalCard
                            key={idx}
                            item={item}
                            onComplete={() => {
                                const updated = shipments.map(s => {
                                    if (s.id === item.shipment.id) {
                                        return {
                                            ...s,
                                            status: 'completed',
                                            pendingActions: s.pendingActions.filter(a => a.action !== item.action)
                                        };
                                    }
                                    return s;
                                });
                                setShipments(updated);
                            }}
                            onViewDetails={() => setSelectedShipment(item.shipment)}
                        />
                    ))}
                </ActionSection>
            )}

            {/* Needs Attention Section */}
            {shipments.some(s => s.pendingActions?.some(a => a.type === 'manual')) && (
                <ActionSection
                    title="Needs Attention"
                    icon={Shield}
                    count={manualActions}
                    badgeColor="var(--destructive)"
                >
                    {shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'manual').map(action => ({ ...action, shipment: s }))).map((item, idx) => (
                        <ManualCard key={idx} item={item} onViewDetails={() => setSelectedShipment(item.shipment)} />
                    ))}
                </ActionSection>
            )}

            {/* Auto-handled Today Section */}
            <AutoHandledSection />
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }) {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Icon style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>{label}</span>
            </div>
            <p style={{ fontSize: 36, fontWeight: 600, color, margin: 0 }}>{value}</p>
        </div>
    );
}

function ActionSection({ title, icon: Icon, count, badgeColor, children }) {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{title}</h2>
                <span style={{ padding: '4px 12px', background: badgeColor, color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {children}
            </div>
        </div>
    );
}

function ApprovalCard({ item, isEditing, onEdit, onCloseEdit, onApprove }) {
    return (
        <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                        <span style={{ padding: '2px 8px', background: 'var(--chart-4)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {item.action === 'send_email' ? '📧 Send Email' : item.action === 'confirm_time' ? '🕐 Confirm Time' : item.action === 'approve_payment' ? '💰 Payment' : 'Approve'}
                        </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        {item.recipients?.length > 0 && (
                            <span style={{ color: 'var(--muted-foreground)' }}>📬 {item.recipients.join(', ')}</span>
                        )}
                        <span style={{ color: 'var(--muted-foreground)' }}>⚡ {item.riskReason}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        <Check style={{ width: 16, height: 16 }} /> Approve
                    </button>
                    <button onClick={onEdit} style={{ padding: '10px 14px', background: isEditing ? 'var(--chart-4)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <Edit3 style={{ width: 16, height: 16, color: isEditing ? 'white' : 'var(--muted-foreground)' }} />
                    </button>
                </div>
            </div>

            {/* Edit/Preview Panel */}
            {isEditing && (
                <EditPanel item={item} onClose={onCloseEdit} />
            )}
        </div>
    );
}

function EditPanel({ item, onClose }) {
    return (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Mail style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Draft Email Preview</span>
            </div>
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>To:</p>
                <input type="text" defaultValue={item.recipients?.join(', ') || ''} placeholder="recipient@example.com, another@example.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>CC:</p>
                <input type="text" defaultValue="" placeholder="cc@example.com (optional)" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>Subject:</p>
                <input type="text" defaultValue={item.action === 'send_email' ? `ISF Documents Required - ${item.shipment.reference}` : `RE: ${item.title} - ${item.shipment.reference}`} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>Body:</p>
                <textarea defaultValue={item.action === 'send_email' ? `Dear ${item.shipment.customer},\n\nWe need to file the ISF for your shipment ${item.shipment.reference}. Please provide:\n\n1. Commercial Invoice\n2. Packing List\n3. Bill of Lading\n\nBest regards,\nAgentOps` : item.action === 'confirm_time' ? `Hi,\n\nConfirmed. Please proceed with the pickup on ${item.desc.replace('Trucker proposed ', '')}.\n\nReference: ${item.shipment.reference}\n\nThank you.` : `Regarding ${item.title}...`} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--muted)', borderRadius: 6, border: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText style={{ width: 14, height: 14 }} /> Attachments:
                    </p>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                        <Plus style={{ width: 12, height: 12 }} /> Add File
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.action === 'send_email' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                            📄 ISF_Template.pdf <X style={{ width: 12, height: 12, color: 'var(--muted-foreground)', cursor: 'pointer' }} />
                        </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', padding: '4px 0' }}>
                        {item.action !== 'send_email' && 'No attachments'}
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Send style={{ width: 14, height: 14 }} /> Save & Send
                </button>
            </div>
        </div>
    );
}

function PhysicalCard({ item, onComplete, onViewDetails }) {
    return (
        <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                        <span style={{ padding: '2px 8px', background: 'var(--foreground)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {item.action === 'freight_release' ? '📦 Freight Release' : '🔧 Physical'}
                        </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>📋 {item.riskReason}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={onComplete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        <Check style={{ width: 16, height: 16 }} /> Mark as Done
                    </button>
                    <button onClick={onViewDetails} style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ManualCard({ item, onViewDetails }) {
    return (
        <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                        <span style={{ padding: '2px 8px', background: 'var(--destructive)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {item.action === 'isf_filing' ? '📋 ISF Filing' : item.action === 'approve_payment' ? '💰 High Amount' : item.action === 'escalation' ? '🚨 Escalation' : '⚠️ Manual'}
                        </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>{item.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>⚠️ {item.riskReason}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {item.action === 'isf_filing' ? (
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--foreground)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            <ChevronRight style={{ width: 16, height: 16 }} /> Go to CBP
                        </button>
                    ) : (
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--destructive)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            <ChevronRight style={{ width: 16, height: 16 }} /> Handle in Gmail
                        </button>
                    )}
                    <button onClick={onViewDetails} style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function AutoHandledSection() {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Auto-handled Today</h2>
                <span style={{ padding: '4px 12px', background: 'var(--primary)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>0</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {autoHandledItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--muted)', borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', fontWeight: 500, minWidth: 45 }}>{item.time}</span>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.94 0.04 160)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {item.type === 'email' ? <Send style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                item.type === 'tracking' ? <Ship style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                    item.type === 'status' ? <RefreshCw style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                        <FileText style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} />}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', minWidth: 100 }}>{item.shipment}</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)', flex: 1 }}>{item.action}</span>
                        <span style={{ padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                            <Zap style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />AUTO
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
