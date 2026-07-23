<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChat } from '@/composables/useChat'

const { messages, isStreaming, errorMessage, sendMessage } = useChat()

const input = ref('')
const scrollContainer = ref<HTMLDivElement | null>(null)

const suggestions = ['What did I decide this week?', 'Summarize my open action items']

async function handleSend() {
  const question = input.value.trim()
  if (!question) return

  input.value = ''
  await sendMessage(question)
}

function ask(q: string) {
  input.value = q
  handleSend()
}

watch(
  () => messages.value.map((m) => m.content).join(''),
  async () => {
    await nextTick()
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  },
)
</script>

<template>
  <section
    class="rounded-xl bg-card border border-ink-100 shadow-[0_1px_2px_rgba(15,20,29,0.04)] flex flex-col h-[32rem] lg:h-[calc(100vh-5rem)]"
  >
    <header class="px-5 py-4 border-b border-ink-100">
      <div class="flex items-center gap-2">
        <span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-mark-500" />
        <h2 class="font-display text-lg text-ink-950">Ask your notes</h2>
      </div>
      <p class="text-[13px] text-ink-400 mt-0.5 leading-snug">
        Answers come from your notes only it does not need the open web.
      </p>
    </header>

    <div ref="scrollContainer" class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
      <!-- Empty state as an invitation, not a status message -->
      <div v-if="messages.length === 0" class="mt-auto">
        <p class="text-[13px] text-ink-400 mb-3">Try asking</p>
        <div class="flex flex-col gap-2">
          <button
            v-for="s in suggestions"
            :key="s"
            type="button"
            @click="ask(s)"
            class="text-left text-[13px] text-ink-600 bg-paper hover:bg-pen-50 hover:text-pen-700 border border-ink-100 rounded-lg px-3 py-2 transition-colors"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="rise max-w-[88%] text-[14px] leading-relaxed"
        :class="
          message.role === 'user'
            ? 'self-end bg-pen-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2'
            : 'self-start text-ink-800 border-l-2 border-mark-500 bg-mark-50 rounded-r-lg pl-3 pr-3 py-2 whitespace-pre-wrap'
        "
      >
        <template v-if="message.role === 'assistant' && !message.content && isStreaming">
          <span class="text-ink-400">Searching your notes<span class="caret-blink" /></span>
        </template>
        <template v-else>{{ message.content }}</template>
      </div>

      <p v-if="errorMessage" class="text-[13px] text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
        {{ errorMessage }}
      </p>
    </div>

    <form @submit.prevent="handleSend" class="border-t border-ink-100 p-3 flex gap-2">
      <input
        v-model="input"
        type="text"
        placeholder="Ask a question..."
        aria-label="Ask your notes a question"
        :disabled="isStreaming"
        class="flex-1 text-[14px] text-ink-800 placeholder:text-ink-300 bg-paper border border-ink-100 rounded-lg px-3 py-2 focus:outline-none focus:border-pen-500 focus:bg-card disabled:opacity-50 transition-colors"
      />
      <button
        type="submit"
        :disabled="isStreaming || !input.trim()"
        class="bg-pen-600 text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-pen-700 disabled:opacity-40 disabled:hover:bg-pen-600 transition-colors"
      >
        Ask
      </button>
    </form>
  </section>
</template>
