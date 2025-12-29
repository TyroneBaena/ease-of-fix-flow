import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  title: string;
  description: string;
  explanation?: string;
  attemptedFix?: string;
  issueNature?: string;
  location?: string;
  category?: string;
}

interface AnalysisResponse {
  responsibility: 'landlord' | 'tenant' | 'needs_review';
  urgency: 'urgent' | 'normal';
  assetType: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM_PROMPT = `You are an expert property maintenance analyst for Australian rental properties. Your task is to determine whether a maintenance issue is the responsibility of the LANDLORD, TENANT, or NEEDS REVIEW.

## DECISION FRAMEWORK

### Step A — URGENCY OVERRIDE (check first)
If ANY of these are present → Respond with Landlord + URGENT:
- Gas smell/leak, sparking, power outage, exposed wiring
- Flooding, burst pipe, sewer overflow
- No hot water, no water, no electricity
- Smoke alarm fault (chirping/hardwired) / fire risk
- External door not locking / security risk
- Roof leak during rain, major water ingress
- Blocked only toilet in property

### Step B — ASSET TYPE CLASSIFICATION
Classify the issue into one of (use lowercase in your response):
1. structure/building envelope (roof, walls, ceiling, windows frame, external doors, foundations)
2. plumbing/water/sewer (pipes, taps, toilets, drains, hot water)
3. electrical/gas (wiring, switchboard, outlets, lights, gas appliances)
4. supplied appliance/fixture (oven, cooktop, rangehood, fixed AC/heater, dishwasher)
5. cosmetic/wear & tear (paint scuffs, loose handle, ageing carpet)
6. cleaning/housekeeping (mould spots, dirty fan, grease build-up)
7. pests (cockroaches, rodents, bedbugs)
8. outdoor/garden (lawn, weeds, trees, gutters)

### Step C — CAUSE ASSESSMENT
Determine if the issue is likely caused by:
- Tenant behaviour/misuse/neglect (wipes/grease in drain, broken from impact, mould from not ventilating, pests from food waste)
- Age/failure/defect/external event (hot water system died, pipe burst, storm damage, roof leak, old appliance stopped)

### Step D — RESPONSIBILITY MATRIX

1) **Structure/building envelope**: Landlord by default. Tenant only if clearly caused by tenant damage (punched hole, broken window by impact)

2) **Electrical/gas**: Landlord ALWAYS (safety/compliance), unless it's a tenant-owned device

3) **Plumbing/drains**:
   - Landlord if: burst pipe, leaking from inside wall, toilet cistern failure, hot water system
   - Tenant if: blocked drain likely from wipes/grease/foreign objects, damaged fittings due to misuse
   - If unclear → Needs Review

4) **Supplied appliances/fixtures**:
   - Landlord if supplied with property and failure is normal wear/fault
   - Tenant if damaged by misuse (smashed cooktop, overloaded appliance, missing parts)

5) **Cleaning/housekeeping**:
   - Tenant by default
   - Landlord if cleaning issue is secondary to building defect (mould due to leak/ventilation fan not working)

6) **Wear & tear / minor adjustments**:
   - Landlord for repairs due to wear/age (loose handle, dripping tap washer, rollers, seals)
   - Tenant for consumables (globes, batteries) and damage

7) **Pests**:
   - Landlord if infestation exists at start of tenancy or due to building entry points
   - Tenant if caused by hygiene/food waste or occurs well into tenancy with no building defect
   - Often → Needs Review unless evidence is clear

8) **Garden/outdoor**:
   - Tenant if tenancy agreement says tenant maintains lawns/garden upkeep (mowing, weeding)
   - Landlord for: large tree hazards, storm damage, broken fences not tenant-caused, gutter repairs

## RESPONSE FORMAT
You must respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "responsibility": "landlord" | "tenant" | "needs_review",
  "urgency": "urgent" | "normal",
  "assetType": "use lowercase category name (e.g., 'pests', 'plumbing/water/sewer', 'electrical/gas')",
  "reasoning": "Structure as: 'The reported issue is [describe issue]. Under the [specific rule/category], this falls to [party] because [reason]. Finding: [Landlord/Tenant/Needs Review] responsibility.'",
  "confidence": "high" | "medium" | "low"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AnalysisRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the user prompt with all available details
    const userPrompt = `Analyze this maintenance request and determine responsibility:

**Title**: ${requestData.title}

**Description**: ${requestData.description || 'Not provided'}

**Issue Nature**: ${requestData.issueNature || 'Not specified'}

**Location in Property**: ${requestData.location || 'Not specified'}

**Category**: ${requestData.category || 'Not specified'}

**What the tenant tried/explanation**: ${requestData.attemptedFix || requestData.explanation || 'Not provided'}

Based on the decision framework, determine who is responsible for this maintenance issue.`;

    console.log("Analyzing maintenance request:", requestData.title);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", content);

    // Parse the JSON response from the AI
    let analysis: AnalysisResponse;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default needs_review response if parsing fails
      analysis = {
        responsibility: 'needs_review',
        urgency: 'normal',
        assetType: 'unknown',
        reasoning: 'Unable to determine responsibility from the provided information. Finding: Needs Review responsibility.',
        confidence: 'low'
      };
    }

    console.log("Analysis result:", analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-responsibility function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
