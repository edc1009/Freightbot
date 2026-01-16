import React from 'react';
import {
    ArrowLeft, X, Inbox, ChevronDown, CheckCircle,
    ArrowUpRight, ArrowDownLeft, Users, Zap, Edit3, Shield,
    Paperclip, FileText
} from 'lucide-react';
import { PLAYBOOKS, AUTOMATION_LEVELS, stepLabels, stepIcons } from '../../constants';

export default function ActivityLogModal({
    shipment,
    onClose,
    onBack,
    expandedCategory,
    setExpandedCategory,
    selectedEmail,
    setSelectedEmail
}) {
    // Only use real emails stored on the shipment, no mock data
    const emails = shipment.emails || [];
    const grouped = {};
    emails.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });
    const categories = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    const playbook = PLAYBOOKS[shipment.playbook];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, width: '100%', maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderRadius: '18px 18px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={onBack} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                            <ArrowLeft style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                        </button>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Activity Log</h2>
                            <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>{shipment.reference} • {playbook?.name || 'Standard'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                        <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    </button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 26 }}>
                    {categories.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <Inbox style={{ width: 48, height: 48, color: 'var(--muted-foreground)', margin: '0 auto 16px' }} />
                            <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>No activity yet</p>
                            <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '8px 0 0 0' }}>Agent will start processing when documents arrive</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {categories.map(cat => (
                                <CategorySection
                                    key={cat}
                                    category={cat}
                                    emails={grouped[cat]}
                                    playbook={playbook}
                                    shipment={shipment}
                                    isExpanded={expandedCategory === cat}
                                    onToggle={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                                    selectedEmail={selectedEmail}
                                    setSelectedEmail={setSelectedEmail}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CategorySection({ category, emails, playbook, shipment, isExpanded, onToggle, selectedEmail, setSelectedEmail }) {
    const StepIcon = stepIcons[category - 1] || stepIcons[0];
    const stepConfig = playbook?.steps[category - 1];
    const stepLevel = stepConfig?.default || 'auto';
    const levelConfig = stepLevel === 'auto' ? AUTOMATION_LEVELS.AUTO : stepLevel === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
    const isComplete = category < shipment.step;
    const isCurrent = category === shipment.step;

    return (
        <div style={{ background: 'var(--muted)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={onToggle} style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isComplete ? 'var(--primary)' : isCurrent ? 'var(--primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isComplete ? <CheckCircle style={{ width: 20, height: 20, color: 'white' }} /> : <StepIcon style={{ width: 20, height: 20, color: isCurrent ? 'white' : 'var(--muted-foreground)' }} />}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{stepConfig?.name || stepLabels[category - 1]}</p>
                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>
                            {isComplete ? `✓ Completed • ${emails.length} actions` : isCurrent ? `In progress • ${emails.length} actions` : `${emails.length} actions`}
                        </p>
                    </div>
                </div>
                <ChevronDown style={{ width: 20, height: 20, color: 'var(--muted-foreground)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {emails.map((email) => (
                        <EmailItem
                            key={email.id}
                            email={email}
                            isExpanded={selectedEmail?.id === email.id}
                            onToggle={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmailItem({ email, isExpanded, onToggle }) {
    const isAuto = email.autoLevel === 'auto';
    const isApprove = email.autoLevel === 'approve' || email.autoLevel === 'draft';
    const isManual = email.autoLevel === 'manual';
    const isThirdParty = email.direction === 'third-party';

    return (
        <div onClick={onToggle} style={{ background: isThirdParty ? 'oklch(0.98 0.01 280)' : 'var(--card)', borderRadius: 10, cursor: 'pointer', border: isThirdParty ? '1px dashed oklch(0.75 0.08 280)' : '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Email Header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isThirdParty ? 'oklch(0.9 0.06 280)' : email.direction === 'outbound' ? 'var(--primary)' : 'oklch(0.6 0.12 250)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isThirdParty ? <Users style={{ width: 18, height: 18, color: 'oklch(0.45 0.15 280)' }} /> : email.direction === 'outbound' ? <ArrowUpRight style={{ width: 18, height: 18, color: 'white' }} /> : <ArrowDownLeft style={{ width: 18, height: 18, color: 'white' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{email.from}</span>
                        <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>→</span>
                        <span style={{ fontSize: 14, color: 'var(--sidebar-foreground)' }}>{email.to}</span>
                        {email.cc && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>(CC: {email.cc})</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{email.subject}</p>
                    <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: 0 }}>{email.timestamp}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {email.direction === 'outbound' && email.autoLevel && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: isAuto ? 'oklch(0.94 0.04 160)' : isApprove ? 'oklch(0.95 0.06 70)' : 'oklch(0.94 0.04 32)', color: isAuto ? 'var(--primary)' : isApprove ? 'var(--chart-4)' : 'var(--destructive)', fontSize: 12, fontWeight: 600 }}>
                            {isAuto ? <Zap style={{ width: 12, height: 12 }} /> : isApprove ? <Edit3 style={{ width: 12, height: 12 }} /> : <Shield style={{ width: 12, height: 12 }} />}
                            {isAuto ? 'Auto sent' : isApprove ? 'Approved' : 'Manual'}
                        </div>
                    )}
                    {email.direction === 'inbound' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'oklch(0.94 0.05 250)', color: 'oklch(0.5 0.12 250)', fontSize: 12, fontWeight: 600 }}>
                            <ArrowDownLeft style={{ width: 12, height: 12 }} /> Received
                        </div>
                    )}
                    {isThirdParty && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'oklch(0.9 0.06 280)', color: 'oklch(0.45 0.15 280)', fontSize: 12, fontWeight: 600 }}>
                            <Users style={{ width: 12, height: 12 }} /> 3rd Party
                        </div>
                    )}
                    <ChevronDown style={{ width: 18, height: 18, color: 'var(--muted-foreground)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>
            </div>

            {/* Expanded Email Body */}
            {isExpanded && (
                <div style={{ padding: '0 16px 16px 64px' }}>
                    <div style={{ padding: 16, background: 'var(--muted)', borderRadius: 8 }}>
                        <p style={{ fontSize: 14, color: 'var(--foreground)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{email.body}</p>
                    </div>
                    {/* Attachments Section */}
                    {email.attachments && email.attachments.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Paperclip style={{ width: 14, height: 14 }} />
                                {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {email.attachments.map((att, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 12px', background: 'var(--card)',
                                            border: '1px solid var(--border)', borderRadius: 8,
                                            fontSize: 13, color: 'var(--foreground)', cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            try {
                                                // 1. Try Blob approach (Best for performance/stability)
                                                if (att.content && att.content.startsWith('data:')) {
                                                    const base64Arr = att.content.split(',');
                                                    const base64 = base64Arr[1] || base64Arr[0]; // Handle if data: prefix is missing
                                                    const mime = base64Arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';

                                                    const byteCharacters = atob(base64);
                                                    const byteNumbers = new Array(byteCharacters.length);
                                                    for (let i = 0; i < byteCharacters.length; i++) {
                                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                    }
                                                    const byteArray = new Uint8Array(byteNumbers);
                                                    const blob = new Blob([byteArray], { type: mime });
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    window.open(blobUrl, '_blank');
                                                } else if (att.content) {
                                                    // 2. Fallback for non-base64 (e.g. normal URLs)
                                                    window.open(att.content, '_blank');
                                                } else {
                                                    alert('File content not available.');
                                                }
                                            } catch (err) {
                                                console.error('Error opening file:', err);
                                                // 3. Fallback to basic iframe approach if Blob fails
                                                const win = window.open();
                                                if (win) {
                                                    win.document.write('<iframe src="' + att.content + '" frameborder="0" style="border:0;width:100%;height:100%" allowfullscreen></iframe>');
                                                }
                                            }
                                        }}
                                    >
                                        <div style={{ padding: 4, background: 'oklch(0.96 0.01 200)', borderRadius: 4 }}>
                                            <FileText style={{ width: 14, height: 14, color: 'var(--sidebar-foreground)' }} />
                                        </div>
                                        <span>{att.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
