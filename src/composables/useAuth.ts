import { ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const session = ref<Session | null>(null)
const user = ref<User | null>(null)
const isInitialized = ref(false)

async function initAuth() {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  user.value = data.session?.user ?? null
  isInitialized.value = true
}

supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
  user.value = newSession?.user ?? null
})

async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
}
async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function useAuth() {
  return { session, user, isInitialized, initAuth, signUp, signIn, signOut }
}
