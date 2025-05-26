import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import cors from 'cors';
import {McpAuthServer} from '@asgardeo/mcp-express';

// Initialize McpAuthServer with baseUrl
const mcpAuthServer = new McpAuthServer({
  baseUrl: "https://api.asgardeo.io/t/pavinduorg",
  issuer: "https://api.asgardeo.io/t/pavinduorg/oauth2/token"
});

const app = express();

app.use(express.json());
app.use(cors());
app.use(mcpAuthServer.router());

function getServer() {
  // Import the MCP server and transport classes
  const server = new McpServer({
      name: "example-server",
      version: "1.0.0"
    });

    server.tool(
  "echo",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }]
  })
);

    return server;
}

app.post('/mcp', mcpAuthServer.protect(), async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.
  
  try {
    const server = getServer(); 
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
