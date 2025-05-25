/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';

const handler = createMcpHandler(
  async (server: any) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      {
        sides: z.number().int().min(2)
      },
      async ({ sides }: { sides: any }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {
    // Optional server options
  },
  {
    // You need these endpoints
    basePath: '/mcp', // this needs to match where the [transport] is located.
    maxDuration: 60,
    verboseLogs: true,
  }
);
export { handler as GET, handler as POST };