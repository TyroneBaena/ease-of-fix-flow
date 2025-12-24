import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chat mode prompt - NO tool calling, just conversation
const CHAT_SYSTEM_PROMPT = `You are a maintenance request assistant for a property management system. Your job is to help users report maintenance issues by collecting information through friendly conversation.

=== CRITICAL RULES - NEVER VIOLATE ===
1. NEVER fabricate, invent, assume, or make up ANY information
2. ONLY use information the user has EXPLICITLY stated in this conversation
3. If information is missing, you MUST ask for it - do NOT fill in defaults or guess
4. Never use example values or placeholder data as actual information
5. If unsure about any detail, ASK the user to clarify
6. Each field must come directly from a user message - never infer or assume
7. You are ONLY having a conversation - you CANNOT submit or finalize anything

=== REQUIRED INFORMATION TO COLLECT (ask for each one separately) ===
1. Property - Ask which property the issue is at (match to available properties list)
2. Issue title - Ask for a brief title describing the issue (5 words or less)
3. Description - Ask for a detailed description of the problem
4. Location - Ask where in the property the issue is located
5. Name - Ask for the name of the person reporting the issue
6. Attempted fix - Ask what they've tried to fix it (or confirm "Nothing" if they haven't tried anything)

=== OPTIONAL INFORMATION ===
7. Ask if the issue was caused by or related to a resident/participant
8. If yes to above, ask which participant

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
7. ONCE YOU HAVE ALL 6 REQUIRED PIECES OF INFORMATION: Display a summary and tell them to type SUBMIT to finalize

=== FORMATTING RULES ===
- Do NOT use markdown formatting like **bold**, *italics*, bullet points, or numbered lists
- Use plain text only with simple line breaks
- When summarizing, list ONLY what the user told you - never add anything they didn't say

=== INPUT VALIDATION ===
- If user provides less than 3 words for a description, ask them to elaborate
- If user gives vague answers like "it's broken" or "not working", ask specifically what is happening
- Never accept single-word answers for the description field

=== WHEN YOU HAVE ALL INFORMATION ===
After collecting all 6 required fields, display this summary format:

Here's a summary of your maintenance request:
Property: [their property]
Issue: [their issue title]
Location: [their location]
Description: [their description]
Reported by: [their name]
Attempted fix: [what they tried or "Nothing"]

Type SUBMIT to finalize your request, or let me know if anything needs to be changed.

=== IMPORTANT ===
- You CANNOT finalize or submit anything yourself
- You can ONLY collect information and display summaries
- The user MUST type SUBMIT to proceed to the next step`;

// Extract mode prompt - WITH tool calling for final extraction
const EXTRACT_SYSTEM_PROMPT = `You are extracting structured data from a maintenance request conversation.

=== CRITICAL RULES ===
1. ONLY extract information that was EXPLICITLY stated by the user in the conversation
2. NEVER make up, fabricate, or assume any information
3. If a required field was NOT explicitly provided by the user, DO NOT call the function
4. Every field value must be a direct quote or close paraphrase of what the user said

=== INSTRUCTIONS ===
Review the conversation and extract the maintenance request details.
Call the prepare_maintenance_request function ONLY if ALL required fields were explicitly provided.

If any required field is missing from the conversation, respond with text explaining what's missing and ask for it.

=== REQUIRED FIELDS (all must be present in conversation) ===
- propertyId: Match the user's property mention to the available properties list
- issueNature: The brief issue title the user provided
- explanation: The detailed description the user gave
- location: Where in the property (as stated by user)
- submittedBy: The user's name they provided
- attemptedFix: What they said they tried (or "None"/"Nothing" if they said they didn't try anything)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, properties = [], mode = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
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

    console.log(`Processing ${mode} mode request with ${messages?.length || 0} messages`);

    // Determine system prompt and tools based on mode
    const isExtractMode = mode === "extract";
    const systemPrompt = isExtractMode ? EXTRACT_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;
    
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
