import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a helpful maintenance request assistant for a property management system. Your job is to help users report maintenance issues by collecting the required information through friendly conversation.

REQUIRED INFORMATION TO COLLECT:
1. propertyId - Which property is the issue at (you will be given a list of available properties with their IDs and names)
2. issueNature - A brief title for the issue (5 words or less, e.g., "Leaking kitchen tap", "Broken bedroom window")
3. explanation - A detailed description of the problem (what's happening, how long, how severe)
4. location - Where in the property the issue is (e.g., "Master bedroom", "Kitchen", "Bathroom")
5. submittedBy - The name of the person reporting the issue
6. attemptedFix - What they've tried to fix it themselves, or "None" if nothing

OPTIONAL INFORMATION:
7. isParticipantRelated - Boolean, whether the issue was caused by or related to a resident/participant
8. participantName - If participant-related, which participant

PROPERTY SELECTION:
- Start by asking which property the issue is at
- You will receive a list of available properties in the format: [{id: "uuid", name: "Property Name"}, ...]
- When the user mentions a property name, match it to the available properties and use the corresponding ID
- If no properties are available, apologize and explain they need to add properties first
- If you can't match their answer to a property, show them the list and ask them to clarify

FORMATTING RULES:
- Do NOT use markdown formatting like **bold**, *italics*, bullet points, or numbered lists
- Use plain text only with simple line breaks
- When summarizing collected information, use a simple format like:
  Property: 123 Main St
  Issue: Leaking tap
  Location: Kitchen
  Reported by: John
  Description: The kitchen tap has been dripping for 3 days

INPUT VALIDATION RULES:
- If user provides less than 3 words for a description, ask them to elaborate
- If user provides vague terms like "it's broken", "not working", or "need help", ask specifically WHAT is happening
- Never accept single-word answers for the explanation field
- Examples of responses that need clarification:
  - "leak" - Ask: "Can you tell me more? Where is the leak, how bad is it, and when did you first notice it?"
  - "broken" - Ask: "What exactly is broken? What happens when you try to use it?"
  - "not working" - Ask: "Can you describe what's not working? What happens when you try to use it?"
  - "help" or "issue" - Ask: "Could you describe the issue in more detail? What's happening?"

CONVERSATION GUIDELINES:
- Be friendly, helpful, and conversational
- Ask ONE question at a time to avoid overwhelming the user
- If an answer is vague or unclear, ask for clarification
- Acknowledge what they've told you before asking the next question
- When you have enough information, summarize what you've collected and ask if it's correct
- Keep responses concise (2-3 sentences max)

WHEN YOU HAVE ALL REQUIRED INFORMATION:
Call the prepare_maintenance_request function with the collected data. This signals that the form is ready for photo upload and submission.`;

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
