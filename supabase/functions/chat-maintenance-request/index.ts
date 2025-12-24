import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a maintenance request assistant for a property management system. Your job is to help users report maintenance issues by collecting information through friendly conversation.

=== CRITICAL RULES - NEVER VIOLATE ===
1. NEVER fabricate, invent, assume, or make up ANY information
2. ONLY use information the user has EXPLICITLY stated in this conversation
3. If information is missing, you MUST ask for it - do NOT fill in defaults or guess
4. Never use example values or placeholder data as actual information
5. If unsure about any detail, ASK the user to clarify
6. Do NOT call prepare_maintenance_request until ALL required fields have been explicitly provided by the user
7. Each field must come directly from a user message - never infer or assume

=== REQUIRED INFORMATION TO COLLECT (ask for each one) ===
1. propertyId - Ask which property the issue is at (match to available properties list)
2. issueNature - Ask for a brief title describing the issue (5 words or less)
3. explanation - Ask for a detailed description of the problem
4. location - Ask where in the property the issue is located
5. submittedBy - Ask for the name of the person reporting the issue
6. attemptedFix - Ask what they've tried to fix it (or confirm "None" if nothing)

=== OPTIONAL INFORMATION ===
7. isParticipantRelated - Ask if the issue was caused by or related to a resident/participant
8. participantName - If yes to above, ask which participant

=== PROPERTY SELECTION ===
- Start by asking which property the issue is at
- You will receive a list of available properties in the format: [{id: "uuid", name: "Property Name"}, ...]
- When the user mentions a property name, match it to the available properties and use the corresponding ID
- If no properties are available, apologize and explain they need to add properties first
- If you can't match their answer to a property, show them the list and ask them to clarify

=== CONVERSATION FLOW ===
1. Greet the user and ask which property has the issue
2. After they select a property, ask what the issue is (for issueNature)
3. Ask for more details about the problem (for explanation)
4. Ask where in the property the issue is located
5. Ask for their name
6. Ask if they've tried anything to fix it
7. BEFORE calling the function: summarize ONLY what they told you and ask them to confirm

=== FORMATTING RULES ===
- Do NOT use markdown formatting like **bold**, *italics*, bullet points, or numbered lists
- Use plain text only with simple line breaks
- When summarizing, use this format with ONLY user-provided values:
  Property: [what user said]
  Issue: [what user said]
  Location: [what user said]
  Reported by: [what user said]
  Description: [what user said]
  Attempted fix: [what user said]

=== INPUT VALIDATION ===
- If user provides less than 3 words for a description, ask them to elaborate
- If user gives vague answers like "it's broken" or "not working", ask specifically what is happening
- Never accept single-word answers for the explanation field

=== BEFORE CALLING prepare_maintenance_request ===
1. Verify EVERY required field was explicitly provided by the user in this conversation
2. Display a summary of ONLY user-provided information
3. Ask: "Does this look correct? Reply 'yes' to submit or let me know what needs to change."
4. Only call the function AFTER the user confirms
5. If ANY field was not explicitly stated by the user, ASK for it instead of calling the function`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, properties = [] } = await req.json();
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

    console.log("Processing chat request with", messages?.length || 0, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + propertyContext },
          ...messages,
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "prepare_maintenance_request",
              description: "Called when all required information has been collected from the user. This prepares the maintenance request for photo upload and submission.",
              parameters: {
                type: "object",
                properties: {
                  propertyId: {
                    type: "string",
                    description: "The UUID of the selected property from the available properties list"
                  },
                  issueNature: { 
                    type: "string", 
                    description: "Brief title for the issue, 5 words or less" 
                  },
                  explanation: { 
                    type: "string", 
                    description: "Detailed description of the problem" 
                  },
                  location: { 
                    type: "string", 
                    description: "Where in the property the issue is located" 
                  },
                  submittedBy: { 
                    type: "string", 
                    description: "Name of the person reporting the issue" 
                  },
                  attemptedFix: { 
                    type: "string", 
                    description: "What they tried to fix it, or 'None'" 
                  },
                  isParticipantRelated: { 
                    type: "boolean",
                    description: "Whether the issue is related to a participant/resident"
                  },
                  participantName: { 
                    type: "string",
                    description: "Name of the participant if issue is participant-related"
                  }
                },
                required: ["propertyId", "issueNature", "explanation", "location", "submittedBy", "attemptedFix"],
                additionalProperties: false
              }
            }
          }
        ],
      }),
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

    console.log("Streaming response from AI gateway");

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
