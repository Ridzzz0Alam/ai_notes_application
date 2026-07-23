<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Note, NoteInput } from '@/types/note'

const props = defineProps<{
  editingNote: Note | null
}>()

const emit = defineEmits<{
  submit: [data: NoteInput]
  cancel: []
}>()

const title = ref('')
const content = ref('')

const canSubmit = computed(() => title.value.trim().length > 0)

watch(
  () => props.editingNote,
  (note) => {
    if (note) {
      title.value = note.title
      content.value = note.content ?? ''
    } else {
      title.value = ''
      content.value = ''
    }
  },
  { immediate: true },
)

function handleSubmit() {
  if (!canSubmit.value) return

  emit('submit', {
    title: title.value.trim(),
    content: content.value.trim(),
  })

  title.value = ''
  content.value = ''
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="relative rounded-xl bg-card border border-ink-100 shadow-[0_1px_2px_rgba(15,20,29,0.04)] focus-within:border-pen-100 focus-within:shadow-[0_4px_20px_rgba(47,75,214,0.08)] transition-all duration-200"
  >
    <span
      aria-hidden="true"
      class="absolute left-0 top-4 bottom-4 w-px transition-colors duration-200"
      :class="editingNote ? 'bg-mark-500' : 'bg-pen-500'"
    />

    <div class="pl-6 pr-5 py-5">
      <p
        v-if="editingNote"
        class="font-mono text-[10px] uppercase tracking-[0.12em] text-mark-700 mb-3"
      >
        Editing note
      </p>

      <input
        v-model="title"
        type="text"
        placeholder="Title"
        aria-label="Note title"
        class="w-full font-display text-xl text-ink-950 placeholder:text-ink-300 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
      />

      <div class="h-px bg-ink-100 my-3" />

      <textarea
        v-model="content"
        placeholder="Start writing. Everything here stays yours."
        aria-label="Note content"
        rows="8"
        class="w-full text-[15px] leading-relaxed text-ink-600 placeholder:text-ink-300 bg-transparent border-0 p-0 resize-y min-h-40 focus:outline-none focus:ring-0"
      ></textarea>

      <div class="flex items-center gap-2 mt-4 pt-3 border-t border-ink-100">
        <button
          type="submit"
          :disabled="!canSubmit"
          class="bg-pen-600 text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-pen-700 disabled:opacity-40 disabled:hover:bg-pen-600 transition-colors"
        >
          {{ editingNote ? 'Save changes' : 'Add note' }}
        </button>
        <button
          v-if="editingNote"
          type="button"
          @click="emit('cancel')"
          class="text-[13px] font-medium text-ink-400 hover:text-ink-800 px-3 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>

        <span
          v-if="content.length > 0"
          class="ml-auto font-mono text-[11px] text-ink-300 tabular-nums"
        >
          {{ content.length }} chars
        </span>
      </div>
    </div>
  </form>
</template>
