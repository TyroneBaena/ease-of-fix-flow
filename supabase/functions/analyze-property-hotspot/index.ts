import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version stamp for deployment verification
const FUNCTION_VERSION = "2025-01-20_v4_fixed_auth";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a property maintenance analyst for Australian rental properties. Your job is to analyze maintenance request history and identify patterns, systemic issues, and provide actionable recommendations.

TASK: Analyze the provided maintenance requests and identify:
1. RECURRING ISSUES: Same types of problems happening repeatedly
2. SYSTEMIC PROBLEMS: Building-wide infrastructure issues
3. RISK ASSESSMENT: Safety concerns or escalation likelihood
4. RECOMMENDATIONS: Specific actions to prevent future issues

RESPONSE FORMAT (JSON only, no markdown):
{
  "recurringIssues": [
    {
      "category": "issue category (e.g., plumbing, electrical)",
      "count": number_of_occurrences,
      "locations": ["location1", "location2"],
      "pattern": "description of the pattern",
      "severity": "low|medium|high"
    }
  ],
  "systemicProblems": [
    {
      "problem": "description of the systemic issue",
      "evidence": "what in the data suggests this",
      "severity": "low|medium|high"
    }
  ],
  "recommendations": [
    {
      "action": "specific action to take",
      "priority": "low|medium|high|urgent",
      "reasoning": "why this action is recommended"
    }
  ],
  "riskLevel": "low|medium|high|critical",
  "summary": "2-3 sentence summary of the property's maintenance health"
}

RISK LEVEL GUIDELINES:
- "low": Few issues, mostly minor, well-maintained
- "medium": Some recurring issues, standard wear and tear
- "high": Multiple recurring problems, possible safety concerns
- "critical": Safety hazards, urgent infrastructure issues, many unresolved problems

IMPORTANT:
- Return ONLY valid JSON, no explanations or markdown
- Be specific in recommendations - include what, where, and why
- Consider the age and frequency of issues
- Prioritize safety-related concerns
- If very few requests (< 3), note the limited data`;

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  ai_issue_type?: string;
  ai_issue_tags?: string[];
}

interface PropertyAnalysisRequest {
  propertyId: string;
  propertyName?: string;
  propertyAddress?: string;
}

// Helper to store insight in database
async function storeInsight(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  organizationId: string,
  analysis: Record<string, unknown>,
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: upsertError } = await supabase.from('property_insights').upsert({
      property_id: propertyId,
      organization_id: organizationId,
      insight_type: 'hotspot_analysis',
      insight_data: analysis,
      period_start: periodStart,
      period_end: periodEnd
    }, {
      onConflict: 'property_id,insight_type'
    });

    if (upsertError) {
      console.error('Error storing insight:', upsertError);
      return { success: false, error: upsertError.message };
    }
    
    console.log('✅ Insight stored successfully for property:', propertyId);
    return { success: true };
  } catch (err) {
    console.error('Exception storing insight:', err);
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  console.log(`[analyze-property-hotspot] FUNCTION_VERSION: ${FUNCTION_VERSION}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyId, propertyName, propertyAddress } = await req.json() as PropertyAnalysisRequest;

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request - CRITICAL FIX: Extract and validate token properly
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[analyze-property-hotspot] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log(`[analyze-property-hotspot] Token present, length: ${token.length}`);

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client for user validation (with token)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    // Validate user by passing token explicitly
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('[analyze-property-hotspot] Auth validation failed:', userError?.message || 'No user returned');
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`[analyze-property-hotspot] User authenticated: ${userId.substring(0, 8)}...`);

    // Client for data operations (with auth header for RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for storage (bypasses RLS for upsert)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[analyze-property-hotspot] Profile fetch error:', profileError);
    }

    let organizationId = userProfile?.organization_id;
    
    // Fallback: try to get org from the property itself
    if (!organizationId) {
      console.log('[analyze-property-hotspot] No org from profile, checking property...');
      const { data: propData } = await supabase
        .from('properties')
        .select('organization_id')
        .eq('id', propertyId)
        .single();
      
      if (propData?.organization_id) {
        organizationId = propData.organization_id;
        console.log(`[analyze-property-hotspot] Got org from property: ${organizationId.substring(0, 8)}...`);
      }
    } else {
      console.log(`[analyze-property-hotspot] Organization: ${organizationId.substring(0, 8)}...`);
    }

    // Fetch maintenance requests for this property (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const periodStart = oneYearAgo.toISOString();
    const periodEnd = new Date().toISOString();

    const { data: requests, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select('id, title, description, location, category, status, priority, created_at, ai_issue_type, ai_issue_tags')
      .eq('property_id', propertyId)
      .gte('created_at', periodStart)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching requests:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch maintenance requests' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${requests?.length || 0} requests for property ${propertyId}`);

    // If no requests, return a basic response
    if (!requests || requests.length === 0) {
      const emptyAnalysis = {
        recurringIssues: [],
        systemicProblems: [],
        recommendations: [{
          action: 'Continue regular maintenance monitoring',
          priority: 'low',
          reasoning: 'No maintenance issues recorded in the past 12 months'
        }],
        riskLevel: 'low',
        summary: 'No maintenance requests recorded for this property in the past 12 months. The property appears to be well-maintained or newly added to the system.',
        requestsAnalyzed: 0
      };

      // Store insight if we have org
      if (organizationId) {
        await storeInsight(supabaseService, propertyId, organizationId, emptyAnalysis, periodStart, periodEnd);
      } else {
        console.warn('[analyze-property-hotspot] Cannot store insight - no organization_id');
      }

      return new Response(
        JSON.stringify(emptyAnalysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Format requests for AI analysis
    const formattedRequests = requests.map((r: MaintenanceRequest) => ({
      title: r.title,
      description: r.description?.substring(0, 200) || 'No description',
      location: r.location,
      category: r.ai_issue_type || r.category,
      tags: r.ai_issue_tags || [],
      status: r.status,
      priority: r.priority,
      date: new Date(r.created_at).toLocaleDateString('en-AU')
    }));

    const userPrompt = `Analyze maintenance requests for property: ${propertyName || 'Property'} (${propertyAddress || 'Address not provided'})

Total requests in past 12 months: ${requests.length}

Maintenance Request History:
${JSON.stringify(formattedRequests, null, 2)}

Provide a comprehensive analysis identifying patterns, systemic issues, and actionable recommendations.`;

    // Build minimal request body (no temperature, no top_p - these cause errors with some models)
    const requestBody: Record<string, unknown> = {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 1000
    };

    console.log(`[analyze-property-hotspot] AI request payload keys: ${Object.keys(requestBody).join(', ')}`);

    const makeAIRequest = async () => {
      return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    };

    let response = await makeAIRequest();
    
    // Helper to create fallback response when AI fails
    const createFallbackAnalysis = (reason: string) => ({
      recurringIssues: [],
      systemicProblems: [],
      recommendations: [{
        action: 'Retry analysis later',
        priority: 'medium',
        reasoning: 'AI analysis temporarily unavailable. Please try again in a few minutes.'
      }],
      riskLevel: 'unknown',
      summary: `AI analysis temporarily unavailable (${reason}). The system has ${requests.length} maintenance requests to analyze. Please retry shortly.`,
      requestsAnalyzed: requests.length,
      analysisStatus: 'ai_unavailable'
    });

    // Handle errors with detailed logging
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails: Record<string, unknown> = { status: response.status, message: errorText };
      
      // Try to parse error for more details
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = {
          status: response.status,
          message: errorJson.error?.message || errorText,
          type: errorJson.error?.type,
          param: errorJson.error?.param,
          code: errorJson.error?.code
        };
      } catch { /* keep original errorDetails */ }
      
      console.error('[analyze-property-hotspot] AI Gateway error:', JSON.stringify(errorDetails));
      
      // For rate limits, return specific message
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other errors, return fallback analysis instead of hard failure
      console.log('[analyze-property-hotspot] Returning fallback analysis due to AI error');
      const fallbackAnalysis = createFallbackAnalysis('service error');
      
      // Store the fallback insight
      if (organizationId) {
        await storeInsight(supabaseService, propertyId, organizationId, fallbackAnalysis, periodStart, periodEnd);
      }

      return new Response(
        JSON.stringify(fallbackAnalysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Log raw response for debugging
    console.log('[analyze-property-hotspot] Raw AI response:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    // Handle multiple response formats from different AI models
    const aiResponse = data.choices?.[0]?.message?.content 
      || data.content?.[0]?.text  // Gemini sometimes uses this format
      || data.text  // Another fallback format
      || null;

    if (!aiResponse) {
      console.error('[analyze-property-hotspot] No content in AI response, returning fallback. Response structure:', Object.keys(data));
      const fallbackAnalysis = createFallbackAnalysis('empty response');
      
      // Store the fallback insight
      if (organizationId) {
        await storeInsight(supabaseService, propertyId, organizationId, fallbackAnalysis, periodStart, periodEnd);
      }

      return new Response(
        JSON.stringify(fallbackAnalysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let analysis;
    try {
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add request count to analysis
    analysis.requestsAnalyzed = requests.length;

    // Store the insight in the database
    if (organizationId) {
      const result = await storeInsight(supabaseService, propertyId, organizationId, analysis, periodStart, periodEnd);
      if (!result.success) {
        console.error('[analyze-property-hotspot] Storage failed:', result.error);
      }
    } else {
      console.warn('[analyze-property-hotspot] Cannot store insight - no organization_id resolved');
    }

    console.log('Analysis complete:', { riskLevel: analysis.riskLevel, requestsAnalyzed: analysis.requestsAnalyzed });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-property-hotspot:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
