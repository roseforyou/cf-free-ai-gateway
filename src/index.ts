import { AURA_VOICES, MODELS, resolveModel } from "./models";
import { renderHome } from "./ui";
import { BUILD_API_KEY } from "./generated-config";
import { CATALOG_INFO, TTS_INFO, extractCfModelIds, pickInterestingModels } from "./catalog";

export interface Env {
  AI: Ai;
  API_KEY?: string;
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  };
}

function getApiKey(env: Env): string {
  return env.API_KEY || BUILD_API_KEY || "";
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders()
    }
  });
}

function html(markup: string): Response {
  return new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...corsHeaders()
    }
  });
}

function unauthorized() {
  return json({ error: { message: "Unauthorized or API_KEY is not configured", type: "auth_error" } }, 401);
}

function checkAuth(request: Request, env: Env): boolean {
  const apiKey = getApiKey(env);
  if (!apiKey) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${apiKey}`;
}

async function readJson<T = any>(request: Request): Promise<T> {
  try {
    return await request.json<T>();
  } catch {
    return {} as T;
  }
}

function normalizeMessages(messages: ChatMessage[] = []) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

async function handleLatestModels(): Promise<Response> {
  const source = CATALOG_INFO.pricingUrl;
  try {
    const res = await fetch(source, {
      headers: { accept: "text/plain, text/markdown, text/html" }
    });
    const text = await res.text();
    const ids = extractCfModelIds(text);
    const grouped = pickInterestingModels(ids);

    return json({
      ok: true,
      source,
      fetchedAt: new Date().toISOString(),
      total: ids.length,
      freeTier: CATALOG_INFO,
      grouped,
      all: ids
    });
  } catch (error) {
    return json({
      ok: false,
      source,
      error: String(error),
      fallback: {
        freeTier: CATALOG_INFO,
        models: MODELS
      }
    }, 502);
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const model = resolveModel(body.model, "chat");
  const messages = normalizeMessages(body.messages || []);

  const result: any = await env.AI.run(model as any, {
    messages,
    stream: false
  });

  const text =
    result?.response ??
    result?.result?.response ??
    result?.choices?.[0]?.message?.content ??
    "";

  return json({
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text
        },
        finish_reason: "stop"
      }
    ],
    usage: result?.usage ?? undefined,
    raw: result
  });
}

async function handleEmbeddings(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const model = resolveModel(body.model, "embedding");
  const input = Array.isArray(body.input) ? body.input : [body.input ?? ""];

  const result: any = await env.AI.run(model as any, { text: input });
  const vectors = result?.data ?? result?.result?.data ?? result?.embeddings ?? result;

  return json({
    object: "list",
    model,
    data: (Array.isArray(vectors) ? vectors : [vectors]).map((embedding, index) => ({
      object: "embedding",
      index,
      embedding
    }))
  });
}

function pickTtsSpeaker(model: string, requested?: string): string {
  if (requested) return requested;
  if (model.includes("aura-2-es")) return TTS_INFO.aura2SpanishDefaultVoice;
  if (model.includes("aura-2-en")) return TTS_INFO.aura2EnglishDefaultVoice;
  return "angus";
}

async function handleSpeech(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const model = resolveModel(body.model, "tts");
  const input = body.input || body.text || "";
  const voice = pickTtsSpeaker(model, body.voice);
  const format = body.response_format || body.format || "mp3";

  if (!input) {
    return json({ error: { message: "Missing input text" } }, 400);
  }

  const result: any = await env.AI.run(
    model as any,
    {
      text: input,
      speaker: voice,
      encoding: format
    },
    {
      returnRawResponse: true
    } as any
  );

  if (result instanceof Response) {
    return new Response(result.body, {
      status: result.status,
      headers: {
        "content-type": format === "wav" ? "audio/wav" : "audio/mpeg",
        ...corsHeaders()
      }
    });
  }

  return new Response(result?.body ?? result, {
    headers: {
      "content-type": format === "wav" ? "audio/wav" : "audio/mpeg",
      ...corsHeaders()
    }
  });
}

async function handleTranscription(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";
  const modelDefault = "@cf/openai/whisper";

  if (!contentType.includes("multipart/form-data")) {
    return json({
      error: {
        message: "Use multipart/form-data with a file field, OpenAI transcription style."
      }
    }, 400);
  }

  const form = await request.formData();
  const file = form.get("file");
  const model = resolveModel(String(form.get("model") || modelDefault), "stt");

  if (!(file instanceof File)) {
    return json({ error: { message: "Missing file field" } }, 400);
  }

  const audio = [...new Uint8Array(await file.arrayBuffer())];
  const result: any = await env.AI.run(model as any, { audio });

  return json({
    text: result?.text ?? result?.result?.text ?? result?.transcription ?? "",
    raw: result
  });
}

async function handleImage(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const model = resolveModel(body.model, "image");
  const prompt = body.prompt || "";

  if (!prompt) {
    return json({ error: { message: "Missing prompt" } }, 400);
  }

  const result: any = await env.AI.run(model as any, { prompt });
  const imageBase64 =
    result?.image ??
    result?.result?.image ??
    result?.data?.[0]?.b64_json ??
    "";

  return json({
    created: Math.floor(Date.now() / 1000),
    data: [{ b64_json: imageBase64 }],
    raw: result
  });
}

async function handleRawRun(request: Request, env: Env, pathname: string): Promise<Response> {
  const encoded = pathname.replace("/cf/run/", "");
  const model = decodeURIComponent(encoded);
  const body = await readJson(request);

  if (!model.startsWith("@cf/")) {
    return json({ error: { message: "Model should start with @cf/" } }, 400);
  }

  const result = await env.AI.run(model as any, body);
  return json({ model, result });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return html(renderHome(url.origin));
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        name: "cf-free-ai-gateway",
        authConfigured: Boolean(getApiKey(env)),
        authSource: env.API_KEY ? "runtime" : BUILD_API_KEY ? "build" : "none",
        routes: [
          "GET /",
          "GET /health",
          "GET /v1/models",
          "GET /cf/tts-guide",
          "GET /cf/models/latest",
          "POST /v1/chat/completions",
          "POST /v1/embeddings",
          "POST /v1/audio/speech",
          "POST /v1/audio/transcriptions",
          "POST /v1/images/generations",
          "POST /cf/run/:model"
        ]
      });
    }

    if (url.pathname === "/v1/models" && request.method === "GET") {
      return json({ object: "list", data: MODELS, freeTier: CATALOG_INFO, tts: TTS_INFO });
    }

    if (url.pathname === "/cf/tts-guide" && request.method === "GET") {
      return json({ ok: true, freeTier: CATALOG_INFO, tts: TTS_INFO });
    }

    if (url.pathname === "/cf/models/latest" && request.method === "GET") {
      return handleLatestModels();
    }

    if (!checkAuth(request, env)) return unauthorized();

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      return handleChat(request, env);
    }

    if (url.pathname === "/v1/embeddings" && request.method === "POST") {
      return handleEmbeddings(request, env);
    }

    if (url.pathname === "/v1/audio/speech" && request.method === "POST") {
      return handleSpeech(request, env);
    }

    if (url.pathname === "/v1/audio/transcriptions" && request.method === "POST") {
      return handleTranscription(request, env);
    }

    if (url.pathname === "/v1/images/generations" && request.method === "POST") {
      return handleImage(request, env);
    }

    if (url.pathname.startsWith("/cf/run/") && request.method === "POST") {
      return handleRawRun(request, env, url.pathname);
    }

    return json({ error: { message: "Not found" } }, 404);
  }
};
