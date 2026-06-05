import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages } = await request.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(DEFAULT_CHAT_MODEL),
        system:
          "You are a friendly AI assistant in a video call. Keep responses concise (2-3 sentences max) and conversational. Speak naturally as if in a real-time video chat. Respond in the same language the user speaks.",
        messages,
      });
      writer.merge(result.toUIMessageStream());
    },
    generateId: generateUUID,
  });

  return createUIMessageStreamResponse({ stream });
}
