// Gemini API Service
// API Key is loaded from environment variable VITE_GEMINI_API_KEY
// Or can be passed directly to functions

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Get API Key from environment variable
export const getApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
};

// Import Agent Skill from root directory (工具)
import AGENT_SKILL_MD from '../../../agentops-skill.md?raw';

// System Prompt (大腦) - Core instructions for the Agent
const SYSTEM_PROMPT = `You are an AI operations agent for a freight forwarding company focused ONLY on the "free-hand" playbook.

Goal:
- Triage inbound emails, match them to an existing shipment when possible, or create a new shipment record when the email refers to a shipment not found in the system.
- Draft operational emails when appropriate.
- Escalate high-risk or ambiguous cases to a human.

Non-negotiable rules:
- Never invent shipment data. If a field is missing, leave it null and request clarification or escalate as required.
- All actions must follow the Free-hand Skill policy provided. If an action is not allowed by the policy, choose ESCALATE.
- If you detect a shipment reference (BL / container / booking / PO) and the system indicates "no match found", treat it as a NEW shipment initiation and propose CREATE_SHIPMENT (skeleton allowed).

Output requirement:
- Respond with ONLY valid JSON that conforms exactly to the schema defined in the Free-hand Skill policy.
- No markdown, no extra text.`;

export async function processEmailWithAgent(apiKey, emailData) {
    const key = apiKey || getApiKey();

    if (!key || key === 'YOUR_API_KEY_HERE') {
        throw new Error('請在 .env 文件中設置 VITE_GEMINI_API_KEY');
    }

    // Combine: System Prompt (大腦) + Agent Skill (工具) + Email Content
    const prompt = `## SYSTEM INSTRUCTIONS (大腦)
${SYSTEM_PROMPT}

---

## FREE-HAND AGENT SKILL POLICY (工具)
${AGENT_SKILL_MD}

---

## EMAIL TO PROCESS

FROM: ${emailData.from}
SUBJECT: ${emailData.subject}

BODY:
${emailData.body}

${emailData.attachments?.length > 0 ? `ATTACHMENTS:\n${emailData.attachments.map(a => `- ${a.name} (${a.type})`).join('\n')}` : 'No attachments'}

---

Now process this email following the Free-hand Skill policy. Return ONLY the JSON object, nothing else.`;

    // Construct content parts
    const parts = [{ text: prompt }];

    // Add attachments if present (Multimodal)
    if (emailData.attachments?.length > 0) {
        emailData.attachments.forEach(att => {
            // Include supported types (images, pdf) as inline_data
            if (att.content && !att.convertedToJson && (att.type.startsWith('image/') || att.type === 'application/pdf')) {
                console.log(`📎 Adding attachment to prompt: ${att.name} (${att.type})`);
                parts.push({
                    inline_data: {
                        mime_type: att.type,
                        data: att.content // Base64 string
                    }
                });
            } else if (att.convertedToJson) {
                // For Excel converted to JSON, add as text content
                parts.push({
                    text: `\n\nATTACHMENT FILE: ${att.name}\nCONTENT (Parsed Excel):\n${JSON.stringify(att.content, null, 2)}\n`
                });
            }
        });
    }

    try {
        const apiUrl = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;
        console.log('📧 Processing email with Agent...');
        console.log('Subject:', emailData.subject);
        console.log(`📎 Attachments: ${emailData.attachments?.length || 0}`);
        console.log('🧠 System Prompt: Active');
        console.log('🔧 Agent Skill: Free-hand v0.1');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 4096,
                }
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('❌ API Error:', responseData);
            throw new Error(responseData.error?.message || `API request failed: ${response.status}`);
        }

        console.log('✅ API Response received');

        const textContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            console.error('❌ No text in response:', responseData);
            throw new Error('No response from API');
        }

        console.log('📝 Raw response:', textContent.substring(0, 300) + '...');

        // Clean and parse JSON
        let jsonStr = textContent.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```')) {
            const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonStr = match[1].trim();
            }
        }

        // Try to find JSON object
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        }

        console.log('🔍 Parsing JSON...');
        const result = JSON.parse(jsonStr);
        console.log('✅ Parsed successfully:', result.email_analysis?.type);

        return result;
    } catch (error) {
        console.error('❌ Gemini API Error:', error);
        throw error;
    }
}

export async function testApiConnection(apiKey) {
    const key = apiKey || getApiKey();

    if (!key || key === 'YOUR_API_KEY_HERE') {
        return { success: false, error: 'API Key not configured' };
    }

    try {
        const apiUrl = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say OK' }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, error: errorData.error?.message || 'Connection failed' };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
