import '@/assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from './lib/queryClient.ts'
import { useAuth } from './composables/useAuth.ts'

const { initAuth } = useAuth()
await initAuth()

const app = createApp(App)
app.use(router)
app.use(VueQueryPlugin, { queryClient })
app.mount('#app')
