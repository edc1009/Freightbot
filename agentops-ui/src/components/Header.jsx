import React from 'react';
import { Ship, Send, Calendar, Trash2 } from 'lucide-react';
import { formatDate } from '../utils';

import logo from '../assets/logo.svg';

export default function Header({ currentDate, onOpenTestAgent, onClearAllShipments, shipmentCount }) {
    return (
        <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={logo} alt="FreightBot" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>FreightBot</h1>

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
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                padding: 0,
                                background: 'transparent',
                                color: 'var(--destructive)',
                                border: 'none',
                                borderRadius: 10,
                                cursor: 'pointer'
                            }}
                            title={`Clear all shipments (${shipmentCount})`}
                        >
                            <Trash2 style={{ width: 18, height: 18 }} />
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
