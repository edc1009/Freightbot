import React from 'react';

export default function StatCard({ stat, isSelected, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: 'var(--card)',
                borderRadius: 14,
                padding: 18,
                border: isSelected ? `2px solid ${stat.color}` : '1px solid var(--border)',
                cursor: 'pointer',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500 }}>{stat.label}</span>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: stat.color }} />
            </div>
            <p style={{ fontSize: 32, fontWeight: 600, color: isSelected ? stat.color : 'var(--foreground)', margin: '10px 0 0 0' }}>{stat.value}</p>
        </div>
    );
}
