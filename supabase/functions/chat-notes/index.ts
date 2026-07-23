import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ChatRequest {
  question: string
}

const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'
const GEMINI_STREAM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question }: ChatRequest = await req.json()

    if (!question || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not set')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // 1. Embed the question — RETRIEVAL_QUERY this time, not RETRIEVAL_DOCUMENT
    const embedResponse = await fetch(`${GEMINI_EMBED_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: question }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 768,
      }),
    })

    if (!embedResponse.ok) {
      throw new Error(`Embedding the question failed: ${embedResponse.status}`)
    }

    const embedData = await embedResponse.json()
    const queryEmbedding: number[] = embedData.embedding.values

    // 2. Search for matching notes via the match_notes Postgres function
    const { data: matches, error: matchError } = await supabase.rpc('match_notes', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_count: 5,
      match_threshold: 0.5,
    })

    if (matchError) throw matchError

    // 3. Build context from whatever notes actually matched — could be zero
    const context =
      matches && matches.length > 0
        ? matches
            .map(
              (note: { title: string; content: string }) => `Title: ${note.title}\n${note.content}`,
            )
            .join('\n\n---\n\n')
        : ''

    const prompt = context
      ? `You are answering questions using only the user's own notes below. If the notes don't contain the answer, say so honestly instead of guessing.\n\nNotes:\n${context}\n\nQuestion: ${question}`
      : `The user has no notes that match this question. Tell them you couldn't find anything relevant in their notes, and don't make up an answer. Question: ${question}`

    // 4. Stream the answer back from Gemini
    const geminiResponse = await fetch(`${GEMINI_STREAM_URL}&key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    })

    if (!geminiResponse.ok || !geminiResponse.body) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini stream error:', geminiResponse.status, errorBody)
      throw new Error(`Gemini streaming request failed: ${geminiResponse.status}`)
    }

    // 5. Re-stream Gemini's SSE chunks back to the browser as plain text deltas.
    const reader = geminiResponse.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const parsed = JSON.parse(jsonStr)
              const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (textChunk) {
                controller.enqueue(encoder.encode(textChunk))
              }
            } catch {
              // Incomplete JSON chunk mid-stream safe to skip, the next chunk completes it
            }
          }
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('chat-notes error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
