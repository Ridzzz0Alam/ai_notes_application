<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { signUp } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    await signUp(email.value, password.value)
    successMessage.value = 'Account created - you can now login'
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
      <h1 class="text-2xl font-bold text-gray-900">Create your VueNotes Account</h1>

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
      <p v-if="successMessage" class="text-green-600 text-sm">{{ successMessage }}</p>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {{ isSubmitting ? 'Creating account...' : 'Sign Up' }}
      </button>

      <p class="text-sm text-gray-500 text-center">
        Already have an account
        <RouterLink to="/login" class="text-indigo-600 hover:underline">Login</RouterLink>
      </p>
    </form>
  </div>
</template>
