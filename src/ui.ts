export function renderHome(origin: string): string {
  const baseUrl = `${origin}/v1`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CF Free AI Gateway</title>
  <style>
    :root { color-scheme: dark; --bg: #050816; --panel: rgba(255,255,255,.08); --text: #f8fafc; --muted: #94a3b8; --line: rgba(255,255,255,.14); --brand: #f97316; --brand2: #38bdf8; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at 20% 10%, rgba(56,189,248,.26), transparent 30%), radial-gradient(circle at 75% 15%, rgba(249,115,22,.24), transparent 32%), radial-gradient(circle at 50% 100%, rgba(34,197,94,.14), transparent 35%), var(--bg); color: var(--text); min-height: 100vh; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 32px 18px 56px; }
    .hero { padding: 48px 28px; border: 1px solid var(--line); border-radius: 32px; background: linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); box-shadow: 0 30px 100px rgba(0,0,0,.35); backdrop-filter: blur(18px); }
    .badge { display: inline-flex; gap: 8px; align-items: center; border: 1px solid rgba(249,115,22,.45); background: rgba(249,115,22,.12); padding: 8px 12px; border-radius: 999px; color: #fed7aa; font-size: 13px; }
    h1 { font-size: clamp(36px, 7vw, 76px); letter-spacing: -0.06em; line-height: .95; margin: 22px 0 16px; }
    .lead { color: #cbd5e1; font-size: 18px; line-height: 1.7; max-width: 760px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
    button, .btn { border: 0; color: white; padding: 12px 16px; border-radius: 14px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, var(--brand), #fb7185); box-shadow: 0 14px 40px rgba(249,115,22,.25); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
    .btn.secondary, button.secondary { background: rgba(255,255,255,.1); box-shadow: none; border: 1px solid var(--line); }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 18px; }
    .card { border: 1px solid var(--line); background: var(--panel); border-radius: 24px; padding: 20px; backdrop-filter: blur(16px); }
    .card h3 { margin: 0 0 8px; }
    .card p { margin: 0; color: var(--muted); line-height: 1.6; }
    code, pre { background: rgba(15,23,42,.9); border: 1px solid var(--line); border-radius: 16px; color: #e2e8f0; }
    code { padding: 3px 6px; }
    pre { overflow: auto; padding: 16px; line-height: 1.55; }
    .section { margin-top: 24px; }
    .copyline { display: flex; gap: 10px; align-items: center; justify-content: space-between; border: 1px solid var(--line); background: rgba(15,23,42,.7); padding: 12px; border-radius: 16px; overflow: auto; }
    .copyline span { color: #bfdbfe; white-space: nowrap; }
    input, textarea { width: 100%; border: 1px solid var(--line); background: rgba(15,23,42,.75); color: white; border-radius: 14px; padding: 12px; outline: none; margin: 8px 0; }
    textarea { min-height: 92px; resize: vertical; }
    .tester { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .result { white-space: pre-wrap; color: #dbeafe; min-height: 120px; }
    .foot { color: var(--muted); text-align: center; margin-top: 36px; }
    @media (max-width: 820px) { .grid, .tester { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="badge">Cloudflare Workers AI · OpenAI-compatible · Free-tier friendly</div>
      <h1>CF Free AI Gateway</h1>
      <p class="lead">把 Cloudflare Workers AI 里的常用模型封装成外部应用更容易接入的接口：Chat、Embedding、TTS、STT、Image 和原生模型透传。适合 Kelivo、Web App、小程序后端和个人 AI 工具。</p>
      <div class="actions"><a class="btn" href="/v1/models">公开模型列表</a><a class="btn secondary" href="/cf/tts-guide">TTS 指南</a><a class="btn secondary" href="/cf/models/latest">实时扫描 CF 模型</a><a class="btn secondary" href="/health">健康检查</a><button class="secondary" onclick="copyText('${baseUrl}')">复制 Base URL</button></div>
    </section>
    <section class="section card"><h3>Base URL</h3><div class="copyline"><span>${baseUrl}</span><button onclick="copyText('${baseUrl}')">复制</button></div></section>
    <section class="grid">
      <div class="card"><h3>Chat</h3><p><code>/v1/chat/completions</code><br/>兼容 OpenAI Chat Completions，需要 API_KEY。</p></div>
      <div class="card"><h3>TTS</h3><p><code>/v1/audio/speech</code><br/>默认 Aura-1，Kelivo 用 <code>tts-1</code>。</p></div>
      <div class="card"><h3>公开模型</h3><p><code>/v1/models</code><br/>可直接浏览器打开，不需要 Key。</p></div>
      <div class="card"><h3>实时目录</h3><p><code>/cf/models/latest</code><br/>从 Cloudflare 定价页提取最新 @cf 模型 ID。</p></div>
      <div class="card"><h3>Embedding</h3><p><code>/v1/embeddings</code><br/>适合检索、RAG 和语义搜索。</p></div>
      <div class="card"><h3>Raw Run</h3><p><code>/cf/run/:model</code><br/>直接透传任意 Cloudflare 模型。</p></div>
    </section>
    <section class="section tester"><div class="card"><h3>在线测试 Chat</h3><p style="color:var(--muted)">填入 API_KEY，测试当前 Worker 是否可用。</p><input id="key" placeholder="API_KEY" /><textarea id="prompt">你好，用中文介绍一下你自己。</textarea><button onclick="testChat()">发送测试</button><button class="secondary" onclick="loadModels()">加载公开模型</button></div><div class="card"><h3>返回结果</h3><pre class="result" id="result">等待测试...</pre></div></section>
    <section class="section card"><h3>Kelivo TTS 配置</h3><pre>Provider: OpenAI
Base URL: ${baseUrl}
API Key: 你在 Cloudflare Worker 里设置的 API_KEY
Model: tts-1
Voice: angus
Format: mp3</pre></section>
    <section class="section card"><h3>curl 示例</h3><pre>curl -X POST "${baseUrl}/audio/speech" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"tts-1","input":"Hello from Cloudflare Workers AI.","voice":"angus","response_format":"mp3"}' \\
  --output speech.mp3</pre></section>
    <p class="foot">Made for Cloudflare Workers AI · Keep your API_KEY private.</p>
  </main>
  <script>
    async function copyText(text) { await navigator.clipboard.writeText(text); alert('已复制：' + text); }
    async function testChat() { const key = document.getElementById('key').value.trim(); const prompt = document.getElementById('prompt').value; const result = document.getElementById('result'); result.textContent = '请求中...'; try { const res = await fetch('/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify({ model: 'chat-default', messages: [{ role: 'user', content: prompt }] }) }); const data = await res.json(); result.textContent = JSON.stringify(data, null, 2); } catch (err) { result.textContent = String(err); } }
    async function loadModels() { const result = document.getElementById('result'); result.textContent = '加载模型中...'; const data = await (await fetch('/v1/models')).json(); result.textContent = JSON.stringify(data, null, 2); }
  </script>
</body>
</html>`;
}
