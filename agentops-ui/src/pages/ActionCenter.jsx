import React from 'react';
import { Edit3, Package, Shield, Zap, Check, ChevronRight, Send, RefreshCw, Ship, FileText, Mail, X, Plus } from 'lucide-react';
import { autoHandledItems } from '../data';

export default function ActionCenter({
    shipments,
    setShipments,
    setSelectedShipment,
    editingAction,
    setEditingAction,
    onApprove,
    activities = [],
    toggleISFFiled // Passed from App
}) {
    // 1. Synthesize ISF Actions (Fix for missing action)
    const needsISF = shipments.filter(s => s.step === 1 && !s.isfFiled);
    const synthesizedISFActions = needsISF.map(s => ({
        type: 'manual',
        action: 'isf_filing',
        title: 'Action Required: ISF Filing',
        desc: 'Importer Security Filing must be filed 24h prior to loading.',
        riskReason: 'Penalty Risk',
        shipment: s,
        uniqueId: `${s.id}-isf-synthesized`
    }));

    // 2. Aggregate Actions
    const pendingApprovals = shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'approve').length || 0), 0);
    const physicalActions = shipments.reduce((acc, s) => acc + (s.pendingActions?.filter(a => a.type === 'physical').length || 0), 0);

    // Merge existing manual actions with synthesized ISF actions
    const existingManual = shipments.flatMap(s => (s.pendingActions || []).filter(a => a.type === 'manual').map(a => ({ ...a, shipment: s })));
    // Filter out duplicates if ISF is already in pendingActions (unlikely but safe)
    const allManualActions = [
        ...synthesizedISFActions.filter(syn => !existingManual.some(ex => ex.shipment.id === syn.shipment.id && ex.action === 'isf_filing')),
        ...existingManual
    ];
    const manualCount = allManualActions.length;

    // 3. Waiting Items Logic
    const waitingItems = shipments.flatMap(s => (s.waitingTasks || []).map(task => ({
        ...task,
        shipment: s,
        uniqueId: `${s.id}-waiting-${task.key}`
    })));
    const waitingCount = waitingItems.length;


    // Filter relevant auto-handled activities
    const autoHandledActivities = activities
        .filter(a => ['email-sent', 'document', 'status', 'email-received'].includes(a.type))
        .slice(0, 10);

    const autoHandledCount = activities.filter(a => ['email-sent', 'document', 'status', 'email-received'].includes(a.type)).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                <SummaryCard icon={Edit3} label="Pending Approvals" value={pendingApprovals} color="var(--chart-4)" />
                <SummaryCard icon={Package} label="Physical Actions" value={physicalActions} color="var(--foreground)" />
                <SummaryCard icon={Shield} label="Needs Attention" value={manualCount} color="var(--destructive)" />
                <SummaryCard icon={RefreshCw} label="Waiting" value={waitingCount} color="oklch(0.6 0.15 250)" />
                <SummaryCard icon={Zap} label="Auto-handled" value={autoHandledCount} color="var(--primary)" />
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

            {/* Waiting Section (New) */}
            {waitingCount > 0 && (
                <ActionSection
                    title="Waiting for Reply"
                    icon={RefreshCw}
                    count={waitingCount}
                    badgeColor="oklch(0.6 0.15 250)" // Bluish/Purple
                >
                    {waitingItems.map((item) => (
                        <WaitingCard key={item.uniqueId} item={item} onViewDetails={() => setSelectedShipment(item.shipment)} />
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

            {/* Needs Attention Section (Manual + Synthesized ISF) */}
            {manualCount > 0 && (
                <ActionSection
                    title="Needs Attention"
                    icon={Shield}
                    count={manualCount}
                    badgeColor="var(--destructive)"
                >
                    {allManualActions.map((item, idx) => (
                        <ManualCard
                            key={idx}
                            item={item}
                            onViewDetails={() => setSelectedShipment(item.shipment)}
                            toggleISFFiled={toggleISFFiled}
                        />
                    ))}
                </ActionSection>
            )}

            {/* Auto-handled Section */}
            <AutoHandledSection activities={autoHandledActivities} />
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
                    {/* Removed top Approve button as requested */}
                    <button onClick={onEdit} style={{ padding: '10px 14px', background: isEditing ? 'var(--chart-4)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <Edit3 style={{ width: 16, height: 16, color: isEditing ? 'white' : 'var(--muted-foreground)' }} />
                    </button>
                </div>
            </div>

            {/* Edit/Preview Panel */}
            {isEditing && (
                <EditPanel item={item} onClose={onCloseEdit} onApprove={onApprove} />
            )}
        </div>
    );
}

function EditPanel({ item, onClose, onApprove }) {
    const fileInputRef = React.useRef(null);
    const [attachments, setAttachments] = React.useState(item.attachments || []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setAttachments([...attachments, e.target.files[0].name]);
        }
    };

    return (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {/* ... inputs ... */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Mail style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Draft Email Preview</span>
            </div>
            {/* ... Inputs omitted for brevity, keeping structure ... */}
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>To:</p>
                <input type="text" defaultValue={item.recipients?.join(', ') || ''} placeholder="recipient@example.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
            </div>
            {/* ... other inputs ... */}
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
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                        <Plus style={{ width: 12, height: 12 }} /> Add File
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.action === 'send_email' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                            📄 ISF_Template.pdf <X style={{ width: 12, height: 12, color: 'var(--muted-foreground)', cursor: 'pointer' }} />
                        </span>
                    )}
                    {attachments.map((file, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                            📄 {file} <X style={{ width: 12, height: 12, color: 'var(--muted-foreground)', cursor: 'pointer' }} />
                        </span>
                    ))}
                    {attachments.length === 0 && item.action !== 'send_email' && (
                        <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', padding: '4px 0' }}>No attachments</span>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button
                    onClick={onApprove}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
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

function ManualCard({ item, onViewDetails, toggleISFFiled }) {
    return (
        <div style={{ padding: 16, background: 'oklch(0.96 0.04 32)', borderRadius: 12, border: '1px solid var(--destructive)' }}>
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
                        <button
                            onClick={() => {
                                if (toggleISFFiled) {
                                    toggleISFFiled(item.shipment.id);
                                } else {
                                    onViewDetails();
                                }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--primary)', color: 'black', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Check style={{ width: 16, height: 16 }} /> Mark as Filed
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

function AutoHandledSection({ activities }) {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Auto-handled History</h2>
                <span style={{ padding: '4px 12px', background: 'var(--primary)', color: 'white', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{activities.length}</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activities.length === 0 ? (
                    <p style={{ color: 'var(--muted-foreground)', padding: 10, textAlign: 'center', fontStyle: 'italic', fontSize: 13 }}>No recent auto-handled activities.</p>
                ) : (
                    activities.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--muted)', borderRadius: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--sidebar-foreground)', fontWeight: 500, minWidth: 90 }}>{item.timestamp?.split(' ')[0]}</span>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.94 0.04 160)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {item.type === 'email-sent' ? <Send style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                    item.type === 'document' ? <FileText style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                        item.type === 'status' ? <RefreshCw style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} /> :
                                            <Ship style={{ width: 14, height: 14, color: 'oklch(0.5 0.1 160)' }} />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', minWidth: 100 }}>{item.shipment}</span>
                            <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.message}</span>
                            <span style={{ padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                <Zap style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />AUTO
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function WaitingCard({ item, onViewDetails }) {
    return (
        <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.shipment.reference}</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>•</span>
                        <span style={{ fontSize: 13, color: 'var(--sidebar-foreground)' }}>{item.shipment.customer}</span>
                        <span style={{ padding: '2px 8px', background: 'oklch(0.6 0.15 250)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {item.key === 'trucker_coordination' ? '🚛 Trucker' : item.key === 'customs_coordination' ? '🛃 Customs' : item.key === 'warehouse_coordination' ? '🏭 Warehouse' : 'Waiting'}
                        </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px 0' }}>Waiting for Reply</p>
                    <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 8px 0' }}>
                        Email sent to {item.key === 'trucker_coordination' ? 'Trucker' : item.key === 'customs_coordination' ? 'Customs Broker' : 'Warehouse'}. Waiting for confirmation.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>⏳ Sent on {item.sentAt ? item.sentAt.split(' ')[0] : 'today'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={onViewDetails} style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
}
