<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await signIn(email.value, password.value)
    router.push('/')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <div class="hidden lg:flex flex-col justify-between bg-ink-950 text-white p-12">
      <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">Lumina Notes ✨</p>
      <div>
        <h2 class="font-display text-4xl leading-tight max-w-sm">
          Ask your notes a question. Get an answer from your notes.
        </h2>
        <p class="text-[15px] text-ink-300 mt-4 max-w-sm leading-relaxed">
          Nothing is trained on. Nothing leaves your account. When there's no answer in your notes,
          it says so.
        </p>
      </div>
      <p class="font-mono text-[11px] text-ink-600">Encrypted · Row-level isolation</p>
    </div>

    <div class="flex items-center justify-center px-5 py-12">
      <form @submit.prevent="handleSubmit" class="w-full max-w-sm">
        <h1 class="font-display text-3xl text-ink-950">Welcome back</h1>
        <p class="text-[14px] text-ink-400 mt-1 mb-7">Sign in to your notebook.</p>

        <label class="block font-mono text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
          Email
        </label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full text-[15px] text-ink-800 bg-card border border-ink-200 rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:border-pen-500 transition-colors"
        />

        <label class="block font-mono text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
          Password
        </label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full text-[15px] text-ink-800 bg-card border border-ink-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-pen-500 transition-colors"
        />

        <p
          v-if="errorMessage"
          class="text-[13px] text-danger-600 bg-danger-50 rounded-lg px-3 py-2 mt-4"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full bg-pen-600 text-white text-[14px] font-medium py-2.5 rounded-lg hover:bg-pen-700 disabled:opacity-40 transition-colors mt-6"
        >
          {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>

        <p class="text-[13px] text-ink-400 text-center mt-5">
          No account?
          <RouterLink to="/signup" class="text-pen-600 font-medium hover:underline">
            Create one
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
