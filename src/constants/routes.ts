export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  GROUPS: '/groups',
  GROUP_DETAIL: '/groups/:groupId',
  BUDGET: '/budget',
  ACTIVITY: '/activity',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]
