import type { Metadata, Viewport } from 'next'
import './globals.css'
import { FeedbackWidget } from '@/components/FeedbackWidget'

export const metadata: Metadata = {
  title: 'Ben — Career Pattern Analysis',
  description: 'Understand the friction pattern across your career. Ben is a career counselor AI that synthesizes your story into a clear, honest diagnosis.',
  openGraph: {
    title: 'Ben — Career Pattern Analysis',
    description: 'Understand the friction pattern across your career.',
    siteName: 'Ben',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <FeedbackWidget />
      </body>
    </html>
  )
}
