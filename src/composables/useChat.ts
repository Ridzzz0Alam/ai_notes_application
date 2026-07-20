import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types/chat'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const errorMessage = ref('')

  async function sendMessage(question: string) {
    if (!question.trim() || isStreaming.value) return

    errorMessage.value = ''

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    }

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    }

    messages.value.push(userMessage, assistantMessage)
    isStreaming.value = true

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/chat-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: supabasePublishableKey,
        },
        body: JSON.stringify({ question }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        const target = messages.value.find((m) => m.id === assistantMessage.id)
        if (target) {
          target.content += chunk
        }
      }
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Something went wrong'
    } finally {
      isStreaming.value = false
    }
  }

  return {
    messages,
    isStreaming,
    errorMessage,
    sendMessage,
  }
}
