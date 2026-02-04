import React from 'react';
import {
    ArrowLeft, X, Inbox, ChevronDown, CheckCircle,
    ArrowUpRight, ArrowDownLeft, Users, Zap, Edit3, Shield,
    Paperclip, FileText
} from 'lucide-react';
import { PLAYBOOKS, AUTOMATION_LEVELS, stepLabels, stepIcons } from '../../constants';
import { formatDateTime } from '../../utils';

export default function ActivityLogModal({
    shipment,
    onClose,
    onBack,
    expandedCategory,
    setExpandedCategory,
    selectedEmail,
    setSelectedEmail,
    activities = [] // New prop
}) {
    // 1. Get Emails
    const emails = shipment.emails || [];
    const emailIds = new Set(emails.map(e => e.id));

    // 2. Map Activities to Pseudo-Emails
    const shipmentActivities = activities.filter(a =>
        (a.shipment === shipment.reference || a.shipment === shipment.id) &&
        a.message !== 'Shipment Updated via Agent' // Filter out redundant updates
    );
    const activityItems = shipmentActivities.map(a => {
        // If activity already contains a full email object (e.g., auto-sent email), use it directly
        if (a.email && a.email.id) {
            // FIX: Deduplicate - if this email is already in shipment.emails, skip it here
            if (emailIds.has(a.email.id)) {
                return null;
            }

            return {
                ...a.email,
                id: a.email.id || `act-email-${a.timestamp}`,
                category: a.email.category || shipment.step || 1
            };
        }

        // Otherwise, create a pseudo-email for system activities
        let category = 1; // Default
        const msg = a.message?.toLowerCase() || '';
        const type = a.type?.toLowerCase() || '';

        // Heuristic Categorization
        if (msg.includes('isf') || type.includes('isf')) category = 1;
        else if (msg.includes('arrival notice') || msg.includes('an ')) category = 3; // Step 3
        else if (msg.includes('trucker') || msg.includes('pickup') || msg.includes('truck')) category = 3;
        else if (msg.includes('customs') || msg.includes('broker') || msg.includes('entry')) category = 4;
        else if (msg.includes('warehouse') || msg.includes('delivery')) category = 5;
        else if (msg.includes('payment') || msg.includes('bill')) category = 7;
        else if (msg.includes('release')) category = 6;
        else category = shipment.step || 1; // Fallback to current step

        return {
            id: `act-${a.timestamp}-${Math.random()}`,
            category,
            direction: 'system', // Special direction for rendering
            from: 'System',
            to: '-',
            subject: a.type === 'email-sent' ? 'Email Sent' : a.type === 'document' ? 'Document Generated' : (a.message || 'System Activity'),
            body: a.detail || a.message,
            timestamp: formatDateTime(a.timestamp),
            read: true,
            autoLevel: 'auto',
            originalActivity: a // Keep reference for debugging
        };
    }).filter(item => item !== null);

    // 3. Merge and Group
    const allItems = [...emails, ...activityItems];
    // Deduplicate by ID if necessary (though IDs should be unique)

    const grouped = {};
    allItems.forEach(e => {
        if (!grouped[e.category]) grouped[e.category] = [];
        grouped[e.category].push(e);
    });

    // sorting
    Object.keys(grouped).forEach(k => {
        grouped[k].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });

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

    // Correct completion check for parallel items
    // TASK_MAP uses 0-indexed values: idx 2=Truck, idx 3=Customs, idx 4=Warehouse
    const TASK_MAP = {
        2: 'truck_scheduling',       // idx 2 = Step 3: Truck Scheduling
        3: 'customs_coordination',   // idx 3 = Step 4: Customs Coordination
        4: 'warehouse_coordination'  // idx 4 = Step 5: Warehouse Coordination
    };

    let isComplete = false;
    if (shipment.status === 'completed') {
        isComplete = true;
    } else if (TASK_MAP[category - 1]) {
        // category is 1-indexed, TASK_MAP uses 0-indexed, so check category-1
        isComplete = (shipment.completedTasks || []).includes(TASK_MAP[category - 1]);
    } else {
        // Sequential step: complete when step pointer > category
        isComplete = category < shipment.step;
    }

    const isCurrent = !isComplete && (
        (TASK_MAP[category - 1]) ? shipment.step >= 4 && shipment.step < 8 : category === shipment.step
    );

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
                            {isComplete ? `✓ Completed • ${emails.length} events` : isCurrent ? `In progress • ${emails.length} events` : `${emails.length} events`}
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
    const isSystem = email.direction === 'system';

    return (
        <div onClick={onToggle} style={{ background: isThirdParty ? 'oklch(0.98 0.01 280)' : isSystem ? 'oklch(0.97 0 0)' : 'var(--card)', borderRadius: 10, cursor: 'pointer', border: isThirdParty ? '1px dashed oklch(0.75 0.08 280)' : isSystem ? '1px solid var(--border)' : '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Email Header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isSystem ? 'var(--muted)' : isThirdParty ? 'oklch(0.9 0.06 280)' : email.direction === 'outbound' ? 'var(--primary)' : 'oklch(0.6 0.12 250)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSystem ? <Zap style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} /> : isThirdParty ? <Users style={{ width: 18, height: 18, color: 'oklch(0.45 0.15 280)' }} /> : email.direction === 'outbound' ? <ArrowUpRight style={{ width: 18, height: 18, color: 'white' }} /> : <ArrowDownLeft style={{ width: 18, height: 18, color: 'white' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{email.from}</span>
                        {email.to !== '-' && (
                            <>
                                <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>→</span>
                                <span style={{ fontSize: 14, color: 'var(--sidebar-foreground)' }}>{email.to}</span>
                            </>
                        )}
                        {email.cc && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>(CC: {email.cc})</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', margin: '0 0 4px 0' }}>{email.subject}</p>
                    <p style={{ fontSize: 12, color: 'var(--sidebar-foreground)', margin: 0 }}>{formatDateTime(email.timestamp)}</p>
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
                    {isSystem && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}>
                            <Zap style={{ width: 12, height: 12 }} /> System
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
                                            fontSize: 13, color: 'var(--foreground)', cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card)'}
                                        onClick={(e) => {
                                            // CRITICAL: Stop event bubbling to prevent parent onClick from triggering
                                            e.stopPropagation();
                                            
                                            console.log('📎 Attachment clicked:', att.name);
                                            console.log('📎 Content available:', !!att.content);
                                            console.log('📎 Content length:', att.content?.length || 0);
                                            console.log('📎 Content starts with:', att.content?.substring(0, 50));
                                            
                                            try {
                                                // 1. Try Blob approach (Best for performance/stability)
                                                if (att.content && att.content.startsWith('data:')) {
                                                    console.log('📎 Using data: URL approach');
                                                    const base64Arr = att.content.split(',');
                                                    const base64 = base64Arr[1] || base64Arr[0]; // Handle if data: prefix is missing
                                                    const mime = base64Arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
                                                    console.log('📎 Detected MIME type:', mime);

                                                    const byteCharacters = atob(base64);
                                                    const byteNumbers = new Array(byteCharacters.length);
                                                    for (let i = 0; i < byteCharacters.length; i++) {
                                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                    }
                                                    const byteArray = new Uint8Array(byteNumbers);
                                                    const blob = new Blob([byteArray], { type: mime });
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    console.log('📎 Opening blob URL:', blobUrl);
                                                    window.open(blobUrl, '_blank');
                                                } else if (att.content && att.content.length > 100) {
                                                    // 2. Raw base64 without data: prefix - assume PDF
                                                    console.log('📎 Raw base64 detected, treating as PDF');
                                                    const mime = att.type || 'application/pdf';
                                                    const byteCharacters = atob(att.content);
                                                    const byteNumbers = new Array(byteCharacters.length);
                                                    for (let i = 0; i < byteCharacters.length; i++) {
                                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                    }
                                                    const byteArray = new Uint8Array(byteNumbers);
                                                    const blob = new Blob([byteArray], { type: mime });
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    console.log('📎 Opening blob URL:', blobUrl);
                                                    window.open(blobUrl, '_blank');
                                                } else if (att.content) {
                                                    // 3. Fallback for URLs
                                                    console.log('📎 Treating as URL');
                                                    window.open(att.content, '_blank');
                                                } else {
                                                    console.warn('📎 No content available for attachment:', att.name);
                                                    alert(`File content not available for: ${att.name}\n\nThe file may not have been properly attached or the content was not preserved.`);
                                                }
                                            } catch (err) {
                                                console.error('📎 Error opening file:', err);
                                                alert(`Error opening file: ${att.name}\n\n${err.message}`);
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
