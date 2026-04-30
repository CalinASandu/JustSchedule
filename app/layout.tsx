import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'JustSchedule',
  description: 'Schedule your exam seat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(geist.variable, "font-sans")}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
