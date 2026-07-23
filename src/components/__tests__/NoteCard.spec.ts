import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteCard from '../NoteCard.vue'
import type { Note } from '@/types/note'


function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Design meeting',
    content: 'We agreed on the new nav bar.',
    summary: null,
    tags: null,
    embedding: null,
    created_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    ...overrides,
  }
}

describe('NoteCard', () => {
  it('renders the title and content', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote() } })
    expect(wrapper.text()).toContain('Design meeting')
    expect(wrapper.text()).toContain('We agreed on the new nav bar.')
  })

  it('hides the summary block when there is no summary', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote() } })
    expect(wrapper.find('[data-testid="note-summary"]').exists()).toBe(false)
  })

  it('shows the summary as a labelled annotation when present', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote({ summary: 'A short recap.' }) } })
    const summary = wrapper.find('[data-testid="note-summary"]')
    expect(summary.exists()).toBe(true)
    expect(summary.text()).toContain('AI summary')
    expect(summary.text()).toContain('A short recap.')
  })

  it('renders tags when present', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote({ tags: ['design', 'ux'] }) } })
    expect(wrapper.text()).toContain('design')
    expect(wrapper.text()).toContain('ux')
  })

  it('emits delete with the note id', async () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote() } })
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(wrapper.emitted('delete')?.[0]).toEqual(['note-1'])
  })

  it('emits edit with the whole note', async () => {
    const note = makeNote()
    const wrapper = mount(NoteCard, { props: { note } })
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([note])
  })

  it('disables the summarize button while summarizing', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote(), isSummarizing: true } })
    const btn = wrapper.find('[data-testid="summarize-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('Summarizing')
  })

  it('offers to resummarize a note that already has a summary', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote({ summary: 'Recap.' }) } })
    expect(wrapper.find('[data-testid="summarize-btn"]').text()).toContain('Resummarize')
  })

  it('does not clamp a short note', () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote() } })
    expect(wrapper.find('[data-testid="expand-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="note-body"]').classes()).not.toContain('overflow-hidden')
  })

  it('clamps a long note and expands it on demand', async () => {
    const wrapper = mount(NoteCard, { props: { note: makeNote({ content: 'x'.repeat(900) }) } })
    const toggle = wrapper.find('[data-testid="expand-toggle"]')
    expect(toggle.exists()).toBe(true)
    expect(wrapper.find('[data-testid="note-body"]').classes()).toContain('overflow-hidden')

    await toggle.trigger('click')
    expect(wrapper.find('[data-testid="note-body"]').classes()).not.toContain('overflow-hidden')
  })
})

describe('NoteCard — inline editing', () => {
  const note = makeNote({ content: 'Original body.' })

  it('shows read mode by default', () => {
    const wrapper = mount(NoteCard, { props: { note } })
    expect(wrapper.find('[data-testid="edit-title"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="note-body"]').exists()).toBe(true)
  })

  it('emits edit when the Edit button is pressed', async () => {
    const wrapper = mount(NoteCard, { props: { note } })
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([note])
  })

  it('swaps to an editable form when isEditing is true', () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true } })
    expect(wrapper.find('[data-testid="note-body"]').exists()).toBe(false)
    const title = wrapper.find('[data-testid="edit-title"]')
    const body = wrapper.find('[data-testid="edit-content"]')
    expect((title.element as HTMLInputElement).value).toBe('Design meeting')
    expect((body.element as HTMLTextAreaElement).value).toBe('Original body.')
  })

  it('emits save with the edited values', async () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true } })
    await wrapper.find('[data-testid="edit-title"]').setValue('  Renamed  ')
    await wrapper.find('[data-testid="edit-content"]').setValue('New body.')
    await wrapper.find('[data-testid="save-btn"]').trigger('click')

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { id: 'note-1', input: { title: 'Renamed', content: 'New body.' } },
    ])
  })

  it('blocks saving an empty title', async () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true } })
    await wrapper.find('[data-testid="edit-title"]').setValue('   ')
    const btn = wrapper.find('[data-testid="save-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
    await btn.trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('emits cancel without emitting save', async () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true } })
    await wrapper.find('[data-testid="edit-content"]').setValue('discard me')
    await wrapper.find('[data-testid="cancel-btn"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('discards an abandoned draft when re-entering edit mode', async () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true } })
    await wrapper.find('[data-testid="edit-content"]').setValue('abandoned text')

    await wrapper.setProps({ isEditing: false })
    await wrapper.setProps({ isEditing: true })

    const body = wrapper.find('[data-testid="edit-content"]')
    expect((body.element as HTMLTextAreaElement).value).toBe('Original body.')
  })

  it('shows a saving state and blocks double submits', async () => {
    const wrapper = mount(NoteCard, { props: { note, isEditing: true, isSaving: true } })
    const btn = wrapper.find('[data-testid="save-btn"]')
    expect(btn.text()).toContain('Saving')
    expect(btn.attributes('disabled')).toBeDefined()
    await btn.trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
