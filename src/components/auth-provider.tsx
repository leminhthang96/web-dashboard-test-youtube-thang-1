"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  )
}
