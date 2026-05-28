# 使用说明

## 当前能力

- 首页控制台：GET /
- 健康检查：GET /health
- 公开模型列表：GET /v1/models
- TTS 指南：GET /cf/tts-guide
- 实时模型扫描：GET /cf/models/latest
- Chat：POST /v1/chat/completions
- TTS：POST /v1/audio/speech
- STT：POST /v1/audio/transcriptions
- Embeddings：POST /v1/embeddings
- Image：POST /v1/images/generations
- 原生透传：POST /cf/run/:model

## Kelivo TTS

Provider: OpenAI
Base URL: https://cf-free-ai-gateway.nhst-js.workers.dev/v1
API Key: 你设置的 API_KEY
Model: tts-1
Voice: angus
Format: mp3

## 说明

/v1/models、/cf/tts-guide、/cf/models/latest 可以直接浏览器打开，不需要 API_KEY。

真正调用模型的 POST 接口需要 Authorization: Bearer API_KEY。

当前 API_KEY 来源可以是运行时变量，也可以是构建变量。健康检查里的 authSource 会显示 runtime、build 或 none。

Cloudflare Workers AI 免费额度是账号级共享额度，不是每个模型单独免费。
