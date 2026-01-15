import React from 'react';
import { getActivityIcon } from '../utils';

export default function ActivityPage({ activities }) {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Recent Activity</h2>
            </div>
            <div>
                {activities.map((activity, idx) => (
                    <div key={activity.id} style={{ padding: 18, display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: idx < activities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getActivityIcon(activity.type)}
                        </div>
                        <div>
                            <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>{activity.message}</p>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>{activity.timestamp}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
