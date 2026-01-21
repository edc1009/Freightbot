// Gemini API Service
// API Key is loaded from environment variable VITE_GEMINI_API_KEY
// Or can be passed directly to functions

const GEMINI_MODEL = 'gemini-3-pro-preview';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Import Agent Skill from root directory (工具)
import AGENT_SKILL_MD from '../../../agentops-skill.md?raw';

// Defined Output Schema for Structured JSON
const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        thought_start: {
            type: "STRING",
            description: "Concise initial thought (Max 2 sentences). E.g. 'Found MBL and HBL. Identifying Consignee...'"
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
                    action: { type: "STRING", enum: ["CREATE", "UPDATE", "ESCALATE"], description: "Proposed action. Use ESCALATE if Carrier AN but no matching shipment found." },
                    playbook: {
                        type: "STRING",
                        enum: ["import-fcl", "import-lcl", "free-hand"],
                        description: "DEFAULT='free-hand'. ONLY use 'import-fcl' if EMAIL BODY explicitly says 'Please file ISF' or 'ISF needed'. Seeing 'ISF' in a form field does NOT count."
                    },
                    extracted_data: {
                        type: "OBJECT",
                        description: "Data specific to this shipment extracted from its page/section",
                        properties: {
                            origin: { type: "STRING", nullable: true, description: "Max 100 chars. e.g. 'SHANGHAI'." },
                            destination: { type: "STRING", nullable: true, description: "Max 100 chars. e.g. 'LONG BEACH, CA'." },
                            vessel: { type: "STRING", nullable: true, description: "Max 50 chars. Strict Format: 'VESSEL_NAME VOYAGE'. NO REPETITION. Example: 'OOCL BRUSSELS 067E'." },
                            voyage: { type: "STRING", nullable: true, description: "Max 20 chars." },
                            eta: { type: "STRING", nullable: true },
                            etd: { type: "STRING", nullable: true },
                            bl_number: { type: "STRING", nullable: true },
                            hbl_number: { type: "STRING", nullable: true, description: "House Bill of Lading (if distinct from MBL)" },
                            booking_number: { type: "STRING", nullable: true },
                            firms_code: { type: "STRING", nullable: true, description: "CY Location / FIRMS Code" },
                            container_number: { type: "STRING", nullable: true },
                            weight: { type: "STRING", nullable: true },
                            volume: { type: "STRING", nullable: true },
                            package_count: { type: "STRING", nullable: true },
                            shipper: { type: "STRING", nullable: true, description: "Shipper name and address" },
                            consignee: { type: "STRING", nullable: true, description: "Consignee name and address" },
                            notify_party: { type: "STRING", nullable: true, description: "Notify party name and address" }
                        }
                    }
                },
                required: ["reference", "match_result", "action"]
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
        shipment_data: {
            type: "OBJECT",
            description: "Extracted shipment details. CROSS-REFERENCE all attachments. If Image says TBD but PDF has valid data, use the PDF data.",
            properties: {
                origin: { type: "STRING", nullable: true, description: "Max 100 chars. e.g. 'SHANGHAI'." },
                destination: { type: "STRING", nullable: true, description: "Max 100 chars. e.g. 'LONG BEACH, CA'." },
                vessel: { type: "STRING", nullable: true, description: "Max 50 chars. Strict Format: 'VESSEL_NAME VOYAGE'. NO REPETITION. Example: 'OOCL BRUSSELS 067E'." },
                voyage: { type: "STRING", nullable: true, description: "Max 20 chars." },
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
                payments: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            amount: { type: "STRING" },
                            currency: { type: "STRING" },
                            reference: { type: "STRING", description: "Check # or Wire Ref" },
                            type: { type: "STRING", enum: ["CHECK", "WIRE", "CREDIT", "OTHER"] }
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
        },
        reasoning: {
            type: "STRING",
            description: "Detailed step-by-step reasoning. MUST explain where each piece of data was found. Place this AT THE END."
        }
    },
    required: ["thought_start", "processed_shipments", "email_analysis", "action", "reasoning"]
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

CRITICAL: MATCHING LOGIC (FUZZY MATCH)
- **Hiearchy**: Match in this order:
  1. **MBL** (Master Bill) - Primary Key.
  2. **HBL** (House Bill) - Secondary Key.
  3. **Container Number** - Strong Signal.
- **Normalization**: When comparing, IGNORE spaces, dashes, dots, and case.
  - Example: "NYKU-123 456" matches "NYKU123456".
- **Logic**: If MBL is missing in the document, try to match by HBL or Container.

CRITICAL: PLAYBOOK CLASSIFICATION (FREE-HAND IS DEFAULT)
- **DEFAULT BEHAVIOR**: Always use playbook = "free-hand" unless you find EXPLICIT evidence otherwise.
- **ONLY use import-fcl** if ALL of these conditions are met:
  1. The EMAIL BODY (not attachments!) explicitly requests ISF filing.
  2. The request uses action words like: "Please file ISF", "ISF needed", "Require ISF filing", "File ISF for this shipment".
- **DO NOT classify as import-fcl** if you only see:
  - "ISF" in a form field, table header, or checkbox
  - "ISF: N/A", "ISF: TBD", "ISF filed by shipper"
  - "ISF" anywhere in an attachment (PDF, image, etc.)
  - Any other passive mention of ISF
- **When in doubt, use "free-hand".** This is a SAFETY DEFAULT.

CRITICAL: CARRIER AN RULE (NO CREATE)
- **Constraint**: If document is "Arrival Notice" from a CARRIER:
  - You must **NEVER** return action "CREATE".
  - If a matching shipment (by MBL, HBL, or Container) is found -> Action: "UPDATE".
  - If NO matching shipment is found -> Action: "ESCALATE" (Reason: "Carrier AN received but no matching shipment found in database").

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
- **SAFETY**: Carrier Invoices are COSTS. Do not present them as Revenue without review. All financial actions must be APPROVE.

CRITICAL: PAYMENT RECEIPTS (REVENUE)
- If document is from Customer/Agent proving payment (Wire, Check, Slip):
- DO NOT extract as a "Charge". Extract into 'payments' array.
- If amount covers multiple shipments (Bulk), record full amount but note "Bulk" in reference.
- Action: UPDATE_STATUS with Authority: APPROVE.

CRITICAL: CONSIGNEE SELECTION (DOMAIN LOGIC)
- We are the Forwarder (Agent).
- If MBL Consignee is "Pioneer" or "The Forwarder" -> IGNORE IT for the Shipment Record.
- **ALWAYS** pick the Consignee from the **HBL (House Bill)**. This is the real customer.
- **HBL EXTRACTION**: On the HBL, look specifically for "Notify Party" and "Consignee" fields. They might be labeled "Consigned to", "Notify", or "Notify Address". Capture the Full Name for both.
- **CARRIER AN HANDLING**: When processing a Carrier AN, the "Consignee" listed is almost always US (the Forwarder). **DO NOT** use this as the Shipment Consignee.
     - Extract FIRMS CODE (Location) and ETA from AN.
     - If the AN lists a Consignee that matches the Forwarder (e.g. "Consensus", "Pioneer"), **EXPLICITLY IGNORE** it for the 'consignee' field. Leave it null if not found on HBL.
- If forwarding an AN, rename it to "Arrival Notice - [HBL Number]" instead of the Carrier's filename.

CRITICAL: NO REPETITION
- Do not repeat vessel names or voyage numbers (e.g., "Vessel A V.100").
- **CRITICAL**: The 'vessel' field MUST be concise, e.g., "OOCL BRUSSELS 067E". NEVER repeat the voyage number (e.g., "067E/V.067E/067E..."). If you see yourself repeating, STOP immediately.

ONE-SHOT REASONING EXAMPLE (GOLD STANDARD):
"Reviewing document 'AN.pdf'. Found MBL: EGLV123456, HBL: SH999.
Matching: Found existing shipment SH999 in DB (Matched via HBL).
Decision: Update existing shipment SH999.
Checking Consignee: MBL lists 'Pioneer Global' (US). HBL lists 'Target Stores' (Customer).
Decision: Ignore MBL Consignee. Use 'Target Stores' as Shipment Consignee.
Checking Vessel: OCR reads 'OOCL BRUSSELS V.067E / VOY 067E'.
Self-Correction: Extract simplified format: 'OOCL BRUSSELS 067E'.
Checking Charges: Carrier AN lists $500 Ocean Freight.
Decision: This is Cost. Authority: APPROVE.
Final Action: UPDATE SH999."

OUTPUT:
- Return ONLY valid JSON matching the schema.
- **CONSTRAINT**: Keep the "reasoning" field CONCISE (under 500 words). Do not repeat the same analysis.
- **CONSTRAINT**: Each string field (vessel, origin, destination) MUST be under 100 characters. If you find yourself writing more, STOP and summarize.`;

// Get API Key from environment variable
// Get API Key from environment variable
export const getApiKey = () => {
    // Priority: Vite env (Browser/Dev) -> Process env (Node/Test)
    try {
        if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
            return import.meta.env.VITE_GEMINI_API_KEY;
        }
    } catch (e) {
        // Ignore, explicit fallback
    }

    try {
        // Safe check for process.env
        if (typeof process !== 'undefined' && process?.env?.VITE_GEMINI_API_KEY) {
            return process.env.VITE_GEMINI_API_KEY;
        }
    } catch (e) {
        // Ignore
    }

    return '';
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
        hbl: s.hbl,
        container: s.container_number || s.container,
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

    // Retry Logic Configuration
    const MAX_RETRIES = 2;
    let attempt = 0;

    // Import validator inside function to avoid top-level await issues if any
    const { validateAgentOutput } = await import('./outputValidator.js');

    while (attempt <= MAX_RETRIES) {
        attempt++;
        try {
            const apiUrl = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;
            console.log(`📧 Processing email with Agent (Attempt ${attempt}/${MAX_RETRIES + 1})...`);

            // If retry, append error instruction to the last part
            if (attempt > 1) {
                console.warn('⚠️ Retrying with stricter instruction...');
                parts.push({
                    text: `\n\nPREVIOUS ATTEMPT FAILED VALIDATION.\nERROR: The previous JSON output was invalid or contained repetitive loops.\nINSTRUCTION: Please correct the JSON. Ensure 'vessel' and 'reasoning' fields are CONCISE. Do not repeat text.`
                });
            }

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
                        maxOutputTokens: 16384,
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

            const textContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
                throw new Error('No text in response');
            }

            console.log('📝 Raw JSON received. Validating...');

            let result;
            try {
                // Basic JSON Parse
                result = JSON.parse(textContent);
            } catch (e) {
                console.error('❌ JSON Parse Error:', e);

                // Attempt to repair JSON if it's an "Unterminated string" or similar syntax error
                if (e.message.includes('Unterminated') || e.message.includes('End of data')) {
                    console.warn('🔧 Attempting to repair truncated JSON...');
                    const repaired = tryRepairJson(textContent);
                    if (repaired) {
                        try {
                            result = JSON.parse(repaired);
                            console.log('✅ JSON Repaired successfully.');
                        } catch (repairErr) {
                            console.error('❌ Repair failed:', repairErr);
                        }
                    }
                }

                if (!result) {
                    // If still no result, and we have retries left, throw to trigger retry loop
                    if (attempt <= MAX_RETRIES) {
                        // Add specific context for the retry
                        const errorMsg = e.message.includes('Unterminated')
                            ? "OUTPUT_TOO_LONG: Your response was cut off. You MUST summarize 'reasoning' and 'extracted_data' more drastically. Do NOT return full document text."
                            : "INVALID_JSON: Your output was not valid JSON. Please ensure all strings are escaped and structure is correct.";

                        // Pass this specific error to the next loop iteration via a variable or by modifying 'parts' immediately?
                        // We'll modify 'parts' for the next iteration here.
                        parts.push({
                            text: `\n\nPREVIOUS ATTEMPT FAILED.\nERROR: ${errorMsg}\nINSTRUCTION: Return ONLY valid, complete JSON. Keep it short.`
                        });
                        continue;
                    }
                    throw e;
                }
            }

            // Zod Schema Validation
            const validation = validateAgentOutput(result);
            if (!validation.success) {
                console.error('❌ Zod Validation Failed:', validation.error.message);

                // Construct a helpful error message for the model
                const errorDetails = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
                console.log('Validation Details:', errorDetails);

                if (attempt > MAX_RETRIES) {
                    throw new Error(`Agent output invalid after ${MAX_RETRIES + 1} attempts: ${errorDetails}`);
                }

                parts.push({
                    text: `\n\nPREVIOUS ATTEMPT FAILED VALIDATION.\nERROR: ${errorDetails}\nINSTRUCTION: Correct the data to match the schema.`
                });
                continue; // Retry with error context
            }

            console.log('✅ Zod Validation Passed.');
            console.log('✅ Parsed successfully. Action:', result.action?.type);
            console.log('🧠 Reasoning:', result.reasoning?.substring(0, 100));
            return result;

        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            if (attempt > MAX_RETRIES) throw error;
        }
    }
}

// Simple Best-Effort JSON Repair (Truncated Strings/Arrays)
function tryRepairJson(jsonStr) {
    let trimmed = jsonStr.trim();
    // If it ends attempting to close a string but fails
    // This is a naive implementation; for production, a proper library like 'jsonrepair' is better.
    // However, since we can't install packages, we do basic fixes.

    // 1. Close open string
    // Count quotes to see if the last one is open?
    // It's hard to do perfectly without a parser. 
    // Strategy: Just try to close objects iteratively.

    // If it end with a trailing comma, remove it
    if (trimmed.endsWith(',')) trimmed = trimmed.slice(0, -1);

    // Count open braces/brackets
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    let repaired = trimmed;

    // Close strings if the last char isn't a quote (approximate)
    // This is dangerous without context, skip string repair for now, focus on structural.

    // Close arrays/objects
    for (let i = 0; i < (openBraces - closeBraces); i++) repaired += "}";
    for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += "]";

    // Check if we need to close a quote first? 
    // If the error was "Unterminated string", we probably need to close a quote.
    // Let's rely on the RETRY logic primarily, using this only if it's a minor structural miss.

    return repaired;
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
