import { z } from 'zod';

// Helper to detect unwanted repetition
const detectRepetition = (val) => {
    if (!val) return true;
    // Check for "067E/V.067E/067E..." pattern (3+ repeats)
    if (val.length > 50 && /(.{4,})\1{2,}/.test(val)) {
        return false;
    }
    return true;
};

// Define Zod Schema mirroring the API JSON Schema
export const AgentResponseSchema = z.object({
    thought_start: z.string().max(500).optional(),

    shipment_data: z.object({
        origin: z.string().max(100).nullable().optional(),
        destination: z.string().max(100).nullable().optional(),
        vessel: z.string().max(100).nullable().optional()
            .refine(detectRepetition, { message: "Vessel name contains repetitive pattern loop." }),
        voyage: z.string().max(50).nullable().optional(),
        eta: z.string().nullable().optional(),
        etd: z.string().nullable().optional(),
        bl_number: z.string().max(50).nullable().optional(),
        container_number: z.string().nullable().optional(),
        booking_number: z.string().nullable().optional(),
        firms_code: z.string().nullable().optional(),
        weight: z.string().nullable().optional(),
        volume: z.string().nullable().optional(),
        package_count: z.string().nullable().optional()
    }).optional(),

    email_analysis: z.object({
        type: z.enum([
            "NEW_FREEHAND_INTENT", "CARRIER_AN", "STATUS_UPDATE",
            "PAYMENT_CONFIRM", "PAYMENT_FOLLOWUP", "INQUIRY",
            "COMPLAINT", "INTERNAL_REQUEST", "FYI_NO_ACTION", "UNKNOWN"
        ]),
        sender: z.object({
            email: z.string(),
            name: z.string().nullable().optional(),
            party_type: z.enum(["OVERSEAS_AGENT", "CUSTOMER", "CARRIER", "INTERNAL", "UNKNOWN"])
        }),
        confidence: z.number().optional(),
        summary: z.string().optional()
    }),

    processed_shipments: z.array(z.object({
        reference: z.string().max(200),
        match_result: z.enum(["FOUND", "NOT_FOUND"]),
        shipment_id: z.string().nullable().optional(),
        action: z.enum(["CREATE", "UPDATE", "ESCALATE"]),
        extracted_data: z.object({
            origin: z.string().max(100).nullable().optional(),
            destination: z.string().max(100).nullable().optional(),
            vessel: z.string().max(100).nullable().optional()
                .refine(detectRepetition, { message: "Vessel name contains repetitive pattern loop." }),
            eta: z.string().nullable().optional(),
            bl_number: z.string().nullable().optional(),
            hbl_number: z.string().nullable().optional(),
            firms_code: z.string().nullable().optional(),
            container_number: z.string().nullable().optional(),
            shipper: z.string().nullable().optional(),
            consignee: z.string().nullable().optional(),
            notify_party: z.string().nullable().optional()
        }).optional()
    })).optional(),

    playbook: z.object({
        selected: z.string(),
        current_step: z.number(),
        step_name: z.string()
    }).optional(),

    action: z.object({
        type: z.enum(["CREATE_SHIPMENT", "UPDATE_STATUS", "SEND_EMAIL", "REQUEST_INFO", "SCHEDULE_REMINDER", "ESCALATE"]),
        authority: z.enum(["AUTO", "APPROVE", "MANUAL"]),
        description: z.string()
    }).optional(),

    email_draft: z.object({
        should_send: z.boolean(),
        to: z.array(z.string()).optional(),
        cc: z.array(z.string()).optional(),
        subject: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
        attachments: z.array(z.string()).optional()
    }).optional(),

    status_update: z.object({
        should_update: z.boolean(),
        new_status: z.string().nullable().optional(),
        notes: z.string().nullable().optional()
    }).optional(),

    escalation: z.object({
        required: z.boolean(),
        reason: z.string().nullable().optional(),
        urgency: z.string().nullable().optional()
    }).optional(),

    financials: z.object({
        charges: z.array(z.object({
            description: z.string().optional(),
            amount: z.string().optional(),
            currency: z.enum(["USD", "EUR", "CNY", "TWD"]).optional(),
            prepaid_or_collect: z.enum(["Prepaid", "Collect"]).optional(),
            payer: z.string().nullable().optional()
        })).optional(),
        payments: z.array(z.object({
            amount: z.string().optional(),
            currency: z.string().optional(),
            reference: z.string().optional(),
            type: z.string().optional()
        })).optional(),
        total_amount: z.string().nullable().optional()
    }).optional(),

    reminders: z.array(z.object({
        after_days: z.number(),
        purpose: z.string()
    })).optional()
}).passthrough(); // Allow extra fields if model adds reasoning, etc.

export const validateAgentOutput = (jsonData) => {
    return AgentResponseSchema.safeParse(jsonData);
};
