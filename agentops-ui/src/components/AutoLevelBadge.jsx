import React from 'react';
import { AUTOMATION_LEVELS } from '../constants';

export default function AutoLevelBadge({ level }) {
    const config = level === 'auto' ? AUTOMATION_LEVELS.AUTO : level === 'draft' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            <config.icon style={{ width: 10, height: 10 }} />{config.label}
        </span>
    );
}
