import React from 'react';
import { Bell, Package, Clock, MessageSquare, Settings } from 'lucide-react';

const navItems = [
    { id: 'actions', label: 'Action Center', icon: Bell },
    { id: 'shipments', label: 'Shipments', icon: Package },
    { id: 'activity', label: 'Activity', icon: Clock },
    // { id: 'messages', label: 'Messages', icon: MessageSquare }, // Hidden
    { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Navigation({ currentPage, onPageChange, stats, shipments, messages }) {
    const getTabCount = (id) => {
        switch (id) {
            case 'actions':
                return shipments.reduce((acc, s) => acc + (s.pendingActions?.length || 0), 0);
            case 'shipments':
                return stats.total;
            case 'activity':
                return null;
            case 'messages':
                return messages.filter(m => !m.read).length;
            default:
                return null;
        }
    };

    const hasHighlight = (id) => {
        if (id === 'actions') {
            return shipments.some(s => s.pendingActions?.some(a => a.type === 'approve' || a.type === 'manual'));
        }
        return false;
    };

    return (
        <nav style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'var(--card)', padding: 6, borderRadius: 14, border: '1px solid var(--border)', width: 'fit-content' }}>
            {navItems.map(tab => {
                const count = getTabCount(tab.id);
                const highlight = hasHighlight(tab.id);
                return (
                    <button
                        key={tab.id}
                        onClick={() => onPageChange(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 10,
                            border: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            background: currentPage === tab.id ? (highlight && count > 0 ? 'var(--chart-4)' : 'var(--primary)') : 'transparent',
                            color: currentPage === tab.id ? 'white' : 'var(--muted-foreground)'
                        }}
                    >
                        <tab.icon style={{ width: 18, height: 18 }} />{tab.label}
                        {count !== null && count > 0 && (
                            <span style={{
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                background: currentPage === tab.id ? 'rgba(255,255,255,0.25)' : (highlight ? 'var(--chart-4)' : 'var(--muted)'),
                                color: currentPage === tab.id ? 'white' : (highlight ? 'white' : 'var(--muted-foreground)')
                            }}>{count}</span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
