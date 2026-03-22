import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VO360 Photo Organizer',
  description: 'Your Intelligent Execution Partner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b border-navy-light bg-navy px-6 py-4 flex items-center gap-3">
          <span className="text-xl font-extrabold">
            <span className="text-white">VO</span>
            <span className="bg-gradient-to-r from-brand-blue to-brand-orange bg-clip-text text-transparent">360</span>
          </span>
          <span className="text-sm text-gray-400">Photo Organizer</span>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
