import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getHomePage } from "@/lib/auth/permissions"

export default async function HomePage() {
  const session = await auth()
  redirect(session?.user ? getHomePage(session.user) : "/sign-in")
}
