#!/usr/bin/env node
/**
 * MCP Server - Scraping API
 * Coleta e busca informacoes de websites por slug
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SCRAPING_API_URL = process.env.SCRAPING_API_URL || "https://scraping.iconsai.ai";

const server = new Server(
  {
    name: "iconsai-scraping-api",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scraping_search",
        description: "Busca informacoes coletadas de websites por slug e query",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Slug do tema (ex: website, blog, noticias, catalogo)",
            },
            query: {
              type: "string",
              description: "Pergunta ou termo de busca",
            },
            company_id: {
              type: "string",
              description: "ID da empresa (opcional)",
            },
            limit: {
              type: "number",
              description: "Numero maximo de resultados (default: 5)",
            },
          },
          required: ["slug", "query"],
        },
      },
      {
        name: "scraping_list_slugs",
        description: "Lista todos os slugs de scraping disponiveis para uma empresa",
        inputSchema: {
          type: "object",
          properties: {
            company_id: {
              type: "string",
              description: "ID da empresa",
            },
          },
          required: ["company_id"],
        },
      },
      {
        name: "scraping_add_url",
        description: "Adiciona uma URL para coleta automatica",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Slug do tema",
            },
            company_id: {
              type: "string",
              description: "ID da empresa",
            },
            url: {
              type: "string",
              description: "URL a ser coletada",
            },
            schedule: {
              type: "string",
              description: "Frequencia de coleta (daily, weekly, monthly)",
            },
          },
          required: ["slug", "company_id", "url"],
        },
      },
      {
        name: "scraping_run_now",
        description: "Executa coleta imediata de uma URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL a ser coletada",
            },
            company_id: {
              type: "string",
              description: "ID da empresa",
            },
            slug: {
              type: "string",
              description: "Slug do tema para categorizar",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "scraping_search": {
        const { slug, query, company_id, limit = 5 } = args;

        const response = await fetch(`${SCRAPING_API_URL}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, query, company_id, limit }),
        });

        if (!response.ok) {
          throw new Error(`Scraping API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "scraping_list_slugs": {
        const { company_id } = args;

        const response = await fetch(`${SCRAPING_API_URL}/api/slugs?company_id=${company_id}`);

        if (!response.ok) {
          throw new Error(`Scraping API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "scraping_add_url": {
        const { slug, company_id, url, schedule = "daily" } = args;

        const response = await fetch(`${SCRAPING_API_URL}/api/urls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, company_id, url, schedule }),
        });

        if (!response.ok) {
          throw new Error(`Scraping API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "scraping_run_now": {
        const { url, company_id, slug } = args;

        const response = await fetch(`${SCRAPING_API_URL}/api/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, company_id, slug }),
        });

        if (!response.ok) {
          throw new Error(`Scraping API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Scraping API MCP Server started");
