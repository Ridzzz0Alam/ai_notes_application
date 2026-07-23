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

// Which card is currently open for inline editing (null = none)
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

const savingNoteId = ref<string | null>(null)

const updateMutation = useMutation({
  mutationFn: ({ id, input }: { id: string; input: NoteInput }) => updateNote(id, input),
  onMutate: ({ id }: { id: string; input: NoteInput }) => {
    savingNoteId.value = id
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] })
    // Only close the editor once the save actually succeeded — a failed
    // save keeps the card open so the user's text isn't lost.
    editingNote.value = null
  },
  onSettled: () => {
    savingNoteId.value = null
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

// The top form only creates now — editing happens in the card itself.
function handleCreate(formData: NoteInput) {
  createMutation.mutate(formData)
}

function startEdit(note: Note) {
  editingNote.value = note
}

function cancelEdit() {
  editingNote.value = null
}

function handleSave(payload: { id: string; input: NoteInput }) {
  updateMutation.mutate(payload)
}

function handleDelete(id: string) {
  if (editingNote.value?.id === id) editingNote.value = null
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
  <div
    class="max-w-7xl mx-auto px-5 lg:px-8 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6 lg:gap-8"
  >
    <div class="min-w-0">
      <header class="flex items-center justify-between mb-7">
        <div>
          <h1 class="font-display text-3xl text-ink-950 leading-none">
            Lumina Notes ✨ Your AI Note Application
          </h1>
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300 mt-1.5">
            Private notebook
          </p>
        </div>
        <button
          @click="handleSignOut"
          class="text-[13px] font-medium text-ink-600 bg-card border border-ink-200 px-3.5 py-2 rounded-lg shadow-[0_1px_2px_rgba(15,20,29,0.04)] hover:text-ink-950 hover:border-ink-300 hover:shadow-[0_2px_8px_rgba(15,20,29,0.06)] transition-all duration-200"
        >
          Sign out
        </button>
      </header>

      <NoteForm :editing-note="null" @submit="handleCreate" @cancel="cancelEdit" />

      <div class="mt-8">
        <div v-if="isPending" class="flex flex-col gap-4">
          <div
            v-for="n in 2"
            :key="n"
            class="rounded-xl bg-card border border-ink-100 h-36 animate-pulse"
          />
        </div>

        <p
          v-else-if="isError"
          class="text-[14px] text-danger-600 bg-danger-50 rounded-lg px-4 py-3"
        >
          Couldn't load your notes: {{ error?.message }}
        </p>

        <div
          v-else-if="notes?.length === 0"
          class="rounded-xl border border-dashed border-ink-200 px-6 py-12 text-center"
        >
          <p class="font-display text-lg text-ink-600">Nothing here yet</p>
          <p class="text-[14px] text-ink-400 mt-1">
            Write your first note above — you can ask questions about it once it's saved.
          </p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300">
            {{ notes?.length }} {{ notes?.length === 1 ? 'note' : 'notes' }}
          </p>
          <NoteCard
            v-for="note in notes"
            :key="note.id"
            :note="note"
            :is-editing="editingNote?.id === note.id"
            :is-saving="savingNoteId === note.id"
            :is-summarizing="summarizingNoteId === note.id"
            @edit="startEdit"
            @cancel="cancelEdit"
            @save="handleSave"
            @delete="handleDelete"
            @summarize="handleSummarize"
          />
        </div>
      </div>
    </div>

    <aside class="lg:sticky lg:top-10 lg:self-start lg:h-[calc(100vh-5rem)]">
      <ChatPanel />
    </aside>
  </div>
</template>
