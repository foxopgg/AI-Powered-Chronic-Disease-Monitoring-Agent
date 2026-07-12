/* ═══════════════════════════════════════════════════════════════════
   CareIQ — AI-Powered Chronic Disease Monitoring Agent
   app.js  ·  Vanilla ES6  ·  IBM Granite Clinical AI Simulator
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   1. PATIENT SEED DATA (3 patients, 14-day history)
──────────────────────────────────────────────── */
const SEED_PATIENTS = [
  {
    id: 0,
    name:      'Elena Martinez',
    initials:  'EM',
    age:       54,
    sex:       'F',
    condition: 'Type 2 Diabetes · Age 54 · F',
    diagnosis: 'type2_diabetes',
    medications: [
      { name: 'Metformin 1000mg',  dose: 'Morning with food', time: 'AM' },
      { name: 'Glipizide 5mg',     dose: 'Before breakfast',  time: 'AM' },
      { name: 'Lisinopril 10mg',   dose: 'Evening',           time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:140, bpSystolicMax:130, bpDiastolicMax:80, hrMin:60, hrMax:100, spo2Min:95, weightMin:58, weightMax:72 },
    history: generateHistory('diabetes', 14),
  },
  {
    id: 1,
    name:      'Robert Chen',
    initials:  'RC',
    age:       61,
    sex:       'M',
    condition: 'Hypertension · Age 61 · M',
    diagnosis: 'hypertension',
    medications: [
      { name: 'Amlodipine 10mg',   dose: 'Morning',          time: 'AM' },
      { name: 'Hydrochlorothiazide 25mg', dose: 'Morning',   time: 'AM' },
      { name: 'Atorvastatin 40mg', dose: 'Evening',          time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:110, bpSystolicMax:125, bpDiastolicMax:80, hrMin:55, hrMax:90, spo2Min:96, weightMin:72, weightMax:88 },
    history: generateHistory('hypertension', 14),
  },
  {
    id: 2,
    name:      'Ama Owusu',
    initials:  'AO',
    age:       67,
    sex:       'F',
    condition: 'Heart Disease · Age 67 · F',
    diagnosis: 'heart_disease',
    medications: [
      { name: 'Aspirin 81mg',        dose: 'Morning with food', time: 'AM' },
      { name: 'Carvedilol 12.5mg',   dose: 'Twice daily',       time: 'AM' },
      { name: 'Furosemide 40mg',     dose: 'Morning',           time: 'AM' },
      { name: 'Spironolactone 25mg', dose: 'Evening',           time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:130, bpSystolicMax:120, bpDiastolicMax:75, hrMin:55, hrMax:85, spo2Min:96, weightMin:60, weightMax:74 },
    history: generateHistory('heart_disease', 14),
  }
];

/* ── History generator: realistic noise per condition ── */
function generateHistory(type, days) {
  const logs = [];
  const now = Date.now();
  for (let d = days - 1; d >= 0; d--) {
    const ts = now - d * 86400000 - Math.random() * 3600000;
    let glucose, systolic, diastolic, hr, spo2, weight;
    if (type === 'diabetes') {
      glucose   = Math.round(rand(95, 230));
      systolic  = Math.round(rand(118, 148));
      diastolic = Math.round(rand(72, 92));
      hr        = Math.round(rand(64, 88));
      spo2      = +(rand(96.5, 99)).toFixed(1);
      weight    = +(rand(68, 72)).toFixed(1);
    } else if (type === 'hypertension') {
      glucose   = Math.round(rand(82, 108));
      systolic  = Math.round(rand(138, 175));
      diastolic = Math.round(rand(86, 105));
      hr        = Math.round(rand(62, 82));
      spo2      = +(rand(96, 99)).toFixed(1);
      weight    = +(rand(80, 85)).toFixed(1);
    } else { // heart_disease
      glucose   = Math.round(rand(85, 120));
      systolic  = Math.round(rand(108, 135));
      diastolic = Math.round(rand(65, 85));
      hr        = Math.round(rand(58, 95));
      spo2      = +(rand(94, 98.5)).toFixed(1);
      weight    = +(rand(67, 71)).toFixed(1);
    }
    logs.push({ ts, glucose, systolic, diastolic, hr, spo2, weight, type: 'vitals' });
  }
  return logs;
}

function rand(min, max) { return min + Math.random() * (max - min); }

/* ──────────────────────────────────────────────
   2. APPLICATION STATE
──────────────────────────────────────────────── */
const STATE = {
  patients:        [],          // loaded from localStorage or seeded
  activePatientIdx: 0,
  activePortal:    'patient',
  providerPatientIdx: 0,
  alerts:          [],
  logDraft:        {},          // current log modal type/data
  charts:          {},          // Chart.js instances
  settings:        { apiKey:'', watsonUrl:'', modelId:'ibm-granite-13b-instruct-v2', useReal:false },
  medTaken:        {},          // { "patientId_medIdx_YYYY-MM-DD": bool }
};

/* ──────────────────────────────────────────────
   3. PERSISTENCE — localStorage
──────────────────────────────────────────────── */
function loadState() {
  try {
    const raw = localStorage.getItem('careiq_patients');
    if (raw) {
      STATE.patients = JSON.parse(raw);
    } else {
      STATE.patients = JSON.parse(JSON.stringify(SEED_PATIENTS)); // deep clone
      savePatients();
    }
    const sets = localStorage.getItem('careiq_settings');
    if (sets) STATE.settings = JSON.parse(sets);
    const med = localStorage.getItem('careiq_medtaken');
    if (med) STATE.medTaken = JSON.parse(med);
    const alerts = localStorage.getItem('careiq_alerts');
    if (alerts) STATE.alerts = JSON.parse(alerts);
  } catch (e) {
    STATE.patients = JSON.parse(JSON.stringify(SEED_PATIENTS));
  }
}

function savePatients() {
  localStorage.setItem('careiq_patients', JSON.stringify(STATE.patients));
}
function persistSettings() {
  localStorage.setItem('careiq_settings', JSON.stringify(STATE.settings));
}
function saveMedTaken() {
  localStorage.setItem('careiq_medtaken', JSON.stringify(STATE.medTaken));
}
function saveAlerts() {
  localStorage.setItem('careiq_alerts', JSON.stringify(STATE.alerts));
}

/* ──────────────────────────────────────────────
   4. ANALYTICS ENGINE — Risk Scoring & Alerts
──────────────────────────────────────────────── */
function getLatestVitals(patient) {
  const logs = patient.history.filter(l => l.type === 'vitals');
  if (!logs.length) return null;
  return logs[logs.length - 1];
}

function analyzeVitals(patient) {
  const v = getLatestVitals(patient);
  if (!v) return { risk: 0, level: 'stable', flags: [] };
  const t = patient.targets;
  let risk = 0; const flags = [];

  // Glucose
  if (v.glucose > 250) { risk += 40; flags.push({ type:'critical', msg:`🔴 Critical: Blood glucose ${v.glucose} mg/dL (>250)` }); }
  else if (v.glucose > t.glucoseMax) { risk += 20; flags.push({ type:'warning', msg:`🟡 Elevated glucose: ${v.glucose} mg/dL (target <${t.glucoseMax})` }); }
  else if (v.glucose < t.glucoseMin) { risk += 25; flags.push({ type:'critical', msg:`🔴 Hypoglycemia: ${v.glucose} mg/dL (<${t.glucoseMin})` }); }

  // Blood Pressure
  if (v.systolic > 180 || v.diastolic > 110) { risk += 45; flags.push({ type:'critical', msg:`🔴 Hypertensive Crisis: BP ${v.systolic}/${v.diastolic} mmHg` }); }
  else if (v.systolic > t.bpSystolicMax || v.diastolic > t.bpDiastolicMax) { risk += 22; flags.push({ type:'warning', msg:`🟡 Elevated BP: ${v.systolic}/${v.diastolic} mmHg (target <${t.bpSystolicMax}/${t.bpDiastolicMax})` }); }

  // Heart Rate
  if (v.hr > 120) { risk += 30; flags.push({ type:'critical', msg:`🔴 Tachycardia: HR ${v.hr} bpm` }); }
  else if (v.hr < 45) { risk += 30; flags.push({ type:'critical', msg:`🔴 Bradycardia: HR ${v.hr} bpm` }); }
  else if (v.hr > t.hrMax) { risk += 10; flags.push({ type:'warning', msg:`🟡 Elevated heart rate: ${v.hr} bpm` }); }

  // SpO2
  if (v.spo2 < 90) { risk += 40; flags.push({ type:'critical', msg:`🔴 Critical SpO₂: ${v.spo2}% (<90%)` }); }
  else if (v.spo2 < t.spo2Min) { risk += 20; flags.push({ type:'warning', msg:`🟡 Low SpO₂: ${v.spo2}% (target ≥${t.spo2Min}%)` }); }

  // Weight trend
  if (v.weight > t.weightMax) { risk += 8; flags.push({ type:'info', msg:`ℹ️ Weight ${v.weight} kg above target (${t.weightMax} kg)` }); }

  const level = risk >= 40 ? 'critical' : risk >= 18 ? 'warning' : 'stable';
  return { risk, level, flags };
}

function evaluateAndAlert(patient, isNew = false) {
  const analysis = analyzeVitals(patient);
  analysis.flags.forEach(flag => {
    const key = `${patient.id}_${flag.msg.slice(0, 40)}`;
    if (!STATE.alerts.find(a => a.key === key)) {
      STATE.alerts.unshift({ key, patientName: patient.name, ...flag, ts: Date.now() });
    }
  });
  if (STATE.alerts.length > 50) STATE.alerts = STATE.alerts.slice(0, 50);
  saveAlerts();
  renderNotifications();
  return analysis;
}

/* ──────────────────────────────────────────────
   5. UI HELPERS
──────────────────────────────────────────────── */
function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function statusLabel(v, min, max) {
  if (v === null || v === undefined) return { text:'—', cls:'' };
  if (v > max)  return { text:'Elevated', cls:'status-elevated' };
  if (v < min)  return { text:'Low', cls:'status-low' };
  return { text:'Normal', cls:'status-normal' };
}

function setEl(id, val)  { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHtml(id, val){ const el = document.getElementById(id); if (el) el.innerHTML = val; }

function trendArrow(history, field, last = 7) {
  const vals = history.filter(h => h.type === 'vitals').map(h => h[field]).filter(Boolean);
  if (vals.length < 2) return '';
  const recent = vals.slice(-last);
  const avg1 = recent.slice(0, Math.floor(recent.length/2)).reduce((a,b)=>a+b,0) / Math.ceil(recent.length/2);
  const avg2 = recent.slice(Math.floor(recent.length/2)).reduce((a,b)=>a+b,0)  / Math.ceil(recent.length/2);
  const delta = avg2 - avg1;
  if (Math.abs(delta) < 1) return '→ Stable';
  return delta > 0 ? `↑ +${delta.toFixed(1)}` : `↓ ${delta.toFixed(1)}`;
}

/* ──────────────────────────────────────────────
   6. PATIENT DASHBOARD RENDER
──────────────────────────────────────────────── */
function renderPatientDashboard() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  const v = getLatestVitals(p);
  const analysis = evaluateAndAlert(p);

  // Header
  setEl('pt-avatar', p.initials);
  setEl('pt-name', p.name);
  setEl('pt-condition', p.condition);
  const riskEl = document.getElementById('pt-risk-badge');
  if (riskEl) { riskEl.textContent = analysis.level.charAt(0).toUpperCase() + analysis.level.slice(1); riskEl.className = `risk-badge ${analysis.level}`; }
  setEl('pt-risk-score', `Risk Score: ${analysis.risk}`);

  // Metrics
  if (v) {
    // Glucose
    setEl('mv-glucose', v.glucose ?? '—');
    const gs = statusLabel(v.glucose, p.targets.glucoseMin, p.targets.glucoseMax);
    document.getElementById('ms-glucose').className = `metric-status ${gs.cls}`;
    setEl('ms-glucose', gs.text);
    setEl('mt-glucose', trendArrow(p.history, 'glucose'));
    colorCard('mc-glucose', gs.cls);

    // BP
    setEl('mv-bp', v.systolic ? `${v.systolic}/${v.diastolic}` : '—');
    const bs = statusLabel(v.systolic, 90, p.targets.bpSystolicMax);
    document.getElementById('ms-bp').className = `metric-status ${bs.cls}`;
    setEl('ms-bp', bs.text);
    setEl('mt-bp', trendArrow(p.history, 'systolic'));
    colorCard('mc-bp', bs.cls);

    // HR
    setEl('mv-hr', v.hr ?? '—');
    const hs = statusLabel(v.hr, p.targets.hrMin, p.targets.hrMax);
    document.getElementById('ms-hr').className = `metric-status ${hs.cls}`;
    setEl('ms-hr', hs.text);
    setEl('mt-hr', trendArrow(p.history, 'hr'));
    colorCard('mc-hr', hs.cls);
    const heartIcon = document.getElementById('heart-icon');
    if (heartIcon) { heartIcon.className = `heart-pulse ${hs.cls === 'status-critical' ? 'beating' : ''}`; }

    // SpO2
    setEl('mv-spo2', v.spo2 ?? '—');
    const ss = statusLabel(v.spo2, p.targets.spo2Min, 100);
    document.getElementById('ms-spo2').className = `metric-status ${ss.cls}`;
    setEl('ms-spo2', ss.text);
    setEl('mt-spo2', '');
    colorCard('mc-spo2', ss.cls);

    // Weight
    setEl('mv-weight', v.weight ?? '—');
    const ws = statusLabel(v.weight, p.targets.weightMin, p.targets.weightMax);
    document.getElementById('ms-weight').className = `metric-status ${ws.cls}`;
    setEl('ms-weight', ws.text);
    setEl('mt-weight', trendArrow(p.history, 'weight'));
    colorCard('mc-weight', ws.cls);
  }

  renderMedications(p);
  renderRecentLogs(p);
  renderVitalsChart('glucose');
  renderMedAdherenceChart(p);
}

function colorCard(cardId, statusCls) {
  const el = document.getElementById(cardId);
  if (!el) return;
  el.classList.remove('mc-emerald','mc-amber','mc-coral');
  if (statusCls === 'status-normal')   el.classList.add('mc-emerald');
  if (statusCls === 'status-elevated') el.classList.add('mc-amber');
  if (statusCls === 'status-critical') el.classList.add('mc-coral');
  if (statusCls === 'status-low')      el.classList.add('mc-coral');
}

function renderMedications(patient) {
  const today = new Date().toISOString().slice(0,10);
  const container = document.getElementById('med-list');
  if (!container) return;
  container.innerHTML = patient.medications.map((med, i) => {
    const key = `${patient.id}_${i}_${today}`;
    const taken = STATE.medTaken[key] || false;
    return `<div class="med-item">
      <div class="med-info">
        <div class="med-name">${med.name}</div>
        <div class="med-dose">${med.dose} · ${med.time}</div>
      </div>
      <button class="med-check ${taken ? 'taken' : ''}" onclick="toggleMed(${patient.id},${i})">${taken ? '✓' : ''}</button>
    </div>`;
  }).join('');
}

function renderRecentLogs(patient) {
  const container = document.getElementById('recent-logs');
  if (!container) return;
  const logs = [...patient.history].reverse().slice(0, 15);
  if (!logs.length) { container.innerHTML = '<p class="muted" style="text-align:center;padding:1rem">No logs yet.</p>'; return; }
  container.innerHTML = logs.map(log => {
    let val = '';
    if (log.type === 'vitals') val = `Glucose: ${log.glucose} mg/dL · BP: ${log.systolic}/${log.diastolic} · HR: ${log.hr} bpm · SpO₂: ${log.spo2}%`;
    else if (log.type === 'meal') val = log.description || 'Meal logged';
    else if (log.type === 'symptom') val = log.description || 'Symptom logged';
    else if (log.type === 'medication') val = `Medication: ${log.name}`;
    return `<div class="log-entry">
      <div class="log-entry-left">
        <div class="log-entry-type">${log.type}</div>
        <div class="log-entry-value">${val}</div>
      </div>
      <div class="log-entry-time">${fmtDate(log.ts)}</div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────────
   7. CHART.JS WRAPPERS
──────────────────────────────────────────────── */
const CHART_COLORS = {
  glucose:  '#f59e0b',
  systolic: '#ef4444',
  hr:       '#ec4899',
  weight:   '#8b5cf6',
  bp:       '#ef4444',
};

function getChartLabels(patient) {
  return patient.history.filter(h => h.type === 'vitals').slice(-14).map(h =>
    new Date(h.ts).toLocaleDateString('en-US', { month:'short', day:'numeric' })
  );
}

function getChartValues(patient, field) {
  return patient.history.filter(h => h.type === 'vitals').slice(-14).map(h => h[field]);
}

function makeChartConfig(labels, datasets, opts = {}) {
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#94a3b8', font:{ family:'Outfit', size:11 } } } },
      scales: {
        x: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.05)' } },
        y: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.05)' },
             min: opts.yMin, max: opts.yMax },
      },
      elements: { line:{ tension:0.4, borderWidth:2 }, point:{ radius:3, hoverRadius:5 } },
      ...opts,
    }
  };
}

function renderVitalsChart(type) {
  const p = STATE.patients[STATE.activePatientIdx];
  const ctx = document.getElementById('vitals-chart');
  if (!ctx) return;
  const labels = getChartLabels(p);

  let datasets = [];
  if (type === 'glucose') {
    datasets = [{
      label: 'Blood Glucose (mg/dL)',
      data: getChartValues(p, 'glucose'),
      borderColor: CHART_COLORS.glucose, backgroundColor: 'rgba(245,158,11,0.08)',
      fill: true,
    }, {
      label: `Target Max (${p.targets.glucoseMax})`,
      data: labels.map(() => p.targets.glucoseMax),
      borderColor: 'rgba(239,68,68,0.5)', borderDash:[5,5], pointRadius:0, fill:false,
    }];
  } else if (type === 'bp') {
    datasets = [
      { label:'Systolic (mmHg)', data: getChartValues(p,'systolic'), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)', fill:true },
      { label:'Diastolic (mmHg)',data: getChartValues(p,'diastolic'),borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.05)', fill:false },
      { label:`Target Sys (${p.targets.bpSystolicMax})`, data:labels.map(()=>p.targets.bpSystolicMax), borderColor:'rgba(239,68,68,0.3)', borderDash:[5,5], pointRadius:0, fill:false },
    ];
  } else if (type === 'hr') {
    datasets = [{ label:'Heart Rate (bpm)', data:getChartValues(p,'hr'), borderColor:CHART_COLORS.hr, backgroundColor:'rgba(236,72,153,0.08)', fill:true }];
  } else if (type === 'weight') {
    datasets = [{ label:'Weight (kg)', data:getChartValues(p,'weight'), borderColor:CHART_COLORS.weight, backgroundColor:'rgba(139,92,246,0.08)', fill:true }];
  }

  if (STATE.charts.vitals) { STATE.charts.vitals.destroy(); }
  STATE.charts.vitals = new Chart(ctx, makeChartConfig(labels, datasets));
}

function renderMedAdherenceChart(patient) {
  const ctx = document.getElementById('med-chart');
  if (!ctx) return;
  const today = new Date().toISOString().slice(0,10);
  const total = patient.medications.length;
  let taken = 0;
  patient.medications.forEach((_, i) => {
    if (STATE.medTaken[`${patient.id}_${i}_${today}`]) taken++;
  });
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  setEl('adherence-pct', `${pct}%`);

  if (STATE.charts.med) { STATE.charts.med.destroy(); }
  STATE.charts.med = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Taken', 'Remaining'],
      datasets: [{ data:[taken, total-taken], backgroundColor:['#10b981','rgba(255,255,255,0.07)'], borderWidth:0 }],
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'72%',
      plugins: { legend:{ labels:{ color:'#94a3b8', font:{family:'Outfit',size:11} } } },
    }
  });
}

function switchChart(type, btn) {
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVitalsChart(type);
}

/* ──────────────────────────────────────────────
   8. PROVIDER PORTAL
──────────────────────────────────────────────── */
function renderProviderPortal() {
  renderTriageList();
  renderTargetsForm();
  renderAlarmDashboard();
  selectProviderPatient(STATE.providerPatientIdx);
}

function renderTriageList() {
  const container = document.getElementById('triage-cards');
  if (!container) return;
  container.innerHTML = STATE.patients.map((p, i) => {
    const analysis = analyzeVitals(p);
    const colorMap = { stable:'status-normal', warning:'status-elevated', critical:'status-critical' };
    return `<div class="triage-card ${i === STATE.providerPatientIdx ? 'selected' : ''}" onclick="selectProviderPatient(${i})">
      <div class="tc-name">${p.name}</div>
      <div class="tc-condition">${p.condition}</div>
      <div class="tc-risk ${colorMap[analysis.level]}">${analysis.level.toUpperCase()} · Score ${analysis.risk}</div>
      <div class="muted" style="font-size:0.75rem;margin-top:4px">${p.medications.length} medications</div>
    </div>`;
  }).join('');
}

function selectProviderPatient(idx) {
  STATE.providerPatientIdx = idx;
  const p = STATE.patients[idx];
  if (!p) return;

  // Highlight selected triage card
  document.querySelectorAll('.triage-card').forEach((c,i) => c.classList.toggle('selected', i===idx));

  setEl('prov-pt-name', `${p.name} — ${p.condition}`);
  renderProviderChart(p);
  renderProviderLogTable(p);
  renderTargetsForm();
}

function renderProviderChart(patient) {
  const ctx = document.getElementById('prov-chart');
  if (!ctx) return;
  const labels = getChartLabels(patient);
  const datasets = [
    { label:'Systolic',  data:getChartValues(patient,'systolic'),  borderColor:'#ef4444', fill:false },
    { label:'Glucose',   data:getChartValues(patient,'glucose'),   borderColor:'#f59e0b', fill:false },
    { label:'Heart Rate',data:getChartValues(patient,'hr'),        borderColor:'#ec4899', fill:false },
  ];
  if (STATE.charts.prov) STATE.charts.prov.destroy();
  STATE.charts.prov = new Chart(ctx, makeChartConfig(labels, datasets));
}

function renderProviderLogTable(patient) {
  const container = document.getElementById('prov-log-table');
  if (!container) return;
  const logs = [...patient.history].filter(l=>l.type==='vitals').reverse().slice(0,10);
  if (!logs.length) { container.innerHTML='<p class="muted">No vitals logged.</p>'; return; }
  container.innerHTML = `<div class="prov-log-table"><table>
    <thead><tr><th>Date</th><th>Glucose</th><th>BP</th><th>HR</th><th>SpO₂</th><th>Wt(kg)</th></tr></thead>
    <tbody>${logs.map(l=>`<tr>
      <td>${fmtDate(l.ts)}</td>
      <td>${l.glucose ?? '—'}</td>
      <td>${l.systolic}/${l.diastolic}</td>
      <td>${l.hr}</td>
      <td>${l.spo2}%</td>
      <td>${l.weight}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderTargetsForm() {
  const container = document.getElementById('targets-form');
  if (!container) return;
  const p = STATE.patients[STATE.providerPatientIdx];
  const t = p.targets;
  container.innerHTML = `
    <div class="target-row"><label>Glucose Min (mg/dL)</label><input id="tg-gmin" type="number" value="${t.glucoseMin}"/></div>
    <div class="target-row"><label>Glucose Max (mg/dL)</label><input id="tg-gmax" type="number" value="${t.glucoseMax}"/></div>
    <div class="target-row"><label>BP Systolic Max</label><input id="tg-bpsys" type="number" value="${t.bpSystolicMax}"/></div>
    <div class="target-row"><label>BP Diastolic Max</label><input id="tg-bpdia" type="number" value="${t.bpDiastolicMax}"/></div>
    <div class="target-row"><label>HR Min (bpm)</label><input id="tg-hrmin" type="number" value="${t.hrMin}"/></div>
    <div class="target-row"><label>HR Max (bpm)</label><input id="tg-hrmax" type="number" value="${t.hrMax}"/></div>
    <div class="target-row"><label>SpO₂ Min (%)</label><input id="tg-spo2" type="number" value="${t.spo2Min}"/></div>
    <div class="target-row"><label>Weight Min (kg)</label><input id="tg-wmin" type="number" value="${t.weightMin}"/></div>
    <div class="target-row"><label>Weight Max (kg)</label><input id="tg-wmax" type="number" value="${t.weightMax}"/></div>
  `;
}

function saveTargets() {
  const p = STATE.patients[STATE.providerPatientIdx];
  const get = (id) => { const el=document.getElementById(id); return el ? parseFloat(el.value)||0 : 0; };
  p.targets = {
    glucoseMin:     get('tg-gmin'),
    glucoseMax:     get('tg-gmax'),
    bpSystolicMax:  get('tg-bpsys'),
    bpDiastolicMax: get('tg-bpdia'),
    hrMin:          get('tg-hrmin'),
    hrMax:          get('tg-hrmax'),
    spo2Min:        get('tg-spo2'),
    weightMin:      get('tg-wmin'),
    weightMax:      get('tg-wmax'),
  };
  savePatients();
  renderPatientDashboard();
  renderAlarmDashboard();
  showToast('✅ Clinical targets updated and saved.', 'emerald');
}

function generateClinicalSummary() {
  const p = STATE.patients[STATE.providerPatientIdx];
  const output = document.getElementById('clinical-summary-output');
  if (!output) return;
  output.textContent = 'Generating IBM Granite clinical summary…';
  setTimeout(() => {
    output.textContent = graniteGenerateClinicalSummary(p);
  }, 900);
}

function renderAlarmDashboard() {
  const container = document.getElementById('alarm-dashboard');
  if (!container) return;
  const active = STATE.alerts.slice(0, 20);
  if (!active.length) { container.innerHTML = '<div class="no-alarms">✅ No active alarms across all patients.</div>'; return; }
  container.innerHTML = active.map(a =>
    `<div class="alarm-item ${a.type==='warning'?'warning':''}">
      <span>${a.patientName}</span>
      <span>${a.msg}</span>
      <span style="margin-left:auto;font-size:0.72rem;color:var(--muted)">${fmtDate(a.ts)}</span>
    </div>`
  ).join('');
}

/* ──────────────────────────────────────────────
   9. LOG MODAL
──────────────────────────────────────────────── */
function openLogModal(type) {
  STATE.logDraft = { type };
  const overlay = document.getElementById('log-modal-overlay');
  const title   = document.getElementById('log-modal-title');
  const body    = document.getElementById('log-modal-body');
  if (!overlay || !body) return;

  if (type === 'vitals') {
    title.textContent = '📊 Log Vitals';
    body.innerHTML = `
      <div class="form-row">
        <div class="input-group"><label>Blood Glucose (mg/dL)</label><input type="number" id="log-glucose" placeholder="e.g. 142"/></div>
        <div class="input-group"><label>Systolic BP (mmHg)</label><input type="number" id="log-sys" placeholder="e.g. 128"/></div>
      </div>
      <div class="form-row">
        <div class="input-group"><label>Diastolic BP (mmHg)</label><input type="number" id="log-dia" placeholder="e.g. 82"/></div>
        <div class="input-group"><label>Heart Rate (bpm)</label><input type="number" id="log-hr" placeholder="e.g. 74"/></div>
      </div>
      <div class="form-row">
        <div class="input-group"><label>SpO₂ (%)</label><input type="number" step="0.1" id="log-spo2" placeholder="e.g. 97.5"/></div>
        <div class="input-group"><label>Weight (kg)</label><input type="number" step="0.1" id="log-weight" placeholder="e.g. 71.2"/></div>
      </div>
      <div class="input-group"><label>Notes (optional)</label><textarea id="log-notes" placeholder="Any observations…"></textarea></div>
    `;
  } else if (type === 'meal') {
    title.textContent = '🍽️ Log Meal / Symptom';
    body.innerHTML = `
      <div class="input-group"><label>Type</label>
        <select id="log-mtype">
          <option value="meal">Meal</option>
          <option value="symptom">Symptom</option>
          <option value="activity">Physical Activity</option>
        </select>
      </div>
      <div class="input-group"><label>Description</label><textarea id="log-mdesc" placeholder="e.g. 'Large dinner with rice and vegetables' or 'Mild dizziness for 20 min'"></textarea></div>
      <div class="form-row">
        <div class="input-group"><label>Severity (1–10, optional)</label><input type="number" id="log-severity" min="1" max="10" placeholder="5"/></div>
        <div class="input-group"><label>Blood Glucose After (mg/dL)</label><input type="number" id="log-post-glucose" placeholder="optional"/></div>
      </div>
    `;
  } else if (type === 'medication') {
    const p = STATE.patients[STATE.activePatientIdx];
    title.textContent = '💊 Record Medication';
    body.innerHTML = `
      <div class="input-group"><label>Medication</label>
        <select id="log-med-select">
          ${p.medications.map((m,i) => `<option value="${i}">${m.name}</option>`).join('')}
          <option value="other">Other (specify below)</option>
        </select>
      </div>
      <div class="input-group"><label>Name (if other)</label><input type="text" id="log-med-name" placeholder="Medication name…"/></div>
      <div class="input-group"><label>Notes</label><textarea id="log-med-notes" placeholder="Any side effects or notes…"></textarea></div>
    `;
  }

  overlay.classList.add('open');
}

function closeLogModal(e) { if (e.target.id === 'log-modal-overlay') closeLogModalDirect(); }
function closeLogModalDirect() { document.getElementById('log-modal-overlay').classList.remove('open'); }

function submitLog() {
  const type = STATE.logDraft.type;
  const p = STATE.patients[STATE.activePatientIdx];
  const now = Date.now();

  if (type === 'vitals') {
    const glucose  = parseFloat(document.getElementById('log-glucose')?.value);
    const systolic = parseFloat(document.getElementById('log-sys')?.value);
    const diastolic= parseFloat(document.getElementById('log-dia')?.value);
    const hr       = parseFloat(document.getElementById('log-hr')?.value);
    const spo2     = parseFloat(document.getElementById('log-spo2')?.value);
    const weight   = parseFloat(document.getElementById('log-weight')?.value);
    if (!glucose && !systolic) { showToast('Please enter at least one vital.', 'amber'); return; }
    const latest = getLatestVitals(p) || {};
    p.history.push({
      ts: now, type: 'vitals',
      glucose:   glucose   || latest.glucose   || 100,
      systolic:  systolic  || latest.systolic  || 120,
      diastolic: diastolic || latest.diastolic || 80,
      hr:        hr        || latest.hr        || 72,
      spo2:      spo2      || latest.spo2      || 97,
      weight:    weight    || latest.weight    || 70,
    });
  } else if (type === 'meal') {
    const mtype = document.getElementById('log-mtype')?.value;
    const desc  = document.getElementById('log-mdesc')?.value;
    const sev   = document.getElementById('log-severity')?.value;
    const pg    = document.getElementById('log-post-glucose')?.value;
    p.history.push({ ts:now, type: mtype||'meal', description: desc, severity: sev||null, postGlucose: pg||null });
  } else if (type === 'medication') {
    const idx  = document.getElementById('log-med-select')?.value;
    const name = idx === 'other'
      ? (document.getElementById('log-med-name')?.value || 'Medication')
      : p.medications[parseInt(idx)]?.name;
    const today = new Date().toISOString().slice(0,10);
    if (idx !== 'other') STATE.medTaken[`${p.id}_${idx}_${today}`] = true;
    p.history.push({ ts:now, type:'medication', name });
    saveMedTaken();
  }

  savePatients();
  closeLogModalDirect();
  renderPatientDashboard();
  if (STATE.activePortal === 'provider') renderProviderPortal();
  showToast('✅ Log entry saved successfully.', 'emerald');
}

/* ──────────────────────────────────────────────
   10. MEDICATION TOGGLE
──────────────────────────────────────────────── */
function toggleMed(patientId, medIdx) {
  const today = new Date().toISOString().slice(0,10);
  const key = `${patientId}_${medIdx}_${today}`;
  STATE.medTaken[key] = !STATE.medTaken[key];
  saveMedTaken();
  renderMedications(STATE.patients[STATE.activePatientIdx]);
  renderMedAdherenceChart(STATE.patients[STATE.activePatientIdx]);
}

/* ──────────────────────────────────────────────
   11. NOTIFICATIONS
──────────────────────────────────────────────── */
function renderNotifications() {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  if (!list) return;

  const count = STATE.alerts.length;
  if (badge) {
    badge.textContent = count > 0 ? String(Math.min(count, 99)) : '0';
    badge.style.display = count > 0 ? '' : 'none';
  }

  if (!STATE.alerts.length) {
    list.innerHTML = '<li class="no-notifs">No active alerts</li>';
    return;
  }
  list.innerHTML = STATE.alerts.slice(0,20).map(a =>
    `<li class="notif-${a.type}"><strong>${a.patientName}</strong> — ${a.msg}<br/><small style="color:var(--muted)">${fmtDate(a.ts)}</small></li>`
  ).join('');
}

function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('open');
}

function clearAlerts() {
  STATE.alerts = [];
  saveAlerts();
  renderNotifications();
  renderAlarmDashboard();
}

/* ──────────────────────────────────────────────
   12. SETTINGS
──────────────────────────────────────────────── */
function openSettings() {
  const s = STATE.settings;
  const overlay = document.getElementById('settings-overlay');
  document.getElementById('cfg-apikey').value = s.apiKey || '';
  document.getElementById('cfg-url').value    = s.watsonUrl || '';
  document.getElementById('cfg-model').value  = s.modelId || 'ibm-granite-13b-instruct-v2';
  document.getElementById('cfg-use-real').checked = s.useReal || false;
  overlay.classList.add('open');
  updateApiStatus();
}
function closeSettings(e) { if (e.target.id === 'settings-overlay') closeSettingsDirect(); }
function closeSettingsDirect() { document.getElementById('settings-overlay').classList.remove('open'); }

function saveSettings() {
  STATE.settings.apiKey    = document.getElementById('cfg-apikey').value.trim();
  STATE.settings.watsonUrl = document.getElementById('cfg-url').value.trim();
  STATE.settings.modelId   = document.getElementById('cfg-model').value.trim() || 'ibm-granite-13b-instruct-v2';
  STATE.settings.useReal   = document.getElementById('cfg-use-real').checked;
  saveSettings_state();
  updateApiStatus();
  showToast('⚙️ Settings saved.', 'blue');
}
function saveSettings_state() {
  persistSettings();
}

function updateApiStatus() {
  const el = document.getElementById('api-status');
  if (!el) return;
  if (STATE.settings.useReal && STATE.settings.apiKey) {
    el.textContent = `🔌 Real IBM Granite API enabled (${STATE.settings.modelId})`;
    el.className = 'api-status connected';
  } else {
    el.textContent = 'Simulator active — no real API configured.';
    el.className = 'api-status muted';
  }
}

async function testConnection() {
  const el = document.getElementById('api-status');
  if (!el) return;
  const apiKey = document.getElementById('cfg-apikey').value.trim();
  const url    = document.getElementById('cfg-url').value.trim();
  if (!apiKey || !url) { el.textContent = '⚠️ Please provide API Key and URL before testing.'; el.className='api-status error'; return; }
  el.textContent = 'Testing connection…'; el.className='api-status muted';
  try {
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:`grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`
    });
    if (tokenRes.ok) {
      el.textContent = '✅ IBM Cloud IAM token obtained. API credentials valid.';
      el.className='api-status connected';
    } else {
      el.textContent = `❌ Authentication failed (${tokenRes.status}). Check your API key.`;
      el.className='api-status error';
    }
  } catch(e) {
    el.textContent = `❌ Connection error: ${e.message}`;
    el.className='api-status error';
  }
}

/* ──────────────────────────────────────────────
   13. AI CHAT — IBM Granite Simulator
──────────────────────────────────────────────── */
function toggleChat() {
  document.getElementById('chat-window').classList.toggle('open');
}

function chatKeydown(e) { if (e.key === 'Enter') sendChat(); }

function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msgs  = document.getElementById('chat-messages');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  appendChatMsg(text, 'user', msgs);

  // Typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'msg ai typing typing-dots';
  typingEl.id = 'chat-typing';
  msgs.appendChild(typingEl);
  msgs.scrollTop = msgs.scrollHeight;

  const delay = 600 + Math.random() * 800;
  setTimeout(() => {
    typingEl.remove();
    const p = STATE.patients[STATE.activePatientIdx];
    const response = graniteChat(text, p);
    appendChatMsg(response, 'ai', msgs);
  }, delay);
}

function appendChatMsg(text, role, container) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

/* ──────────────────────────────────────────────
   14. IBM GRANITE SIMULATOR (Clinical LLM)
──────────────────────────────────────────────── */
function graniteChat(query, patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const q = query.toLowerCase();

  // --- Glucose analysis ---
  if (q.includes('glucose') || q.includes('sugar') || q.includes('blood sugar')) {
    const avg = avgField(patient.history, 'glucose');
    const trend = trendArrow(patient.history, 'glucose');
    const status = v?.glucose > patient.targets.glucoseMax ? 'above target range' : 'within acceptable range';
    return `📊 Glucose Analysis for ${patient.name}:\n\nLatest reading: ${v?.glucose ?? '—'} mg/dL (Target: ${patient.targets.glucoseMin}–${patient.targets.glucoseMax} mg/dL)\n14-day average: ${avg} mg/dL\nTrend: ${trend} ${status}\n\n${glucoseAdvice(v?.glucose, patient)}`;
  }

  // --- Blood pressure ---
  if (q.includes('blood pressure') || q.includes('bp') || q.includes('hypertension') || q.includes('systolic')) {
    const avg = avgField(patient.history, 'systolic');
    return `🩺 Blood Pressure Analysis for ${patient.name}:\n\nLatest: ${v?.systolic}/${v?.diastolic} mmHg\nTarget: <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax} mmHg\n14-day avg systolic: ${avg} mmHg\n\n${bpAdvice(v?.systolic, v?.diastolic, patient)}`;
  }

  // --- Cardiac / risk ---
  if (q.includes('cardiac') || q.includes('heart') || q.includes('risk') || q.includes('danger')) {
    return `❤️ Cardiac Risk Assessment — ${patient.name}:\n\nRisk Score: ${analysis.risk}/100 (${analysis.level.toUpperCase()})\nHeart Rate: ${v?.hr} bpm · SpO₂: ${v?.spo2}%\n\n${analysis.flags.length ? 'Active flags:\n' + analysis.flags.map(f=>'• '+f.msg).join('\n') : '✅ No critical cardiac flags at this time.'}\n\n${heartAdvice(patient, analysis)}`;
  }

  // --- Diet ---
  if (q.includes('diet') || q.includes('food') || q.includes('eat') || q.includes('nutrition') || q.includes('meal')) {
    return dietAdvice(patient);
  }

  // --- Medication ---
  if (q.includes('medication') || q.includes('medicine') || q.includes('drug') || q.includes('pill') || q.includes('dose')) {
    const meds = patient.medications.map(m => `• ${m.name} — ${m.dose}`).join('\n');
    return `💊 Medication Review — ${patient.name}:\n\n${meds}\n\n⚠️ Always consult your prescribing physician before adjusting medications. Never stop or change doses without medical supervision.\n\nAdhering to your full medication schedule is critical for your ${patient.diagnosis.replace(/_/g,' ')} management.`;
  }

  // --- SpO2 ---
  if (q.includes('spo2') || q.includes('oxygen') || q.includes('saturation') || q.includes('breathing')) {
    const st = v?.spo2 < 94 ? '🔴 Your SpO₂ is critically low. Seek immediate medical attention.' : v?.spo2 < 96 ? '🟡 Your SpO₂ is mildly low. Rest and avoid strenuous activity.' : '✅ Your SpO₂ is within the normal range.';
    return `🫁 SpO₂ Reading: ${v?.spo2}% (Target ≥${patient.targets.spo2Min}%)\n\n${st}\n\nIf you experience shortness of breath, chest pain, or persistent low readings below 92%, call emergency services immediately.`;
  }

  // --- Weight ---
  if (q.includes('weight') || q.includes('bmi') || q.includes('overweight')) {
    return `⚖️ Weight Tracking — ${patient.name}:\nCurrent: ${v?.weight} kg · Target range: ${patient.targets.weightMin}–${patient.targets.weightMax} kg\n\nEven a 5–10% reduction in body weight can significantly improve blood pressure, insulin sensitivity, and cardiovascular outcomes. Focus on gradual, sustainable changes in diet and 150 min/week of moderate activity.`;
  }

  // --- Summary ---
  if (q.includes('summary') || q.includes('overall') || q.includes('report') || q.includes('analyze') || q.includes('analyse') || q.includes('how am i')) {
    return graniteGeneratePatientSummary(patient);
  }

  // --- Emergency ---
  if (q.includes('emergency') || q.includes('chest pain') || q.includes('stroke') || q.includes('unconscious') || q.includes('faint')) {
    return '🚨 EMERGENCY GUIDANCE:\n\nIf you are experiencing chest pain, sudden numbness, severe shortness of breath, or loss of consciousness — call emergency services (911) IMMEDIATELY.\n\nDo NOT drive yourself. Stay calm, sit or lie down, and wait for emergency responders. Take any prescribed emergency medications (e.g., nitroglycerin) as directed.';
  }

  // --- Generic fallback ---
  return `🤖 IBM Granite Clinical AI — Analysis for ${patient.name}:\n\nBased on your recent data:\n• Glucose: ${v?.glucose ?? '—'} mg/dL\n• BP: ${v?.systolic}/${v?.diastolic} mmHg\n• HR: ${v?.hr} bpm · SpO₂: ${v?.spo2}%\n• Risk level: ${analysis.level.toUpperCase()} (Score: ${analysis.risk})\n\n${analysis.flags.length ? 'Current concerns:\n' + analysis.flags.map(f=>'• '+f.msg).join('\n') : '✅ No critical flags detected.'}\n\nFor specific questions, try asking about glucose, blood pressure, cardiac risk, diet, or your medications.`;
}

function graniteGeneratePatientSummary(patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const glucoseAvg = avgField(patient.history, 'glucose');
  const bpAvg = avgField(patient.history, 'systolic');
  return `🤖 IBM Granite Clinical AI — Patient Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: ${patient.name}
Condition: ${patient.condition}
Risk Level: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)

📊 Recent Vitals (Latest):
• Blood Glucose: ${v?.glucose ?? '—'} mg/dL (14-day avg: ${glucoseAvg})
• Blood Pressure: ${v?.systolic}/${v?.diastolic} mmHg (avg systolic: ${bpAvg})
• Heart Rate: ${v?.hr} bpm · SpO₂: ${v?.spo2}%
• Weight: ${v?.weight} kg

${analysis.flags.length ? '⚠️ Active Flags:\n' + analysis.flags.map(f=>'  • '+f.msg).join('\n') : '✅ No critical flags detected.'}

💡 Recommendations:
${graniteRecommendations(patient, analysis)}`;
}

function graniteGenerateClinicalSummary(patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const glucoseAvg = avgField(patient.history, 'glucose');
  const bpAvg = avgField(patient.history, 'systolic');
  const diaAvg = avgField(patient.history, 'diastolic');
  const hrAvg  = avgField(patient.history, 'hr');

  return `IBM Granite Clinical AI — Structured Clinical Report
Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT: ${patient.name}
CONDITION: ${patient.condition}
AI RISK LEVEL: ${analysis.level.toUpperCase()} · Score ${analysis.risk}/100

VITAL SIGNS SUMMARY (14-day longitudinal):
  Blood Glucose  — Latest: ${v?.glucose} mg/dL | Avg: ${glucoseAvg} mg/dL | Target: ${patient.targets.glucoseMin}–${patient.targets.glucoseMax}
  Blood Pressure — Latest: ${v?.systolic}/${v?.diastolic} mmHg | Avg: ${bpAvg}/${diaAvg} mmHg | Target: <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax}
  Heart Rate     — Latest: ${v?.hr} bpm | Avg: ${hrAvg} bpm | Target: ${patient.targets.hrMin}–${patient.targets.hrMax}
  SpO₂           — Latest: ${v?.spo2}%  | Target: ≥${patient.targets.spo2Min}%
  Weight         — Latest: ${v?.weight} kg | Target: ${patient.targets.weightMin}–${patient.targets.weightMax} kg

ACTIVE CLINICAL FLAGS:
${analysis.flags.length ? analysis.flags.map(f=>'  '+f.msg).join('\n') : '  None identified.'}

MEDICATION ADHERENCE:
${patient.medications.map(m=>'  • '+m.name+' ('+m.dose+')').join('\n')}

CLINICAL RECOMMENDATIONS:
${graniteRecommendations(patient, analysis)}

LONGITUDINAL ASSESSMENT:
  Glucose trend: ${trendArrow(patient.history,'glucose')} · BP trend: ${trendArrow(patient.history,'systolic')} · HR trend: ${trendArrow(patient.history,'hr')}

NEXT STEPS:
  Review clinical targets and adjust therapy if flags persist > 3 days.
  Schedule follow-up appointment within ${analysis.level === 'critical' ? '48 hours' : analysis.level === 'warning' ? '1 week' : '4 weeks'}.
  ${analysis.level === 'critical' ? '🚨 URGENT: Consider immediate clinical intervention.' : ''}

Note: This report was generated by the IBM Granite Clinical AI Simulator. Not a substitute for clinical judgment.`;
}

function graniteRecommendations(patient, analysis) {
  const recs = [];
  const v = getLatestVitals(patient);
  if (!v) return '  Insufficient data for recommendations.';

  if (patient.diagnosis === 'type2_diabetes') {
    if (v.glucose > patient.targets.glucoseMax) recs.push('• Reduce refined carbohydrate intake (white rice, bread, sugary drinks)');
    if (v.glucose > 200) recs.push('• Consider contacting prescriber to review insulin/medication dosing');
    recs.push('• Aim for 30 min of moderate walking 5 days/week to improve insulin sensitivity');
    recs.push('• Monitor glucose before and 2 hours after each meal');
  }
  if (patient.diagnosis === 'hypertension' || v.systolic > patient.targets.bpSystolicMax) {
    recs.push('• Limit sodium intake to <1500 mg/day; avoid processed foods');
    recs.push('• Practice stress-reduction techniques: deep breathing, meditation, yoga');
    if (v.systolic > 160) recs.push('• ⚠️ BP significantly elevated — contact healthcare provider today');
  }
  if (patient.diagnosis === 'heart_disease') {
    recs.push('• Monitor daily weight; gain >2 kg in 48 h may indicate fluid retention');
    recs.push('• Limit fluid intake as directed; avoid alcohol and smoking');
    recs.push('• Report any new chest pain, shortness of breath, or ankle swelling immediately');
    if (v.hr > patient.targets.hrMax) recs.push('• Elevated heart rate noted — avoid strenuous activity until reviewed');
  }
  if (v.spo2 < patient.targets.spo2Min) recs.push('• SpO₂ below target — rest, avoid exertion, follow up with physician');
  recs.push('• Maintain medication adherence schedule as prescribed');
  recs.push('• Log vitals at consistent times each day for accurate trend analysis');
  return recs.join('\n');
}

function glucoseAdvice(glucose, patient) {
  if (!glucose) return 'No recent glucose reading available.';
  if (glucose > 250) return '🔴 Critically elevated glucose. Check for ketones, hydrate, and contact your diabetes care team immediately. Do NOT exercise with glucose above 250 mg/dL.';
  if (glucose > patient.targets.glucoseMax) return '🟡 Glucose above target. Reduce refined carbohydrates, increase activity, and monitor closely. If persistently elevated >3 days, contact your provider.';
  if (glucose < 70) return '🔴 Hypoglycemia detected! Consume 15g fast-acting carbohydrates (4 glucose tablets, ½ cup juice). Re-check in 15 minutes. If unconscious, call emergency services.';
  return '✅ Glucose within target range. Continue current management plan.';
}

function bpAdvice(sys, dia, patient) {
  if (!sys) return 'No recent BP reading available.';
  if (sys > 180 || dia > 110) return '🔴 HYPERTENSIVE CRISIS. Seek emergency care immediately (call 911). Do not drive yourself.';
  if (sys > 160) return '🔴 Stage 2 hypertension. Contact your healthcare provider today. Avoid salt, caffeine, and strenuous activity.';
  if (sys > patient.targets.bpSystolicMax) return '🟡 BP above target. Reduce sodium, increase potassium-rich foods (bananas, leafy greens), practice stress reduction. Take medications as prescribed.';
  return '✅ Blood pressure within target range. Excellent cardiovascular management.';
}

function heartAdvice(patient, analysis) {
  if (analysis.level === 'critical') return '🚨 Multiple critical flags detected. Contact your cardiologist or go to an emergency department.';
  if (analysis.level === 'warning')  return '⚠️ Some values outside target range. Review with your care team at next appointment, or sooner if symptoms develop.';
  return '✅ Cardiac parameters are within acceptable ranges. Continue current management and scheduled monitoring.';
}

function dietAdvice(patient) {
  const base = `🥗 Personalized Dietary Guidance — ${patient.name}:\n\n`;
  const tips = [];
  if (patient.diagnosis === 'type2_diabetes') {
    tips.push('Diabetes-Friendly Diet:',
      '• Carbohydrates: choose whole grains, legumes, non-starchy vegetables',
      '• Glycemic index: prefer low-GI foods (steel-cut oats, lentils, berries)',
      '• Portion control: use the "Plate Method" — ½ veg, ¼ protein, ¼ complex carb',
      '• Limit: sugary beverages, white bread, pastries, fried foods',
      '• Hydration: 6–8 glasses water/day; avoid sweetened drinks');
  } else if (patient.diagnosis === 'hypertension') {
    tips.push('DASH Diet for Hypertension:',
      '• Sodium: limit to <1500 mg/day (avoid processed/packaged foods)',
      '• Increase: potassium (bananas, sweet potato), magnesium, calcium',
      '• Prioritize: fruits, vegetables, low-fat dairy, whole grains',
      '• Limit: red meat, saturated fats, alcohol (max 1 drink/day)',
      '• Caffeine: limit to 1–2 cups coffee/day');
  } else {
    tips.push('Heart-Healthy Diet:',
      '• Mediterranean-style diet: olive oil, fish, nuts, legumes',
      '• Omega-3 fatty acids: salmon, mackerel, walnuts, flaxseed',
      '• Avoid: trans fats, high-sodium foods, excessive alcohol',
      '• Fluid management: monitor daily intake as directed by cardiologist',
      '• Small frequent meals to reduce cardiac workload');
  }
  return base + tips.join('\n');
}

function avgField(history, field) {
  const vals = history.filter(h => h.type==='vitals' && h[field] != null).map(h => h[field]);
  if (!vals.length) return '—';
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
}

/* ──────────────────────────────────────────────
   15. AI ANALYSIS MODAL (patient view)
──────────────────────────────────────────────── */
function requestAISummary() {
  const overlay = document.getElementById('ai-summary-overlay');
  const content = document.getElementById('ai-summary-content');
  content.textContent = 'Generating IBM Granite analysis…';
  overlay.classList.add('open');
  setTimeout(() => {
    content.textContent = graniteGeneratePatientSummary(STATE.patients[STATE.activePatientIdx]);
  }, 800);
}
function closeAiSummary(e) { if (e.target.id === 'ai-summary-overlay') closeAiSummaryDirect(); }
function closeAiSummaryDirect() { document.getElementById('ai-summary-overlay').classList.remove('open'); }

/* ──────────────────────────────────────────────
   16. PORTAL SWITCHING
──────────────────────────────────────────────── */
function switchPortal(name) {
  STATE.activePortal = name;
  document.querySelectorAll('.portal').forEach(p => p.classList.remove('active'));
  document.getElementById(`portal-${name}`).classList.add('active');
  document.querySelectorAll('.portal-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${name}`).classList.add('active');
  if (name === 'provider') {
    setTimeout(renderProviderPortal, 50);
  }
}

function switchPatient(idx) {
  STATE.activePatientIdx = parseInt(idx);
  renderPatientDashboard();
}

/* ──────────────────────────────────────────────
   17. TOAST NOTIFICATIONS
──────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, color = 'blue') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:7rem;left:50%;transform:translateX(-50%);
      padding:10px 20px;border-radius:8px;font-size:0.85rem;font-weight:500;
      z-index:900;transition:opacity 0.3s;opacity:0;pointer-events:none;
      font-family:Outfit,system-ui,sans-serif;
    `;
    document.body.appendChild(toast);
  }
  const colorMap = {
    emerald: { bg:'rgba(16,185,129,0.15)', border:'#10b981', color:'#10b981' },
    amber:   { bg:'rgba(245,158,11,0.15)', border:'#f59e0b', color:'#f59e0b' },
    coral:   { bg:'rgba(239,68,68,0.15)',  border:'#ef4444', color:'#ef4444' },
    blue:    { bg:'rgba(59,130,246,0.15)', border:'#3b82f6', color:'#3b82f6' },
  };
  const c = colorMap[color] || colorMap.blue;
  toast.textContent = msg;
  toast.style.background = c.bg;
  toast.style.border = `1px solid ${c.border}`;
  toast.style.color = c.color;
  toast.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.style.opacity='0'; }, 3000);
}

/* ──────────────────────────────────────────────
   18. INIT
──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderPatientDashboard();
  renderNotifications();
  // Re-evaluate all patients for alarms on startup
  STATE.patients.forEach(p => evaluateAndAlert(p));
  renderNotifications();
  renderAlarmDashboard();
});
