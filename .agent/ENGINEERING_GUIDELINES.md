# Engineering Guidelines: Cross-File Dependencies

## ⚠️ Critical: Playbook Classification System

When modifying anything related to **Playbook Classification**, you MUST update ALL of these files:

### 1. Agent Prompt Layer
| File | What to Update |
|------|----------------|
| `geminiService.js` | System Prompt rules + Schema `playbook` enum/description |
| `agentops-skill.md` | Classification Hints section |
| `outputValidator.js` | Zod schema for `playbook` field |

### 2. UI Rendering Layer
| File | What to Update |
|------|----------------|
| `constants/index.js` | `PLAYBOOKS` object (step definitions), `stepLabels`, `stepIcons` |
| `ShipmentDetailModal.jsx` | `PendingActionsSection` ISF logic, `PlaybookTimeline` |
| `ActionCenter.jsx` | ISF synthesis logic |
| `ShipmentCard.jsx` | Playbook display |

### 3. Data Layer
| File | What to Update |
|------|----------------|
| `App.jsx` | Shipment creation/update logic (field mapping) |
| `data/index.js` | Sample data (if applicable) |

---

## Checklist: Adding a New Field

Example: Adding a new extracted field like `notify_party`

1. [ ] **Schema**: Add to `geminiService.js` → `RESPONSE_SCHEMA.extracted_data`
2. [ ] **Validator**: Add to `outputValidator.js` → Zod schema
3. [ ] **App Mapping**: Add explicit mapping in `App.jsx` → `handleProcessEmail()`
4. [ ] **UI Display**: Add to `ShipmentDetailModal.jsx` → render section
5. [ ] **Test**: Verify with real document

---

## Checklist: Modifying Playbook Logic

Example: Changing when ISF Filing shows

1. [ ] **Agent Prompt**: Update `geminiService.js` SYSTEM_PROMPT
2. [ ] **Skill Doc**: Update `agentops-skill.md` Classification Hints
3. [ ] **Schema Description**: Update `playbook.description` in Schema
4. [ ] **UI - Modal**: Update `ShipmentDetailModal.jsx` → `PendingActionsSection`
5. [ ] **UI - ActionCenter**: Update `ActionCenter.jsx` → `needsISF` filter
6. [ ] **Test**: Verify with test documents

---

## Known Coupling Points

### ISF Filing Display Logic
The ISF Filing action appears based on:
- `ShipmentDetailModal.jsx` L669-677: Checks `playbook === 'import-fcl'`
- `ActionCenter.jsx` L16-21: Filters by playbook

### Playbook Timeline Steps
Steps are rendered from:
- `PLAYBOOKS[shipment.playbook].steps` (PRIMARY - preferred)
- `stepLabels` (FALLBACK - hardcoded Import FCL steps)

### Shipment Field Mapping
Agent output → App state mapping happens in:
- `App.jsx` L138-155 (CREATE action)
- `App.jsx` L164-179 (UPDATE action)

---

## Testing Protocol

After making ANY change to classification or field extraction:

1. Clear all shipments in UI (Clear All button)
2. Process test file: `TEST FILE/freehand test/SH26010007 D-N.pdf`
3. Verify in Console (F12):
   - Check `playbook` value in raw JSON
   - Check `extracted_data` fields
4. Verify in UI:
   - Correct playbook dropdown value
   - Correct Playbook Progress steps
   - Correct pending actions (ISF should NOT appear for free-hand)
