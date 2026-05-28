export const CATALOG_INFO = {
  docsModelsUrl: "https://developers.cloudflare.com/workers-ai/models/",
  pricingUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
  note: "Workers AI has a shared daily free allocation. It is not a separate free quota per model.",
  dailyFreeNeurons: 10000,
  reset: "00:00 UTC"
};

export const TTS_INFO = {
  defaultModel: "@cf/deepgram/aura-1",
  kelivoModel: "tts-1",
  aura1Price: "$0.015 / 1k characters",
  aura2Price: "$0.030 / 1k characters",
  melottsPrice: "$0.0002 / audio minute",
  aura1Voices: ["angus", "asteria", "arcas", "orion", "orpheus", "athena", "luna", "zeus", "perseus", "helios", "hera", "stella"],
  aura2EnglishDefaultVoice: "luna",
  aura2SpanishDefaultVoice: "aquila"
};

export function extractCfModelIds(text: string): string[] {
  return Array.from(new Set(text.match(/@cf\/[a-zA-Z0-9._\/-]+/g) || [])).sort();
}

export function pickInterestingModels(ids: string[]) {
  return {
    tts: ids.filter((id) => id.includes("aura") || id.includes("melotts")),
    stt: ids.filter((id) => id.includes("whisper") || id.includes("nova-3") || id.includes("flux")),
    embedding: ids.filter((id) => id.includes("bge") || id.includes("embedding")),
    image: ids.filter((id) => id.includes("flux-1") || id.includes("flux-2") || id.includes("leonardo")),
    chatCheap: ids.filter((id) => id.includes("llama-3.2-1b") || id.includes("llama-3.2-3b") || id.includes("granite-4.0-h-micro"))
  };
}
