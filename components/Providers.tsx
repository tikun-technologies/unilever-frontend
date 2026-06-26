"use client"

import { SessionProvider } from "next-auth/react"
import { AuthProvider } from "@/lib/auth/AuthContext"
import { JobNotificationProvider } from "@/lib/jobs/JobNotificationContext"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <AuthProvider>
        <JobNotificationProvider>
          {children}
        </JobNotificationProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
