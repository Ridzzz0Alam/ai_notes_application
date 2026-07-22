import { corsHeaders } from '../_shared/cors.ts'

interface EmbedRequest {
  text: string
}

interface EmbedResponse {
  embedding: number[]
}

const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text }: EmbedRequest = await req.json()

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const geminiResponse = await fetch(`${GEMINI_EMBED_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        // RETRIEVAL_DOCUMENT — this embedding represents a stored note,
        // not a search query. Gemini optimizes the vector differently for each.
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768
      })
    })

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini embed error:', geminiResponse.status, errorBody)
      throw new Error(`Gemini API responded with ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const values: number[] | undefined = geminiData.embedding?.values

    if (!values) {
      throw new Error('Gemini returned no embedding values')
    }

    const result: EmbedResponse = { embedding: values }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('embed-note error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
