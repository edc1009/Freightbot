import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader, ArrowLeft } from 'lucide-react';
import { geminiService } from './services/geminiService';

export default function App() {
  const [messages, setMessages] = useState([
    { type: 'system', text: 'Agent initialized. Ready for testing. Upload a PDF to start extraction.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Add user message with file
    setMessages(prev => [...prev, { type: 'user', text: `Uploaded: ${file.name}`, isFile: true }]);
    setIsTyping(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        // Call Gemini Service simply to extract text and describe it
        setMessages(prev => [...prev, { type: 'system', text: 'Processing PDF...' }]);

        let promptType = 'general';
        if (file.name.toLowerCase().includes('arrival')) promptType = 'arrival_notice';
        else if (file.name.toLowerCase().includes('bill')) promptType = 'bill_of_lading';

        const result = await geminiService.extractDocumentData(base64Data, promptType);

        setIsTyping(false);
        setMessages(prev => [...prev, {
          type: 'agent',
          text: 'Extracted Data:',
          data: result
        }]);
      };
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'error', text: `Error: ${error.message}` }]);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090b', color: '#fafafa', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Test Agent Interface</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            padding: 16,
            borderRadius: 12,
            background: msg.type === 'user' ? '#3b82f6' : msg.type === 'error' ? '#ef4444' : '#27272a',
            color: 'white',
            border: msg.type === 'system' ? '1px solid #3f3f46' : 'none'
          }}>
            {msg.isFile && <FileText style={{ width: 16, height: 16, display: 'inline', marginRight: 8 }} />}
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>{msg.text}</div>
            {msg.data && (
              <pre style={{ marginTop: 10, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8, overflowX: 'auto' }}>
                {JSON.stringify(msg.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {isTyping && <div style={{ alignSelf: 'flex-start', padding: 16, color: '#a1a1aa' }}><Loader style={{ animation: 'spin 1s linear infinite' }} /> Agent is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 24, borderTop: '1px solid #27272a' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '12px 24px', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
          >
            <Upload style={{ width: 18, height: 18 }} /> Upload PDF
          </button>
          <div style={{ flex: 1 }}></div>
        </div>
      </div>

      <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                body { margin: 0; }
            `}</style>
    </div>
  );
}
