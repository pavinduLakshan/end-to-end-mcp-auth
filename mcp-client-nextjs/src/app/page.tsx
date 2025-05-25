import { auth, signIn, signOut } from "@/auth"

export default async function Home() {
  const session = await auth();

  return (
    <div className="justify-items-center">
      {
        !session ? (
          <form
            action={async () => {
              "use server"
              await signIn("asgardeo")
            }}
          >
            <button type="submit">Sign in</button>
          </form>
        ) : (
          <>
            <p> You are now signed in!</p>

            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <button type="submit">Sign Out</button>
            </form>
          </>
        )
      }
    </div>
  );
}
