## cf-free-ai-gateway

把 Cloudflare Workers AI 封装成 **OpenAI 兼容接口**的网关，自带一个 Web 控制台。适合 Kelivo、各类 Web App、小程序后端和个人 AI 工具直接接入。

核心目标：**尽量只用 Workers AI 每天 10,000 Neurons 的免费额度**，因此默认模型一律选择 Neuron 成本最低的那一档。

### 能力一览

| 端点 | 方法 | 说明 | 默认模型 |
| --- | --- | --- | --- |
| `/` | GET | Web 控制台首页 | — |
| `/health` | GET | 健康检查（含 `authSource`） | — |
| `/v1/models` | GET | 公开模型列表 | — |
| `/cf/tts-guide` | GET | TTS 选型说明 | — |
| `/cf/models/latest` | GET | 实时抓取 CF 模型清单 | — |
| `/v1/chat/completions` | POST | 对话 | `llama-3.1-8b-instruct-fast` |
| `/v1/embeddings` | POST | 向量 | `bge-small-en-v1.5` |
| `/v1/audio/speech` | POST | **文本转语音（TTS）** | **MeloTTS** |
| `/v1/audio/transcriptions` | POST | **语音转文本（STT）** | **Whisper** |
| `/v1/images/generations` | POST | 文生图 | `flux-1-schnell` |
| `/cf/run/:model` | POST | 原生模型透传 | 由路径指定 |

`GET` 类接口可直接浏览器打开，无需鉴权；`POST` 类接口需 `Authorization: Bearer <API_KEY>`。

### 免费额度与模型选型（重要）

免费额度是**账号级每天 10,000 Neurons 共享池**，00:00 UTC 重置，不是每个模型单独免费。不同模型烧 Neuron 速度差距极大：

| 用途 | 推荐模型 | Neuron 成本 | 10k/天约可用 |
| --- | --- | --- | --- |
| TTS 输出 | `@cf/myshell-ai/melotts` | 18.63 / 分钟 | ≈ 537 分钟 |
| STT 输入 | `@cf/openai/whisper` | 41.14 / 分钟 | ≈ 243 分钟 |
| STT（更快） | `@cf/openai/whisper-large-v3-turbo` | 46.63 / 分钟 | ≈ 214 分钟 |
| TTS（高音质，**贵**） | `@cf/deepgram/aura-1` | 1363.64 / 千字符 | ≈ 7.3k 字符 |

> Aura 按等效内容比 MeloTTS 贵约 **70 倍**，几段话就能烧光当天额度。本网关因此**默认使用 MeloTTS**，只有显式指定 `model: "aura-1"` 时才走 Aura。

### 部署

```bash
npm install
# 设置鉴权密钥（推荐：运行时 secret，不进代码、不进 git）
npx wrangler secret put API_KEY
# 部署
npm run deploy
```

部署后用 `/health` 确认：`authSource` 为 `runtime` 表示密钥已配置，`none` 表示未配置鉴权。

### Chat（支持流式）

默认非流式；请求体加 `"stream": true` 即返回 OpenAI 兼容的 SSE 增量（`chat.completion.chunk`），客户端可直接打字机输出：

```bash
curl -N -X POST "https://<your-worker>/v1/chat/completions" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"chat-default","messages":[{"role":"user","content":"你好"}],"stream":true}'
```

### TTS 用法（默认 MeloTTS，自动识别中文）

请求体里**含中文字符就自动用 `lang=zh`**，纯英文用 `lang=en`，无需改 model / voice：

```bash
curl -X POST "https://<your-worker>/v1/audio/speech" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"你好，这是中文测试。"}' \
  --output speech.mp3
```

可选参数：

- `lang`：显式指定语言（`zh` / `en` / `es` / `fr` / `ja` / `ko`），优先级高于自动识别。
- `model: "aura-1"`：切换到 Deepgram Aura（英文高音质，但烧额度），此时 `voice` 才生效（`angus` / `luna` 等）。

### STT 用法（默认 Whisper，支持中文）

OpenAI 转写风格，`multipart/form-data` 上传音频文件：

```bash
curl -X POST "https://<your-worker>/v1/audio/transcriptions" \
  -H "Authorization: Bearer <API_KEY>" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1"
```

`model` 可填 `whisper-1`（→ `@cf/openai/whisper`）或 `@cf/openai/whisper-large-v3-turbo`。

### Kelivo 配置

```text
Provider:  OpenAI
Base URL:  https://<your-worker>/v1
API Key:   你设置的 API_KEY
Model:     tts-1          # 已指向 MeloTTS
Voice:     （留空即可，MeloTTS 不使用 voice）
Format:    mp3
```

### 开发命令

```bash
npm run dev      # 本地起服务（读取 .dev.vars 里的 API_KEY）
npm run check    # tsc 类型检查
npm run types    # 生成 wrangler 类型
npm run deploy   # 部署
```

### 安全注意

- 鉴权密钥只走运行时：生产用 `wrangler secret put API_KEY`，本地开发用 `.dev.vars`（已在 `.gitignore`，可参考 `.dev.vars.example`）。密钥不进代码、不进 git。
- 历史清理：若早期版本曾把 `src/generated-config.ts` 提交进 git，执行 `git rm --cached src/generated-config.ts`，必要时清理 git 历史里的旧密钥。

### License

MIT
