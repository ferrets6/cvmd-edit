// ===================================================
// AUTENTICAZIONE
// ===================================================
async function checkPassword() {
  const input = document.getElementById('password-input');
  const errEl = document.getElementById('auth-error');
  const btn   = document.getElementById('auth-btn');

  if (!input.value) return;
  btn.disabled    = true;
  btn.textContent = 'Verifica...';

  try {
    const res = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input.value }),
    });

    if (res.ok) {
      const { token } = await res.json();
      sessionStorage.setItem('session_token', token);
      document.getElementById('auth-gate').style.display = 'none';
      document.getElementById('editor-app').style.display = 'flex';
      loadConfig();
      loadReadme();
    } else {
      errEl.style.display = 'block';
      input.value = '';
      input.focus();
      btn.disabled    = false;
      btn.textContent = 'Accedi';
    }
  } catch {
    errEl.textContent = 'Errore di rete. Riprova.';
    errEl.style.display = 'block';
    btn.disabled    = false;
    btn.textContent = 'Accedi';
  }
}

function getSessionHeader() {
  return { 'x-session': sessionStorage.getItem('session_token') || '' };
}

// ===================================================
// CONFIGURAZIONE (URL assets del repo target)
// ===================================================
let repoProfileImageUrl = null;

async function loadConfig() {
  try {
    const res = await fetch('/.netlify/functions/get-config', {
      headers: getSessionHeader(),
    });
    if (res.ok) {
      const data = await res.json();
      repoProfileImageUrl = data.profileImageUrl;
    }
  } catch { /* non bloccante */ }
}

// ===================================================
// CARICAMENTO README.md
// ===================================================
let currentFileSha = null;
let textChanged    = false;

async function loadReadme() {
  setStatus('Caricamento del CV...', 'loading');
  try {
    const res = await fetch('/.netlify/functions/get-file', {
      headers: getSessionHeader(),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    currentFileSha = data.sha;
    const content = base64ToUtf8(data.content.replace(/\n/g, ''));
    document.getElementById('markdown-input').value = content;
    updatePreview();
    textChanged = false;
    updateSaveButton();
    setStatus('CV caricato correttamente.', 'success');
  } catch (err) {
    setStatus('Errore nel caricamento: ' + err.message, 'error');
  }
}

// ===================================================
// ANTEPRIMA
// ===================================================
let previewVisible = false;
let previewTimer   = null;

function togglePreview() {
  previewVisible = !previewVisible;
  document.getElementById('preview-pane').classList.toggle('hidden', !previewVisible);
  document.getElementById('btn-preview').classList.toggle('active', previewVisible);
  if (previewVisible) updatePreview();
}

function onEditorInput() {
  textChanged = true;
  updateSaveButton();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 200);
}

function updatePreview() {
  if (!previewVisible) return;
  const md = document.getElementById('markdown-input').value;
  document.getElementById('preview-content').innerHTML = marked.parse(md);
  document.querySelectorAll('#preview-content img').forEach(img => {
    if (img.getAttribute('src') === 'assets/profile.png') {
      img.src = previewPhotoUrl || repoProfileImageUrl || img.src;
    }
  });
}

// ===================================================
// LEGENDA
// ===================================================
let legendVisible = false;

function toggleLegend() {
  legendVisible = !legendVisible;
  document.getElementById('legend-section').classList.toggle('open', legendVisible);
  document.getElementById('btn-legend').classList.toggle('active', legendVisible);
}

// ===================================================
// STATO BOTTONE SALVA
// ===================================================
function updateSaveButton() {
  const btn = document.getElementById('btn-save');
  if (!btn) return;
  const hasChanges = textChanged || photoChanged;
  btn.disabled = !hasChanges;
  btn.title    = hasChanges ? '' : 'Nessuna modifica da salvare';
}

// ===================================================
// SALVATAGGIO
// ===================================================
async function saveChanges() {
  if (!textChanged && !photoChanged) return;

  setStatus('Salvataggio in corso...', 'loading');
  try {
    if (photoChanged) {
      await writeFile(
        'assets/profile.png', await blobToBase64(confirmedProfileBlob),
        'Aggiornamento foto profilo tramite editor web'
      );
      await writeFile(
        'assets/og-image.png', await blobToBase64(confirmedOgBlob),
        'Aggiornamento og-image tramite editor web'
      );
      confirmedProfileBlob = null;
      confirmedOgBlob      = null;
      photoChanged         = false;
    }

    if (textChanged) {
      if (!currentFileSha) {
        setStatus('Il file non risulta caricato. Ricarica la pagina.', 'error');
        return;
      }
      const content = document.getElementById('markdown-input').value;
      const data = await writeFile(
        null,
        utf8ToBase64(content),
        'Aggiornamento CV tramite editor web',
        currentFileSha
      );
      currentFileSha = data.content.sha;
      textChanged    = false;
    }

    if (previewPhotoUrl) {
      URL.revokeObjectURL(previewPhotoUrl);
      previewPhotoUrl = null;
    }
    document.getElementById('btn-restore-photo').style.display = 'none';
    updateSaveButton();
    setStatus(
      'Modifiche salvate. La GitHub Action aggiornerà il sito automaticamente (1-2 minuti).',
      'success'
    );
  } catch (err) {
    setStatus('Errore nel salvataggio: ' + err.message, 'error');
  }
}

async function writeFile(path, content, message, sha) {
  const body = { content, message };
  if (path) body.path = path;
  if (sha !== undefined) body.sha = sha;

  const res = await fetch('/.netlify/functions/write-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getSessionHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===================================================
// CAMBIO FOTO PROFILO
// ===================================================
const MAX_PROFILE_SIZE = 300;
const OG_WIDTH = 1200, OG_HEIGHT = 630;

let photoChanged         = false;
let confirmedProfileBlob = null;
let confirmedOgBlob      = null;
let previewProfileBlob   = null;
let previewOgBlob        = null;
let previewPhotoUrl      = null;

function cropToCircle(img) {
  const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
  const size    = Math.min(srcSize, MAX_PROFILE_SIZE);
  const canvas  = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  const srcX = (img.naturalWidth  - srcSize) / 2;
  const srcY = (img.naturalHeight - srcSize) / 2;
  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
  return canvas;
}

function generateOgCanvas(profileCanvas) {
  const canvas  = document.createElement('canvas');
  canvas.width  = OG_WIDTH;
  canvas.height = OG_HEIGHT;
  const ctx  = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, OG_WIDTH, 0);
  grad.addColorStop(0, '#155799');
  grad.addColorStop(1, '#159957');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);
  const px = Math.round((OG_WIDTH  - profileCanvas.width)  / 2);
  const py = Math.round((OG_HEIGHT - profileCanvas.height) / 2);
  ctx.drawImage(profileCanvas, px, py);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function onPhotoSelected(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const img = new Image();
  img.onload = async () => {
    const profileCanvas = cropToCircle(img);
    const ogCanvas      = generateOgCanvas(profileCanvas);

    previewProfileBlob = await canvasToBlob(profileCanvas);
    previewOgBlob      = await canvasToBlob(ogCanvas);

    const previewCanvas = document.getElementById('photo-preview-canvas');
    previewCanvas.width  = profileCanvas.width;
    previewCanvas.height = profileCanvas.height;
    previewCanvas.getContext('2d').drawImage(profileCanvas, 0, 0);
    document.getElementById('photo-modal').classList.add('open');
  };
  img.src = URL.createObjectURL(file);
}

function cancelPhoto() {
  document.getElementById('photo-modal').classList.remove('open');
  previewProfileBlob = null;
  previewOgBlob      = null;
}

function confirmPhoto() {
  if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl);
  previewPhotoUrl      = URL.createObjectURL(previewProfileBlob);
  confirmedProfileBlob = previewProfileBlob;
  confirmedOgBlob      = previewOgBlob;
  previewProfileBlob   = null;
  previewOgBlob        = null;
  photoChanged         = true;
  document.getElementById('photo-modal').classList.remove('open');
  document.getElementById('btn-restore-photo').style.display = '';
  updatePreview();
  updateSaveButton();
}

function restorePhoto() {
  if (previewPhotoUrl) {
    URL.revokeObjectURL(previewPhotoUrl);
    previewPhotoUrl = null;
  }
  confirmedProfileBlob = null;
  confirmedOgBlob      = null;
  photoChanged         = false;
  document.getElementById('btn-restore-photo').style.display = 'none';
  updatePreview();
  updateSaveButton();
}

// ===================================================
// UTILITA'
// ===================================================
function setStatus(msg, type) {
  const bar = document.getElementById('status-bar');
  bar.textContent = msg;
  bar.className   = type || '';
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
