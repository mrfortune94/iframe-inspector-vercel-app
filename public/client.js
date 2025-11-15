// DOM setup
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const sourceView = document.getElementById('sourceView');
const liveView = document.getElementById('liveView');

// Add advanced controls to UI
const controlsDiv = document.createElement('div');
controlsDiv.innerHTML = `
  <label>HTTP Method:
    <select id="methodSelect"><option value="GET">GET</option><option value="POST">POST</option></select>
  </label>
  <label>Custom Headers (JSON):
    <input id="headersInput" style="width: 300px" placeholder='{"User-Agent":"Custom"}'/>
  </label>
  <label>Auth Header (Bearer):
    <input id="authInput" style="width: 220px" placeholder='YourTokenHere'/>
  </label>
  <label>
    <input type="checkbox" id="injectLogChk"/> Inject logging script
  </label>
  <button id="downloadHtmlBtn">Download HTML Source</button>
  <button id="extractScriptsBtn">Extract & Download JS</button>
  <button id="showCORSBtn">Show CORS Headers</button>
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
  const authVal = document.getElementById('authInput').value;
  if (authVal) headers['Authorization'] = 'Bearer ' + authVal;
  const injectLog = document.getElementById('injectLogChk').checked;

  let apiUrl = `/api/fetch?url=${encodeURIComponent(url)}`;
  if (Object.keys(headers).length) apiUrl += `&headers=${encodeURIComponent(JSON.stringify(headers))}`;
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

    // Auto-populate scripts to help user find downloadable options
    autoExtractScriptList(html);
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
  htmlText.replace(/<scripts+[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
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

// Show CORS Headers Button
document.getElementById('showCORSBtn').onclick = async () => {
  const url = urlInput.value.trim();
  if (!url) return alert('Enter URL first!');
  let apiUrl = `/api/fetch?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(apiUrl, { method: 'HEAD' });
    const headers = [];
    response.headers.forEach((val, name) => headers.push(`${name}: ${val}`));
    alert('CORS-related Headers:
' + headers.filter(h => h.toLowerCase().includes('access-control')).join('
') || 'No CORS headers found.');
  } catch (e) {
    alert('Error fetching CORS headers.');
  }
};

// Auto-extract and show script links from HTML (just lists for convenience)
function autoExtractScriptList(html) {
  let scriptUrls = [];
  html.replace(/<scripts+[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
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
  let scriptListDiv = document.getElementById('scriptListDiv');
  if (!scriptListDiv) {
    scriptListDiv = document.createElement('div');
    scriptListDiv.id = 'scriptListDiv';
    scriptListDiv.style.marginTop = '10px';
    sourceView.parentNode.insertBefore(scriptListDiv, sourceView.nextSibling);
  }
  scriptListDiv.innerHTML = scriptUrls.length ?
    `<b>Detected External Scripts:</b><br>${scriptUrls.map(s => `<a href="${s}" target="_blank">${s}</a>`).join('<br>')}` :
    '';
}
