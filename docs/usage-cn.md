## 使用说明

### 当前能力

- 首页控制台：GET /
- 健康检查：GET /health
- 公开模型列表：GET /v1/models
- TTS 选型说明：GET /cf/tts-guide
- 实时模型扫描：GET /cf/models/latest
- Chat：POST /v1/chat/completions
- TTS（默认 MeloTTS）：POST /v1/audio/speech
- STT（默认 Whisper）：POST /v1/audio/transcriptions
- Embeddings：POST /v1/embeddings
- Image：POST /v1/images/generations
- 原生透传：POST /cf/run/:model

### 模型选型与免费额度

免费额度是账号级每天 10,000 Neurons 共享，00:00 UTC 重置。默认模型已选最省的一档：

- TTS 输出：MeloTTS（18.63 neurons/分钟，支持中文，约 537 分钟/天）
- STT 输入：Whisper（41.14 neurons/分钟，支持中文，约 243 分钟/天）
- Aura（1363 neurons/千字符）比 MeloTTS 贵约 70 倍，仅在显式 model=aura-1 时使用。

### TTS（默认 MeloTTS）

请求体含中文字符自动用 lang=zh，纯英文用 en，无需改 model / voice：

    curl -X POST ".../v1/audio/speech" \
      -H "Authorization: Bearer API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"model":"tts-1","input":"你好，这是中文测试。"}' \
      --output speech.mp3

- 显式语言：加 "lang":"zh"（或 en/es/fr/ja/ko）。
- 想用 Aura 高音质英文：加 "model":"aura-1"，此时 "voice":"angus" 等才生效。

### STT（默认 Whisper）

multipart/form-data 上传音频 file，model 可填 whisper-1 或 @cf/openai/whisper-large-v3-turbo：

    curl -X POST ".../v1/audio/transcriptions" \
      -H "Authorization: Bearer API_KEY" \
      -F "file=@audio.mp3" -F "model=whisper-1"

### Kelivo TTS 配置

    Provider: OpenAI
    Base URL: https://<你的-worker>.workers.dev/v1
    API Key:  你设置的 API_KEY
    Model:    tts-1        （已指向 MeloTTS）
    Voice:    留空即可（MeloTTS 不使用 voice）
    Format:   mp3

### 鉴权说明

GET 类接口（/v1/models、/cf/tts-guide、/cf/models/latest、/health）可直接浏览器打开，无需 API_KEY。
真正调用模型的 POST 接口需要 Authorization: Bearer API_KEY。
API_KEY 通过运行时配置：生产用 wrangler secret put API_KEY，本地用 .dev.vars。/health 的 authSource 显示 runtime 或 none。
