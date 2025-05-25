import { useAuthContext } from "@asgardeo/auth-react";
import "./App.css";
import { useEffect } from "react";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({
  name: "PetVet Assistant",
  version: "1.0.0",
});

function App() {
  const { state, signIn, signOut } = useAuthContext();

  useEffect(() => {
    async function callTool() {
      const transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:3000/mcp")
      );
      await client.connect(transport);

      const result = await client.callTool({
        name: "echo",
        arguments: {
          message: "Hello, this is a test message!",
        },
      });

      return result;
    }

    callTool()
      .then((result) => {
        console.log("Tool call result:", result);
      })
      .catch((error) => {
        console.error("Error calling tool:", error);
      });
  }, []);

  return (
    <>
      {state.isAuthenticated ? (
        <button onClick={() => signOut()}>Logout</button>
      ) : (
        <button onClick={() => signIn()}>Login</button>
      )}
    </>
  );
}

export default App;
