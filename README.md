# Project Story: The AI-Powered Freight Assistant

## Inspiration
I currently work as a Product Manager at a freight forwarder, where daily operations rely heavily on **Operations Specialists (OPs)**. An OP handles the entire lifecycle of a shipment—from container loading to customs clearance and trucking. This process relies heavily on manual email communication, which is time-consuming and prone to human error.

In this industry, errors translate directly into financial losses. For example:
* **Arrival Notice Delays:** Can lead to port demurrage fees ranging from **$300** to **$500** per container.
* **Late Customs Filings:** Can result in fines as high as **$5,000**.

The primary revenue model for freight forwarders is based on service fees and commissions. This is directly linked to OP performance. Even the most senior OPs average between **$7,000** and **$10,000** in annual fines. This product was built to improve this high-risk, human-dependent profit model.



## What it does
Imagine a 24/7 digital OP. Upon receiving an email, the agent analyzes the intent based on pre-defined "agent skills." It parses the subject, body, and attachments to take action:
1.  **New Orders:** Automatically creates a shipment in the internal system based on attached files.
2.  **Carrier Arrival Notices:** Instantly generates and sends the forwarder’s own Arrival Notice to the consignee (preventing those late fees!).
3.  **Customs Coordination:** Automatically syncs data with customs brokers based on client documentation.

## How I built it
I started by mapping out the workflows for different shipment types (Import FCL, Import LCL, etc.). I then designed a **Permission and Responsibility Hierarchy**, separating actions into "Auto-executable" and "Requires Approval" to ensure risk control.

The architecture positions the AI as a "Senior OP Assistant." I chose **Gemini 3** for three specific reasons:
* **Multimodal Context:** It processes email text, PDFs, and images simultaneously.
* **Long Context Reasoning:** I can feed the entire domain playbook (e.g., MBL vs. HBL rules) into the system prompt.
* **Structured JSON Output:** It supports strict schema constraints, ensuring responses map to executable business logic.

Every output must follow a defined schema:
$$Action \in \{CREATE, UPDATE, ESCALATE, APPROVE\}$$

## Challenges we ran into
1.  **Domain Ambiguity:** Documents often contain both Master Bill of Lading (MBL) and House Bill of Lading (HBL) data. Distinguishing between them requires deep logic, not just field extraction.
2.  **Alignment Issues:** A single email might contain one PDF that covers multiple containers or several HBLs. The system must accurately "de-batch" these.
3.  **Automation vs. Risk:** We intentionally kept $20\%$ of the process—the high-risk "last mile"—under human control to protect the business.
4.  **The "Demo vs. Reality" Gap:** Real-world info isn't always in the email (e.g., a phone call update). I added a manual "Edit" function to allow OPs to patch information manually.

## Accomplishments that we're proud of
* **Accuracy:** The model maintains a **95%** confidence level in shipment identification.
* **Efficiency:** We reduced the average workflow time by **40%**, with complex scenarios seeing improvements of up to **55%**.
* **User Feedback:** Our first-line OPs gave us an **NPS of 9**. Management gave an **8**, focusing on commercial scaling and liability.

## What I learned
I learned to integrate business and profitability logic early. I calculated the unit economics from day one:
* **LLM API Cost:** $\approx \$0.01$ per shipment.
* **Estimated Total Cost:** $\approx \$2.00 - \$3.00$ per shipment (including 3rd-party APIs).

This led me to a **"Charge per Shipment"** model rather than a subscription, aligning costs directly with the value provided.

## What's next for Freightbot
* **Product Roadmap:** Support more shipment types and implement an "Agent Browser" function for various FMS.
* **Business:** Move to GTM (Go-To-Market). I will start by onboarding our internal OP teams before expanding to external vendors.
