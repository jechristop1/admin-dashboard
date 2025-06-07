import OpenAI from 'npm:openai@4.28.0';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TOKENS = 4096;
const MAX_MESSAGES = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Chat function started');
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { message, messages, sessionId } = await req.json();
    console.log('Request payload received:', { sessionId, messageLength: message.length });

    if (!message || !sessionId) {
      throw new Error('Missing required parameters');
    }

    // Get user_id from the session
    console.log('Fetching session data...');
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }
    console.log('Session data retrieved:', { userId: session.user_id });

    // Generate embedding for semantic search
    console.log('Generating embedding for query...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log('Query embedding generated');

    // Search document chunks using embedding similarity
    console.log('Searching document chunks...');
    const { data: relevantChunks, error: chunksError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.78,
        match_count: 5,
        p_user_id: session.user_id
      }
    );

    if (chunksError) {
      console.error('Chunks search error:', chunksError);
      throw new Error(`Failed to search document chunks: ${chunksError.message}`);
    }
    console.log('Found relevant chunks:', relevantChunks?.length || 0);

    // Get user's documents with analysis
    console.log('Fetching document analyses...');
    const { data: userDocs, error: userDocsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', session.user_id)
      .order('upload_date', { ascending: false })
      .limit(5);

    if (userDocsError) {
      console.error('User documents error:', userDocsError);
      throw new Error(`Failed to fetch user documents: ${userDocsError.message}`);
    }
    console.log('Retrieved document analyses:', userDocs?.length || 0);

    // Prepare context from relevant chunks and analyses
    console.log('Preparing context...');
    let context = '';

    if (relevantChunks?.length) {
      context += "Relevant document sections:\n\n" +
        relevantChunks
          .map(chunk => chunk.content)
          .join('\n\n') + '\n\n';
    }

    if (userDocs?.length) {
      context += "Document analyses:\n\n" +
        userDocs
          .filter(doc => doc.analysis)
          .map(doc => `${doc.file_name} (${doc.document_type || 'other'}):\n${doc.analysis}`)
          .join('\n\n');
    }

    console.log('Context prepared:', { contextLength: context.length });

    // Get recent messages for context
    const recentMessages = messages
      .slice(-MAX_MESSAGES)
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

    console.log('Recent messages prepared:', recentMessages.length);

    // System message with context and guidelines
    const systemMessage = {
      role: 'system',
      content: `You are ForwardOps AI, a trauma-informed virtual Veterans Service Officer. Use this context to inform your responses:

${context}

Guidelines:
1. Speak like a veteran helping another veteran
2. Be clear, direct, and practical
3. Use markdown for better readability
4. Focus on actionable steps
5. Reference VA policies when relevant
6. Break down complex topics
7. Maintain a supportive tone
8. If unsure, acknowledge limitations and suggest seeking official VA guidance
9. When referencing documents:
   - Quote relevant sections directly
   - Explain technical terms
   - Highlight important dates
   - Identify required actions
   - Cite specific document names`
    };

    console.log('Creating chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...recentMessages, { role: 'user', content: message }],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
      stream: true,
    });

    console.log('Setting up streaming response...');
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    console.log('Sending streaming response...');
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request.',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});