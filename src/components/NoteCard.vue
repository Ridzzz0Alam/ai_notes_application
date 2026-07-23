<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Note, NoteInput } from '@/types/note'

const props = defineProps<{
  note: Note
  isSummarizing?: boolean
  isEditing?: boolean
  isSaving?: boolean
}>()

const emit = defineEmits<{
  edit: [note: Note]
  cancel: []
  save: [payload: { id: string; input: NoteInput }]
  delete: [id: string]
  summarize: [note: Note]
}>()

const expanded = ref(false)

/* ---- inline edit state ---- */
const draftTitle = ref('')
const draftContent = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

const canSave = computed(() => draftTitle.value.trim().length > 0)

const isDirty = computed(
  () => draftTitle.value !== props.note.title || draftContent.value !== (props.note.content ?? ''),
)

// Refill the draft from the note each time this card enters edit mode,
// so a cancelled edit never leaks into the next one.
watch(
  () => props.isEditing,
  async (editing) => {
    if (!editing) return
    draftTitle.value = props.note.title
    draftContent.value = props.note.content ?? ''
    expanded.value = true
    await nextTick()
    titleInput.value?.focus()
  },
  { immediate: true },
)

function save() {
  if (!canSave.value || props.isSaving) return
  emit('save', {
    id: props.note.id,
    input: { title: draftTitle.value.trim(), content: draftContent.value.trim() },
  })
}

function cancel() {
  emit('cancel')
}

/* ---- display ---- */
const isLong = computed(() => {
  const body = props.note.content ?? ''
  return body.length > 420 || body.split('\n').length > 7
})

const savedOn = computed(() => {
  if (!props.note.created_at) return ''
  return new Date(props.note.created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
})
</script>

<template>
  <article
    data-testid="note-card"
    class="group relative rounded-xl bg-card border transition-all duration-200"
    :class="
      isEditing
        ? 'border-pen-100 shadow-[0_4px_20px_rgba(47,75,214,0.10)]'
        : 'border-ink-100 shadow-[0_1px_2px_rgba(15,20,29,0.04)] hover:shadow-[0_4px_16px_rgba(15,20,29,0.07)] hover:border-ink-200'
    "
    @keydown.esc="isEditing && cancel()"
  >
    <!-- Margin rule: the spine of the card, like the ruled line on notepaper -->
    <span
      aria-hidden="true"
      class="absolute left-0 top-4 bottom-4 w-px transition-colors duration-200"
      :class="isEditing ? 'bg-pen-600' : 'bg-ink-100 group-hover:bg-pen-500'"
    />

    <div class="pl-6 pr-5 py-5">
      <!-- ============ EDIT MODE ============ -->
      <template v-if="isEditing">
        <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-pen-700 mb-3">Editing</p>

        <input
          ref="titleInput"
          v-model="draftTitle"
          data-testid="edit-title"
          type="text"
          placeholder="Title"
          aria-label="Note title"
          class="w-full font-display text-xl text-ink-950 placeholder:text-ink-300 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
          @keydown.meta.enter="save"
          @keydown.ctrl.enter="save"
        />

        <div class="h-px bg-ink-100 my-3" />

        <textarea
          v-model="draftContent"
          data-testid="edit-content"
          rows="8"
          placeholder="Write your note..."
          aria-label="Note content"
          class="w-full text-[15px] leading-relaxed text-ink-600 placeholder:text-ink-300 bg-transparent border-0 p-0 resize-y min-h-40 focus:outline-none focus:ring-0"
          @keydown.meta.enter="save"
          @keydown.ctrl.enter="save"
        ></textarea>

        <footer class="flex items-center gap-2 mt-4 pt-3 border-t border-ink-100">
          <button
            data-testid="save-btn"
            type="button"
            @click="save"
            :disabled="!canSave || isSaving"
            class="inline-flex items-center gap-1.5 bg-pen-600 text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-pen-700 disabled:opacity-40 disabled:hover:bg-pen-600 transition-colors"
          >
            <span
              v-if="isSaving"
              aria-hidden="true"
              class="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent animate-spin"
            />
            {{ isSaving ? 'Saving' : 'Save changes' }}
          </button>
          <button
            data-testid="cancel-btn"
            type="button"
            @click="cancel"
            class="text-[13px] font-medium text-ink-400 hover:text-ink-800 px-3 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <span v-if="isDirty" class="ml-auto font-mono text-[11px] text-ink-300"> Unsaved </span>
        </footer>
      </template>

      <!-- ============ READ MODE ============ -->
      <template v-else>
        <header class="flex items-baseline justify-between gap-4">
          <h3 class="font-display text-xl leading-snug text-ink-950">{{ note.title }}</h3>
          <time
            v-if="savedOn"
            class="font-mono text-[11px] uppercase tracking-wider text-ink-300 shrink-0"
          >
            {{ savedOn }}
          </time>
        </header>

        <div class="relative mt-2">
          <p
            data-testid="note-body"
            class="text-[15px] leading-relaxed text-ink-600 whitespace-pre-wrap"
            :class="!expanded && isLong ? 'max-h-52 overflow-hidden' : ''"
          >
            {{ note.content }}
          </p>

          <div
            v-if="isLong && !expanded"
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent"
          />
        </div>

        <button
          v-if="isLong"
          data-testid="expand-toggle"
          type="button"
          @click="expanded = !expanded"
          class="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-400 hover:text-pen-600 transition-colors"
        >
          {{ expanded ? '— Show less' : '+ Show more' }}
        </button>

        <!-- AI summary as a margin annotation: offset, labelled, unmistakably not your words -->
        <aside
          v-if="note.summary"
          data-testid="note-summary"
          class="mt-4 border-l-2 border-mark-500 bg-mark-50 rounded-r-md pl-3.5 pr-3 py-2.5"
        >
          <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-mark-700 mb-1">
            AI summary
          </p>
          <p class="text-sm leading-relaxed text-ink-600">{{ note.summary }}</p>
        </aside>

        <ul v-if="note.tags?.length" class="flex flex-wrap gap-1.5 mt-3">
          <li
            v-for="tag in note.tags"
            :key="tag"
            class="font-mono text-[11px] text-mark-700 bg-mark-100/70 px-2 py-0.5 rounded"
          >
            {{ tag }}
          </li>
        </ul>

        <footer class="flex items-center gap-1 mt-4 pt-3 border-t border-ink-100">
          <button
            data-testid="edit-btn"
            @click="emit('edit', note)"
            class="text-[13px] font-medium text-ink-400 hover:text-pen-600 px-2 py-1 rounded transition-colors"
          >
            Edit
          </button>
          <button
            data-testid="delete-btn"
            @click="emit('delete', note.id)"
            class="text-[13px] font-medium text-ink-400 hover:text-danger-600 px-2 py-1 rounded transition-colors"
          >
            Delete
          </button>

          <button
            data-testid="summarize-btn"
            @click="emit('summarize', note)"
            :disabled="isSummarizing"
            class="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-mark-700 hover:bg-mark-50 disabled:opacity-50 disabled:hover:bg-transparent px-2.5 py-1 rounded-md transition-colors"
          >
            <span
              v-if="isSummarizing"
              aria-hidden="true"
              class="w-3 h-3 rounded-full border-[1.5px] border-mark-500 border-t-transparent animate-spin"
            />
            {{ isSummarizing ? 'Summarizing' : note.summary ? 'Resummarize' : '✨ Summarize' }}
          </button>
        </footer>
      </template>
    </div>
  </article>
</template>
