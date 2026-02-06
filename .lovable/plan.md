

# AI Assistant Maintenance Request - Improvement Plan

## Summary of Changes

Based on your feedback, I will implement the following improvements to the AI assistant maintenance request feature:

1. **Update AI model** from `google/gemini-2.5-flash` to `google/gemini-3-flash-preview`
2. **Fix follow-up question bundling** - enforce strict one-question-at-a-time rule
3. **Improve frustrated user popup** - make it friendlier while keeping the functionality
4. **Update validation error messages** - make them more helpful and professional
5. **Add simple fix suggestions** - ensure AI offers troubleshooting tips when users say "Nothing"
6. **Improve output formatting** - make the final confirmation message and stored data more professional

---

## Phase 1: Update AI Model

**File:** `supabase/functions/chat-maintenance-request/index.ts`

Change line 354 from:
```typescript
model: "google/gemini-2.5-flash",
```
To:
```typescript
model: "google/gemini-3-flash-preview",
```

---

## Phase 2: Fix Follow-up Question Bundling

**File:** `supabase/functions/chat-maintenance-request/index.ts`

Add explicit one-question-at-a-time enforcement to the system prompt. After the CRITICAL RULES section (around line 127), add:

```text
=== ONE QUESTION AT A TIME (CRITICAL) ===
You MUST ask only ONE question per message. NEVER bundle multiple questions together.

WRONG (bundled questions):
"How severe is the leak, when did it start, and is it causing any damage?"

CORRECT (one question):
"How severe is the leak right now?"
[wait for answer]
"When did you first notice it?"
[wait for answer]
"Has it caused any damage to the surrounding area?"

After the user answers each question, ask the next relevant question. This creates a natural conversation flow and ensures you get complete answers to each question.
```

Also update the INTELLIGENT FOLLOW-UP section (lines 172-238) to reinforce this:
- Change "ask 2-3 RELEVANT follow-up questions" to "ask follow-up questions ONE AT A TIME"
- Add reminder: "Ask ONE question, wait for the answer, then ask the next"

---

## Phase 3: Improve Frustrated User Popup

**File:** `src/components/request/MaintenanceRequestChat.tsx`

Update the dialog content (lines 438-453) to be friendlier:

```tsx
<Dialog open={showFrustratedPopup} onOpenChange={dismissFrustratedPopup}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-xl">Need Some Help?</DialogTitle>
      <DialogDescription className="text-base pt-2">
        It looks like I'm having trouble understanding some of your responses. 
        This can happen when answers are brief or unclear.
        
        Try providing more specific details - for example, instead of "leak", 
        say "kitchen tap is dripping constantly".
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={dismissFrustratedPopup}>
        Got it, I'll try again
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Phase 4: Update Validation Error Messages

**File:** `src/hooks/useMaintenanceChat.ts`

Update the `validateFormData` function messages to be friendlier:

| Field | Current Message | New Message |
|-------|-----------------|-------------|
| Name (placeholder) | `"${name}" doesn't appear to be a real name...` | `Please provide your full name so the property manager can contact you about this request.` |
| Name (short) | `Please provide your full name (at least first name), not just initials.` | `Please provide your full name so we can follow up on this request.` |
| Issue title | `The issue title "${issueTitle}" is too brief...` | `Please provide a brief descriptive title for the issue (e.g., "Kitchen tap leaking" or "Heater not working").` |
| Description | `The description is too brief (${wordCount} words)...` | `Please provide a more detailed description of the issue, including what's happening, when it started, and any impact it's having.` |
| Location | `"${location}" is too vague...` | `Please specify the exact room or area where this issue is located (e.g., "kitchen", "main bathroom", "bedroom 2").` |

---

## Phase 5: Ensure Simple Fix Suggestions

**File:** `supabase/functions/chat-maintenance-request/index.ts`

The system prompt already has SIMPLE FIX SUGGESTIONS section (lines 226-234), but we need to make it mandatory. Update:

```text
=== SIMPLE FIX SUGGESTIONS (MANDATORY when user hasn't tried anything) ===

When the user says they haven't tried anything (e.g., "Nothing", "No", "Haven't tried"), 
you MUST suggest at least one simple fix before proceeding. This is not optional.

Example flow:
User: "Nothing"
AI: "Before we proceed, here's a quick tip that might help - have you tried [relevant simple fix]? 
     If that doesn't work or you'd prefer not to try it, we can continue with your request. 
     What would you like to do?"

[Then continue with list of suggestions by category...]
```

---

## Phase 6: Improve Output Formatting

**File:** `src/hooks/useMaintenanceChat.ts`

Update the confirmation message in `sendMessage` (around line 310) to be more professionally formatted:

```typescript
const confirmMsg = `I've collected all the information for your maintenance request:\n\n` +
  `📍 Property: ${propertyName}\n` +
  `🔧 Issue: ${extractedData.issueNature}\n` +
  `📍 Location: ${extractedData.location}\n` +
  `📝 Description: ${extractedData.explanation}\n` +
  `👤 Reported by: ${extractedData.submittedBy}\n` +
  `🛠️ Attempted fix: ${extractedData.attemptedFix}\n` +
  (extractedData.isParticipantRelated ? `👥 Participant involved: ${extractedData.participantName || 'Yes'}\n` : '') +
  `\nPlease upload at least one photo of the issue, then click "Submit Request" to complete your report.`;
```

**File:** `supabase/functions/chat-maintenance-request/index.ts`

Update the summary format in the system prompt (lines 258-271) to be more professional:

```text
=== WHEN YOU HAVE ALL INFORMATION ===
After collecting all required fields with adequate quality, display this summary:

"I've collected all the information for your maintenance request:

Property: [property name]
Issue: [their issue title]
Location: [their location]
Description: [their full description including follow-up details]
Reported by: [their name]
Attempted fix: [what they tried or "Nothing tried"]
Participant involved: [Yes - Name / No]

Please review the above. If everything looks correct, type SUBMIT to proceed. 
If anything needs to be changed, just let me know."
```

---

## Files to be Modified

| File | Changes |
|------|---------|
| `supabase/functions/chat-maintenance-request/index.ts` | Model upgrade, one-question-at-a-time rule, mandatory fix suggestions, improved summary format |
| `src/components/request/MaintenanceRequestChat.tsx` | Friendlier frustrated popup |
| `src/hooks/useMaintenanceChat.ts` | Friendlier validation messages, improved confirmation format |

---

## Expected Outcomes

- **Better conversation flow** - AI asks one question at a time, making it easier to follow
- **Friendlier experience** - Validation and popup messages are helpful rather than accusatory
- **Improved output quality** - Professional formatting for the final summary
- **Proactive troubleshooting** - AI always offers simple fix suggestions when appropriate
- **Better model performance** - Gemini 3 Flash provides improved response quality

