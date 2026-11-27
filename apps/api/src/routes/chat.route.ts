import { Hono } from "hono";
import { z } from "zod";
import { ChatService } from "../services/chat.service.js";

const ChatRequestSchema = z
  .object({
    message: z.string().max(1000).default(""),
    imageBase64: z.string().max(6_500_000).optional(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(1500)
        })
      )
      .max(8)
      .optional(),
    context: z
      .object({
        cityCode: z.string().max(24).optional(),
        lat: z.number().finite().min(-90).max(90).optional(),
        lng: z.number().finite().min(-180).max(180).optional(),
        locationLabel: z.string().max(80).optional(),
        ageBand: z.enum(["child", "teen", "adult", "senior"]).optional(),
        commuteMode: z.enum(["walk", "two_wheeler", "auto", "bus", "car", "metro"]).optional(),
        budgetBand: z.enum(["none", "low", "medium", "high"]).optional(),
        cooksIndoors: z.boolean().optional(),
        hasExhaust: z.boolean().optional(),
        hasPurifier: z.boolean().optional(),
        cautionMode: z.boolean().optional(),
        lang: z.string().max(10).optional()
      })
      .optional()
  })
  .refine((data) => data.message.trim().length > 0 || Boolean(data.imageBase64 && data.imageBase64.length > 50), {
    message: "Provide a message or an image to analyze."
  });

export function createChatRoutes(chatService: ChatService) {
  const router = new Hono();

  // POST /v1/chat
  router.post("/", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON request body" }, 400);
    }

    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid chat request", details: parsed.error.flatten() },
        400
      );
    }

    try {
      const response = await chatService.chat(
        parsed.data.message,
        parsed.data.context || {},
        parsed.data.history || [],
        parsed.data.imageBase64
          ? { base64: parsed.data.imageBase64, mimeType: parsed.data.mimeType }
          : undefined
      );
      return c.json(response, 200);
    } catch {
      return c.json({ error: "Chat assistant temporarily unavailable" }, 500);
    }
  });

  return router;
}
