import React from 'react';
import { Ship, Send, Calendar, Trash2 } from 'lucide-react';
import { formatDate } from '../utils';

export default function Header({ currentDate, onOpenTestAgent, onClearAllShipments, shipmentCount }) {
    return (
        <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 46, height: 46, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ship style={{ width: 26, height: 26, color: 'var(--primary-foreground)' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>AgentOps</h1>
                        <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: 0 }}>AI Freight Operations</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--muted)', borderRadius: 10 }}>
                        <Calendar style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(currentDate)}</span>
                    </div>
                    {shipmentCount > 0 && (
                        <button
                            onClick={onClearAllShipments}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 18px',
                                background: 'var(--destructive)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                            title="Clear all shipments"
                        >
                            <Trash2 style={{ width: 16, height: 16 }} />
                            Clear All ({shipmentCount})
                        </button>
                    )}
                    <button
                        onClick={onOpenTestAgent}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        <Send style={{ width: 16, height: 16 }} />
                        Test Agent
                    </button>
                </div>
            </div>
        </header>
    );
}
