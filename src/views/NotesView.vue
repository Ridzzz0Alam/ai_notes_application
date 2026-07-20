<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { fetchNotes, createNote, updateNote, deleteNote, summarizeNote } from '@/lib/notes'
import { useAuth } from '@/composables/useAuth'
import type { Note, NoteInput } from '@/types/note'
import NoteCard from '@/components/NoteCard.vue'
import NoteForm from '@/components/NoteForm.vue'
import ChatPanel from '@/components/ChatPanel.vue'

const router = useRouter()
const { signOut } = useAuth()
const queryClient = useQueryClient()
const editingNote = ref<Note | null>(null)

const {
  data: notes,
  isPending,
  isError,
  error,
} = useQuery({
  queryKey: ['notes'],
  queryFn: fetchNotes,
})

const createMutation = useMutation({
  mutationFn: createNote,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  },
})

const updateMutation = useMutation({
  mutationFn: ({ id, input }: { id: string; input: NoteInput }) => updateNote(id, input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] })
    editingNote.value = null
  },
})

const deleteMutation = useMutation({
  mutationFn: deleteNote,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  },
})

const summarizingNoteId = ref<string | null>(null)

const summarizeMutation = useMutation({
  mutationFn: summarizeNote,
  onMutate: (note: Note) => {
    summarizingNoteId.value = note.id
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  },
  onSettled: () => {
    summarizingNoteId.value = null
  },
})

function handleSubmit(formData: NoteInput) {
  if (editingNote.value) {
    updateMutation.mutate({ id: editingNote.value.id, input: formData })
  } else {
    createMutation.mutate(formData)
  }
}

function startEdit(note: Note) {
  editingNote.value = note
}

function cancelEdit() {
  editingNote.value = null
}

function handleDelete(id: string) {
  deleteMutation.mutate(id)
}

function handleSummarize(note: Note) {
  summarizeMutation.mutate(note)
}

async function handleSignOut() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-gray-900">VueNotes AI</h1>
        <button @click="handleSignOut" class="text-sm text-gray-500 hover:text-gray-700">
          Sign out
        </button>
      </div>

      <NoteForm :editing-note="editingNote" @submit="handleSubmit" @cancel="cancelEdit" />

      <div class="mt-8">
        <p v-if="isPending" class="text-gray-500 text-sm">Loading notes...</p>

        <p v-else-if="isError" class="text-red-500 text-sm">
          Error loading notes: {{ error?.message }}
        </p>

        <p v-else-if="notes?.length === 0" class="text-gray-500 text-sm">
          No notes yet. Add your first one above.
        </p>

        <div v-else class="flex flex-col gap-4">
          <NoteCard
            v-for="note in notes"
            :key="note.id"
            :note="note"
            :is-summarizing="summarizingNoteId === note.id"
            @edit="startEdit"
            @delete="handleDelete"
            @summarize="handleSummarize"
          />
        </div>
      </div>
    </div>

    <div class="lg:col-span-1 lg:sticky lg:top-10 lg:self-start">
      <ChatPanel />
    </div>
  </div>
</template>
