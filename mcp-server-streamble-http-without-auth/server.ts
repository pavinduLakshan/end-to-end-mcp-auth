import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
// import {McpAuthServer} from '@asgardeo/mcp-express';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  allergens: string[];
}

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Session {
  cart: CartItem[];
  created_at: string;
  last_active: string;
}

interface Order {
  order_id: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
  customer_info: Record<string, any>;
  payment_info: {
    method: string;
    status: string;
    transaction_id: string;
  };
}

// Load menu items from JSON file
const MENU_JSON_PATH = join(__dirname, "menu_items.json");
const MENU_ITEMS: MenuItem[] = JSON.parse(readFileSync(MENU_JSON_PATH, "utf-8"));

// In-memory storage
const ORDERS: Record<string, Order> = {};
const ACTIVE_SESSIONS: Record<string, Session> = {};

// Initialize McpAuthServer with baseUrl
// const mcpAuthServer = new McpAuthServer({
//   baseUrl: "https://api.asgardeo.io/t/pavinduorg",
//   issuer: "https://api.asgardeo.io/t/pavinduorg/oauth2/token"
// });

const app = express();

app.use(express.json());
app.use(cors());
// app.use(mcpAuthServer.router());

function getServer() {
  // Import the MCP server and transport classes
  const server = new McpServer({
      name: "ai-gourmet-mcp-server",
      version: "1.0.0"
    });

    // Get menu categories
    server.tool(
      "get_menu_categories",
      {}, 
      async () => {
        const categories = [...new Set(MENU_ITEMS.map(item => item.category))].sort();
        return {
          content: [{ type: "text", text: JSON.stringify(categories) }]
        };
      }
    );

    // List items by category
    server.tool(
      "list_items_by_category",
      { category: z.string().describe("Category name") },
      async ({ category }) => {
        const items = MENU_ITEMS.filter(item => item.category === category);
        return {
          content: [{ type: "text", text: JSON.stringify(items) }]
        };
      }
    );

    // Get item details
    server.tool(
      "get_item_details",
      { item_identifier: z.string().describe("Item ID or name") },
      async ({ item_identifier }) => {
        const item = MENU_ITEMS.find(
          item => item.id === item_identifier || item.name.toLowerCase() === item_identifier.toLowerCase()
        );
        const result = item || { error: `Item '${item_identifier}' not found` };
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      }
    );

    // Find items by criteria
    server.tool(
      "find_items_by_criteria",
      {
        dietary_preference: z.string().optional().describe("Dietary preference (vegetarian, vegan, gluten_free)"),
        max_price: z.number().optional().describe("Maximum price"),
        exclude_allergens: z.array(z.string()).optional().describe("List of allergens to exclude"),
        category: z.string().optional().describe("Category to filter by")
      },
      async ({ dietary_preference, max_price, exclude_allergens, category }) => {
        let filtered = [...MENU_ITEMS];

        if (dietary_preference) {
          const pref = dietary_preference.toLowerCase();
          if (pref === 'vegetarian') {
            filtered = filtered.filter(item => item.is_vegetarian);
          } else if (pref === 'vegan') {
            filtered = filtered.filter(item => item.is_vegan);
          } else if (pref === 'gluten_free') {
            filtered = filtered.filter(item => item.is_gluten_free);
          }
        }

        if (max_price !== undefined) {
          filtered = filtered.filter(i => i.price <= max_price);
        }

        if (exclude_allergens) {
          for (const allergen of exclude_allergens) {
            filtered = filtered.filter(item => !item.allergens.includes(allergen));
          }
        }

        if (category) {
          filtered = filtered.filter(i => i.category.toLowerCase() === category.toLowerCase());
        }

        return {
          content: [{ type: "text", text: JSON.stringify(filtered) }]
        };
      }
    );

    // Create cart
    server.tool(
      "create_cart",
      {},
      async () => {
        const session_id = uuidv4();
        const now = new Date().toISOString();
        ACTIVE_SESSIONS[session_id] = {
          cart: [],
          created_at: now,
          last_active: now,
        };
        return {
          content: [{ type: "text", text: JSON.stringify({ session_id, cart: [] }) }]
        };
      }
    );

    // Add to cart
    server.tool(
      "add_to_cart",
      {
        session_id: z.string().describe("Session ID"),
        item_id: z.string().describe("Item ID to add"),
        quantity: z.number().int().default(1).describe("Quantity to add")
      },
      async ({ session_id, item_id, quantity }) => {
        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Invalid session ID" }) }]
          };
        }

        const item = MENU_ITEMS.find(i => i.id === item_id);
        if (!item) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Item '${item_id}' not found` }) }]
          };
        }

        const cart = session.cart;
        const existingItem = cart.find(cart_item => cart_item.item_id === item_id);
        
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.push({
            item_id: item_id,
            name: item.name,
            price: item.price,
            quantity: quantity,
          });
        }

        session.last_active = new Date().toISOString();
        const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        return {
          content: [{ type: "text", text: JSON.stringify({ cart, total }) }]
        };
      }
    );

    // Remove from cart
    server.tool(
      "remove_from_cart",
      {
        session_id: z.string().describe("Session ID"),
        item_id: z.string().describe("Item ID to remove")
      },
      async ({ session_id, item_id }) => {
        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Invalid session ID" }) }]
          };
        }

        session.cart = session.cart.filter(i => i.item_id !== item_id);
        session.last_active = new Date().toISOString();
        const total = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        return {
          content: [{ type: "text", text: JSON.stringify({ cart: session.cart, total }) }]
        };
      }
    );

    // Get cart
    server.tool(
      "get_cart",
      { session_id: z.string().describe("Session ID") },
      async ({ session_id }) => {
        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Invalid session ID" }) }]
          };
        }

        const total = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        return {
          content: [{ type: "text", text: JSON.stringify({ cart: session.cart, total }) }]
        };
      }
    );

    // Checkout
    server.tool(
      "checkout",
      {
        session_id: z.string().describe("Session ID"),
        customer_info: z.record(z.any()).optional().describe("Customer information"),
        payment_info: z.record(z.any()).optional().describe("Payment information")
      },
      async ({ session_id, customer_info, payment_info }) => {
        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Invalid session ID" }) }]
          };
        }

        const cart = session.cart;
        if (cart.length === 0) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Cart is empty" }) }]
          };
        }

        const order_id = `ORD-${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
        const order_time = new Date().toISOString();
        const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        const order: Order = {
          order_id,
          items: cart,
          total,
          status: "confirmed",
          created_at: order_time,
          customer_info: customer_info || {},
          payment_info: {
            method: payment_info?.method || 'credit_card',
            status: "approved",
            transaction_id: `TXN-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
          },
        };

        ORDERS[order_id] = order;
        session.cart = [];
        session.last_active = new Date().toISOString();

        return {
          content: [{ type: "text", text: JSON.stringify({
            order,
            success: true,
            message: "Order placed successfully",
          }) }]
        };
      }
    );

    // Get order status
    server.tool(
      "get_order_status",
      { order_id: z.string().describe("Order ID") },
      async ({ order_id }) => {
        const order = ORDERS[order_id];
        if (!order) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Order '${order_id}' not found` }) }]
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ order }) }]
        };
      }
    );

    // List orders
    server.tool(
      "list_orders",
      {},
      async () => {
        return {
          content: [{ type: "text", text: JSON.stringify(Object.values(ORDERS)) }]
        };
      }
    );

    // Add order note
    server.tool(
      "add_order_note",
      {
        order_id: z.string().describe("Order ID to add the note to"),
        note: z.string().describe("The note to add to the order")
      },
      async ({ order_id, note }) => {
        const order = ORDERS[order_id];
        if (!order) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Order '${order_id}' not found` }) }]
          };
        }
        
        // Attach notes array if not present
        if (!("notes" in order)) {
          (order as any).notes = [];
        }
        (order as any).notes.push(note);
        
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, notes: (order as any).notes }) }]
        };
      }
    );

    return server;
}

app.post('/mcp', async (req: Request, res: Response) => {
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
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`MCP AI Gourmet Server listening on port ${PORT}`);
});
