<script setup lang="ts">
import { ref, watch } from 'vue'
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
  if (!title.value.trim()) return

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
    class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col gap-3"
  >
    <input
      v-model="title"
      type="text"
      placeholder="Note title"
      class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
    <textarea
      v-model="content"
      placeholder="Write your note..."
      rows="4"
      class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
    ></textarea>

    <div class="flex gap-2">
      <button
        type="submit"
        class="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        {{ editingNote ? 'Save Changes' : 'Add Note' }}
      </button>
      <button
        v-if="editingNote"
        type="button"
        @click="emit('cancel')"
        class="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-200"
      >
        Cancel
      </button>
    </div>
  </form>
</template>
