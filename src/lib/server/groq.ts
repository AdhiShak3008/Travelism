import "server-only";
import { z } from "zod";
import { ENV } from "./env";

// ============================================================================
// Groq client — OpenAI-compatible chat completions on GroqCloud.
// Uses openai/gpt-oss-120b (reasoning) with gpt-oss-20b as a fast fallback.
// JSON-mode with schema validation + bounded retries.
// ============================================================================

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqOpts {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** "low" | "medium" | "high" for gpt-oss reasoning effort */
  reasoning?: "low" | "medium" | "high";
  signal?: AbortSignal;
}

export class GroqError extends Error {}

async function rawChat(messages: ChatMsg[], opts: GroqOpts = {}): Promise<string> {
  if (!ENV.GROQ_API_KEY) throw new GroqError("GROQ_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: opts.model ?? ENV.GROQ_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_completion_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.reasoning) body.reasoning_effort = opts.reasoning;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(4000, 500 * 2 ** attempt);
        await sleep(wait);
        lastErr = new GroqError(`Groq ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        // json_validate_failed: the model ran out of budget producing strict
        // JSON. Recover by dropping strict json mode + raising the token cap so
        // we can salvage/parse the output ourselves.
        if (res.status === 400 && txt.includes("json_validate_failed") && body.response_format) {
          delete (body as Record<string, unknown>).response_format;
          body.max_completion_tokens = Math.max(6000, (body.max_completion_tokens as number) ?? 4096);
          if (body.reasoning_effort === "high") body.reasoning_effort = "medium";
          lastErr = new GroqError("json_validate_failed (retrying without strict mode)");
          continue;
        }
        throw new GroqError(`Groq ${res.status}: ${txt.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new GroqError("Empty Groq response");
      return content;
    } catch (e) {
      lastErr = e;
      if (e instanceof GroqError && !String(e.message).match(/429|5\d\d/)) throw e;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new GroqError("Groq failed");
}

export async function chat(messages: ChatMsg[], opts?: GroqOpts): Promise<string> {
  return rawChat(messages, opts);
}

/**
 * JSON completion validated against a Zod schema. Retries once on parse failure
 * by asking the model to fix its output.
 */
export async function chatJSON<T>(
  messages: ChatMsg[],
  schema: z.ZodType<T>,
  opts: GroqOpts = {}
): Promise<T> {
  const withJson = { ...opts, json: true };
  let raw = await rawChat(messages, withJson);

  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = tryParse(raw);
    if (parsed !== undefined) {
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      // Ask the model to conform
      if (attempt === 0) {
        raw = await rawChat(
          [
            ...messages,
            { role: "assistant", content: raw },
            {
              role: "user",
              content: `That JSON did not match the required schema. Errors: ${JSON.stringify(
                result.error.issues.slice(0, 8)
              )}. Return ONLY corrected JSON.`,
            },
          ],
          withJson
        );
        continue;
      }
      throw new GroqError("JSON failed schema validation: " + result.error.message.slice(0, 300));
    }
    if (attempt === 0) {
      raw = await rawChat(
        [...messages, { role: "assistant", content: raw }, { role: "user", content: "Return ONLY valid JSON." }],
        withJson
      );
    }
  }
  throw new GroqError("Could not obtain valid JSON from model");
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // salvage a JSON object/array embedded in prose
    const m = s.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
