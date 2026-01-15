import React from 'react';
import { Ship, User, ChevronRight } from 'lucide-react';

export default function MessagesPage({ messages }) {
    return (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>Messages</h2>
                <span style={{ padding: '6px 14px', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{messages.filter(m => !m.read).length} unread</span>
            </div>
            <div>
                {messages.map((message, idx) => (
                    <div key={message.id} style={{ padding: 18, display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: idx < messages.length - 1 ? '1px solid var(--border)' : 'none', background: !message.read ? 'oklch(0.97 0.03 160 / 0.5)' : 'transparent', cursor: 'pointer' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: message.from === 'Agent' ? 'var(--primary)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {message.from === 'Agent' ? <Ship style={{ width: 24, height: 24, color: 'var(--primary-foreground)' }} /> : <User style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{message.from}</span>
                                <ChevronRight style={{ width: 14, height: 14, color: 'var(--border)' }} />
                                <span style={{ color: 'var(--sidebar-foreground)' }}>{message.to}</span>
                                {!message.read && <div style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: 999 }} />}
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 500, margin: '6px 0' }}>{message.subject}</p>
                            <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: 0 }}>{message.preview}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
