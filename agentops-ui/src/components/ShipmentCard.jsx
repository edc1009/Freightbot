import React from 'react';
import { ChevronRight, AlertTriangle, Edit3, Shield, Trash2 } from 'lucide-react';
import { PLAYBOOKS, stepLabels } from '../constants';
import { getStatusStyle } from '../utils';

export default function ShipmentCard({ shipment, onClick, onDelete }) {
    const playbook = PLAYBOOKS[shipment.playbook];
    const hasPending = shipment.pendingActions?.length > 0;
    const pendingApprove = shipment.pendingActions?.filter(a => a.type === 'approve').length || 0;
    const pendingManual = shipment.pendingActions?.filter(a => a.type === 'manual').length || 0;

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(shipment.id);
    };

    return (
        <div
            onClick={onClick}
            style={{
                background: 'var(--card)',
                borderRadius: 14,
                padding: 22,
                border: hasPending ? '2px solid var(--chart-4)' : '1px solid var(--border)',
                cursor: 'pointer',
                position: 'relative'
            }}
        >
            {/* 第一行：reference + 狀態徽章 + 刪除按鈕 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                {/* 左側：reference 和 badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{shipment.reference}</span>
                    {shipment.alerts > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.92 0.06 32)', color: 'var(--destructive)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                            <AlertTriangle style={{ width: 12, height: 12 }} />{shipment.alerts}
                        </span>
                    )}
                    {pendingApprove > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.95 0.08 70)', color: 'oklch(0.45 0.12 70)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                            <Edit3 style={{ width: 12, height: 12 }} />{pendingApprove} to approve
                        </span>
                    )}
                    {pendingManual > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'oklch(0.92 0.06 32)', color: 'var(--destructive)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                            <Shield style={{ width: 12, height: 12 }} />{pendingManual} manual
                        </span>
                    )}
                </div>
                {/* 右側：狀態徽章 + 刪除按鈕 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, ...getStatusStyle(shipment.status) }}>{shipment.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            style={{
                                padding: 6,
                                background: 'var(--muted)',
                                border: 'none',
                                borderRadius: 5,
                                cursor: 'pointer',
                                opacity: 0.5,
                                transition: 'opacity 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                            title="Delete shipment"
                        >
                            <Trash2 style={{ width: 14, height: 14, color: 'var(--destructive)' }} />
                        </button>
                    )}
                </div>
            </div>
            {/* 第二行：customer 和 playbook */}
            <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{shipment.customer}</p>
                {playbook && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0', fontWeight: 500 }}>{playbook.name}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 18 }}>
                <span style={{ fontWeight: 500 }}>{shipment.origin}</span>
                <ChevronRight style={{ width: 16, height: 16 }} />
                <span style={{ fontWeight: 500 }}>{shipment.destination}</span>
                <span>•</span>
                <span>ETA: {shipment.eta}</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
                {(playbook?.steps || stepLabels).map((s, idx) => (
                    <div
                        key={idx}
                        style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 999,
                            background: idx + 1 < shipment.step ? 'var(--primary)' : idx + 1 === shipment.step ? 'var(--chart-2)' : 'var(--muted)'
                        }}
                        title={typeof s === 'string' ? s : s.name}
                    />
                ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 10, fontWeight: 500 }}>
                Step {shipment.step}/{playbook?.steps.length || 7}: {playbook?.steps[shipment.step - 1]?.name || stepLabels[shipment.step - 1]}
            </p>
        </div>
    );
}
