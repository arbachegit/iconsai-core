#!/usr/bin/env node
/**
 * MCP Server - RAG API
 * Busca informacoes em bases de conhecimento por slug
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const RAG_API_URL = process.env.RAG_API_URL || "https://rag.iconsai.ai";

const server = new Server(
  {
    name: "iconsai-rag-api",
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
        name: "rag_search",
        description: "Busca informacoes na base de conhecimento RAG por slug e query",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Slug da base de conhecimento (ex: produtos, faq, suporte)",
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
        name: "rag_list_slugs",
        description: "Lista todos os slugs de RAG disponiveis para uma empresa",
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
        name: "rag_add_document",
        description: "Adiciona um documento a uma base de conhecimento",
        inputSchema: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Slug da base de conhecimento",
            },
            company_id: {
              type: "string",
              description: "ID da empresa",
            },
            title: {
              type: "string",
              description: "Titulo do documento",
            },
            content: {
              type: "string",
              description: "Conteudo do documento",
            },
            metadata: {
              type: "object",
              description: "Metadados adicionais",
            },
          },
          required: ["slug", "company_id", "title", "content"],
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
      case "rag_search": {
        const { slug, query, company_id, limit = 5 } = args;

        const response = await fetch(`${RAG_API_URL}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, query, company_id, limit }),
        });

        if (!response.ok) {
          throw new Error(`RAG API error: ${response.status}`);
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

      case "rag_list_slugs": {
        const { company_id } = args;

        const response = await fetch(`${RAG_API_URL}/api/slugs?company_id=${company_id}`);

        if (!response.ok) {
          throw new Error(`RAG API error: ${response.status}`);
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

      case "rag_add_document": {
        const { slug, company_id, title, content, metadata } = args;

        const response = await fetch(`${RAG_API_URL}/api/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, company_id, title, content, metadata }),
        });

        if (!response.ok) {
          throw new Error(`RAG API error: ${response.status}`);
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
console.error("RAG API MCP Server started");
