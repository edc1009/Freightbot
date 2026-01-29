import React, { useState } from 'react';
import { getActivityIcon } from '../utils';
import { ChevronDown, ChevronUp, Sparkles, Lightbulb, BarChart2 } from 'lucide-react';

// Helper function to format timestamp into user-friendly format
const formatTimestamp = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    try {
        const date = new Date(isoTimestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' at ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoTimestamp;
    }
};

// Agent Thinking Card Component
// Uses design system colors: --chart-3 (purple), --primary (green), --chart-4 (orange)
const AgentThinkingCard = ({ activity }) => {
    const [expanded, setExpanded] = useState(false);
    const thinking = activity.thinking || {};

    // Confidence percentage (0-1 to 0-100%)
    const confidencePercent = thinking.confidence ? Math.round(thinking.confidence * 100) : null;

    return (
        <div style={{
            padding: 18,
            borderBottom: '1px solid var(--border)',
            background: 'var(--muted)'
        }}>
            {/* Header Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'var(--chart-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Sparkles size={20} color="var(--foreground)" />
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, margin: 0, fontWeight: 600 }}>{activity.message}</p>
                    <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>
                        {formatTimestamp(activity.timestamp)}
                    </p>
                </div>
            </div>

            {/* Initial Thought */}
            {thinking.initial_thought && (
                <div style={{
                    marginTop: 12,
                    marginLeft: 56,
                    padding: '10px 14px',
                    background: 'var(--card)',
                    borderRadius: 8,
                    borderLeft: '3px solid var(--chart-3)'
                }}>
                    <p style={{ fontSize: 11, margin: 0, color: 'var(--chart-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lightbulb size={12} /> Initial Thought
                    </p>
                    <p style={{ fontSize: 13, margin: '6px 0 0 0', color: 'var(--foreground)', fontStyle: 'italic' }}>
                        "{thinking.initial_thought}"
                    </p>
                </div>
            )}

            {/* Decision Summary */}
            <div style={{
                marginTop: 10,
                marginLeft: 56,
                padding: '10px 14px',
                background: 'var(--card)',
                borderRadius: 8,
                borderLeft: '3px solid var(--primary)'
            }}>
                <p style={{ fontSize: 11, margin: 0, color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BarChart2 size={12} /> Decision
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                    {/* Email Type Badge */}
                    <div style={{
                        padding: '4px 10px',
                        background: 'var(--background)',
                        borderRadius: 6,
                        fontSize: 12,
                        border: '1px solid var(--border)'
                    }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>Type: </span>
                        <span style={{ fontWeight: 600 }}>{thinking.email_type || 'N/A'}</span>
                    </div>

                    {/* Confidence with Progress Bar */}
                    {confidencePercent !== null && (
                        <div style={{
                            padding: '4px 10px',
                            background: 'var(--background)',
                            borderRadius: 6,
                            fontSize: 12,
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <span style={{ color: 'var(--muted-foreground)' }}>Confidence:</span>
                            <div style={{
                                width: 60,
                                height: 6,
                                background: 'var(--border)',
                                borderRadius: 3,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${confidencePercent}%`,
                                    height: '100%',
                                    background: confidencePercent > 80 ? 'var(--primary)' : confidencePercent > 50 ? 'var(--chart-4)' : 'var(--destructive)',
                                    borderRadius: 3,
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <span style={{ fontWeight: 600 }}>{confidencePercent}%</span>
                        </div>
                    )}

                    {/* Action Badge */}
                    <div style={{
                        padding: '4px 10px',
                        background: 'var(--background)',
                        borderRadius: 6,
                        fontSize: 12,
                        border: '1px solid var(--border)'
                    }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>Action: </span>
                        <span style={{ fontWeight: 600 }}>{thinking.action || 'N/A'}</span>
                        {thinking.action_authority && (
                            <span style={{
                                marginLeft: 4,
                                padding: '2px 6px',
                                background: thinking.action_authority === 'AUTO' ? 'var(--accent)' : 'var(--muted)',
                                color: thinking.action_authority === 'AUTO' ? 'var(--primary)' : 'var(--chart-4)',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600
                            }}>
                                {thinking.action_authority}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Full Reasoning */}
            {thinking.reasoning && (
                <div style={{ marginTop: 10, marginLeft: 56 }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            color: 'var(--muted-foreground)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Hide' : 'View'} Full Reasoning
                    </button>

                    {expanded && (
                        <div style={{
                            marginTop: 10,
                            padding: 14,
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: 'var(--foreground)',
                            whiteSpace: 'pre-wrap',
                            maxHeight: 300,
                            overflowY: 'auto'
                        }}>
                            {thinking.reasoning}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Standard Activity Card Component
const StandardActivityCard = ({ activity, isLast }) => (
    <div style={{
        padding: 18,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        borderBottom: isLast ? 'none' : '1px solid var(--border)'
    }}>
        <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {getActivityIcon(activity.type)}
        </div>
        <div>
            <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>{activity.message}</p>
            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>
                {formatTimestamp(activity.timestamp)}
            </p>
        </div>
    </div>
);

export default function ActivityPage({ activities }) {
    return (
        <div style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Recent Activity</h2>
            </div>
            <div>
                {activities.map((activity, idx) => (
                    activity.type === 'agent-thinking'
                        ? <AgentThinkingCard key={activity.id} activity={activity} />
                        : <StandardActivityCard key={activity.id} activity={activity} isLast={idx === activities.length - 1} />
                ))}
            </div>
        </div>
    );
}
