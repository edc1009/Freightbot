import React, { useState } from 'react';
import { FileText, Shield, DollarSign, AlertTriangle, User, Clock, Key, Check, Loader, X } from 'lucide-react';
import { PLAYBOOKS, AUTOMATION_LEVELS } from '../constants';
import { testApiConnection } from '../services/geminiService';

export default function SettingsPage({ apiKey, setApiKey }) {
    const [inputKey, setInputKey] = useState(apiKey || '');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testApiConnection(inputKey);
        setTestResult(result);
        setTesting(false);

        if (result.success) {
            setApiKey(inputKey);
        }
    };

    return (
        <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* API Key Configuration */}
            <div style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Key style={{ width: 22, height: 22, color: 'white' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Gemini API Configuration</h2>
                        <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Configure your GEMINI-3.0-FLASH API key</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 8 }}>API Key</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input
                                type="password"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                placeholder="Enter your Gemini API key"
                                style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)' }}
                            />
                            <button
                                onClick={handleTestConnection}
                                disabled={!inputKey || testing}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 20px',
                                    background: testing ? 'var(--muted)' : 'var(--primary)',
                                    color: testing ? 'var(--muted-foreground)' : 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: testing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {testing ? (
                                    <>
                                        <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Check style={{ width: 16, height: 16 }} />
                                        Save & Test
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {testResult && (
                        <div style={{ padding: 14, background: testResult.success ? 'oklch(0.95 0.05 160)' : 'oklch(0.95 0.05 32)', borderRadius: 10, border: `1px solid ${testResult.success ? 'var(--primary)' : 'var(--destructive)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                            {testResult.success ? (
                                <>
                                    <Check style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                                    <span style={{ fontSize: 14, color: 'var(--primary)' }}>Connection successful! API key saved.</span>
                                </>
                            ) : (
                                <>
                                    <X style={{ width: 18, height: 18, color: 'var(--destructive)' }} />
                                    <span style={{ fontSize: 14, color: 'var(--destructive)' }}>{testResult.error}</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Status indicator */}
                    <div style={{ padding: 16, background: apiKey ? 'oklch(0.95 0.05 160)' : 'oklch(0.95 0.06 70)', borderRadius: 10, border: `1px solid ${apiKey ? 'var(--primary)' : 'var(--chart-4)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 10, height: 10, background: apiKey ? 'var(--primary)' : 'var(--chart-4)', borderRadius: 999, animation: apiKey ? 'none' : 'pulse 2s infinite' }} />
                            <span style={{ fontSize: 14, fontWeight: 500, color: apiKey ? 'var(--primary)' : 'var(--chart-4)' }}>
                                {apiKey ? 'Connected to GEMINI-3.0-FLASH' : 'Waiting for API key'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Playbooks Overview */}
            <div style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, background: 'var(--chart-5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText style={{ width: 22, height: 22, color: 'white' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Playbooks</h2>
                        <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Automation templates for different shipment types</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {Object.values(PLAYBOOKS).map(playbook => (
                        <div key={playbook.id} style={{ padding: 20, background: 'var(--muted)', borderRadius: 12 }}>
                            <h3 style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px 0' }}>{playbook.name}</h3>
                            <p style={{ fontSize: 13, color: 'var(--sidebar-foreground)', margin: '0 0 10px 0' }}>{playbook.desc}</p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                                {playbook.recommended?.map((tag, idx) => (
                                    <span key={idx} style={{ padding: '3px 10px', background: 'var(--muted)', color: 'var(--foreground)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {playbook.steps.map((step, idx) => {
                                    const levelConfig = step.default === 'auto' ? AUTOMATION_LEVELS.AUTO : step.default === 'approve' ? AUTOMATION_LEVELS.APPROVE : AUTOMATION_LEVELS.MANUAL;
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--card)', borderRadius: 6, fontSize: 13 }}>
                                            <span>{idx + 1}. {step.name}</span>
                                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{levelConfig.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto-Escalation Rules */}
            <div style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, background: 'var(--destructive)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield style={{ width: 22, height: 22, color: 'white' }} />
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Auto-Escalation Rules</h2>
                        <p style={{ fontSize: 14, color: 'var(--sidebar-foreground)', margin: '2px 0 0 0' }}>Any step escalates to MANUAL when triggered</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                        { icon: DollarSign, text: 'Payment/duty > $5,000' },
                        { icon: AlertTriangle, text: 'Dispute, claim, penalty, damage' },
                        { icon: Shield, text: 'Customs hold or exam' },
                        { icon: User, text: 'New customer (first 3 shipments)' },
                        { icon: FileText, text: 'Formal docs: AN, Invoice' },
                        { icon: Clock, text: 'No response 48+ hours' },
                    ].map((rule, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'oklch(0.96 0.03 32)', borderRadius: 10 }}>
                            <rule.icon style={{ width: 18, height: 18, color: 'var(--destructive)' }} />
                            <span style={{ fontSize: 13 }}>{rule.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
