import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version stamp for deployment verification
const FUNCTION_VERSION = "2025-01-20_v3_gemini_model";

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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Fetch maintenance requests for this property (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: requests, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select('id, title, description, location, category, status, priority, created_at, ai_issue_type, ai_issue_tags')
      .eq('property_id', propertyId)
      .gte('created_at', oneYearAgo.toISOString())
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

      // Store the insight
      const { data: profile } = await supabase.auth.getUser();
      if (profile?.user?.id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', profile.user.id)
          .single();

        if (userProfile?.organization_id) {
          const { error: upsertError } = await supabase.from('property_insights').upsert({
            property_id: propertyId,
            organization_id: userProfile.organization_id,
            insight_type: 'hotspot_analysis',
            insight_data: emptyAnalysis,
            period_start: oneYearAgo.toISOString(),
            period_end: new Date().toISOString()
          }, {
            onConflict: 'property_id,insight_type'
          });
          if (upsertError) console.error('Error storing empty insight:', upsertError);
          else console.log('Empty insight stored successfully for property:', propertyId);
        }
      } else {
        console.warn('No authenticated user, cannot store empty insight');
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
      let errorDetails = { status: response.status, message: errorText };
      
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
      const { data: profile } = await supabase.auth.getUser();
      if (profile?.user?.id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', profile.user.id)
          .single();

        if (userProfile?.organization_id) {
          const { error: upsertError } = await supabase.from('property_insights').upsert({
            property_id: propertyId,
            organization_id: userProfile.organization_id,
            insight_type: 'hotspot_analysis',
            insight_data: fallbackAnalysis,
            period_start: oneYearAgo.toISOString(),
            period_end: new Date().toISOString()
          }, {
            onConflict: 'property_id,insight_type'
          });
          if (upsertError) console.error('Error storing fallback insight:', upsertError);
          else console.log('Fallback insight stored for property:', propertyId);
        }
      } else {
        console.warn('No authenticated user, cannot store fallback insight');
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
      const { data: profile } = await supabase.auth.getUser();
      if (profile?.user?.id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', profile.user.id)
          .single();

        if (userProfile?.organization_id) {
          const { error: upsertError } = await supabase.from('property_insights').upsert({
            property_id: propertyId,
            organization_id: userProfile.organization_id,
            insight_type: 'hotspot_analysis',
            insight_data: fallbackAnalysis,
            period_start: oneYearAgo.toISOString(),
            period_end: new Date().toISOString()
          }, {
            onConflict: 'property_id,insight_type'
          });
          if (upsertError) console.error('Error storing fallback insight:', upsertError);
          else console.log('Fallback insight stored for property:', propertyId);
        }
      } else {
        console.warn('No authenticated user, cannot store fallback insight');
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
    const { data: profile } = await supabase.auth.getUser();
    if (profile?.user?.id) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', profile.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      if (userProfile?.organization_id) {
        const { error: upsertError } = await supabase.from('property_insights').upsert({
          property_id: propertyId,
          organization_id: userProfile.organization_id,
          insight_type: 'hotspot_analysis',
          insight_data: analysis,
          period_start: oneYearAgo.toISOString(),
          period_end: new Date().toISOString()
        }, {
          onConflict: 'property_id,insight_type'
        });

        if (upsertError) {
          console.error('Error storing insight:', upsertError);
        } else {
          console.log('✅ Insight stored successfully for property:', propertyId);
        }
      } else {
        console.warn('No organization_id found for user, cannot store insight');
      }
    } else {
      console.warn('No authenticated user found, cannot store insight');
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
