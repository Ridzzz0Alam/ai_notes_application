import type { Database } from '@/database.types'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInput = Pick<Database['public']['Tables']['notes']['Insert'], 'title' | 'content'> // For creating a new note, just need to provide the title and content
