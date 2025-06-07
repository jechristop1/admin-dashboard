import OpenAI from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // Create a summary prompt from the messages
    const conversationSummary = messages
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .slice(-3) // Only use last 3 messages for title generation
      .join('\n');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a title generator. Generate a concise, descriptive title (maximum 6 words) for this conversation. Respond with ONLY the title, no additional text or punctuation.',
        },
        {
          role: 'user',
          content: conversationSummary,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = completion.choices[0].message.content?.trim() || 'New Conversation';

    return new Response(
      JSON.stringify({ title }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});