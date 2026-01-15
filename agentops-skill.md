# Free-hand Agent Skill (Gemini 3 API) — v0.1

## Scope
This skill covers ONLY the **free-hand** playbook:
- We handle: Arrival Notice (AN) + Invoice → Payment follow-up → Freight Release request (human)
- We do NOT handle: trucking booking, customs brokerage execution, warehouse scheduling

If the email implies full-service import (trucking/customs/warehouse), this skill MUST escalate.

---

## Parties
- OVERSEAS_AGENT: partner forwarder abroad
- CUSTOMER: shipper/consignee/cargo owner
- CARRIER: shipping line / airline
- INTERNAL: colleagues/accounting

---

## Authority Levels
- AUTO: safe to execute without approval (log/status updates, reminders)
- APPROVE: draft required, human approves one click (customer-facing replies, invoices/AN)
- MANUAL: do not draft or execute; flag for human

---

## Shipment Matching & New Shipment Rule (Critical)

### Reference types (detect any)
- BL_NUMBER: 4 letters (SCAC) + alphanumeric (e.g., COSU6123456789)
- CONTAINER_NUMBER: 4 letters + 7 digits (e.g., MSCU1234567)
- BOOKING_NUMBER: carrier booking references (varies)
- PO_NUMBER / REF: customer reference

### Matching workflow (must follow)
1. Extract references from email text/subject/attachments filenames.
2. Attempt to match an existing shipment using references.
3. If match result is **FOUND** → treat as existing shipment (shipment.is_new=false).
4. If match result is **NOT_FOUND** AND at least one reference exists → treat as **new shipment initiation** and propose **CREATE_SHIPMENT** (skeleton allowed).
5. If no reference exists → classify intent; if uncertain, ESCALATE.

> Skeleton allowed = create minimal record with references + parties + playbook=free-hand, leave unknown fields null.

---

## Email Classification (Free-hand only)

### Types
- NEW_FREEHAND_INTENT: first email that initiates a free-hand shipment (often from overseas agent)
- CARRIER_AN: arrival notice / discharge / availability notice
- STATUS_UPDATE: schedule change, ETA update, rolled, delayed, gate-out
- PAYMENT_CONFIRM: payment received / remittance advice
- PAYMENT_FOLLOWUP: chasing payment / overdue / reminder
- INQUIRY: “please check ETA / status / release”
- COMPLAINT: angry / claim / legal threats
- INTERNAL_REQUEST: colleague asks you to handle
- FYI_NO_ACTION: informational only
- UNKNOWN: cannot determine

### Classification hints
- NEW_FREEHAND_INTENT:
  - Sender is OVERSEAS_AGENT and mentions “prepaid / nominated / destination handling / please issue AN / please collect payment”
  - Has BL/container/booking ref but no existing match found
- CARRIER_AN:
  - “Arrival Notice”, “AN”, “Discharged”, “Available”, “DO/Release”, “Freight Release”, attachments like AN.pdf
- STATUS_UPDATE:
  - “ETA change”, “delay”, “rolled”, “vessel schedule”, “time change”
- PAYMENT_CONFIRM:
  - “paid”, “wire sent”, “remittance”, “payment received”
- PAYMENT_FOLLOWUP:
  - “overdue”, “past due”, “please pay”, “payment reminder”
- If confidence < 0.70 → UNKNOWN + ESCALATE

---

## Free-hand Playbook (Steps)

### Step 1 — Order Intake (create/match shipment)
Trigger:
- NEW_FREEHAND_INTENT, or references present with NOT_FOUND match

Actions:
- CREATE_SHIPMENT (APPROVE) — skeleton allowed
- SEND_EMAIL acknowledgment to overseas agent/customer if needed (APPROVE)

### Step 2 — Await Carrier AN
Trigger:
- shipment exists, waiting for AN

Actions:
- UPDATE_STATUS (AUTO)
- SCHEDULE_REMINDER (AUTO) if no updates after threshold

### Step 3 — Send AN + Invoice
Trigger:
- CARRIER_AN received OR AN attachment detected

Actions:
- UPDATE_STATUS (AUTO)
- SEND_EMAIL draft to customer with AN + invoice request (APPROVE)

### Step 4 — Payment Collection
Trigger:
- invoice sent and awaiting payment OR PAYMENT_FOLLOWUP email comes in

Actions:
- SEND_EMAIL payment reminder draft (APPROVE) based on overdue rules
- SCHEDULE_REMINDER (AUTO)
- ESCALATE (MANUAL) if overdue too long or dispute

### Step 5 — Freight Release (human)
Trigger:
- PAYMENT_CONFIRM received

Actions:
- UPDATE_STATUS (AUTO)
- ESCALATE (MANUAL): “Payment confirmed, please perform freight release / DO steps”  
  (Reason: physical/credentialed action; keep human in loop)

---

## Allowed Action Types (Whitelist)
- CREATE_SHIPMENT (APPROVE only)
- UPDATE_STATUS (AUTO)
- SEND_EMAIL (APPROVE unless INTERNAL + FYI)
- REQUEST_INFO (APPROVE) — ask for missing info (e.g., consignee, invoice contact)
- SCHEDULE_REMINDER (AUTO)
- ESCALATE (MANUAL)

If an email would require trucking/customs/warehouse booking:
- action must be ESCALATE (MANUAL)

---

## Escalation Rules (must stop & escalate)

### Financial
- Invoice amount disputed or unclear
- Request to change payment terms / credit
- High-value payments (configurable): `MAX_AUTO_PAYMENT_AMOUNT = 10000`
- Overdue > `OVERDUE_DAYS_THRESHOLD = 30`

### Legal / Complaint
- “lawyer / lawsuit / claim / attorney”
- Very angry tone or explicit complaint

### Operational exceptions
- Cargo damage / shortage / misdelivery
- Customs hold/exam (even if “not our scope”)
- DG / Hazmat mentioned

### Ambiguity
- Multiple shipments referenced in one email
- Contradictory references
- Confidence < `CONFIDENCE_THRESHOLD = 0.70`

---

## Reminder Rules (Free-hand)
- Waiting for carrier AN > 7 days since intake → remind internal ops (AUTO)
- Payment reminder:
  - > 3 days after invoice → reminder draft (APPROVE)
  - > 7 days after invoice → ESCALATE (MANUAL)

Config defaults:
- PAYMENT_REMINDER_DAYS = 3
- PAYMENT_ESCALATE_DAYS = 7

---

## Output JSON Schema (single source of truth)

Return ONLY JSON matching this schema:

```json
{
  "email_analysis": {
    "type": "NEW_FREEHAND_INTENT | CARRIER_AN | STATUS_UPDATE | PAYMENT_CONFIRM | PAYMENT_FOLLOWUP | INQUIRY | COMPLAINT | INTERNAL_REQUEST | FYI_NO_ACTION | UNKNOWN",
    "sender": { "email": "string", "name": "string|null", "party_type": "OVERSEAS_AGENT | CUSTOMER | CARRIER | INTERNAL | UNKNOWN" },
    "confidence": 0.0,
    "summary": "string"
  },
  "shipment_match": {
    "references_found": {
      "bl_number": "string|null",
      "container_number": "string|null",
      "booking_number": "string|null",
      "po_number": "string|null"
    },
    "match_result": "FOUND | NOT_FOUND | NOT_ATTEMPTED",
    "shipment_id": "string|null",
    "is_new": true
  },
  "playbook": {
    "selected": "free-hand",
    "current_step": 1,
    "step_name": "Order Intake | Await Carrier AN | Send AN + Invoice | Payment Collection | Freight Release"
  },
  "action": {
    "type": "CREATE_SHIPMENT | UPDATE_STATUS | SEND_EMAIL | REQUEST_INFO | SCHEDULE_REMINDER | ESCALATE",
    "authority": "AUTO | APPROVE | MANUAL",
    "description": "string"
  },
  "email_draft": {
    "should_send": true,
    "to": ["string"],
    "cc": ["string"],
    "subject": "string",
    "body": "string",
    "attachments": ["string"]
  },
  "status_update": {
    "should_update": true,
    "new_status": "new | waiting_an | an_sent_waiting_payment | payment_overdue | payment_received | release_pending | closed | alert",
    "notes": "string"
  },
  "escalation": {
    "required": false,
    "reason": "string",
    "urgency": "LOW | MEDIUM | HIGH"
  },
  "reminders": [
    { "after_days": 0, "purpose": "string" }
  ]
}
Output rules

If no email should be sent: set email_draft.should_send=false and keep other fields valid.

If action is ESCALATE: set escalation.required=true and provide a concrete reason.

Never output empty top-level keys; always include all top-level keys in schema.

Minimal “New Free-hand” creation rule (practical)

If:

sender.party_type == OVERSEAS_AGENT

AND (bl/container/booking/po exists)

AND match_result == NOT_FOUND

Then:

email_analysis.type = NEW_FREEHAND_INTENT

action.type = CREATE_SHIPMENT

action.authority = APPROVE

shipment_match.is_new = true

playbook.selected = free-hand

step = 1 (Order Intake)