let currentUser = null;
let currentPhotos = [];

// Hilfsfunktion: Bild verkleinern
function processImage(file, targetId) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const max = 800;
      if (width > height) {
        if (width > max) { height *= max / width; width = max; }
      } else {
        if (height > max) { width *= max / height; height = max; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      const photoId = 'img_' + Date.now();
      currentPhotos.push({ id: photoId, data: base64 });
      const textarea = document.getElementById(targetId);
      textarea.value += (textarea.value ? '\n' : '') + `[FOTO:${photoId}]`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', () => {
  const inputs = [{ input: 'photo-completed', target: 'completedTasks' }, { input: 'photo-incidents', target: 'incidents' }, { input: 'photo-pending', target: 'pendingWorks' }];
  inputs.forEach(item => {
    const el = document.getElementById(item.input);
    if (el) el.addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) processImage(e.target.files[0], item.target); });
  });

  const toggleBtn = document.getElementById('theme-toggle');
  if (localStorage.getItem('dark-mode') === 'true') document.body.classList.add('dark-mode');
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('main-form').style.display = 'none';
    document.getElementById('entries-section').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'none';
  });
});

async function login() {
  const user = document.getElementById('login-user').value;
  const pwd = document.getElementById('login-password').value;
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password: pwd })
  });

  if (response.ok) {
    const data = await response.json();
    currentUser = data.user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-form').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('operator').value = currentUser;
    document.getElementById('issuer').value = currentUser;

    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    loadEntries();
  } else {
    alert('Login fehlgeschlagen');
  }
}

async function register() {
  const user = document.getElementById('reg-user').value;
  const pwd = document.getElementById('reg-password').value;
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password: pwd })
  });
  if (response.ok) alert('Registrierung erfolgreich');
  else alert('Fehler: ' + await response.text());
}

async function saveEntry() {
  const entry = {
    machine: document.getElementById('machine').value || "Standard-Bereich",
    operator: currentUser,
    date: document.getElementById('date').value,
    workTime: document.getElementById('workTime').value,
    incidentFrom: document.getElementById('incident-from').value,
    incidentTo: document.getElementById('incident-to').value,
    completedTasks: document.getElementById('completedTasks').value,
    incidents: document.getElementById('incidents').value,
    pendingWorks: document.getElementById('pendingWorks').value,
    issuer: currentUser,
    issuerDate: document.getElementById('date').value,
    photos: currentPhotos,
    userId: currentUser
  };

  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });

  if (response.ok) {
    alert('Eintrag gespeichert');
    currentPhotos = []; // Reset photos after save
    loadEntries();
  } else {
    alert('Speichern fehlgeschlagen');
  }
}

async function loadEntries() {
  const container = document.getElementById('entries-list');
  container.innerHTML = '<p style="text-align:center;">Lade Übergaben aus der Cloud...</p>';
  document.getElementById('entries-section').style.display = 'block';

  try {
    const response = await fetch('/api/entries?nocache=' + Date.now());
    if (response.ok) {
      const entries = await response.json();
      window.allEntries = entries;
      container.innerHTML = '';

      if (!entries || entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">Keine Einträge in der Datenbank gefunden.</p>';
        return;
      }

      entries.forEach(e => {
        // Mapping für alle Datenbank-Varianten
        const machine = e.machine || 'Bereich';
        const workTime = e.work_time || e.workTime || '---';
        const completed = e.completed_tasks || e.completedTasks || '-';
        const pending = e.pending_works || e.pendingWorks || '-';
        const incidentTxt = e.incidents || '';
        const from = e.incident_from || e.incidentFrom || '';
        const to = e.incident_to || e.incidentTo || '';
        const issuer = e.issuer || 'Unbekannt';
        const time = e.issuer_time || e.issuerTime || '--:--';
        const date = e.date || e.issuer_date || '-';

        let photos = [];
        try { photos = JSON.parse(e.photos || '[]'); } catch(err) {}

        const renderTxt = (t) => {
          if (!t) return '-';
          return t.replace(/\[FOTO:(img_\d+)\]/g, (match, id) => {
            const p = photos.find(item => item.id === id);
            return p ? `<a href="#" onclick="viewPhoto('${p.id}'); return false;" style="color:#007bff; font-weight:bold;">[📷 BILD ANZEIGEN]</a>` : '[FOTO]';
          }).replace(/\n/g, '<br>');
        };

        const div = document.createElement('div');
        div.className = 'entry-item';
        div.innerHTML = `
          <div class="entry-header">Datum: ${date} | Schicht: ${workTime}</div>
          <div class="entry-body">
            <p><strong>Bereich:</strong> ${machine}</p>
            <p><strong>Erledigt:</strong><br>${renderTxt(completed)}</p>
            ${incidentTxt || from || to ? `<p><strong>Störung (${from}-${to}):</strong><br>${renderTxt(incidentTxt)}</p>` : ''}
            <p><strong>Anstehend:</strong><br>${renderTxt(pending)}</p>
            <p style="font-size:0.8rem; color:#888; border-top:1px solid #eee; margin-top:8px; padding-top:4px;">
              Von <strong>${issuer}</strong> um ${time} Uhr
            </p>
          </div>
        `;
        container.appendChild(div);
      });
    } else {
      container.innerHTML = '<p style="color:red; text-align:center;">Cloud-Fehler: ' + response.status + '</p>';
    }
  } catch (err) {
    container.innerHTML = '<p style="color:red; text-align:center;">Verbindung zur Cloud unterbrochen.</p>';
  }
}

function viewPhoto(id) {
  let data = null;
  (window.allEntries || []).forEach(e => {
    try {
      const ps = JSON.parse(e.photos || '[]');
      const p = ps.find(x => x.id === id);
      if (p) data = p.data;
    } catch(err) {}
  });
  if (data) {
    const win = window.open("");
    win.document.write(`<img src="${data}" style="max-width:100%;">`);
  } else alert("Bild nicht gefunden.");
}

function startSpeech(id) {
  const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reco) return alert("Spracherkennung wird nicht unterstützt.");
  const recognition = new Reco();
  recognition.lang = 'de-DE';
  const btn = event.currentTarget;
  btn.style.backgroundColor = '#ffcccc';
  recognition.start();
  recognition.onresult = (e) => {
    document.getElementById(id).value += (document.getElementById(id).value ? ' ' : '') + e.results[0][0].transcript;
    btn.style.backgroundColor = '';
  };
  recognition.onerror = () => { btn.style.backgroundColor = ''; alert("Fehler beim Zuhören."); };
  recognition.onspeechend = () => { recognition.stop(); btn.style.backgroundColor = ''; };
}
