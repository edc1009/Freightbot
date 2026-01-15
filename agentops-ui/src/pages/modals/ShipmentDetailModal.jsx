import React from 'react';
import {
    X, Zap, FileText, Bell, Check, ExternalLink, CheckCircle, Loader,
    Shield, Edit3, Package
} from 'lucide-react';
import { PLAYBOOKS, AUTOMATION_LEVELS, stepLabels, stepIcons } from '../../constants';
import { getStatusStyle } from '../../utils';

export default function ShipmentDetailModal({
    shipment,
    onClose,
    onViewActivityLog,
    shipments,
    setShipments,
    setSelectedShipment,
    toggleISFFiled
}) {
    const playbook = PLAYBOOKS[shipment.playbook];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ padding: 26, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--card)', borderRadius: '18px 18px 0 0' }}>
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
                    <button onClick={onClose} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                        <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    </button>
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
                        {[{ label: 'Origin', value: shipment.origin }, { label: 'Destination', value: shipment.destination }, { label: 'Vessel', value: shipment.vessel }, { label: 'B/L', value: shipment.bl }, { label: 'ETA', value: shipment.eta }, { label: 'Step', value: playbook?.steps[shipment.step - 1]?.name || stepLabels[shipment.step - 1] }].map(item => (
                            <div key={item.label} style={{ padding: 18, background: 'var(--muted)', borderRadius: 12 }}>
                                <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0, fontWeight: 500 }}>{item.label}</p>
                                <p style={{ fontWeight: 600, margin: '6px 0 0 0', fontSize: 15 }}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Playbook Timeline */}
                    <PlaybookTimeline shipment={shipment} playbook={playbook} />

                    <div style={{ display: 'flex', gap: 14 }}>
                        <button onClick={onViewActivityLog} style={{ flex: 1, padding: 16, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>View Activity Log</button>
                        <button style={{ padding: '16px 28px', background: 'transparent', color: 'var(--sidebar-foreground)', border: '1px solid var(--border)', borderRadius: 12, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Override</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PendingActionsSection({ shipment, shipments, setShipments, setSelectedShipment, toggleISFFiled }) {
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
                                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
                    const isComplete = isShipmentCompleted || idx + 1 < shipment.step;
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
