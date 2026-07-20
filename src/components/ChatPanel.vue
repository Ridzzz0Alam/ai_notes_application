<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChat } from '@/composables/useChat'

const { messages, isStreaming, errorMessage, sendMessage } = useChat()

const input = ref('')
const scrollContainer = ref<HTMLDivElement | null>(null)

async function handleSend() {
  const question = input.value.trim()
  if (!question) return

  input.value = ''
  await sendMessage(question)
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
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-125">
    <div class="px-4 py-3 border-b border-gray-200">
      <h2 class="font-semibold text-gray-900">Chat with your notes</h2>
      <p class="text-xs text-gray-500">Answers are grounded in your own notes only.</p>
    </div>

    <div ref="scrollContainer" class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
      <p v-if="messages.length === 0" class="text-sm text-gray-400">
        Ask something like "What did I write about the design meeting?"
      </p>

      <div
        v-for="message in messages"
        :key="message.id"
        :class="[
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
          message.role === 'user'
            ? 'bg-indigo-600 text-white self-end'
            : 'bg-gray-100 text-gray-800 self-start',
        ]"
      >
        {{ message.content || (isStreaming ? '…' : '') }}
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>
    </div>

    <form @submit.prevent="handleSend" class="border-t border-gray-200 p-3 flex gap-2">
      <input
        v-model="input"
        type="text"
        placeholder="Ask your notes a question..."
        :disabled="isStreaming"
        class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        type="submit"
        :disabled="isStreaming || !input.trim()"
        class="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  </div>
</template>
