import { corsHeaders } from '../_shared/cors.ts'

interface SummarizeRequest {
  content: string
}

interface SummarizeResponse {
  summary: string
  tags: string[]
}

const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

Deno.serve(async (req: Request) => {
  // CORS preflight must be handled first, before any other logic
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content }: SummarizeRequest = await req.json()

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Summarize the following note in one or two sentences, and suggest 2-4 short topical tags. Note content:\n\n${content}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              summary: { type: 'STRING' },
              tags: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              }
            },
            required: ['summary', 'tags']
          }
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorBody)

      // Surface rate limits distinctly — the frontend can show a friendlier message for this one
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached, try again in a moment' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error(`Gemini API responded with ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error('Gemini returned no usable content')
    }

    // responseSchema guarantees this parses cleanly — no markdown fences, no stray prose
    const parsed: SummarizeResponse = JSON.parse(rawText)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('summarize-note error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/summarize-note' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/
