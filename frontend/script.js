let currentUser = null;

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
    document.getElementById('operator').value = currentUser;
    document.getElementById('issuer').value = currentUser;

    // Datum und Uhrzeit vorbefüllen
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('issuerDate').value = now.toISOString().split('T')[0];
    document.getElementById('issuerTime').value = now.toTimeString().slice(0, 5);

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

  if (response.ok) {
    alert('Registrierung erfolgreich');
  } else {
    const err = await response.text();
    alert('Registrierung fehlgeschlagen: ' + err);
  }
}

async function saveEntry() {
  const entry = {
    machine: document.getElementById('machine').value,
    operator: document.getElementById('operator').value,
    additionalEmployee: document.getElementById('additionalEmployee').value,
    date: document.getElementById('date').value,
    completedTasks: document.getElementById('completedTasks').value,
    incidents: document.getElementById('incidents').value,
    pendingWorks: document.getElementById('pendingWorks').value,
    issuer: document.getElementById('issuer').value,
    issuerDate: document.getElementById('issuerDate').value,
    issuerTime: document.getElementById('issuerTime').value,
    userId: currentUser
  };

  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });

  if (response.ok) {
    alert('Eintrag gespeichert');
    loadEntries();
  } else {
    alert('Fehler beim Speichern');
  }
}

async function loadEntries() {
  const response = await fetch('/api/entries');
  if (response.ok) {
    const entries = await response.json();
    window.allEntries = entries; // Für PDF-Export speichern
    const container = document.getElementById('entries-list');
    container.innerHTML = '';

    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header">${entry.date}</div>
        <p><strong>Maschine:</strong> ${entry.machine}</p>
        <p><strong>Ausgestellt:</strong> ${entry.issuer} (${entry.issuerTime})</p>
        <p><strong>Aufgaben:</strong><br>${entry.completedTasks.replace(/\n/g, '<br>')}</p>
      `;
      container.appendChild(div);
    });

    document.getElementById('entries-section').style.display = 'block';
  }
}

// PDF: Heutige Übergabe
function createDailyPDF() {
  const entryDiv = document.createElement('div');
  entryDiv.innerHTML = `
    <h1>Schichtübergabe – Heute</h1>
    <p><strong>Maschine:</strong> ${document.getElementById('machine').value}</p>
    <p><strong>Ausgestellt:</strong> ${document.getElementById('issuer').value}</p>
    <p><strong>Datum:</strong> ${document.getElementById('issuerDate').value}</p>
    <p><strong>Uhrzeit:</strong> ${document.getElementById('issuerTime').value}</p>
    <p><strong>Aufgaben:</strong><br>${document.getElementById('completedTasks').value.replace(/\n/g, '<br>')}</p>
    <p><strong>Folgearbeiten:</strong><br>${document.getElementById('pendingWorks').value.replace(/\n/g, '<br>')}</p>
  `;

  entryDiv.style.position = 'absolute';
  entryDiv.style.left = '-9999px';
  document.body.appendChild(entryDiv);

  import('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js').then(module => {
    const html2pdf = module.default || module;
    html2pdf().from(entryDiv).save(`uebergabe_heute_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.removeChild(entryDiv);
  }).catch(e => console.error(e));
}

// PDF: Gesamte Woche
function createWeeklyPDF() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setHours(0,0,0,0);
  monday.setDate(today.getDate() - daysBack);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23,59,59,999);

  const weekEntries = (window.allEntries || []).filter(e => {
    const d = new Date(e.date);
    return d >= monday && d <= friday;
  });

  const content = document.createElement('div');
  content.style.padding = '20px';
  content.innerHTML = `
    <h1>Schichtübergabe – Woche ${monday.toLocaleDateString('de-DE')}</h1>
    <p><strong>Zeitraum:</strong> ${monday.toLocaleDateString('de-DE')} – ${friday.toLocaleDateString('de-DE')}</p>
    <hr>
    ${weekEntries.length === 0 ? '<p>Keine Einträge für diese Woche gefunden.</p>' : weekEntries.map(e => `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
        <h3>Datum: ${e.date} (${e.issuerTime})</h3>
        <p><strong>Maschine:</strong> ${e.machine}</p>
        <p><strong>Mitarbeiter:</strong> ${e.operator} ${e.additionalEmployee ? ', ' + e.additionalEmployee : ''}</p>
        <p><strong>Erledigte Aufgaben:</strong><br>${e.completedTasks.replace(/\n/g, '<br>')}</p>
        <p><strong>Störungen/Wartungen:</strong><br>${e.incidents.replace(/\n/g, '<br>')}</p>
        <p><strong>Anstehende Arbeiten:</strong><br>${e.pendingWorks.replace(/\n/g, '<br>')}</p>
      </div>
    `).join('')}
  `;

  content.style.position = 'absolute';
  content.style.left = '-9999px';
  document.body.appendChild(content);

  import('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js').then(module => {
    const html2pdf = module.default || module;
    html2pdf().from(content).save(`uebergabe_woche_${monday.toISOString().slice(0, 10)}.pdf`);
    document.body.removeChild(content);
  }).catch(e => console.error(e));
}