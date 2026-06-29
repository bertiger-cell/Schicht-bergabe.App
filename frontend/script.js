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
    machine: document.getElementById('machine').value || "Prod.-bereich",
    operator: currentUser,
    additionalEmployee: "",
    date: document.getElementById('date').value,
    workTime: document.getElementById('workTime').value,
    incidentFrom: document.getElementById('incident-from').value,
    incidentTo: document.getElementById('incident-to').value,
    completedTasks: document.getElementById('completedTasks').value,
    incidents: document.getElementById('incidents').value,
    pendingWorks: document.getElementById('pendingWorks').value,
    issuer: document.getElementById('issuer').value,
    issuerDate: document.getElementById('date').value,
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
        <div class="entry-header">Datum: ${entry.date} | Arbeitszeit: ${entry.workTime || 'Nicht angegeben'}</div>
        <div class="entry-body">
            <p><strong>Prod.-bereich:</strong> ${entry.machine || 'Prod.-bereich'}</p>
            <p><strong>Erledigte Aufgaben:</strong><br>${entry.completedTasks ? entry.completedTasks.replace(/\n/g, '<br>') : '-'}</p>
            ${entry.incidents || entry.incidentFrom || entry.incidentTo ? `
              <p><strong>Wartung / Störung (${entry.incidentFrom || ''} - ${entry.incidentTo || ''}):</strong><br>${entry.incidents ? entry.incidents.replace(/\n/g, '<br>') : '-'}</p>
            ` : ''}
            <p><strong>Zu erledigende Aufgaben:</strong><br>${entry.pendingWorks ? entry.pendingWorks.replace(/\n/g, '<br>') : '-'}</p>
            <p style="font-size: 0.85rem; color: #666; margin-top: 10px; border-top: 1px solid #eee; pt: 5px;">
                Ausgestellt von ${entry.issuer} um ${entry.issuerTime} Uhr
            </p>
        </div>
      `;
      container.appendChild(div);
    });

    document.getElementById('entries-section').style.display = 'block';
  }
}

// PDF: Heutige Übergabe
function createDailyPDF() {
  const content = document.createElement('div');
  content.style.padding = '30px';
  content.style.fontFamily = 'Arial, sans-serif';

  const machine = document.getElementById('machine').value || "Prod.-bereich";
  const date = document.getElementById('date').value;
  const workTime = document.getElementById('workTime').value;
  const completed = document.getElementById('completedTasks').value;
  const incidentFrom = document.getElementById('incident-from').value;
  const incidentTo = document.getElementById('incident-to').value;
  const incidents = document.getElementById('incidents').value;
  const pending = document.getElementById('pendingWorks').value;
  const issuer = document.getElementById('issuer').value;

  content.innerHTML = `
    <h1 style="color: #007bff; border-bottom: 2px solid #007bff; pb: 10px;">Schichtübergabe</h1>
    <p><strong>Datum:</strong> ${date} | <strong>Arbeitszeit:</strong> ${workTime || '-'}</p>
    <p><strong>Prod.-bereich:</strong> ${machine}</p>
    <hr>
    <h3>Erledigte Aufgaben:</h3>
    <p>${completed ? completed.replace(/\n/g, '<br>') : '-'}</p>

    ${incidents || incidentFrom || incidentTo ? `
      <h3>Wartung / Störung (${incidentFrom} - ${incidentTo}):</h3>
      <p>${incidents ? incidents.replace(/\n/g, '<br>') : '-'}</p>
    ` : ''}

    <h3>Zu erledigende Arbeiten:</h3>
    <p>${pending ? pending.replace(/\n/g, '<br>') : '-'}</p>

    <div style="margin-top: 50px; border-top: 1px solid #ccc; pt: 10px;">
      <p><strong>Ausgestellt durch:</strong> ${issuer}</p>
      <p><strong>Erstellt am:</strong> ${new Date().toLocaleString('de-DE')}</p>
    </div>
  `;

  html2pdf().from(content).set({
    margin: 10,
    filename: `uebergabe_${date}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
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
        <h3>Datum: ${e.date} | Arbeitszeit: ${e.workTime || '-'}</h3>
        <p><strong>Prod.-bereich:</strong> ${e.machine || 'Prod.-bereich'}</p>
        <p><strong>Erledigte Aufgaben:</strong><br>${e.completedTasks ? e.completedTasks.replace(/\n/g, '<br>') : '-'}</p>
        ${e.incidents || e.incidentFrom || e.incidentTo ? `
          <p><strong>Wartung / Störung (${e.incidentFrom || ''} - ${e.incidentTo || ''}):</strong><br>${e.incidents ? e.incidents.replace(/\n/g, '<br>') : '-'}</p>
        ` : ''}
        <p><strong>Anstehende Arbeiten:</strong><br>${e.pendingWorks ? e.pendingWorks.replace(/\n/g, '<br>') : '-'}</p>
        <p style="font-size: 0.8rem; color: #666;">Ausgestellt von ${e.issuer} um ${e.issuerTime}</p>
      </div>
    `).join('')}

  `;

  content.style.position = 'absolute';
  content.style.left = '-9999px';
  document.body.appendChild(content);

  html2pdf().from(content).set({
    margin: 10,
    filename: `uebergabe_woche_${monday.toISOString().slice(0, 10)}.pdf`,
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
  document.body.removeChild(content);
}
