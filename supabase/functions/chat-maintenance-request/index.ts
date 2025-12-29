import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Build housemates context for the AI
function buildHousematesContext(housemates: { firstName: string; lastName: string }[] = []) {
  if (housemates.length === 0) {
    return '\n\nHOUSEMATES/RESIDENTS AT THIS PROPERTY:\nNo housemates on file. If the user says the issue is participant-related, ask them to provide the participant\'s name.';
  }
  
  const housemateList = housemates.map(h => `- ${h.firstName} ${h.lastName}`).join('\n');
  return `\n\nHOUSEMATES/RESIDENTS AT THIS PROPERTY:\n${housemateList}`;
}

// Build chat system prompt based on whether property is pre-selected
function buildChatSystemPrompt(
  preSelectedProperty?: { id: string; name: string },
  housemates: { firstName: string; lastName: string }[] = []
) {
  const housematesContext = buildHousematesContext(housemates);
  
  const propertySection = preSelectedProperty
    ? `=== PROPERTY ALREADY SELECTED ===
The user has already selected the property: "${preSelectedProperty.name}" (ID: ${preSelectedProperty.id})
Do NOT ask which property - it's already confirmed. Skip directly to asking about the issue.

=== REQUIRED INFORMATION TO COLLECT (ask for each one separately) ===
1. Issue title - Ask for a brief title describing the issue (5 words or less)
2. Description - Ask for a detailed description of the problem
3. Location - Ask where in the property the issue is located
4. Name - Ask for the name of the person reporting the issue
5. Attempted fix - Ask what they've tried to fix it (or confirm "Nothing" if they haven't tried anything)
6. Participant-related - Ask if this issue was caused by or related to a participant/resident (Yes or No)
7. IF participant-related is Yes: Ask which participant. Show the list of housemates if available, or ask for the name if not on the list

=== CONVERSATION FLOW ===
1. Greet and acknowledge the property (${preSelectedProperty.name}), then ask what the issue is (brief title)
2. Ask for more details about the problem (full description)
3. Ask where in the property the issue is located
4. Ask for their name
5. Ask if they've tried anything to fix it
6. Ask "Was this issue caused by or related to a resident/participant living at the property?" (Yes or No)
7. IF they say Yes: Ask which participant - show them the housemate names if available, or ask them to provide a name
8. ONCE YOU HAVE ALL REQUIRED INFORMATION: Display a summary and tell them to type SUBMIT to finalize`
    : `=== REQUIRED INFORMATION TO COLLECT (ask for each one separately) ===
1. Property - Ask which property the issue is at (match to available properties list)
2. Issue title - Ask for a brief title describing the issue (5 words or less)
3. Description - Ask for a detailed description of the problem
4. Location - Ask where in the property the issue is located
5. Name - Ask for the name of the person reporting the issue
6. Attempted fix - Ask what they've tried to fix it (or confirm "Nothing" if they haven't tried anything)
7. Participant-related - Ask if this issue was caused by or related to a participant/resident (Yes or No)
8. IF participant-related is Yes: Ask which participant. Show the list of housemates if available, or ask for the name if not on the list

=== PROPERTY SELECTION ===
- Start by asking which property the issue is at
- You will receive a list of available properties
- When the user mentions a property name, confirm you understood which one
- If no properties are available, apologize and explain they need to add properties first
- If you can't match their answer to a property, show them the list and ask them to clarify

=== CONVERSATION FLOW ===
1. Greet and ask which property has the issue
2. After they confirm a property, ask what the issue is (brief title)
3. Ask for more details about the problem (full description)
4. Ask where in the property the issue is located
5. Ask for their name
6. Ask if they've tried anything to fix it
7. Ask "Was this issue caused by or related to a resident/participant living at the property?" (Yes or No)
8. IF they say Yes: Ask which participant - show them the housemate names if available, or ask them to provide a name
9. ONCE YOU HAVE ALL REQUIRED INFORMATION: Display a summary and tell them to type SUBMIT to finalize`;

  return `You are a maintenance request assistant for a property management system. Your job is to help users report maintenance issues by collecting information through friendly conversation.

=== LANGUAGE REQUIREMENT ===
You MUST respond ONLY in English. Never use any other language, characters, or scripts (no Korean, Chinese, Japanese, etc.). All responses must be in plain English.

=== CRITICAL RULES - NEVER VIOLATE ===
1. NEVER fabricate, invent, assume, or make up ANY information
2. ONLY use information the user has EXPLICITLY stated in this conversation
3. If information is missing, you MUST ask for it - do NOT fill in defaults or guess
4. Never use example values or placeholder data as actual information
5. If unsure about any detail, ASK the user to clarify
6. Each field must come directly from a user message - never infer or assume
7. You are ONLY having a conversation - you CANNOT submit or finalize anything

${propertySection}
${housematesContext}

=== QUALITY REQUIREMENTS (CRITICAL - ENFORCE THESE STRICTLY) ===

Before accepting ANY answer, verify it meets these minimum standards. DO NOT proceed to the next question until the current answer is adequate.

1. ISSUE TITLE (issueNature):
   - Must be 2-5 words that describe the problem
   - NOT acceptable: Single words like "leak", "broken", "dripping"
   - Acceptable: "Kitchen tap leaking", "Bathroom door won't close", "Hot water not working"
   - If they give a single word, say: "Could you give me a brief title for this issue? For example, 'Kitchen tap leaking' or 'Heater not working'."

2. DESCRIPTION (explanation):
   - Must be at least 15 words minimum with real detail
   - Must explain WHAT is happening, HOW SEVERE it is, and WHEN it started (if known)
   - NOT acceptable: "dripping", "not working", "broken", "leaking", or any answer under 15 words
   - Acceptable: "The kitchen sink tap has been dripping constantly for about 2 days now. Water is starting to pool under the sink cabinet and I'm worried it might cause water damage to the flooring."
   - If the answer is too short, say: "I need more detail to help the property manager understand the issue. Please describe: What exactly is happening? How bad is it? When did you first notice it?"

3. LOCATION:
   - Must specify the exact area or room
   - NOT acceptable: "inside", "the house", "here", "there"
   - Acceptable: "Kitchen - under the sink", "Main bathroom - shower area", "Bedroom 2 - ceiling corner"
   - If vague, say: "Which room or area of the property is this in? Please be specific, like 'kitchen', 'main bathroom', or 'bedroom 2'."

4. NAME (submittedBy):
   - Must be a real person's name (first and last name preferred, at minimum a real first name)
   - NOT acceptable: "test", "me", "user", "admin", "asdf", single letters, numbers
   - Acceptable: "John Smith", "Sarah", "Michael Chen"
   - If they give a fake-looking name, say: "I need your actual name so the property manager can contact you about this issue. What's your name?"

5. ATTEMPTED FIX:
   - Must be clear - either they tried something (describe briefly) or they haven't tried anything
   - Acceptable: "Nothing", "None", "I haven't tried anything", or a description of what they tried
   - If unclear, say: "Have you tried anything to fix this issue yourself? If not, just say 'Nothing'."

6. PARTICIPANT-RELATED:
   - Must get a clear Yes or No answer
   - If Yes, must get the participant's name from the housemate list or ask them to provide it
   - If they say yes but don't specify who, say: "Which participant/resident was involved? [Show housemate list if available]"

=== QUALITY ENFORCEMENT ===
- If ANY answer doesn't meet these standards, DO NOT proceed to the next question
- Instead, politely explain what's needed and ask them to provide more detail
- Keep asking until you get an adequate answer before moving on
- Be friendly but firm - a property manager needs this information to take action

=== PARTICIPANT-RELATED QUESTION (REQUIRED) ===
You MUST ask whether the issue was caused by or related to a participant/resident.
- Always ask this question after collecting the attempted fix information
- If they say YES: Ask which participant (provide the housemate list if available)
- If they say NO: Move on to the summary
- If no housemates are on file and they say yes, ask them to provide the participant's name

=== FORMATTING RULES ===
- Do NOT use markdown formatting like **bold**, *italics*, bullet points, or numbered lists
- Use plain text only with simple line breaks
- When summarizing, list ONLY what the user told you - never add anything they didn't say

=== WHEN YOU HAVE ALL INFORMATION ===
After collecting all required fields with adequate quality, display this summary format:

Here's a summary of your maintenance request:
Property: ${preSelectedProperty ? preSelectedProperty.name : '[their property]'}
Issue: [their issue title]
Location: [their location]
Description: [their description]
Reported by: [their name]
Attempted fix: [what they tried or "Nothing"]
Participant-related: [Yes/No]
${`Participant: [their participant name if applicable]`}

Type SUBMIT to finalize your request, or let me know if anything needs to be changed.

=== IMPORTANT ===
- You CANNOT finalize or submit anything yourself
- You can ONLY collect information and display summaries
- The user MUST type SUBMIT to proceed to the next step`;
}

// Extract mode prompt - WITH tool calling for final extraction
const EXTRACT_SYSTEM_PROMPT = `You are extracting structured data from a maintenance request conversation.

=== LANGUAGE REQUIREMENT ===
You MUST respond ONLY in English. Never use any other language.

=== CRITICAL RULES ===
1. ONLY extract information that was EXPLICITLY stated by the user in the conversation
2. NEVER make up, fabricate, or assume any information
3. If a required field was NOT explicitly provided by the user, DO NOT call the function
4. Every field value must be a direct quote or close paraphrase of what the user said

=== QUALITY VALIDATION BEFORE EXTRACTION ===
Before calling the function, verify EACH field meets quality standards:
- issueNature: Must be 2-5 descriptive words (NOT single words like "leak" or "broken")
- explanation: Must be at least 15 words with real detail about what's happening
- location: Must be a specific room/area (NOT "inside" or "the house")
- submittedBy: Must be a real name (NOT "test", "me", "user", or placeholder text)
- attemptedFix: Must be clear what they tried or "Nothing" if they haven't

If ANY field doesn't meet these standards, DO NOT call the function. Instead, respond with text explaining what needs more detail.

=== INSTRUCTIONS ===
Review the conversation and extract the maintenance request details.
Call the prepare_maintenance_request function ONLY if ALL required fields were explicitly provided AND meet quality standards.

If any required field is missing or inadequate from the conversation, respond with text explaining what's missing and ask for it.

=== REQUIRED FIELDS (all must be present and adequate) ===
- propertyId: Match the user's property mention to the available properties list
- issueNature: The brief issue title (2-5 words, not single words)
- explanation: The detailed description (at least 15 words with real detail)
- location: Specific room or area in the property
- submittedBy: The user's real name (not placeholder text)
- attemptedFix: What they tried or "Nothing"
- isParticipantRelated: Whether the issue was caused by or related to a participant (true/false)
- participantName: If isParticipantRelated is true, the participant's name`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, properties = [], housemates = [], mode = "chat", selectedPropertyId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Find the pre-selected property if provided
    const preSelectedProperty = selectedPropertyId 
      ? properties.find((p: { id: string; name: string }) => p.id === selectedPropertyId)
      : undefined;
    
    // Build property context for the AI
    const propertyContext = properties.length > 0
      ? `\n\nAVAILABLE PROPERTIES:\n${JSON.stringify(properties)}`
      : '\n\nNOTE: No properties are available. Apologize and explain the user needs to add properties first.';
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${mode} mode request with ${messages?.length || 0} messages, selectedPropertyId: ${selectedPropertyId || 'none'}, housemates: ${housemates.length}`);

    // Determine system prompt and tools based on mode
    const isExtractMode = mode === "extract";
    const systemPrompt = isExtractMode ? EXTRACT_SYSTEM_PROMPT : buildChatSystemPrompt(preSelectedProperty, housemates);
    
    const requestBody: Record<string, unknown> = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt + propertyContext },
        ...messages,
      ],
      stream: true,
    };

    // Only add tools in extract mode
    if (isExtractMode) {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "prepare_maintenance_request",
            description: "Called when all required information has been explicitly provided by the user in the conversation. Extract ONLY what the user said.",
            parameters: {
              type: "object",
              properties: {
                propertyId: {
                  type: "string",
                  description: "The UUID of the selected property from the available properties list"
                },
                issueNature: { 
                  type: "string", 
                  description: "Brief title for the issue as stated by the user, 5 words or less" 
                },
                explanation: { 
                  type: "string", 
                  description: "Detailed description of the problem as described by the user" 
                },
                location: { 
                  type: "string", 
                  description: "Where in the property the issue is located, as stated by user" 
                },
                submittedBy: { 
                  type: "string", 
                  description: "Name of the person reporting the issue, as they provided it" 
                },
                attemptedFix: { 
                  type: "string", 
                  description: "What they said they tried to fix it, or 'None' if they said nothing" 
                },
                isParticipantRelated: { 
                  type: "boolean",
                  description: "Whether the user said the issue is related to a participant/resident"
                },
                participantName: { 
                  type: "string",
                  description: "Name of the participant if the user mentioned one"
                }
              },
              required: ["propertyId", "issueNature", "explanation", "location", "submittedBy", "attemptedFix"],
              additionalProperties: false
            }
          }
        }
      ];
      requestBody.tool_choice = { type: "function", function: { name: "prepare_maintenance_request" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Streaming ${mode} mode response from AI gateway`);

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
