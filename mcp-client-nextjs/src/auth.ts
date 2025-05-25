import NextAuth from "next-auth"
import Asgardeo from "next-auth/providers/asgardeo"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Asgardeo],
})
