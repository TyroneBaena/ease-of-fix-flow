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
4. supplied appliance/fixture (oven, cooktop, rangehood, fixed AC/heater, dishwasher) — ONLY if confirmed landlord-supplied
5. cosmetic/wear & tear (paint scuffs, loose handle, ageing carpet)
6. cleaning/housekeeping (mould spots, dirty fan, grease build-up)
7. pests (cockroaches, rodents, bedbugs)
8. outdoor/garden (lawn, weeds, trees, gutters)
9. tenant-owned/personal items (furniture tenant brought, personal electronics, outdoor dining sets, BBQs, portable heaters/fans, alfresco furniture, patio sets)

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

4) **Supplied appliances/fixtures** (ONLY items CONFIRMED as landlord-supplied):
   - Landlord if: Item is clearly built-in/fixed (oven, cooktop, rangehood, fixed AC, dishwasher, fixed heater) AND failure is normal wear/fault
   - Tenant if: Item is damaged by misuse (smashed cooktop, overloaded appliance, missing parts)
   - ⚠️ CRITICAL: If ownership is NOT explicitly stated as landlord-supplied → return "needs_review" with medium/low confidence
   - Include in reasoning: "Ownership needs to be confirmed - recommend checking if this item was supplied with the property."

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

9) **Tenant-owned/personal items**:
   - ALWAYS Tenant responsibility
   - Common examples: outdoor furniture (tables, chairs, benches, umbrellas, alfresco sets), BBQs, portable heaters/fans, personal electronics, rugs, curtains tenant installed
   - If item is moveable/portable and not explicitly listed as landlord-supplied → assume tenant-owned

### Step E — OWNERSHIP ASSUMPTIONS (when not explicitly stated)

**ASSUME LANDLORD-OWNED (built-in/fixed):**
- Oven, cooktop, rangehood, fixed air conditioning, ducted heating
- Dishwasher, garbage disposal, fixed exhaust fans
- Hot water system, ceiling fans, light fixtures
- Built-in wardrobes, fixed shelving

**ASSUME TENANT-OWNED (portable/moveable):**
- Outdoor furniture (tables, chairs, benches, dining sets, umbrellas, alfresco sets, patio furniture)
- BBQs, portable heaters, portable fans, portable AC units
- Freestanding furniture (beds, couches, dining tables)
- Washing machines, dryers (unless specified in lease as landlord-supplied)
- Personal electronics, TVs, gaming consoles
- Any item described as "our", "my", "we bought", "personal"

**NEEDS CLARIFICATION (could be either):**
- Fridges, microwaves (sometimes supplied)
- Window blinds, curtains (sometimes installed by tenant)
- Washing machines in rental properties (varies by property)

## RESPONSE FORMAT
You must respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "responsibility": "landlord" | "tenant" | "needs_review",
  "urgency": "urgent" | "normal",
  "assetType": "use lowercase category name (e.g., 'tenant-owned/personal items', 'supplied appliance/fixture')",
  "reasoning": "Structure as: 'The reported issue is [describe issue]. Ownership assessment: [state whether item appears landlord-supplied, tenant-owned, or unclear based on Step E guidelines]. Under the [specific rule/category], this falls to [party] because [reason]. [If ownership unclear: Recommend confirming whether this item was supplied with the property.] Finding: [Landlord/Tenant/Needs Review] responsibility.'",
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
