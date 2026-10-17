import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '#/components/Dashboard'
import { FONTS_STYLESHEET } from '#/lib/designTokens'

export const Route = createFileRoute('/shift')({
  ssr: false,
  head: () => ({
    meta: [{ title: 'Marshal · Live shift' }],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: FONTS_STYLESHEET },
    ],
  }),
  component: ShiftPage,
})

function ShiftPage() {
  return <Dashboard />
}
