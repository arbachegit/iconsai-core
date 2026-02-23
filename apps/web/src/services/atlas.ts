import { z } from "zod";
import { api } from "@/lib/http";

// Zod schemas for request/response validation
export const AtlasChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

export const AtlasChatResponseSchema = z.object({
  response: z.string(),
  sessionId: z.string().uuid(),
  sources: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AtlasChatRequest = z.infer<typeof AtlasChatRequestSchema>;
export type AtlasChatResponse = z.infer<typeof AtlasChatResponseSchema>;

export async function atlasChat(input: AtlasChatRequest): Promise<AtlasChatResponse> {
  // Validate input
  const validatedInput = AtlasChatRequestSchema.parse(input);

  // Make API call
  const rawResponse = await api.post<unknown>("/api/atlas/chat", validatedInput);

  // Validate response
  const validatedResponse = AtlasChatResponseSchema.parse(rawResponse);

  return validatedResponse;
}
