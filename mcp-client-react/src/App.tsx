/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { useAuthContext } from "@asgardeo/auth-react";
import "./App.css";
import { useEffect } from "react";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { McpClientOAuthProvider } from "./mcp-client-oauth-provider";

const client = new Client({
  name: "PetVet Assistant",
  version: "1.0.0",
});

const UNAUTHORIZED_ERROR_MESSAGE =
  'Error POSTing to endpoint (HTTP 401): {"error":"unauthorized","error_description":"Missing authorization token"}';

function App() {
  const { state, signIn, signOut } = useAuthContext();

  async function callEchoTool() {
      try {
        const transport = new StreamableHTTPClientTransport(
          new URL("http://localhost:3000/mcp"),{
            authProvider: new McpClientOAuthProvider(
              "http://localhost:3000/mcp"
            ),
          }
        );
        await client.connect(transport);
      } catch (error: any) {
        console.error("Error connecting to MCP server:", error);

        if (error.message === UNAUTHORIZED_ERROR_MESSAGE) {
          console.log("Attempting to authenticate...");
          const authProvider = new McpClientOAuthProvider(
            "http://localhost:3000/mcp"
          );

          const result = await auth(authProvider, {
            serverUrl: "http://localhost:3000/mcp",
          });
          console.log("Authentication result:", result);
        }
      }

      const result = await client.callTool({
        name: "echo",
        arguments: {
          message: "Hello, this is a test message!",
        },
      });

      console.log(result)
    }

  return (
    <>
<button onClick={() => callEchoTool()}>Call Echo tool</button>
      {state.isAuthenticated ? (
<>

        <button onClick={() => signOut()}>Logout</button>
</>




      ) : (
        <button onClick={() => signIn()}>Login</button>
      )}
    </>
  );
}

export default App;
