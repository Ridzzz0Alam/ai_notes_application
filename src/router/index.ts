import { createRouter, createWebHistory } from 'vue-router'
import NotesView from '@/views/NotesView.vue'
import LoginView from '@/views/LoginView.vue'
import SignupView from '@/views/SignupView.vue'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'notes', component: NotesView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { requiresAuth: false } },
    { path: '/signup', name: 'signup', component: SignupView, meta: { requiresAuth: false } },
  ],
})

router.beforeEach((to) => {
  const { user } = useAuth()
  if (to.meta.requiresAuth && !user.value) return { name: 'login' }
  if (!to.meta.requiresAuth && user.value && (to.name === 'login' || to.name === 'signup'))
    return { name: 'notes' }
  return true
})

export default router
