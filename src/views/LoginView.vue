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
  <div class="min-h-screen flex items-center justify-center px-4">
    <form
      @submit.prevent="handleSubmit"
      class="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4"
    >
      <h1 class="text-2xl font-bold text-gray-900">Log in to VueNotes AI</h1>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
        class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
        class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {{ isSubmitting ? 'Logging in...' : 'Log In' }}
      </button>

      <p class="text-sm text-gray-500 text-center">
        No account?
        <RouterLink to="/signup" class="text-indigo-600 hover:underline">Sign up</RouterLink>
      </p>
    </form>
  </div>
</template>
