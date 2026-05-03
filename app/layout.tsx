import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { PostHogProvider } from "./providers";
import { PostHogPageView } from "./PostHogPageView";
import { Analytics } from '@vercel/analytics/next';

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
      <body className="font-sans antialiased">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
