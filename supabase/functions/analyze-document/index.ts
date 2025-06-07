import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AnalyzeRequest {
  content: string;
  documentType: string;
  userId: string;
  documentId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('🔄 Starting document analysis...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { content, documentType, userId, documentId }: AnalyzeRequest = await req.json();

    console.log('📋 Analysis request details:', {
      documentId,
      documentType,
      contentLength: content.length,
      userId: userId.substring(0, 8) + '...'
    });

    if (!content || !documentType || !userId || !documentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content, documentType, userId, documentId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get document filename for title
    const { data: docData, error: docError } = await supabase
      .from('user_documents')
      .select('file_name')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
    }

    const documentTitle = docData?.file_name ? 
      docData.file_name.replace(/\.[^/.]+$/, '') : // Remove file extension
      'Document';

    console.log('📄 Document title:', documentTitle);

    // Create comprehensive analysis prompt based on document type
    let analysisPrompt = '';
    
    switch (documentType) {
      case 'c&p_exam':
        analysisPrompt = `You are ForwardOps AI, an experienced Veterans Service Officer (VSO) analyzing a C&P examination report. 

CRITICAL FORMATTING REQUIREMENTS:
1. Start with a brief, conversational summary (2-3 sentences) explaining what this document is and the key takeaways, as if talking to a fellow veteran. 
2. For any numbered section that doesn't apply to this specific document, either omit the section entirely OR write "Does not apply" under that section heading.
3. Only include sections that are relevant to the actual content of the document.
4. Use trauma-informed, veteran-to-veteran language throughout.
5. Be practical and tactical in your recommendations.
6. Provide a COMPLETE and COMPREHENSIVE analysis - do not truncate or summarize.
7. MUST follow the exact format structure below - this is mandatory.

Format your response EXACTLY like this structure:

**Summary:**
[Write 2-3 conversational sentences explaining what this C&P exam shows, the key findings, and any major concerns or positives - as if explaining to a fellow veteran over coffee]

---

# ${documentTitle} - C&P Examination Analysis

## 1. Document Type and Date
- **Document Type:** C&P Examination Report
- **Date of Examination:** [Extract date from document]
- **Examining Provider:** [Extract provider name/facility]
- **Conditions Examined:** [List all conditions examined]

## 2. Summary of Examination Findings
[Provide a clear summary of the examiner's findings for each condition in plain language, or write "Does not apply" if no clear findings are present]

## 3. Key Medical Opinions
[Include only if medical opinions are present in the document]
- **Diagnosis:** [Current diagnoses provided]
- **Severity Assessment:** [How severe the examiner rated each condition]
- **Functional Impact:** [How conditions affect daily activities]
- **Service Connection Opinion:** [Examiner's opinion on service connection if provided]

## 4. Strengths of the Examination
[Identify positive aspects that support the veteran's claim, or write "Does not apply" if no clear strengths are evident]

## 5. Potential Concerns or Gaps
[Identify any areas where the examination might be insufficient or concerning, or write "Does not apply" if the exam appears complete]

## 6. Recommended Action Steps
[Specific actions the veteran should consider, or write "Does not apply" if no specific actions are needed]

## 7. Suggested Language for Lay Statement (VA Form 21-4138)
[Include only if a lay statement is missing, weak, or could help clarify service connection. Draft should reflect the veteran's tone and experience, or write "Does not apply" if not needed]

## 8. Documents Reviewed
- ${documentTitle}

## 9. Next Step Options
[Provide 1-3 clear paths forward with specific forms and deadlines, or write "Does not apply" if no immediate next steps are required]

Analyze the following C&P examination report:`;
        break;

      case 'rating_decision':
        analysisPrompt = `You are ForwardOps AI, an experienced Veterans Service Officer (VSO) analyzing a VA Rating Decision.

CRITICAL FORMATTING REQUIREMENTS:
1. Start with a brief, conversational summary (2-3 sentences) explaining what this document is and the key takeaways, as if talking to a fellow veteran. 
2. For any numbered section that doesn't apply to this specific document, either omit the section entirely OR write "Does not apply" under that section heading.
3. Only include sections that are relevant to the actual content of the document.
4. Use trauma-informed, veteran-to-veteran language throughout.
5. Be practical and tactical in your recommendations.
6. Provide a COMPLETE and COMPREHENSIVE analysis - do not truncate or summarize.
7. MUST follow the exact format structure below - this is mandatory.

Format your response EXACTLY like this structure:

**Summary:**
[Write 2-3 conversational sentences explaining what this rating decision shows - what was granted, what was denied, and the main reasons - as if explaining to a fellow veteran over coffee]

---

# ${documentTitle} - VA Rating Decision Analysis

## 1. Document Type and Date
- **Document Type:** VA Rating Decision
- **Date of Decision:** [Extract date from document]
- **Effective Date:** [Extract effective date]
- **Claimed Conditions Reviewed:** [List all conditions reviewed]

## 2. Summary of VA Findings
[Provide a plainspoken summary of what the VA decided for each condition]

## 3. Reasons for Denial (Condition-by-Condition)
[Break down the VA's denial logic for each denied item in clear terms, or write "Does not apply" if no conditions were denied]

## 4. Missing or Weak Evidence
[Identify what evidence is lacking or could be improved, or write "Does not apply" if evidence appears sufficient]

## 5. Recommended Action Steps
[A tactical checklist for how to strengthen and resubmit denied claims, or write "Does not apply" if no appeals are recommended]

## 6. Suggested Language for Lay Statement (VA Form 21-4138)
[Include only if a lay statement is missing, weak, or could help clarify service connection. Draft should reflect the veteran's tone and experience, or write "Does not apply" if not needed]

## 7. Documents Reviewed
- ${documentTitle}

## 8. Next Step Options
[Provide 1-3 clear paths forward, or write "Does not apply" if no immediate action is required]

Analyze the following VA Rating Decision:`;
        break;

      case 'dbq':
        analysisPrompt = `You are ForwardOps AI, an experienced Veterans Service Officer (VSO) analyzing a Disability Benefits Questionnaire (DBQ).

CRITICAL FORMATTING REQUIREMENTS:
1. Start with a brief, conversational summary (2-3 sentences) explaining what this document is and the key takeaways, as if talking to a fellow veteran. 
2. For any numbered section that doesn't apply to this specific document, either omit the section entirely OR write "Does not apply" under that section heading.
3. Only include sections that are relevant to the actual content of the document.
4. Use trauma-informed, veteran-to-veteran language throughout.
5. Be practical and tactical in your recommendations.
6. Provide a COMPLETE and COMPREHENSIVE analysis - do not truncate or summarize.
7. MUST follow the exact format structure below - this is mandatory.

Format your response EXACTLY like this structure:

**Summary:**
[Write 2-3 conversational sentences explaining what this DBQ covers, the key medical findings, and how strong it is for the veteran's claim - as if explaining to a fellow veteran over coffee]

---

# ${documentTitle} - DBQ Analysis

## 1. Document Type and Date
- **Document Type:** Disability Benefits Questionnaire (DBQ)
- **Date Completed:** [Extract date]
- **Condition(s) Addressed:** [List conditions covered]
- **Completing Provider:** [Provider name and credentials]

## 2. Summary of Medical Findings
[Summarize the key medical findings in plain language]

## 3. Service Connection Elements
[Include only if service connection information is present]
- **In-Service Event/Injury:** [What the DBQ says about service connection]
- **Current Symptoms:** [Present symptoms documented]
- **Medical Nexus:** [Provider's opinion on service connection]

## 4. Missing or Weak Evidence
[Areas where additional information might strengthen the claim, or write "Does not apply" if the DBQ appears complete]

## 5. Recommended Action Steps
[Specific actions to take with this DBQ, or write "Does not apply" if no specific actions are needed]

## 6. Suggested Language for Lay Statement (VA Form 21-4138)
[Include only if a lay statement is missing, weak, or could help clarify service connection. Draft should reflect the veteran's tone and experience, or write "Does not apply" if not needed]

## 7. Documents Reviewed
- ${documentTitle}

## 8. Next Step Options
[Clear guidance on how to use this DBQ effectively, or write "Does not apply" if no immediate action is required]

Analyze the following DBQ:`;
        break;

      default:
        analysisPrompt = `You are ForwardOps AI, an experienced Veterans Service Officer (VSO) analyzing a veteran's document.

CRITICAL FORMATTING REQUIREMENTS:
1. Start with a brief, conversational summary (2-3 sentences) explaining what this document is and the key takeaways, as if talking to a fellow veteran. 
2. For any numbered section that doesn't apply to this specific document, either omit the section entirely OR write "Does not apply" under that section heading.
3. Only include sections that are relevant to the actual content of the document.
4. Use trauma-informed, veteran-to-veteran language throughout.
5. Be practical and tactical in your recommendations.
6. Provide a COMPLETE and COMPREHENSIVE analysis - do not truncate or summarize.
7. MUST follow the exact format structure below - this is mandatory.

Format your response EXACTLY like this structure:

**Summary:**
[Write 2-3 conversational sentences explaining what this document is, what it contains, and how it might help or hurt the veteran's claim - as if explaining to a fellow veteran over coffee]

---

# ${documentTitle} - Document Analysis

## 1. Document Type and Date
- **Document Type:** [Identify the type of document]
- **Date:** [Extract any relevant dates]
- **Purpose:** [What this document is for]

## 2. Summary of Key Information
[Summarize the most important information in plain language]

## 3. Relevance to VA Claims
[Explain how this document might be relevant to VA disability claims or benefits, or write "Does not apply" if not relevant to VA claims]

## 4. Missing or Weak Evidence
[Note any limitations or areas that might need additional support, or write "Does not apply" if the document appears complete]

## 5. Recommended Action Steps
[Specific steps the veteran should consider based on this document, or write "Does not apply" if no specific actions are needed]

## 6. Suggested Language for Lay Statement (VA Form 21-4138)
[Include only if a lay statement is missing, weak, or could help clarify service connection. Draft should reflect the veteran's tone and experience, or write "Does not apply" if not needed]

## 7. Documents Reviewed
- ${documentTitle}

## 8. Next Step Options
[Clear guidance on how to use this document effectively, or write "Does not apply" if no immediate action is required]

Analyze the following document:`;
    }

    console.log('🤖 Calling OpenAI API for comprehensive analysis...');

    // Call OpenAI API for analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are ForwardOps AI, an experienced Veterans Service Officer (VSO) with deep knowledge of VA claims, regulations, and procedures. You MUST follow the exact formatting structure provided in the user prompt. Always start with a brief, conversational summary before providing detailed analysis. Use clear, plain language and be specific about recommendations. Write as if you are a fellow veteran helping another veteran understand their documents. Use a trauma-informed, respectful approach throughout. For any section that doesn\'t apply to the specific document being analyzed, either omit that section entirely or write "Does not apply" under the section heading. Only include relevant sections based on the actual document content. Maintain a professional, VSO-style tone that is practical and tactical. PROVIDE COMPLETE AND COMPREHENSIVE ANALYSIS - do not truncate or summarize the response. CRITICAL: You must follow the exact format structure provided in the prompt, including all numbered sections and markdown formatting. This analysis will be saved to a database and must be complete and comprehensive for future reference.'
          },
          {
            role: 'user',
            content: `${analysisPrompt}\n\n${content}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated from OpenAI');
    }

    console.log('✅ Analysis generated successfully');
    console.log('📊 Analysis length:', analysis.length);
    console.log('🔍 Analysis preview:', analysis.substring(0, 200) + '...');

    // CRITICAL: Update the document with the analysis IMMEDIATELY
    console.log('💾 Saving analysis to database...');
    
    const { error: updateError } = await supabase
      .from('user_documents')
      .update({ 
        status: 'completed',
        analysis: analysis 
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Error updating document with analysis:', updateError);
      throw new Error(`Failed to save analysis: ${updateError.message}`);
    }

    console.log('✅ Analysis saved to database successfully');

    // Create chunks for better searchability
    const chunkSize = 2500;
    const chunks = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      chunks.push({
        document_id: documentId,
        content: chunk,
        chunk_index: Math.floor(i / chunkSize),
        total_chunks: Math.ceil(content.length / chunkSize)
      });
    }

    // Insert document chunks
    if (chunks.length > 0) {
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(chunks);

      if (chunksError) {
        console.error('Error inserting document chunks:', chunksError);
      } else {
        console.log('✅ Document chunks created:', chunks.length);
      }
    }

    // Store in document_embeddings for compatibility
    const { error: embeddingError } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        content: content.slice(0, 8000),
        metadata: {
          document_type: documentType,
          word_count: content.split(/\s+/).length,
          character_count: content.length,
          processed_at: new Date().toISOString(),
          title: documentTitle
        }
      });

    if (embeddingError) {
      console.error('Error inserting document embedding:', embeddingError);
    } else {
      console.log('✅ Document embedding created');
    }

    console.log('🎉 Document analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: analysis,
        chunks_created: chunks.length,
        word_count: content.split(/\s+/).length,
        title: documentTitle
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('💥 Error in analyze-document function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});