import { useAuthContext } from '@asgardeo/auth-react'
import './App.css'

function App() {
  const { state, signIn, signOut } = useAuthContext();

  console.log('Auth State:', state);

  return (
    <>
      {state.isAuthenticated ? (
        <button onClick={() => signOut()}>Logout</button>
      ) : (
        <button onClick={() => signIn()}>Login</button>
      )}
    </>
  )
}

export default App
