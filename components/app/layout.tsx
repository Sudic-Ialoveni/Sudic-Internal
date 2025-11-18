import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sudic Internal Dashboard',
  description: 'Unified control center for Sudic Ialoveni',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

