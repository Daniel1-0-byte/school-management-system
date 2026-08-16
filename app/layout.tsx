import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Comprehensive school management platform for attendance, fees, academics, and communication',
  generator: 'v0.app',
  icons: {
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/418663-removebg-preview-VtVfwK4nK0XmFUKHC1BHmGHDkqcp6Y.png',
    apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/418663-removebg-preview-VtVfwK4nK0XmFUKHC1BHmGHDkqcp6Y.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background text-foreground scroll-smooth">
      <body className="antialiased bg-background text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
