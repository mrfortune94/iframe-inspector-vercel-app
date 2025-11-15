// DOM setup
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const sourceView = document.getElementById('sourceView');
const liveView = document.getElementById('liveView');

// Advanced controls: custom headers, method selector, injectLog, download toggle
const controlsDiv = document.createElement('div');
controlsDiv.innerHTML = `
  <label>HTTP Method:
    <select id="methodSelect">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
    </select>
  </label>
  <label>Custom Headers (JSON):
    <input id="headersInput" style="width: 300px" placeholder='{"User-Agent":"Custom"}'/>
  </label>
  <label>
    <input type="checkbox" id="injectLogChk"/> Inject logging script
  </label>
  <button id="downloadHtmlBtn">Download HTML Source</button>
  <button id="extractScriptsBtn">Extract & Download JS</button>
`;
sourceView.parentNode.insertBefore(controlsDiv, sourceView.nextSibling);

// Main load and inspect handler
loadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return alert('Please enter a URL');

  const method = document.getElementById('methodSelect').value;
  let headers = {};
  let headersStr = document.getElementById('headersInput').value.trim();
  if (headersStr) {
    try { headers = JSON.parse(headersStr); } catch {}
  }
  const injectLog = document.getElementById('injectLogChk').checked;

  let apiUrl = `/api/fetch?url=${encodeURIComponent(url)}`;
  if (headersStr) apiUrl += `&headers=${encodeURIComponent(headersStr)}`;
  if (injectLog) apiUrl += `&injectLog=1`;

  let options = { method };
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify({ url, data: null });
  }

  try {
    const response = await fetch(apiUrl, options);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const html = await response.text();

    sourceView.textContent = html;

    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    liveView.src = blobUrl;
  } catch (error) {
    alert('Error loading page: ' + error.message);
  }
});

// Download HTML Source button
document.getElementById('downloadHtmlBtn').onclick = () => {
  const htmlSource = sourceView.textContent;
  const blob = new Blob([htmlSource], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iframe_source_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Extract & Download JS Scripts button
document.getElementById('extractScriptsBtn').onclick = async () => {
  const htmlText = sourceView.textContent;
  const scriptUrls = [];
  // Find script tags with src attributes
  htmlText.replace(/<scripts+[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
    // Absolute or resolve relative
    let u = src;
    if (!/^https?:///i.test(u)) {
      try {
        const pageUrl = urlInput.value.trim();
        const newUrl = new URL(u, pageUrl);
        u = newUrl.href;
      } catch {}
    }
    scriptUrls.push(u);
  });
  if (!scriptUrls.length) return alert('No external scripts found');
  
  // Download each JS file via proxy
  for (const jsUrl of scriptUrls) {
    try {
      const apiUrl = `/api/fetch?url=${encodeURIComponent(jsUrl)}&download=true`;
      const jsResp = await fetch(apiUrl);
      if (!jsResp.ok) throw new Error('Failed to download script');
      const jsCode = await jsResp.text();
      const blob = new Blob([jsCode], { type: 'application/javascript' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const cleanName = jsUrl.split('/').pop().split('?')[0] || 'game_script.js';
      a.download = `${cleanName.replace(/[^w.-]/g, '_')}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Error downloading JS: ' + jsUrl);
    }
  }
};
