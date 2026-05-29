import { MODELS, resolveModel } from "./models";
import { renderHome } from "./ui";
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
  return env.API_KEY || "";
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
  const wantStream = body.stream === true;
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  // ---- 流式（SSE）：把 Cloudflare 的 data:{"response":...} 转成 OpenAI chunk ----
  if (wantStream) {
    const upstream: any = await env.AI.run(model as any, { messages, stream: true });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const sse = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
    const chunk = (delta: object, finish: string | null) => ({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finish }]
    });

    const transformed = new ReadableStream({
      async start(controller) {
        const reader = (upstream as ReadableStream).getReader();
        let buffer = "";
        controller.enqueue(sse(chunk({ role: "assistant" }, null)));
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const token = JSON.parse(data)?.response ?? "";
                if (token) controller.enqueue(sse(chunk({ content: token }, null)));
              } catch {
                // 忽略非 JSON 的 keep-alive 行
              }
            }
          }
          controller.enqueue(sse(chunk({}, "stop")));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(sse({ error: { message: String(err), type: "stream_error" } }));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(transformed, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        ...corsHeaders()
      }
    });
  }

  // ---- 非流式 ----
  const result: any = await env.AI.run(model as any, { messages, stream: false });
  const text =
    result?.response ??
    result?.result?.response ??
    result?.choices?.[0]?.message?.content ??
    "";

  return json({
    id,
    object: "chat.completion",
    created,
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop"
      }
    ],
    usage: result?.usage ?? undefined
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

// 含中/日/韩等字符时，Aura 无法正确发音，需要走 MeloTTS
function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text);
}

// base64 -> 二进制（Workers 运行时内置 atob）
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function handleSpeech(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const input = body.input || body.text || "";
  const format = body.response_format || body.format || "mp3";

  if (!input) {
    return json({ error: { message: "Missing input text" } }, 400);
  }

  // 默认解析到 MeloTTS（FALLBACK.tts）；只有显式 model=aura-1 / tts-aura 才得到 Aura
  const model = resolveModel(body.model, "tts");
  const explicitLang = (body.lang || body.language || "").toString();

  // ---- Deepgram Aura 路径（仅显式指定；英/西语，质量高但烧额度）----
  if (model.includes("aura")) {
    const voice = pickTtsSpeaker(model, body.voice);
    const result: any = await env.AI.run(
      model as any,
      { text: input, speaker: voice, encoding: format },
      { returnRawResponse: true } as any
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

  // ---- MeloTTS 路径（默认；省额度 + 支持中文）----
  // lang 优先级：显式 lang/language > 文本含 CJK 自动选 zh，否则 en
  // 注意：若中文无声，把下面的 "zh" 改成 "ZH" 再试（取决于 CF 后端大小写处理）
  const lang = explicitLang
    ? explicitLang.slice(0, 2).toLowerCase()
    : (hasCjk(input) ? "zh" : "en");
  const result: any = await env.AI.run("@cf/myshell-ai/melotts" as any, {
    prompt: input,
    lang
  });
  const b64: string = result?.audio ?? result?.result?.audio ?? "";
  if (!b64) {
    return json({ error: { message: "MeloTTS returned no audio", raw: result } }, 502);
  }
  return new Response(base64ToBytes(b64), {
    headers: { "content-type": "audio/mpeg", ...corsHeaders() }
  });
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB，Whisper 输入上限的保守值

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

  // 大文件保护：在读进内存前先拦截，避免 [...Uint8Array] 内存翻倍触发 Worker 128MB 上限
  if (file.size > MAX_AUDIO_BYTES) {
    return json({
      error: {
        message: `Audio too large (${(file.size / 1048576).toFixed(1)}MB). Max ${MAX_AUDIO_BYTES / 1048576}MB.`,
        type: "payload_too_large"
      }
    }, 413);
  }

  const audio = [...new Uint8Array(await file.arrayBuffer())];
  const result: any = await env.AI.run(model as any, { audio });

  return json({
    text: result?.text ?? result?.result?.text ?? result?.transcription ?? ""
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
    data: [{ b64_json: imageBase64 }]
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
    try {
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
          authSource: env.API_KEY ? "runtime" : "none",
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

      return json({ error: { message: "Not found", type: "not_found" } }, 404);
    } catch (err: any) {
      // 统一兜底：模型调用失败、JSON 解析异常等都在这里转成 OpenAI 风格错误
      return json(
        { error: { message: String(err?.message ?? err), type: "internal_error" } },
        500
      );
    }
  }
};
