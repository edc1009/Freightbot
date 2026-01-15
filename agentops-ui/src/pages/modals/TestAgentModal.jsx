import React, { useState, useRef } from 'react';
import { X, Send, Paperclip, FileText, Loader, Check, AlertCircle, Trash2 } from 'lucide-react';
import { parseExcelFile, isExcelFile, formatExcelAsText } from '../../services/excelService';

export default function TestAgentModal({
    onClose,
    onProcessEmail,
    isProcessing
}) {
    const [from, setFrom] = useState('customer@example.com');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        setError(null);

        for (const file of files) {
            try {
                if (isExcelFile(file)) {
                    // Convert Excel to JSON
                    const excelData = await parseExcelFile(file);
                    setAttachments(prev => [...prev, {
                        name: file.name,
                        type: 'excel',
                        originalFile: file,
                        content: excelData.data,
                        contentText: formatExcelAsText(excelData),
                        convertedToJson: true
                    }]);
                } else {
                    // Convert regular file to Base64 for Multimodal API
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            // Extract Base64 part from Data URL
                            const base64 = reader.result.split(',')[1];
                            resolve(base64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    setAttachments(prev => [...prev, {
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        originalFile: file,
                        content: base64Data, // Store Base64 string
                        convertedToJson: false
                    }]);
                }
            } catch (err) {
                setError(`Failed to process ${file.name}: ${err.message}`);
            }
        }

        // Clear input
        e.target.value = '';
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if (!subject.trim() && !body.trim()) {
            setError('Please enter a subject or body');
            return;
        }

        onProcessEmail({
            from,
            subject,
            body,
            attachments: attachments.map(a => ({
                name: a.name,
                type: a.type,
                content: a.content,
                contentText: a.contentText
            }))
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
            <div style={{ background: 'var(--card)', borderRadius: 18, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                {/* Header */}
                <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card)', borderRadius: '18px 18px 0 0', zIndex: 1 }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Test Agent</h2>
                        <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '4px 0 0 0' }}>Send a test email to the AI Agent</p>
                    </div>
                    <button onClick={onClose} style={{ padding: 10, background: 'var(--muted)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                        <X style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }} />
                    </button>
                </div>

                {/* Form */}
                <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* From */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 8 }}>From (Sender Email)</label>
                        <input
                            type="email"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder="sender@company.com"
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)' }}
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 8 }}>Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="New Shipment Request - PO#12345"
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)' }}
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 8 }}>Email Body</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Dear Team,

We would like to arrange a shipment from Shanghai to Los Angeles.

Container: 1x40HC
Cargo: Electronics
Ready Date: January 20, 2025

Please find attached the commercial invoice and packing list.

Best regards,
John Smith
ABC Electronics"
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, minHeight: 200, resize: 'vertical', fontFamily: 'inherit', background: 'var(--card)' }}
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 8 }}>Attachments</label>
                        <div style={{ padding: 20, border: '2px dashed var(--border)', borderRadius: 12, background: 'var(--muted)' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.doc,.docx"
                                style={{ display: 'none' }}
                            />
                            <div style={{ textAlign: 'center' }}>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                                >
                                    <Paperclip style={{ width: 16, height: 16 }} />
                                    Add Files
                                </button>
                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '10px 0 0 0' }}>
                                    Excel files (.xlsx, .xls) will be automatically converted to JSON
                                </p>
                            </div>

                            {attachments.length > 0 && (
                                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {attachments.map((att, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            <FileText style={{ width: 18, height: 18, color: 'var(--muted-foreground)' }} />
                                            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{att.name}</span>
                                            {att.convertedToJson && (
                                                <span style={{ padding: '3px 8px', background: 'var(--primary)', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                                    → JSON
                                                </span>
                                            )}
                                            <button
                                                onClick={() => removeAttachment(idx)}
                                                style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Trash2 style={{ width: 16, height: 16, color: 'var(--destructive)' }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: 14, background: 'oklch(0.95 0.05 32)', borderRadius: 10, border: '1px solid var(--destructive)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <AlertCircle style={{ width: 18, height: 18, color: 'var(--destructive)' }} />
                            <span style={{ fontSize: 14, color: 'var(--destructive)' }}>{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: '14px 28px',
                            background: isProcessing ? 'var(--muted)' : 'var(--primary)',
                            color: isProcessing ? 'var(--muted-foreground)' : 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            width: '100%'
                        }}
                    >
                        {isProcessing ? (
                            <>
                                <Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                                Processing with Agent...
                            </>
                        ) : (
                            <>
                                <Send style={{ width: 18, height: 18 }} />
                                Send to Agent
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
