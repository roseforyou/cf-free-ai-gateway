export type ModelKind =
  | "chat"
  | "embedding"
  | "tts"
  | "stt"
  | "image"
  | "translate"
  | "raw";

export type ModelInfo = {
  id: string;
  object: "model";
  owned_by: string;
  kind: ModelKind;
  alias?: string[];
  description: string;
};

export const MODELS: ModelInfo[] = [
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    object: "model",
    owned_by: "cloudflare",
    kind: "chat",
    alias: ["gpt-3.5-turbo", "gpt-4o-mini", "chat-default"],
    description: "Default chat model for OpenAI Chat Completions compatibility."
  },
  {
    id: "@cf/meta/llama-3.2-3b-instruct",
    object: "model",
    owned_by: "cloudflare",
    kind: "chat",
    description: "Small instruction model for lightweight chat."
  },
  {
    id: "@cf/baai/bge-small-en-v1.5",
    object: "model",
    owned_by: "cloudflare",
    kind: "embedding",
    alias: ["text-embedding-3-small", "embedding-default"],
    description: "Fast English embedding model."
  },
  {
    id: "@cf/baai/bge-base-en-v1.5",
    object: "model",
    owned_by: "cloudflare",
    kind: "embedding",
    description: "Base English embedding model."
  },
  {
    id: "@cf/myshell-ai/melotts",
    object: "model",
    owned_by: "cloudflare",
    kind: "tts",
    alias: ["tts-1", "tts-1-hd", "tts-default", "melotts", "tts-zh", "tts-ml"],
    description: "MeloTTS multilingual TTS (DEFAULT). Cheapest TTS (~18.63 neurons/min). Supports Chinese (lang=zh) and English."
  },
  {
    id: "@cf/deepgram/aura-1",
    object: "model",
    owned_by: "cloudflare",
    kind: "tts",
    alias: ["tts-aura", "aura", "aura-1"],
    description: "Deepgram Aura TTS. English/Spanish only, premium quality but ~70x more neurons than MeloTTS. Use only when explicitly requested."
  },
  {
    id: "@cf/openai/whisper",
    object: "model",
    owned_by: "cloudflare",
    kind: "stt",
    alias: ["whisper-1", "stt-default"],
    description: "Whisper speech-to-text model."
  },
  {
    id: "@cf/openai/whisper-large-v3-turbo",
    object: "model",
    owned_by: "cloudflare",
    kind: "stt",
    description: "Whisper large-v3 turbo speech-to-text model."
  },
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    object: "model",
    owned_by: "cloudflare",
    kind: "image",
    alias: ["dall-e-3", "image-default"],
    description: "Flux Schnell image generation model."
  },
  {
    id: "@cf/meta/m2m100-1.2b",
    object: "model",
    owned_by: "cloudflare",
    kind: "translate",
    description: "Multilingual translation model."
  }
];

const FALLBACK: Record<ModelKind, string> = {
  chat: "@cf/meta/llama-3.1-8b-instruct-fast",
  embedding: "@cf/baai/bge-small-en-v1.5",
  tts: "@cf/myshell-ai/melotts",
  stt: "@cf/openai/whisper",
  image: "@cf/black-forest-labs/flux-1-schnell",
  translate: "@cf/meta/m2m100-1.2b",
  raw: ""
};

export function resolveModel(model: string | undefined, kind: ModelKind): string {
  if (!model) return FALLBACK[kind];

  const found = MODELS.find((m) => {
    if (m.kind !== kind) return false;
    return m.id === model || m.alias?.includes(model);
  });

  return found?.id ?? model;
}

export const AURA_VOICES = [
  "angus",
  "asteria",
  "arcas",
  "orion",
  "orpheus",
  "athena",
  "luna",
  "zeus",
  "perseus",
  "helios",
  "hera",
  "stella"
];
