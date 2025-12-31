import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Predefined issue types for categorization
const ISSUE_TYPES = [
  'plumbing_leak', 'plumbing_drain', 'plumbing_toilet', 'plumbing_hot_water', 'plumbing_other',
  'electrical_lighting', 'electrical_outlet', 'electrical_appliance', 'electrical_safety', 'electrical_other',
  'hvac_cooling', 'hvac_heating', 'hvac_ventilation',
  'structural_door', 'structural_window', 'structural_wall', 'structural_floor', 'structural_roof', 'structural_other',
  'appliance_washer', 'appliance_dryer', 'appliance_stove', 'appliance_fridge', 'appliance_dishwasher', 'appliance_other',
  'security_lock', 'security_alarm', 'security_camera', 'security_other',
  'cleaning_mould', 'cleaning_pest', 'cleaning_general',
  'landscaping_lawn', 'landscaping_tree', 'landscaping_fence', 'landscaping_other',
  'furniture_bed', 'furniture_chair', 'furniture_table', 'furniture_storage', 'furniture_other',
  'general_other'
];

const SYSTEM_PROMPT = `You are a maintenance request categorization assistant for Australian rental properties. Your job is to analyze maintenance request descriptions and classify them accurately.

TASK: Analyze the provided maintenance request and return a structured categorization.

AVAILABLE ISSUE TYPES (choose ONE that best matches):
${ISSUE_TYPES.join(', ')}

RESPONSE FORMAT (JSON only, no markdown):
{
  "issueType": "one_of_the_issue_types_above",
  "issueTags": ["tag1", "tag2", "tag3"],
  "affectedArea": "specific area in property",
  "confidence": "high|medium|low"
}

GUIDELINES:
1. issueType: Select the MOST specific type that matches. Use "_other" variants only when nothing else fits.
2. issueTags: Add up to 5 relevant tags. Examples: "water_damage", "urgent", "safety_hazard", "recurring", "wear_and_tear", "tenant_caused", "age_related", "needs_quote", "blocked", "leaking", "broken", "noisy", "not_working"
3. affectedArea: Be specific - e.g., "master bathroom", "kitchen sink", "front door", "unit 3 bedroom", "common area laundry"
4. confidence: 
   - "high" = clear description, obvious issue type
   - "medium" = some ambiguity but reasonable categorization
   - "low" = vague description, multiple interpretations possible

IMPORTANT:
- Return ONLY valid JSON, no explanations or markdown
- If the request mentions water/flooding, check if it's plumbing-related
- If lighting or power issues, classify as electrical
- Safety issues should be tagged appropriately
- Consider urgency based on keywords like "urgent", "emergency", "immediately"`;

interface CategorizationRequest {
  title: string;
  description: string;
  location?: string;
}

interface CategorizationResponse {
  issueType: string;
  issueTags: string[];
  affectedArea: string;
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, location } = await req.json() as CategorizationRequest;

    if (!title && !description) {
      return new Response(
        JSON.stringify({ error: 'Title or description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the user prompt
    const userPrompt = `Categorize this maintenance request:

Title: ${title || 'N/A'}
Description: ${description || 'N/A'}
Location: ${location || 'Not specified'}`;

    console.log('Categorizing request:', { title, description: description?.substring(0, 100) });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_completion_tokens: 200
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('No response from AI');
      return new Response(
        JSON.stringify({ error: 'No response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response, cleaning up any markdown
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let categorization: CategorizationResponse;
    try {
      categorization = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      // Return a default categorization
      categorization = {
        issueType: 'general_other',
        issueTags: [],
        affectedArea: location || 'unknown',
        confidence: 'low'
      };
    }

    // Validate issue type
    if (!ISSUE_TYPES.includes(categorization.issueType)) {
      console.warn('Invalid issue type from AI:', categorization.issueType);
      categorization.issueType = 'general_other';
      categorization.confidence = 'low';
    }

    // Ensure issueTags is an array
    if (!Array.isArray(categorization.issueTags)) {
      categorization.issueTags = [];
    }

    console.log('Categorization result:', categorization);

    return new Response(
      JSON.stringify(categorization),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in categorize-request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
