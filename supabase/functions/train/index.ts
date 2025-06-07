import OpenAI from 'npm:openai@4.28.0';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { encode, decode } from 'npm:gpt-tokenizer@2.1.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reduced chunk size from 1000 to 512 to prevent resource exhaustion
// text-embedding-3-small has a context window of 8191 tokens
// Using a smaller chunk size to ensure safe processing within Edge Function limits
const MAX_TOKENS_PER_CHUNK = 512;

function chunkText(text: string): string[] {
  const tokens = encode(text);
  const chunks: string[] = [];
  
  for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_CHUNK) {
    const chunkTokens = tokens.slice(i, i + MAX_TOKENS_PER_CHUNK);
    const chunkText = decode(chunkTokens);
    chunks.push(chunkText.trim());
  }

  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documents } = await req.json();

    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array');
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = [];

    for (const doc of documents) {
      // Split content into chunks
      const contentChunks = chunkText(doc.content);
      
      for (let i = 0; i < contentChunks.length; i++) {
        const chunk = contentChunks[i];
        
        try {
          // Generate embedding for the chunk
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunk,
          });

          const embedding = embeddingResponse.data[0].embedding;

          // Create metadata for the chunk
          const chunkMetadata = {
            ...doc.metadata,
            originalTitle: doc.title,
            chunkIndex: i,
            totalChunks: contentChunks.length,
          };

          // Generate chunk title
          const chunkTitle = contentChunks.length > 1 
            ? `${doc.title} (Part ${i + 1}/${contentChunks.length})`
            : doc.title;

          // Insert document chunk with embedding and metadata
          const { data, error } = await supabase
            .from('documents')
            .insert({
              title: chunkTitle,
              content: chunk,
              embedding,
              metadata: chunkMetadata,
              user_id: doc.user_id,
            })
            .select('id, title')
            .single();

          if (error) throw error;

          results.push(data);
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}/${contentChunks.length}:`, error);
          throw new Error(`Failed to process chunk ${i + 1}/${contentChunks.length}: ${error.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Train function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});