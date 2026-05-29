export function renderHome(origin: string): string {
  const baseUrl = `${origin}/v1`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CF Free AI Gateway</title>
  <style>
    :root { --bg:#fafafa; --text:#111; --muted:#666; --line:rgba(0,0,0,.12); --line2:rgba(0,0,0,.22); --ok:#15803d; --code:#f4f4f5; font-family: system-ui,-apple-system,"Segoe UI",sans-serif; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); line-height:1.6; }
    a { color:inherit; }
    .wrap { max-width: 920px; margin:0 auto; padding: 44px 20px 64px; }
    .tag { display:inline-block; font-size:12px; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:4px 11px; }
    h1 { font-size: clamp(28px,5vw,44px); letter-spacing:-.02em; margin:18px 0 12px; }
    .lead { color:var(--muted); font-size:16px; max-width:680px; margin:0; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:24px; }
    .btn { border:1px solid var(--line2); background:#fff; color:#111; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; }
    .btn:hover { border-color:#111; }
    h2 { font-size:13px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:38px 0 12px; font-weight:600; }
    .copyline { display:flex; gap:10px; align-items:center; justify-content:space-between; border:1px solid var(--line); border-radius:8px; padding:10px 12px; background:#fff; overflow:auto; }
    .copyline code { white-space:nowrap; background:none; padding:0; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .card { border:1px solid var(--line); border-radius:10px; padding:14px 16px; background:#fff; }
    .card h3 { margin:0 0 5px; font-size:14px; }
    .card p { margin:0; color:var(--muted); font-size:12.5px; line-height:1.55; }
    .ok { color:var(--ok); font-weight:600; }
    .note { border:1px solid var(--line); border-left:3px solid var(--ok); border-radius:8px; padding:12px 14px; background:#fff; font-size:13px; color:#333; }
    code { background:var(--code); border-radius:5px; padding:2px 6px; font-size:12.5px; }
    pre { background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px; overflow:auto; font-size:12.5px; line-height:1.6; margin:0; }
    .tester { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    input, textarea { width:100%; border:1px solid var(--line2); border-radius:8px; padding:10px; font:inherit; font-size:13px; margin:6px 0; background:#fff; }
    textarea { min-height:80px; resize:vertical; }
    .result { white-space:pre-wrap; min-height:130px; font-size:12px; color:#333; }
    .foot { color:var(--muted); font-size:12px; margin-top:42px; text-align:center; }
    @media (max-width:760px){ .grid,.tester{ grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="wrap">
    <span class="tag">Cloudflare Workers AI · OpenAI 兼容 · 免费额度友好</span>
    <h1>CF Free AI Gateway</h1>
    <p class="lead">把 Cloudflare Workers AI 的常用模型封装成 OpenAI 兼容接口：Chat、Embedding、TTS、STT、Image 与原生透传。默认选用最省免费额度的模型，适合 Kelivo、Web App、小程序后端和个人工具。</p>
    <div class="actions">
      <a class="btn" href="/v1/models">模型列表</a>
      <a class="btn" href="/cf/tts-guide">TTS 选型</a>
      <a class="btn" href="/cf/models/latest">实时扫描</a>
      <a class="btn" href="/health">健康检查</a>
      <button class="btn" onclick="copyText('${baseUrl}')">复制 Base URL</button>
    </div>

    <h2>Base URL</h2>
    <div class="copyline"><code>${baseUrl}</code><button class="btn" onclick="copyText('${baseUrl}')">复制</button></div>

    <h2>接口</h2>
    <div class="grid">
      <div class="card"><h3>Chat</h3><p><code>/v1/chat/completions</code><br/>兼容 OpenAI，支持 <code>stream:true</code> 流式。</p></div>
      <div class="card"><h3>TTS</h3><p><code>/v1/audio/speech</code><br/>默认 <span class="ok">MeloTTS</span>，自动识别中文。</p></div>
      <div class="card"><h3>STT</h3><p><code>/v1/audio/transcriptions</code><br/>Whisper 转写，支持中文。</p></div>
      <div class="card"><h3>Embedding</h3><p><code>/v1/embeddings</code><br/>检索 / RAG / 语义搜索。</p></div>
      <div class="card"><h3>Image</h3><p><code>/v1/images/generations</code><br/>Flux 文生图。</p></div>
      <div class="card"><h3>Raw Run</h3><p><code>/cf/run/:model</code><br/>透传任意 @cf 模型。</p></div>
    </div>

    <h2>免费额度提示</h2>
    <div class="note">默认 TTS 用 <b>MeloTTS</b>（约 18.63 neurons/分钟，支持中文），STT 用 <b>Whisper</b>（约 41 neurons/分钟）——都在每天 10,000 免费 Neurons 内，基本用不完。需要英文高音质再显式 <code>model:"aura-1"</code>（约贵 70 倍）。</div>

    <h2>在线测试 Chat</h2>
    <div class="tester">
      <div class="card">
        <p style="color:var(--muted);font-size:12.5px;margin:0">填入 API_KEY 测试当前 Worker 是否可用。</p>
        <input id="key" placeholder="API_KEY" />
        <textarea id="prompt">你好，用中文介绍一下你自己。</textarea>
        <button class="btn" onclick="testChat()">发送测试</button>
        <button class="btn" onclick="loadModels()">加载模型列表</button>
      </div>
      <div class="card"><pre class="result" id="result">等待测试...</pre></div>
    </div>

    <h2>Kelivo TTS 配置</h2>
    <pre>Provider: OpenAI
Base URL: ${baseUrl}
API Key:  你在 Cloudflare 设置的 API_KEY
Model:    tts-1          # 已指向 MeloTTS
Voice:    留空即可（MeloTTS 不使用 voice）
Format:   mp3</pre>

    <h2>curl 示例</h2>
    <pre># TTS（含中文自动走 MeloTTS）
curl -X POST "${baseUrl}/audio/speech" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"tts-1","input":"你好，这是中文测试。"}' \\
  --output speech.mp3

# Chat 流式
curl -N -X POST "${baseUrl}/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"chat-default","messages":[{"role":"user","content":"你好"}],"stream":true}'</pre>

    <p class="foot">Cloudflare Workers AI · 请妥善保管你的 API_KEY</p>
  </main>
  <script>
    async function copyText(text){ try{ await navigator.clipboard.writeText(text); alert('已复制：'+text); }catch(e){ alert('复制失败，请手动复制'); } }
    async function testChat(){ const key=document.getElementById('key').value.trim(); const prompt=document.getElementById('prompt').value; const result=document.getElementById('result'); result.textContent='请求中...'; try{ const res=await fetch('/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',...(key?{authorization:'Bearer '+key}:{})},body:JSON.stringify({model:'chat-default',messages:[{role:'user',content:prompt}]})}); const data=await res.json(); result.textContent=JSON.stringify(data,null,2); }catch(err){ result.textContent=String(err); } }
    async function loadModels(){ const result=document.getElementById('result'); result.textContent='加载中...'; try{ const data=await (await fetch('/v1/models')).json(); result.textContent=JSON.stringify(data,null,2); }catch(err){ result.textContent=String(err); } }
  </script>
</body>
</html>`;
}
