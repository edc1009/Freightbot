// Gemini API Service
// API Key is loaded from environment variable VITE_GEMINI_API_KEY
// Or can be passed directly to functions

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Import Agent Skill from root directory (工具)
import AGENT_SKILL_MD from '../../../agentops-skill.md?raw';

// Defined Output Schema for Structured JSON
const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        reasoning: {
            type: "STRING",
            description: "Detailed step-by-step reasoning. MUST explain where each piece of data was found (e.g., 'Origin found in PDF attachment page 1', 'BL number extracted from email subject'). If a field is TBD/null, explain why."
        },
        shipment_data: {
            type: "OBJECT",
            description: "Extracted shipment details. CROSS-REFERENCE all attachments. If Image says TBD but PDF has valid data, use the PDF data.",
            properties: {
                origin: { type: "STRING", nullable: true },
                destination: { type: "STRING", nullable: true },
                vessel: { type: "STRING", nullable: true },
                voyage: { type: "STRING", nullable: true },
                eta: { type: "STRING", nullable: true, description: "YYYY-MM-DD format preferred" },
                etd: { type: "STRING", nullable: true },
                bl_number: { type: "STRING", nullable: true },
                container_number: { type: "STRING", nullable: true },
                booking_number: { type: "STRING", nullable: true },
                firms_code: { type: "STRING", nullable: true, description: "CY Location / FIRMS Code" },
                weight: { type: "STRING", nullable: true },
                volume: { type: "STRING", nullable: true },
                package_count: { type: "STRING", nullable: true }
            }
        },
        email_analysis: {
            type: "OBJECT",
            properties: {
                type: {
                    type: "STRING",
                    enum: ["NEW_FREEHAND_INTENT", "CARRIER_AN", "STATUS_UPDATE", "PAYMENT_CONFIRM", "PAYMENT_FOLLOWUP", "INQUIRY", "COMPLAINT", "INTERNAL_REQUEST", "FYI_NO_ACTION", "UNKNOWN"]
                },
                sender: {
                    type: "OBJECT",
                    properties: {
                        email: { type: "STRING" },
                        name: { type: "STRING", nullable: true },
                        party_type: {
                            type: "STRING",
                            enum: ["OVERSEAS_AGENT", "CUSTOMER", "CARRIER", "INTERNAL", "UNKNOWN"]
                        }
                    }
                },
                confidence: { type: "NUMBER" },
                summary: { type: "STRING" }
            },
            required: ["type", "sender", "confidence", "summary"]
        },
        processed_shipments: {
            type: "ARRAY",
            description: "List of all unique shipments found in the documents. EACH AN/BL must be a separate entry.",
            items: {
                type: "OBJECT",
                properties: {
                    reference: { type: "STRING", description: "B/L Number or Container Number found" },
                    match_result: { type: "STRING", enum: ["FOUND", "NOT_FOUND"] },
                    shipment_id: { type: "STRING", nullable: true, description: "ID of the matching shipment in database" },
                    action: { type: "STRING", enum: ["CREATE", "UPDATE"], description: "Proposed action for this specific shipment" },
                    extracted_data: {
                        type: "OBJECT",
                        description: "Data specific to this shipment extracted from its page/section",
                        properties: {
                            origin: { type: "STRING", nullable: true },
                            destination: { type: "STRING", nullable: true },
                            vessel: { type: "STRING", nullable: true },
                            eta: { type: "STRING", nullable: true },
                            bl_number: { type: "STRING", nullable: true },
                            hbl_number: { type: "STRING", nullable: true, description: "House Bill of Lading (if distinct from MBL)" },
                            firms_code: { type: "STRING", nullable: true, description: "CY Location / FIRMS Code" },
                            container_number: { type: "STRING", nullable: true },
                            shipper: { type: "STRING", nullable: true, description: "Shipper name and address" },
                            consignee: { type: "STRING", nullable: true, description: "Consignee name and address" },
                            notify_party: { type: "STRING", nullable: true, description: "Notify party name and address" }
                        }
                    }
                },
                required: ["reference", "match_result", "action"]
            }
        },
        playbook: {
            type: "OBJECT",
            properties: {
                selected: { type: "STRING" },
                current_step: { type: "INTEGER" },
                step_name: { type: "STRING" }
            }
        },
        action: {
            type: "OBJECT",
            properties: {
                type: {
                    type: "STRING",
                    enum: ["CREATE_SHIPMENT", "UPDATE_STATUS", "SEND_EMAIL", "REQUEST_INFO", "SCHEDULE_REMINDER", "ESCALATE"]
                },
                authority: { type: "STRING", enum: ["AUTO", "APPROVE", "MANUAL"] },
                description: { type: "STRING" }
            },
            required: ["type", "authority", "description"]
        },
        email_draft: {
            type: "OBJECT",
            properties: {
                should_send: { type: "BOOLEAN" },
                to: { type: "ARRAY", items: { type: "STRING" } },
                cc: { type: "ARRAY", items: { type: "STRING" } },
                subject: { type: "STRING", nullable: true },
                body: { type: "STRING", nullable: true },
                attachments: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["should_send"]
        },
        status_update: {
            type: "OBJECT",
            properties: {
                should_update: { type: "BOOLEAN" },
                new_status: { type: "STRING", nullable: true },
                notes: { type: "STRING", nullable: true }
            },
            required: ["should_update"]
        },
        escalation: {
            type: "OBJECT",
            properties: {
                required: { type: "BOOLEAN" },
                reason: { type: "STRING", nullable: true },
                urgency: { type: "STRING", nullable: true }
            },
            required: ["required"]
        },
        financials: {
            type: "OBJECT",
            description: "Extracted financial/charge details from Credit/Debit Notes or Email Body.",
            properties: {
                charges: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            description: { type: "STRING", description: "Charge name (e.g. Ocean Freight, AMS, Handling)" },
                            amount: { type: "STRING", description: "Amount (numeric string)" },
                            currency: { type: "STRING", enum: ["USD", "EUR", "CNY", "TWD"] },
                            prepaid_or_collect: { type: "STRING", enum: ["Prepaid", "Collect"] },
                            payer: { type: "STRING", nullable: true }
                        }
                    }
                },
                total_amount: { type: "STRING", nullable: true }
            }
        },
        reminders: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    after_days: { type: "INTEGER" },
                    purpose: { type: "STRING" }
                }
            }
        }
    },
    required: ["reasoning", "processed_shipments", "email_analysis", "action"]
};


// System Prompt (大腦) - Core instructions for the Agent
const SYSTEM_PROMPT = `ROLE & PERSONA:
You are an experienced Ocean Freight Import Operator (OP) working for a Freight Forwarder.
Your job is to manage inbound shipments by processing emails from Overseas Agents, Ocean Carriers, and Customers.

CORE RESPONSIBILITY: "PRE-ALERT" vs "ARRIVAL NOTICE"
You must distinguish between two critical document types based on the SENDER:

1. **PRE-ALERT** (New Business)
   - **Sender**: Overseas Agent (e.g., Master Log, World Freight, Partner Agents).
   - **Content**: Often includes House BL (HBL), Master BL (MBL), and an "Arrival Notice" attachment *from the Carrier* (sent to the agent).
   - **Intent**: The agent is telling us "Here is a new shipment coming to you."
   - **Action**: CREATE a new shipment record (NEW_FREEHAND_INTENT).
   - **Rule**: If the sender is an Agent, allowing creating a new shipment even if the attachment is an "Arrival Notice".

2. **CARRIER ARRIVAL NOTICE** (Update Existing)
   - **Sender**: Ocean Carrier (e.g., Evergreen, OOCL, ONE, COSCO).
   - **Content**: Official Arrival Notice (AN) addressed to us (the Consensus Consignee).
   - **Intent**: The carrier is telling us "The vessel is arriving, pay us and pick up cargo."
   - **Action**: UPDATE an existing shipment (CARRIER_AN).
   - **Rule**: We NEVER create a new shipment from a Carrier AN. We only attach it to an existing file. If shipment not found for a Carrier AN, it is an ALERT case.

TASK:
1. Identify the Sender (Name, Email Domain, Signature).
2. Classify the Email Type based on the logic above.
3. Extract Shipment Data (MBL, HBL, Container, Vessel, ETA).
4. Cross-reference with "EXISTING SHIPMENTS" database.

COMMUNICATION PROTOCOL (Rules of Engagement):
- **Scenario 1: Received Pre-alert from Overseas Agent**
  - **Action**: You must draft a reply to the **Overseas Agent** (the Sender).
  - **Subject**: RE: [Original Subject] (e.g., "RE: DOC BY SH26010007...")
  - **Body**: "Well Received. Thank you." or similar professional acknowledgment.
  - **To**: Sender's Email (Agent).
  - **CC**: Only if originally CC'd. **DO NOT** add the Customer/Consignee at this stage. (We do not expose the Agent to the Customer directly).

- **Scenario 2: Received Carrier Arrival Notice**
  - **Action**: No immediate email reply needed to Carrier.
  - **Internal Action**: Update system status.

CRITICAL: BATCH PROCESSING
- The PDF may contain MULTIPLE shipments. Iterate through ALL pages.
- Create a separate entry in 'processed_shipments' for each unique MBL/HBL pair.

CRITICAL: MBL/HBL GROUPING
- Group MBL and HBL for the same shipment into ONE entry.
- MBL = Carrier SCAC (4 letters) + Numbers (e.g., EGLV123456).
- HBL = Forwarder Reference (e.g., SH2601...).

CRITICAL: FINANCIALS (CHARGES)
- Look for "Debit Note", "Credit Note", "Invoice", or "Freight Charges" in attachments or body.
- Extract every charge line item (Ocean Freight, AMS, DDC, etc.).
- Determine if "Prepaid" or "Collect".
- If specific amounts are found, populate the 'financials' object.

CRITICAL: NO REPETITION
- Do not repeat vessel names or voyage numbers (e.g., "Vessel A V.100").

OUTPUT:
- Return ONLY valid JSON matching the schema.`;

// Get API Key from environment variable
export const getApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
};

export async function processEmailWithAgent(apiKey, emailData, existingShipments = []) {
    const key = apiKey || getApiKey();

    if (!key || key === 'YOUR_API_KEY_HERE') {
        throw new Error('請在 .env 文件中設置 VITE_GEMINI_API_KEY');
    }

    // Format Existing Shipments for Context
    // FILTER: Only Active Shipments (Ignore Completed)
    const activeShipments = existingShipments.filter(s => s.status !== 'completed');

    const shipmentContext = activeShipments.map(s => ({
        id: s.id,
        ref: s.reference,
        bl: s.bl,
        container: s.container,
        status: s.status,
        customer: s.customer
    }));
    const shipmentContextStr = JSON.stringify(shipmentContext, null, 2);

    // Combine: System Prompt (大腦) + Agent Skill (工具) + Email Content
    const prompt = `## SYSTEM INSTRUCTIONS(大腦)
${SYSTEM_PROMPT}

---

## DATABASE(EXISTING SHIPMENTS)
${shipmentContextStr}

---

## FREE - HAND AGENT SKILL POLICY(工具)
${AGENT_SKILL_MD}

---

## EMAIL TO PROCESS

FROM: ${emailData.from}
SUBJECT: ${emailData.subject}

BODY:
${emailData.body}

${emailData.attachments?.length > 0 ? `ATTACHMENTS:\n${emailData.attachments.map(a => `- ${a.name} (${a.type})`).join('\n')}` : 'No attachments'}

---

    Now process this email.
Returns structured JSON.`;

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
                    text: `\n\nATTACHMENT FILE: ${att.name} \nCONTENT(Parsed Excel): \n${JSON.stringify(att.content, null, 2)} \n`
                });
            }
        });
    }

    try {
        const apiUrl = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;
        console.log('📧 Processing email with Agent (Structured JSON Mode)...');
        console.log('Subject:', emailData.subject);
        console.log(`📎 Attachments: ${emailData.attachments?.length || 0}`);
        console.log('Using Model:', GEMINI_MODEL);

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
                    temperature: 0.0, // Strict deterministic output
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                    responseSchema: RESPONSE_SCHEMA
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

        console.log('📝 Raw JSON response:', textContent.substring(0, 100) + '...');

        // Payload cleaning (Remove markdown code blocks if present)
        let cleanedText = textContent.trim();
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        // Directly parse JSON
        try {
            const result = JSON.parse(cleanedText);
            console.log('✅ Parsed successfully. Action:', result.action?.type);
            console.log('🧠 Reasoning:', result.reasoning?.substring(0, 100));
            return result;
        } catch (e) {
            console.error('❌ JSON Parse Error:', e);
            console.log('Faulty Content:', textContent);

            // Check for common hallucination patterns (e.g., repetition)
            if (textContent.length > 5000 && /(.{10,})\1{5,}/.test(textContent)) {
                throw new Error('Agent hallucinated (repetitive loop). Please retry.');
            }

            throw new Error('Failed to parse Agent JSON: ' + e.message);
        }

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
