/* ═══════════════════════════════════════════════════════════════════
   VitalSense AI — Core Application
   app.js  ·  Vanilla ES6  ·  IBM Granite Clinical AI
   CSV Patient Loader · RAG Vector Store · IBM Cloud Integration
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   1. FALLBACK SEED PATIENTS
   Used when CSV loading is unavailable (file:// protocol)
────────────────────────────────────────────────── */
const SEED_PATIENTS = [
  {
    id: 0, name: 'Elena Martinez', initials: 'EM', age: 54, sex: 'F',
    condition: 'Type 2 Diabetes · Age 54 · F', diagnosis: 'type2_diabetes',
    primaryPhysician: 'Dr. Sandra Patel', insuranceId: 'BCB-8821-ELM', nextAppointment: '2025-08-15',
    emergencyContact: 'Maria Martinez (daughter) +1-555-0192',
    medications: [
      { name: 'Metformin 1000mg',  dose: 'Morning with food', time: 'AM' },
      { name: 'Glipizide 5mg',     dose: 'Before breakfast',  time: 'AM' },
      { name: 'Lisinopril 10mg',   dose: 'Evening',           time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:140, bpSystolicMax:130, bpDiastolicMax:80, hrMin:60, hrMax:100, spo2Min:95, weightMin:58, weightMax:72 },
    history: [],
  },
  {
    id: 1, name: 'Robert Chen', initials: 'RC', age: 61, sex: 'M',
    condition: 'Hypertension · Age 61 · M', diagnosis: 'hypertension',
    primaryPhysician: "Dr. James O'Brien", insuranceId: 'UHC-4412-RCH', nextAppointment: '2025-07-28',
    emergencyContact: 'David Chen (son) +1-555-0341',
    medications: [
      { name: 'Amlodipine 10mg',           dose: 'Morning', time: 'AM' },
      { name: 'Hydrochlorothiazide 25mg',   dose: 'Morning', time: 'AM' },
      { name: 'Atorvastatin 40mg',          dose: 'Evening', time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:110, bpSystolicMax:125, bpDiastolicMax:80, hrMin:55, hrMax:90, spo2Min:96, weightMin:72, weightMax:88 },
    history: [],
  },
  {
    id: 2, name: 'Ama Owusu', initials: 'AO', age: 67, sex: 'F',
    condition: 'Heart Disease · Age 67 · F', diagnosis: 'heart_disease',
    primaryPhysician: 'Dr. Priya Sharma', insuranceId: 'AET-7730-AOW', nextAppointment: '2025-08-02',
    emergencyContact: 'Kwame Owusu (son) +1-555-0477',
    medications: [
      { name: 'Aspirin 81mg',        dose: 'Morning with food', time: 'AM' },
      { name: 'Carvedilol 12.5mg',   dose: 'Twice daily',       time: 'AM' },
      { name: 'Furosemide 40mg',     dose: 'Morning',           time: 'AM' },
      { name: 'Spironolactone 25mg', dose: 'Evening',           time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:130, bpSystolicMax:120, bpDiastolicMax:75, hrMin:55, hrMax:85, spo2Min:96, weightMin:60, weightMax:74 },
    history: [],
  },
];

/* ──────────────────────────────────────────────
   2. CSV PARSER
   Parses patients.csv into patient objects
────────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });

    const medications = [];
    for (let n = 1; n <= 4; n++) {
      if (row[`med${n}_name`]) {
        medications.push({
          name: row[`med${n}_name`],
          dose: row[`med${n}_dose`] || '',
          time: row[`med${n}_time`] || 'AM',
        });
      }
    }

    return {
      id:               parseInt(row.id) || 0,
      name:             row.name,
      initials:         row.initials,
      age:              parseInt(row.age) || 0,
      sex:              row.sex,
      condition:        row.condition,
      diagnosis:        row.diagnosis,
      primaryPhysician: row.primary_physician || '',
      insuranceId:      row.insurance_id      || '',
      nextAppointment:  row.next_appointment  || '',
      emergencyContact: row.emergency_contact || '',
      medications,
      targets: {
        glucoseMin:      parseFloat(row.glucose_min)      || 70,
        glucoseMax:      parseFloat(row.glucose_max)      || 140,
        bpSystolicMax:   parseFloat(row.bp_systolic_max)  || 130,
        bpDiastolicMax:  parseFloat(row.bp_diastolic_max) || 80,
        hrMin:           parseFloat(row.hr_min)           || 60,
        hrMax:           parseFloat(row.hr_max)           || 100,
        spo2Min:         parseFloat(row.spo2_min)         || 95,
        weightMin:       parseFloat(row.weight_min)       || 55,
        weightMax:       parseFloat(row.weight_max)       || 90,
      },
      history: [],
    };
  });
}

async function loadCSVPatients() {
  if (!window.DATA_CONFIG || !DATA_CONFIG.features?.csvPatientLoader) return null;
  try {
    const res = await fetch(DATA_CONFIG.patientsCSV);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const patients = parseCSV(text);
    if (patients.length) {
      console.log(`[VitalSense] Loaded ${patients.length} patients from CSV.`);
      return patients;
    }
  } catch (e) {
    console.warn('[VitalSense] CSV load failed (serving via file:// ?). Using seed data.', e.message);
  }
  return null;
}

/* ──────────────────────────────────────────────
   3. HISTORY GENERATOR
────────────────────────────────────────────────── */
function rand(min, max) { return min + Math.random() * (max - min); }

function generateHistory(diagnosis, days) {
  const logs = [];
  const now = Date.now();
  for (let d = days - 1; d >= 0; d--) {
    const ts = now - d * 86400000 - Math.random() * 3600000;
    let glucose, systolic, diastolic, hr, spo2, weight;
    if (diagnosis === 'type2_diabetes') {
      glucose = Math.round(rand(95, 230)); systolic = Math.round(rand(118, 148));
      diastolic = Math.round(rand(72, 92)); hr = Math.round(rand(64, 88));
      spo2 = +(rand(96.5, 99)).toFixed(1); weight = +(rand(68, 72)).toFixed(1);
    } else if (diagnosis === 'hypertension') {
      glucose = Math.round(rand(82, 108)); systolic = Math.round(rand(138, 175));
      diastolic = Math.round(rand(86, 105)); hr = Math.round(rand(62, 82));
      spo2 = +(rand(96, 99)).toFixed(1); weight = +(rand(80, 85)).toFixed(1);
    } else if (diagnosis === 'heart_failure') {
      glucose = Math.round(rand(80, 115)); systolic = Math.round(rand(100, 125));
      diastolic = Math.round(rand(60, 80)); hr = Math.round(rand(55, 88));
      spo2 = +(rand(93, 97.5)).toFixed(1); weight = +(rand(60, 68)).toFixed(1);
    } else if (diagnosis === 'type2_diabetes_htn') {
      glucose = Math.round(rand(100, 200)); systolic = Math.round(rand(130, 165));
      diastolic = Math.round(rand(82, 100)); hr = Math.round(rand(65, 90));
      spo2 = +(rand(95, 99)).toFixed(1); weight = +(rand(90, 96)).toFixed(1);
    } else if (diagnosis === 'copd_htn') {
      glucose = Math.round(rand(85, 112)); systolic = Math.round(rand(135, 158));
      diastolic = Math.round(rand(84, 98)); hr = Math.round(rand(68, 95));
      spo2 = +(rand(90, 95)).toFixed(1); weight = +(rand(79, 83)).toFixed(1);
    } else {
      glucose = Math.round(rand(85, 120)); systolic = Math.round(rand(108, 135));
      diastolic = Math.round(rand(65, 85)); hr = Math.round(rand(58, 95));
      spo2 = +(rand(94, 98.5)).toFixed(1); weight = +(rand(67, 71)).toFixed(1);
    }
    logs.push({ ts, glucose, systolic, diastolic, hr, spo2, weight, type: 'vitals' });
  }
  return logs;
}

/* ──────────────────────────────────────────────
   4. CLIENT-SIDE VECTOR STORE (RAG Layer 1)
   Lightweight TF-IDF cosine similarity for
   matching queries to clinical knowledge chunks
────────────────────────────────────────────────── */
const CLINICAL_KNOWLEDGE = [
  { id: 'ada_glucose', title: 'ADA Glucose Targets', text: 'ADA Standards: Fasting glucose target 80-130 mg/dL. Post-meal <180 mg/dL. HbA1c <7% for most adults. Hypoglycemia defined as glucose <70 mg/dL. Critical hypoglycemia <54 mg/dL. Diabetic ketoacidosis risk above 250 mg/dL with ketones present.' },
  { id: 'jnc8_bp', title: 'JNC-8 Blood Pressure Guidelines', text: 'JNC-8: BP target <140/90 mmHg for general population. <130/80 mmHg for diabetes or CKD. Stage 1 hypertension: 130-139/80-89. Stage 2: ≥140/90. Hypertensive crisis: >180/120 mmHg — requires immediate treatment. DASH diet reduces BP by 8-14 mmHg.' },
  { id: 'aha_cardiac', title: 'AHA Cardiac Risk Guidelines', text: 'AHA: Heart rate 60-100 bpm normal. Tachycardia >100 bpm. Bradycardia <60 bpm. SpO2 ≥95% normal. <90% requires supplemental oxygen. Heart failure symptoms: dyspnea, edema, fatigue, weight gain >2kg in 48h. LVEF <40% indicates systolic dysfunction.' },
  { id: 'diabetes_diet', title: 'Diabetes Nutrition Therapy', text: 'ADA Nutrition: Carbohydrate counting critical for glucose control. Mediterranean or DASH diets recommended. Low glycemic index foods (oats, legumes, non-starchy vegetables). Limit refined carbohydrates, sugary drinks, saturated fats. 150 min/week moderate aerobic exercise improves insulin sensitivity by 30-35%.' },
  { id: 'htn_lifestyle', title: 'Hypertension Lifestyle Modifications', text: 'Lifestyle: Sodium restriction to 1500-2300 mg/day reduces systolic by 5-6 mmHg. Weight loss 1 mmHg per kg lost. Aerobic exercise 90-150 min/week. DASH diet emphasizes fruits, vegetables, low-fat dairy, whole grains. Limit alcohol to ≤1 drink/day women, ≤2 men. Stop smoking.' },
  { id: 'heart_failure_mgmt', title: 'Heart Failure Management', text: 'Heart failure: Daily weight monitoring essential — gain >2 kg in 48h indicates fluid retention and needs urgent review. Fluid restriction 1.5-2L/day. Sodium <2g/day. GDMT: ACE inhibitor/ARB/ARNI, beta-blocker, MRA, SGLT2i. Exercise cardiac rehabilitation improves functional capacity and mortality.' },
  { id: 'medication_adherence', title: 'Medication Adherence Principles', text: 'Adherence: Non-adherence accounts for 50% of treatment failures. Simplify regimen — once-daily dosing improves adherence by 26%. Pill organizers, phone reminders, pharmacy blister packs effective. Never abruptly stop beta-blockers or antihypertensives — can cause rebound hypertension or tachycardia.' },
  { id: 'spo2_respiratory', title: 'SpO2 and Respiratory Assessment', text: 'Pulse oximetry: SpO2 95-100% normal. 91-94% mild hypoxemia, consider supplemental O2. 86-90% moderate hypoxemia, O2 required. <85% severe, emergency. COPD patients may have chronically lower baseline 88-92%. Factors affecting accuracy: peripheral vasoconstriction, nail polish, motion artifact.' },
];

const VectorStore = (() => {
  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }
  function termFreq(tokens) {
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    return tf;
  }
  function cosineSim(a, b) {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, normA = 0, normB = 0;
    allKeys.forEach(k => {
      const va = a[k] || 0, vb = b[k] || 0;
      dot += va * vb; normA += va * va; normB += vb * vb;
    });
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  const index = CLINICAL_KNOWLEDGE.map(doc => ({
    ...doc,
    tf: termFreq(tokenize(doc.text + ' ' + doc.title)),
  }));

  return {
    search(query, topK = 3) {
      const qTF = termFreq(tokenize(query));
      return index
        .map(doc => ({ doc, score: cosineSim(qTF, doc.tf) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(r => r.score > 0.02)
        .map(r => `[${r.doc.title}] ${r.doc.text}`);
    },
  };
})();

/* ──────────────────────────────────────────────
   5. APPLICATION STATE
────────────────────────────────────────────────── */
const STATE = {
  patients:           [],
  activePatientIdx:   0,
  activePortal:       'patient',
  providerPatientIdx: 0,
  alerts:             [],
  logDraft:           {},
  charts:             {},
  settings: {
    apiKey: '', watsonUrl: '', modelId: 'ibm/granite-13b-instruct-v2',
    projectId: '', useReal: false,
    discoveryUrl: '', discoveryKey: '', discoveryProjectId: '', discoveryEnabled: false,
  },
  medTaken: {},
};

/* ──────────────────────────────────────────────
   6. PERSISTENCE
────────────────────────────────────────────────── */
function savePatients()    { try { localStorage.setItem('vs_patients', JSON.stringify(STATE.patients)); } catch(e) {} }
function persistSettings() { try { localStorage.setItem('vs_settings', JSON.stringify(STATE.settings)); } catch(e) {} }
function saveMedTaken()    { try { localStorage.setItem('vs_medtaken', JSON.stringify(STATE.medTaken)); } catch(e) {} }
function saveAlerts()      { try { localStorage.setItem('vs_alerts',   JSON.stringify(STATE.alerts));   } catch(e) {} }

async function loadState() {
  // Try loading from CSV first
  const csvPatients = await loadCSVPatients();
  const shouldOverride = window.DATA_CONFIG?.csvOverridesCache === true;

  try {
    const raw = localStorage.getItem('vs_patients');
    if (raw && !shouldOverride) {
      STATE.patients = JSON.parse(raw);
      // Merge in any new CSV patients not yet in cache
      if (csvPatients) {
        csvPatients.forEach(cp => {
          const existing = STATE.patients.find(p => p.id === cp.id);
          if (!existing) {
            cp.history = generateHistory(cp.diagnosis, 14);
            STATE.patients.push(cp);
          }
        });
      }
    } else {
      const base = csvPatients || JSON.parse(JSON.stringify(SEED_PATIENTS));
      STATE.patients = base.map(p => {
        if (!p.history || !p.history.length) {
          p.history = generateHistory(p.diagnosis, 14);
        }
        return p;
      });
      savePatients();
    }
  } catch (e) {
    const base = csvPatients || JSON.parse(JSON.stringify(SEED_PATIENTS));
    STATE.patients = base.map(p => {
      p.history = generateHistory(p.diagnosis, 14);
      return p;
    });
  }

  try {
    const sets = localStorage.getItem('vs_settings');
    if (sets) STATE.settings = { ...STATE.settings, ...JSON.parse(sets) };
    // Merge config.js values if they exist and settings are blank
    if (window.IBM_CONFIG) {
      if (!STATE.settings.apiKey && IBM_CONFIG.iam.apiKey)
        STATE.settings.apiKey = IBM_CONFIG.iam.apiKey;
      if (!STATE.settings.watsonUrl)
        STATE.settings.watsonUrl = IBM_CONFIG.watsonML.serviceUrl;
      if (!STATE.settings.modelId)
        STATE.settings.modelId = IBM_CONFIG.watsonML.modelId;
      if (!STATE.settings.projectId && IBM_CONFIG.watsonML.projectId)
        STATE.settings.projectId = IBM_CONFIG.watsonML.projectId;
    }
  } catch(e) {}

  try {
    const med = localStorage.getItem('vs_medtaken');
    if (med) STATE.medTaken = JSON.parse(med);
  } catch(e) {}

  try {
    const alerts = localStorage.getItem('vs_alerts');
    if (alerts) STATE.alerts = JSON.parse(alerts);
  } catch(e) {}

  rebuildPatientSelector();
}

function rebuildPatientSelector() {
  const sel = document.getElementById('patient-selector');
  if (!sel) return;
  sel.innerHTML = STATE.patients.map((p, i) =>
    `<option value="${i}">${p.name} — ${p.condition.split(' ·')[0]}</option>`
  ).join('');
}

/* ──────────────────────────────────────────────
   7. ANALYTICS ENGINE
────────────────────────────────────────────────── */
function getLatestVitals(patient) {
  const logs = patient.history.filter(l => l.type === 'vitals');
  return logs.length ? logs[logs.length - 1] : null;
}

function analyzeVitals(patient) {
  const v = getLatestVitals(patient);
  if (!v) return { risk: 0, level: 'stable', flags: [] };
  const t = patient.targets;
  let risk = 0;
  const flags = [];
  const thresholds = window.APP_CONFIG?.alertThresholds || {};

  const critGlucHigh = thresholds.glucoseCriticalHigh || 250;
  const critGlucLow  = thresholds.glucoseCriticalLow  || 60;
  const critBPSys    = thresholds.bpCriticalSystolic  || 180;
  const critBPDia    = thresholds.bpCriticalDiastolic || 110;
  const critHRHigh   = thresholds.hrCriticalHigh      || 120;
  const critHRLow    = thresholds.hrCriticalLow       || 45;
  const critSpO2     = thresholds.spo2CriticalLow     || 90;

  if (v.glucose > critGlucHigh) { risk += 40; flags.push({ type:'critical', msg:`🔴 Critical glucose: ${v.glucose} mg/dL (>${critGlucHigh})` }); }
  else if (v.glucose > t.glucoseMax) { risk += 20; flags.push({ type:'warning', msg:`🟡 Elevated glucose: ${v.glucose} mg/dL (target <${t.glucoseMax})` }); }
  else if (v.glucose < critGlucLow) { risk += 35; flags.push({ type:'critical', msg:`🔴 Severe hypoglycemia: ${v.glucose} mg/dL` }); }
  else if (v.glucose < t.glucoseMin) { risk += 25; flags.push({ type:'critical', msg:`🔴 Hypoglycemia: ${v.glucose} mg/dL (<${t.glucoseMin})` }); }

  if (v.systolic > critBPSys || v.diastolic > critBPDia) { risk += 45; flags.push({ type:'critical', msg:`🔴 Hypertensive Crisis: BP ${v.systolic}/${v.diastolic} mmHg` }); }
  else if (v.systolic > t.bpSystolicMax || v.diastolic > t.bpDiastolicMax) { risk += 22; flags.push({ type:'warning', msg:`🟡 Elevated BP: ${v.systolic}/${v.diastolic} mmHg (target <${t.bpSystolicMax}/${t.bpDiastolicMax})` }); }

  if (v.hr > critHRHigh) { risk += 30; flags.push({ type:'critical', msg:`🔴 Tachycardia: HR ${v.hr} bpm` }); }
  else if (v.hr < critHRLow) { risk += 30; flags.push({ type:'critical', msg:`🔴 Bradycardia: HR ${v.hr} bpm` }); }
  else if (v.hr > t.hrMax) { risk += 10; flags.push({ type:'warning', msg:`🟡 Elevated HR: ${v.hr} bpm` }); }
  else if (v.hr < t.hrMin) { risk += 8; flags.push({ type:'warning', msg:`🟡 Low HR: ${v.hr} bpm` }); }

  if (v.spo2 < critSpO2) { risk += 40; flags.push({ type:'critical', msg:`🔴 Critical SpO₂: ${v.spo2}% (<${critSpO2}%)` }); }
  else if (v.spo2 < t.spo2Min) { risk += 20; flags.push({ type:'warning', msg:`🟡 Low SpO₂: ${v.spo2}% (target ≥${t.spo2Min}%)` }); }

  if (v.weight > t.weightMax) { risk += 8; flags.push({ type:'info', msg:`ℹ️ Weight ${v.weight} kg above target (${t.weightMax} kg)` }); }

  const level = risk >= 40 ? 'critical' : risk >= 18 ? 'warning' : 'stable';
  return { risk: Math.min(risk, 100), level, flags };
}

function evaluateAndAlert(patient) {
  const analysis = analyzeVitals(patient);
  analysis.flags.forEach(flag => {
    const key = `${patient.id}_${flag.msg.slice(0, 48)}`;
    if (!STATE.alerts.find(a => a.key === key)) {
      STATE.alerts.unshift({ key, patientName: patient.name, ...flag, ts: Date.now() });
    }
  });
  if (STATE.alerts.length > 60) STATE.alerts = STATE.alerts.slice(0, 60);
  saveAlerts();
  renderNotifications();
  return analysis;
}

/* ──────────────────────────────────────────────
   8. UI HELPERS
────────────────────────────────────────────────── */
function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function statusLabel(v, min, max) {
  if (v === null || v === undefined) return { text:'—', cls:'' };
  if (v > max) return { text:'Elevated', cls:'status-elevated' };
  if (v < min) return { text:'Low',      cls:'status-low' };
  return { text:'Normal', cls:'status-normal' };
}
function setEl(id, val)   { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHtml(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; }

function trendArrow(history, field, last = 7) {
  const vals = history.filter(h => h.type === 'vitals').map(h => h[field]).filter(v => v != null);
  if (vals.length < 2) return '';
  const recent = vals.slice(-last);
  const half = Math.floor(recent.length / 2);
  const avg1 = recent.slice(0, half || 1).reduce((a, b) => a + b, 0) / (half || 1);
  const avg2 = recent.slice(half).reduce((a, b) => a + b, 0) / (recent.length - half || 1);
  const delta = avg2 - avg1;
  if (Math.abs(delta) < 1) return '→ Stable';
  return delta > 0 ? `↑ +${delta.toFixed(1)}` : `↓ ${delta.toFixed(1)}`;
}

function avgField(history, field) {
  const vals = history.filter(h => h.type === 'vitals' && h[field] != null).map(h => h[field]);
  if (!vals.length) return '—';
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/* Build inline SVG sparkline */
function buildSparkline(values, color) {
  if (!values || values.length < 2) return '';
  const w = 120, h = 28;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <polyline points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity="0.08"/>
  </svg>`;
}

/* Update risk dial */
function updateRiskDial(score, level) {
  const fill = document.getElementById('dial-fill');
  if (!fill) return;
  const circumference = 201;
  const offset = circumference - (score / 100) * circumference;
  fill.style.strokeDashoffset = offset;
  const colors = { stable: '#10d9a0', warning: '#f5a623', critical: '#ff4b6e' };
  fill.style.stroke = colors[level] || '#10d9a0';
  setEl('pt-risk-score', score);
}

/* colorCard now uses .metric-bento */
function colorCard(cardId, statusCls) {
  const el = document.getElementById(cardId);
  if (!el) return;
  el.classList.remove('mc-emerald', 'mc-amber', 'mc-coral', 'mc-blue');
  if (statusCls === 'status-normal')   el.classList.add('mc-emerald');
  if (statusCls === 'status-elevated') el.classList.add('mc-amber');
  if (statusCls === 'status-critical') el.classList.add('mc-coral');
  if (statusCls === 'status-low')      el.classList.add('mc-coral');
}

/* ──────────────────────────────────────────────
   9. PATIENT DASHBOARD RENDER
────────────────────────────────────────────────── */
function renderPatientDashboard() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  const v = getLatestVitals(p);
  const analysis = evaluateAndAlert(p);

  // Hero
  setEl('pt-avatar', p.initials);
  setEl('pt-name', p.name);
  setEl('pt-condition', p.condition);
  setEl('hero-physician', p.primaryPhysician || 'Unknown');
  setEl('hero-insurance', p.insuranceId || '—');
  setEl('hero-appt', p.nextAppointment ? `Next: ${p.nextAppointment}` : 'No appointment');
  setEl('med-today-date', new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }));

  const riskEl = document.getElementById('pt-risk-badge');
  if (riskEl) {
    riskEl.textContent = analysis.level.charAt(0).toUpperCase() + analysis.level.slice(1);
    riskEl.className = `risk-badge ${analysis.level}`;
  }
  updateRiskDial(analysis.risk, analysis.level);

  if (v) {
    // Glucose
    setEl('mv-glucose', v.glucose ?? '—');
    const gs = statusLabel(v.glucose, p.targets.glucoseMin, p.targets.glucoseMax);
    const msGlucose = document.getElementById('ms-glucose');
    if (msGlucose) { msGlucose.textContent = gs.text; msGlucose.className = `metric-status ${gs.cls}`; }
    setEl('mt-glucose', trendArrow(p.history, 'glucose'));
    setHtml('spark-glucose', buildSparkline(p.history.filter(h=>h.type==='vitals').slice(-10).map(h=>h.glucose), '#f5a623'));
    colorCard('mc-glucose', gs.cls);

    // BP
    setEl('mv-bp', v.systolic ? `${v.systolic}/${v.diastolic}` : '—');
    const bs = statusLabel(v.systolic, 90, p.targets.bpSystolicMax);
    const msBP = document.getElementById('ms-bp');
    if (msBP) { msBP.textContent = bs.text; msBP.className = `metric-status ${bs.cls}`; }
    setEl('mt-bp', trendArrow(p.history, 'systolic'));
    setHtml('spark-bp', buildSparkline(p.history.filter(h=>h.type==='vitals').slice(-10).map(h=>h.systolic), '#ff4b6e'));
    colorCard('mc-bp', bs.cls);

    // HR
    setEl('mv-hr', v.hr ?? '—');
    const hs = statusLabel(v.hr, p.targets.hrMin, p.targets.hrMax);
    const msHR = document.getElementById('ms-hr');
    if (msHR) { msHR.textContent = hs.text; msHR.className = `metric-status ${hs.cls}`; }
    setEl('mt-hr', trendArrow(p.history, 'hr'));
    setHtml('spark-hr', buildSparkline(p.history.filter(h=>h.type==='vitals').slice(-10).map(h=>h.hr), '#f43f5e'));
    colorCard('mc-hr', hs.cls);
    const heartIcon = document.getElementById('heart-icon');
    if (heartIcon) heartIcon.className = `heart-pulse ${hs.cls === 'status-critical' ? 'beating' : ''}`;

    // SpO2
    setEl('mv-spo2', v.spo2 ?? '—');
    const ss = statusLabel(v.spo2, p.targets.spo2Min, 100);
    const msSpO2 = document.getElementById('ms-spo2');
    if (msSpO2) { msSpO2.textContent = ss.text; msSpO2.className = `metric-status ${ss.cls}`; }
    setEl('mt-spo2', '');
    colorCard('mc-spo2', ss.cls);
    const spo2Fill = document.getElementById('spo2-fill');
    if (spo2Fill) spo2Fill.style.width = `${Math.min(100, v.spo2 || 0)}%`;

    // Weight
    setEl('mv-weight', v.weight ?? '—');
    const ws = statusLabel(v.weight, p.targets.weightMin, p.targets.weightMax);
    const msW = document.getElementById('ms-weight');
    if (msW) { msW.textContent = ws.text; msW.className = `metric-status ${ws.cls}`; }
    setEl('mt-weight', trendArrow(p.history, 'weight'));
    setHtml('spark-weight', buildSparkline(p.history.filter(h=>h.type==='vitals').slice(-10).map(h=>h.weight), '#a78bfa'));
    colorCard('mc-weight', ws.cls);
  }

  renderMedications(p);
  renderRecentLogs(p);
  renderVitalsChart('glucose');
  renderMedAdherenceChart(p);
}

/* ──────────────────────────────────────────────
   10. MEDICATION & LOGS RENDER
────────────────────────────────────────────────── */
function renderMedications(patient) {
  const container = document.getElementById('med-list');
  if (!container) return;
  const today = new Date().toISOString().slice(0, 10);
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

  // Adherence pills in chart card
  const pillsContainer = document.getElementById('adherence-pills');
  if (pillsContainer) {
    pillsContainer.innerHTML = patient.medications.map((med, i) => {
      const key = `${patient.id}_${i}_${today}`;
      const taken = STATE.medTaken[key] || false;
      return `<span class="adh-pill ${taken ? 'taken' : ''}">${med.name.split(' ')[0]}</span>`;
    }).join('');
  }
}

function renderRecentLogs(patient) {
  const container = document.getElementById('recent-logs');
  if (!container) return;
  const logs = [...patient.history].reverse().slice(0, 18);
  if (!logs.length) {
    container.innerHTML = '<p class="muted-label" style="text-align:center;padding:1.5rem">No logs yet.</p>';
    return;
  }
  container.innerHTML = logs.map(log => {
    let val = '';
    if (log.type === 'vitals') val = `Glucose: ${log.glucose} mg/dL · BP: ${log.systolic}/${log.diastolic} · HR: ${log.hr} bpm · SpO₂: ${log.spo2}%`;
    else if (log.type === 'meal') val = log.description || 'Meal logged';
    else if (log.type === 'symptom') val = log.description || 'Symptom logged';
    else if (log.type === 'activity') val = log.description || 'Activity logged';
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
   11. CHART.JS WRAPPERS
────────────────────────────────────────────────── */
const CHART_COLORS = { glucose:'#f5a623', systolic:'#ff4b6e', hr:'#f43f5e', weight:'#a78bfa' };

function getChartLabels(patient) {
  return patient.history.filter(h => h.type === 'vitals').slice(-14).map(h =>
    new Date(h.ts).toLocaleDateString('en-US', { month:'short', day:'numeric' })
  );
}
function getChartValues(patient, field) {
  return patient.history.filter(h => h.type === 'vitals').slice(-14).map(h => h[field]);
}

function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { labels: { color:'#5a6780', font:{ family:'Inter', size:11 } } } },
    scales: {
      x: { ticks:{ color:'#3d4f6e', font:{ size:10 } }, grid:{ color:'rgba(255,255,255,0.04)' } },
      y: { ticks:{ color:'#3d4f6e', font:{ size:10 } }, grid:{ color:'rgba(255,255,255,0.04)' } },
    },
    elements: { line:{ tension:0.45, borderWidth:2 }, point:{ radius:2.5, hoverRadius:5 } },
    animation: { duration: window.APP_CONFIG?.charts?.animationMs || 400 },
  };
}

function renderVitalsChart(type) {
  const p = STATE.patients[STATE.activePatientIdx];
  const ctx = document.getElementById('vitals-chart');
  if (!ctx || !p) return;
  const labels = getChartLabels(p);
  let datasets = [];

  if (type === 'glucose') {
    datasets = [{
      label:'Blood Glucose (mg/dL)', data:getChartValues(p,'glucose'),
      borderColor:'#f5a623', backgroundColor:'rgba(245,166,35,0.07)', fill:true,
    }, {
      label:`Target Max (${p.targets.glucoseMax})`,
      data:labels.map(()=>p.targets.glucoseMax),
      borderColor:'rgba(255,75,110,0.4)', borderDash:[5,5], pointRadius:0, fill:false,
    }];
  } else if (type === 'bp') {
    datasets = [
      { label:'Systolic (mmHg)', data:getChartValues(p,'systolic'), borderColor:'#ff4b6e', backgroundColor:'rgba(255,75,110,0.06)', fill:true },
      { label:'Diastolic (mmHg)', data:getChartValues(p,'diastolic'), borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.04)', fill:false },
      { label:`Target Sys (${p.targets.bpSystolicMax})`, data:labels.map(()=>p.targets.bpSystolicMax), borderColor:'rgba(255,75,110,0.3)', borderDash:[5,5], pointRadius:0, fill:false },
    ];
  } else if (type === 'hr') {
    datasets = [{ label:'Heart Rate (bpm)', data:getChartValues(p,'hr'), borderColor:'#f43f5e', backgroundColor:'rgba(244,63,94,0.07)', fill:true }];
  } else if (type === 'weight') {
    datasets = [{ label:'Weight (kg)', data:getChartValues(p,'weight'), borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,0.07)', fill:true }];
  }

  if (STATE.charts.vitals) STATE.charts.vitals.destroy();
  STATE.charts.vitals = new Chart(ctx, { type:'line', data:{ labels, datasets }, options: chartDefaults() });
}

function renderMedAdherenceChart(patient) {
  const ctx = document.getElementById('med-chart');
  if (!ctx) return;
  const today = new Date().toISOString().slice(0, 10);
  const total = patient.medications.length;
  let taken = 0;
  patient.medications.forEach((_, i) => { if (STATE.medTaken[`${patient.id}_${i}_${today}`]) taken++; });
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  setEl('adherence-pct', `${pct}%`);

  if (STATE.charts.med) STATE.charts.med.destroy();
  STATE.charts.med = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Taken', 'Remaining'],
      datasets: [{ data:[taken, total-taken], backgroundColor:['#10d9a0','rgba(255,255,255,0.06)'], borderWidth:0 }],
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'74%',
      plugins: { legend:{ labels:{ color:'#5a6780', font:{ family:'Inter', size:11 } } } },
      animation: { duration:400 },
    },
  });
}

function switchChart(type, btn) {
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVitalsChart(type);
}

/* ──────────────────────────────────────────────
   12. PROVIDER PORTAL
────────────────────────────────────────────────── */
function renderProviderPortal() {
  renderTriageList();
  renderTargetsForm();
  renderAlarmDashboard();
  renderProviderStats();
  selectProviderPatient(STATE.providerPatientIdx);
}

function renderProviderStats() {
  let critical = 0, warning = 0, stable = 0;
  STATE.patients.forEach(p => {
    const { level } = analyzeVitals(p);
    if (level === 'critical') critical++;
    else if (level === 'warning') warning++;
    else stable++;
  });
  setEl('stat-critical', critical);
  setEl('stat-warning', warning);
  setEl('stat-stable', stable);
}

function renderTriageList() {
  const container = document.getElementById('triage-cards');
  if (!container) return;
  const colorMap = { stable:'status-normal', warning:'status-elevated', critical:'status-critical' };
  container.innerHTML = STATE.patients.map((p, i) => {
    const analysis = analyzeVitals(p);
    return `<div class="triage-card ${i === STATE.providerPatientIdx ? 'selected' : ''}" onclick="selectProviderPatient(${i})">
      <div class="tc-name">${p.name}</div>
      <div class="tc-condition">${p.condition.split(' · ')[0]}</div>
      <div class="tc-risk ${colorMap[analysis.level]}">${analysis.level.toUpperCase()} · Score ${analysis.risk}</div>
      <div class="muted-label" style="margin-top:2px">${p.medications.length} medications · Next: ${p.nextAppointment || '—'}</div>
    </div>`;
  }).join('');
}

function selectProviderPatient(idx) {
  STATE.providerPatientIdx = idx;
  const p = STATE.patients[idx];
  if (!p) return;
  document.querySelectorAll('.triage-card').forEach((c, i) => c.classList.toggle('selected', i === idx));
  setEl('prov-pt-name', `${p.name} — ${p.condition.split(' · ')[0]}`);
  renderProviderChart(p);
  renderProviderLogTable(p);
  renderTargetsForm();
}

function renderProviderChart(patient) {
  const ctx = document.getElementById('prov-chart');
  if (!ctx) return;
  const labels = getChartLabels(patient);
  const datasets = [
    { label:'Systolic',   data:getChartValues(patient,'systolic'), borderColor:'#ff4b6e', fill:false },
    { label:'Glucose',    data:getChartValues(patient,'glucose'),  borderColor:'#f5a623', fill:false },
    { label:'Heart Rate', data:getChartValues(patient,'hr'),       borderColor:'#f43f5e', fill:false },
    { label:'SpO₂',       data:getChartValues(patient,'spo2'),     borderColor:'#38bdf8', fill:false },
  ];
  if (STATE.charts.prov) STATE.charts.prov.destroy();
  STATE.charts.prov = new Chart(ctx, { type:'line', data:{ labels, datasets }, options: chartDefaults() });
}

function renderProviderLogTable(patient) {
  const container = document.getElementById('prov-log-table');
  if (!container) return;
  const logs = [...patient.history].filter(l => l.type === 'vitals').reverse().slice(0, 10);
  if (!logs.length) { container.innerHTML = '<p class="muted-label" style="padding:1rem">No vitals logged.</p>'; return; }
  container.innerHTML = `<div class="prov-log-table"><table>
    <thead><tr><th>Date</th><th>Glucose</th><th>BP</th><th>HR</th><th>SpO₂</th><th>Weight</th></tr></thead>
    <tbody>${logs.map(l => `<tr>
      <td>${fmtDate(l.ts)}</td>
      <td>${l.glucose ?? '—'}</td>
      <td>${l.systolic}/${l.diastolic}</td>
      <td>${l.hr}</td>
      <td>${l.spo2}%</td>
      <td>${l.weight} kg</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderTargetsForm() {
  const container = document.getElementById('targets-form');
  if (!container) return;
  const t = STATE.patients[STATE.providerPatientIdx]?.targets;
  if (!t) return;
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
  const get = id => { const el = document.getElementById(id); return el ? parseFloat(el.value) || 0 : 0; };
  p.targets = {
    glucoseMin: get('tg-gmin'), glucoseMax: get('tg-gmax'),
    bpSystolicMax: get('tg-bpsys'), bpDiastolicMax: get('tg-bpdia'),
    hrMin: get('tg-hrmin'), hrMax: get('tg-hrmax'),
    spo2Min: get('tg-spo2'), weightMin: get('tg-wmin'), weightMax: get('tg-wmax'),
  };
  savePatients();
  renderPatientDashboard();
  renderAlarmDashboard();
  showToast('Clinical targets saved.', 'emerald');
}

function generateClinicalSummary() {
  const p = STATE.patients[STATE.providerPatientIdx];
  const output = document.getElementById('clinical-summary-output');
  if (!output) return;

  if (!hasIBMCredentials()) {
    output.textContent =
      '⚠️ IBM Granite credentials required.\n\n' +
      'Provide your IBM Cloud API Key, Watson ML URL, and Project ID in ⚙️ Settings\n' +
      'to generate a real IBM Granite clinical report.\n\n' +
      'IBM Cloud Lite plan is free — see SETUP.md.';
    setTimeout(() => openSettings(), 400);
    return;
  }

  output.textContent = 'Connecting to IBM Granite (watsonx.ai)…';
  callRealGraniteChat(
    'Generate a structured clinical report including longitudinal vital statistics, active flags, medication schedule, risk assessment, and recommended next steps.',
    p
  )
    .then(res => { output.textContent = res; })
    .catch(err => {
      const fallbackAllowed = window.APP_CONFIG?.simulatorFallback === true;
      if (fallbackAllowed) {
        output.textContent = `⚠️ IBM Granite unavailable: ${err.message}\n[SIMULATOR FALLBACK]\n\n${graniteGenerateClinicalSummary(p)}`;
      } else {
        output.textContent = `❌ IBM Granite error: ${err.message}\n\nCheck credentials in ⚙️ Settings.`;
      }
    });
}

function renderAlarmDashboard() {
  const container = document.getElementById('alarm-dashboard');
  if (!container) return;
  const active = STATE.alerts.slice(0, 20);
  if (!active.length) {
    container.innerHTML = '<div class="no-alarms">✅ No active alarms across all patients.</div>';
    return;
  }
  container.innerHTML = active.map(a =>
    `<div class="alarm-item ${a.type === 'warning' ? 'warning' : a.type === 'info' ? 'info' : ''}">
      <strong style="flex-shrink:0">${a.patientName}</strong>
      <span>${a.msg}</span>
      <span style="margin-left:auto;font-size:0.7rem;color:var(--muted);flex-shrink:0">${fmtDate(a.ts)}</span>
    </div>`
  ).join('');
}

/* ──────────────────────────────────────────────
   13. ANALYTICS PORTAL
────────────────────────────────────────────────── */
function renderAnalyticsPortal() {
  renderAnalyticsCharts();
  renderAnalyticsSummary();
  renderRAGStatus();
}

function renderAnalyticsCharts() {
  const names = STATE.patients.map(p => p.name.split(' ')[0]);

  // Risk chart
  const riskCtx = document.getElementById('analytics-risk-chart');
  if (riskCtx) {
    if (STATE.charts.analyticsRisk) STATE.charts.analyticsRisk.destroy();
    const scores = STATE.patients.map(p => analyzeVitals(p).risk);
    const colors = STATE.patients.map(p => {
      const lvl = analyzeVitals(p).level;
      return lvl === 'critical' ? 'rgba(255,75,110,0.7)' : lvl === 'warning' ? 'rgba(245,166,35,0.7)' : 'rgba(16,217,160,0.7)';
    });
    STATE.charts.analyticsRisk = new Chart(riskCtx, {
      type: 'bar',
      data: { labels: names, datasets: [{ label:'Risk Score', data:scores, backgroundColor:colors, borderRadius:6, borderWidth:0 }] },
      options: { ...chartDefaults(), plugins:{ legend:{ display:false } } },
    });
  }

  // Glucose chart
  const glucCtx = document.getElementById('analytics-glucose-chart');
  if (glucCtx) {
    if (STATE.charts.analyticsGluc) STATE.charts.analyticsGluc.destroy();
    STATE.charts.analyticsGluc = new Chart(glucCtx, {
      type: 'bar',
      data: { labels: names, datasets: [{
        label:'Avg Glucose (mg/dL)',
        data: STATE.patients.map(p => avgField(p.history, 'glucose')),
        backgroundColor:'rgba(245,166,35,0.65)', borderRadius:6, borderWidth:0,
      }]},
      options: { ...chartDefaults(), plugins:{ legend:{ display:false } } },
    });
  }

  // BP chart
  const bpCtx = document.getElementById('analytics-bp-chart');
  if (bpCtx) {
    if (STATE.charts.analyticsBP) STATE.charts.analyticsBP.destroy();
    STATE.charts.analyticsBP = new Chart(bpCtx, {
      type: 'bar',
      data: { labels: names, datasets: [{
        label:'Avg Systolic BP (mmHg)',
        data: STATE.patients.map(p => avgField(p.history, 'systolic')),
        backgroundColor:'rgba(255,75,110,0.65)', borderRadius:6, borderWidth:0,
      }]},
      options: { ...chartDefaults(), plugins:{ legend:{ display:false } } },
    });
  }
}

function renderAnalyticsSummary() {
  const container = document.getElementById('analytics-summary');
  if (!container) return;
  const total = STATE.patients.length;
  const critical = STATE.patients.filter(p => analyzeVitals(p).level === 'critical').length;
  const warning  = STATE.patients.filter(p => analyzeVitals(p).level === 'warning').length;
  const avgGluc  = Math.round(STATE.patients.map(p => +avgField(p.history,'glucose')).filter(Boolean).reduce((a,b)=>a+b,0) / total);
  const avgBP    = Math.round(STATE.patients.map(p => +avgField(p.history,'systolic')).filter(Boolean).reduce((a,b)=>a+b,0) / total);
  const totalAlerts = STATE.alerts.length;

  const rows = [
    ['Total Patients',       total],
    ['Critical Status',      `<span style="color:var(--coral)">${critical}</span>`],
    ['Warning Status',       `<span style="color:var(--amber)">${warning}</span>`],
    ['Stable Status',        `<span style="color:var(--emerald)">${total - critical - warning}</span>`],
    ['Pop. Avg Glucose',     `${avgGluc} mg/dL`],
    ['Pop. Avg Systolic BP', `${avgBP} mmHg`],
    ['Active Alerts',        `<span style="color:var(--coral)">${totalAlerts}</span>`],
    ['RAG Vector Chunks',    CLINICAL_KNOWLEDGE.length],
    ['AI Mode',              STATE.settings.useReal ? `<span style="color:var(--teal)">Real Granite</span>` : 'Simulator'],
  ];
  container.innerHTML = rows.map(([label, value]) =>
    `<div class="analytics-stat-row">
      <span class="analytics-stat-label">${label}</span>
      <span class="analytics-stat-value">${value}</span>
    </div>`
  ).join('');
}

function renderRAGStatus() {
  const container = document.getElementById('rag-status');
  if (!container) return;
  const items = [
    { title:'Client Vector Store', desc:`${CLINICAL_KNOWLEDGE.length} clinical knowledge chunks indexed (ADA, JNC-8, AHA guidelines). Active for all queries.`, status:'active', label:'Active' },
    { title:'IBM Watson Discovery', desc:'Cloud-based semantic RAG. Upload clinical guidelines as PDFs to Discovery to enable evidence-grounded responses.', status: STATE.settings.discoveryEnabled ? 'active' : 'optional', label: STATE.settings.discoveryEnabled ? 'Connected' : 'Not Configured' },
    { title:'IBM Watson ML / Granite', desc:`Model: ${STATE.settings.modelId || 'ibm/granite-13b-instruct-v2'}. Real AI inference via watsonx.ai.`, status: STATE.settings.useReal ? 'active' : 'optional', label: STATE.settings.useReal ? 'Connected' : 'Simulator Mode' },
    { title:'Patient CSV Dataset', desc:`${STATE.patients.length} patients loaded from patients.csv. Edit the file to add, remove, or modify patient data.`, status:'active', label:'Loaded' },
  ];
  container.innerHTML = items.map(item => `
    <div class="rag-item">
      <div class="rag-item-title">${item.title}</div>
      <div class="rag-item-desc">${item.desc}</div>
      <div class="rag-item-status rag-${item.status}">${item.label}</div>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────
   14. LOG MODAL
────────────────────────────────────────────────── */
function openLogModal(type) {
  STATE.logDraft = { type };
  const overlay = document.getElementById('log-modal-overlay');
  const title   = document.getElementById('log-modal-title');
  const body    = document.getElementById('log-modal-body');
  if (!overlay || !body) return;

  if (type === 'vitals') {
    title.textContent = 'Log Vitals';
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
    title.textContent = 'Log Meal / Symptom';
    body.innerHTML = `
      <div class="input-group"><label>Type</label>
        <select id="log-mtype">
          <option value="meal">Meal</option>
          <option value="symptom">Symptom</option>
          <option value="activity">Physical Activity</option>
        </select>
      </div>
      <div class="input-group"><label>Description</label>
        <textarea id="log-mdesc" placeholder="e.g. 'Large dinner with rice' or 'Mild dizziness for 20 min'"></textarea>
      </div>
      <div class="form-row">
        <div class="input-group"><label>Severity (1–10)</label><input type="number" id="log-severity" min="1" max="10" placeholder="5"/></div>
        <div class="input-group"><label>Post-Meal Glucose (mg/dL)</label><input type="number" id="log-post-glucose" placeholder="optional"/></div>
      </div>
    `;
  } else if (type === 'medication') {
    const p = STATE.patients[STATE.activePatientIdx];
    title.textContent = 'Record Medication';
    body.innerHTML = `
      <div class="input-group"><label>Medication</label>
        <select id="log-med-select">
          ${p.medications.map((m, i) => `<option value="${i}">${m.name}</option>`).join('')}
          <option value="other">Other (specify below)</option>
        </select>
      </div>
      <div class="input-group"><label>Name (if other)</label><input type="text" id="log-med-name" placeholder="Medication name…"/></div>
      <div class="input-group"><label>Notes / Side Effects</label><textarea id="log-med-notes" placeholder="Any side effects or observations…"></textarea></div>
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
    const glucose   = parseFloat(document.getElementById('log-glucose')?.value);
    const systolic  = parseFloat(document.getElementById('log-sys')?.value);
    const diastolic = parseFloat(document.getElementById('log-dia')?.value);
    const hr        = parseFloat(document.getElementById('log-hr')?.value);
    const spo2      = parseFloat(document.getElementById('log-spo2')?.value);
    const weight    = parseFloat(document.getElementById('log-weight')?.value);
    if (!glucose && !systolic) { showToast('Please enter at least one vital reading.', 'amber'); return; }
    const latest = getLatestVitals(p) || {};
    p.history.push({
      ts: now, type: 'vitals',
      glucose:   isNaN(glucose)   ? (latest.glucose   || 100) : glucose,
      systolic:  isNaN(systolic)  ? (latest.systolic  || 120) : systolic,
      diastolic: isNaN(diastolic) ? (latest.diastolic || 80)  : diastolic,
      hr:        isNaN(hr)        ? (latest.hr        || 72)  : hr,
      spo2:      isNaN(spo2)      ? (latest.spo2      || 97)  : spo2,
      weight:    isNaN(weight)    ? (latest.weight    || 70)  : weight,
    });
  } else if (type === 'meal') {
    const mtype = document.getElementById('log-mtype')?.value;
    const desc  = document.getElementById('log-mdesc')?.value;
    const sev   = document.getElementById('log-severity')?.value;
    const pg    = document.getElementById('log-post-glucose')?.value;
    p.history.push({ ts:now, type:mtype||'meal', description:desc, severity:sev||null, postGlucose:pg||null });
  } else if (type === 'medication') {
    const idx  = document.getElementById('log-med-select')?.value;
    const name = idx === 'other'
      ? (document.getElementById('log-med-name')?.value || 'Medication')
      : p.medications[parseInt(idx)]?.name;
    const today = new Date().toISOString().slice(0, 10);
    if (idx !== 'other') STATE.medTaken[`${p.id}_${idx}_${today}`] = true;
    p.history.push({ ts:now, type:'medication', name });
    saveMedTaken();
  }

  savePatients();
  closeLogModalDirect();
  renderPatientDashboard();
  if (STATE.activePortal === 'provider') renderProviderPortal();
  showToast('Log entry saved.', 'emerald');
}

function toggleMed(patientId, medIdx) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${patientId}_${medIdx}_${today}`;
  STATE.medTaken[key] = !STATE.medTaken[key];
  saveMedTaken();
  renderMedications(STATE.patients[STATE.activePatientIdx]);
  renderMedAdherenceChart(STATE.patients[STATE.activePatientIdx]);
}

/* ──────────────────────────────────────────────
   15. NOTIFICATIONS
────────────────────────────────────────────────── */
function renderNotifications() {
  const list  = document.getElementById('notif-list');
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
  list.innerHTML = STATE.alerts.slice(0, 20).map(a =>
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
  showToast('All alerts cleared.', 'blue');
}

/* ──────────────────────────────────────────────
   16. SETTINGS
────────────────────────────────────────────────── */
function openSettings() {
  const s = STATE.settings;
  document.getElementById('cfg-apikey').value    = s.apiKey    || '';
  document.getElementById('cfg-url').value       = s.watsonUrl || '';
  document.getElementById('cfg-model').value     = s.modelId   || 'ibm/granite-13b-instruct-v2';
  document.getElementById('cfg-project').value   = s.projectId || '';
  document.getElementById('cfg-use-real').checked = s.useReal  || false;
  document.getElementById('cfg-disc-url').value  = s.discoveryUrl        || '';
  document.getElementById('cfg-disc-key').value  = s.discoveryKey        || '';
  document.getElementById('cfg-disc-proj').value = s.discoveryProjectId  || '';
  document.getElementById('cfg-disc-enabled').checked = s.discoveryEnabled || false;
  document.getElementById('settings-overlay').classList.add('open');
  updateApiStatus();
}
function closeSettings(e)   { if (e.target.id === 'settings-overlay') closeSettingsDirect(); }
function closeSettingsDirect() { document.getElementById('settings-overlay').classList.remove('open'); }

function saveSettings() {
  STATE.settings.apiKey             = document.getElementById('cfg-apikey').value.trim();
  STATE.settings.watsonUrl          = document.getElementById('cfg-url').value.trim();
  STATE.settings.modelId            = document.getElementById('cfg-model').value.trim() || 'ibm/granite-3-8b-instruct';
  STATE.settings.projectId          = document.getElementById('cfg-project').value.trim();
  /* useReal is always true when credentials are present — toggle is kept for override only */
  STATE.settings.useReal            = document.getElementById('cfg-use-real').checked;
  STATE.settings.discoveryUrl       = document.getElementById('cfg-disc-url').value.trim();
  STATE.settings.discoveryKey       = document.getElementById('cfg-disc-key').value.trim();
  STATE.settings.discoveryProjectId = document.getElementById('cfg-disc-proj').value.trim();
  STATE.settings.discoveryEnabled   = document.getElementById('cfg-disc-enabled').checked;

  /* Auto-enable real API when all three mandatory fields are present */
  if (STATE.settings.apiKey && STATE.settings.watsonUrl && STATE.settings.projectId) {
    STATE.settings.useReal = true;
    const toggle = document.getElementById('cfg-use-real');
    if (toggle) toggle.checked = true;
  }

  persistSettings();
  TokenManager.invalidate();   /* force token refresh with new key */
  updateApiStatus();
  updateIBMStatusDot();

  /* Remove onboarding banner if credentials are now complete */
  if (hasIBMCredentials()) {
    dismissIBMOnboardingBanner();
  }

  showToast(
    hasIBMCredentials()
      ? `IBM Granite connected (${STATE.settings.modelId}).`
      : 'Settings saved. IBM Granite credentials still required.',
    hasIBMCredentials() ? 'emerald' : 'amber'
  );
}

function updateApiStatus() {
  const el = document.getElementById('api-status');
  if (!el) return;
  const apiKey   = document.getElementById('cfg-apikey')?.value.trim()  || STATE.settings.apiKey;
  const watsonUrl= document.getElementById('cfg-url')?.value.trim()     || STATE.settings.watsonUrl;
  const projId   = document.getElementById('cfg-project')?.value.trim() || STATE.settings.projectId;

  if (apiKey && watsonUrl && projId) {
    el.textContent = `✅ IBM Granite ready — model: ${STATE.settings.modelId || 'ibm/granite-3-8b-instruct'}`;
    el.className = 'api-status connected';
  } else if (STATE.hasServerCredentials) {
    el.textContent = `✅ IBM Granite ready via Server Environment Variables — model: ${STATE.settings.modelId || 'ibm/granite-3-8b-instruct'}`;
    el.className = 'api-status connected';
  } else {
    const missing = [
      !apiKey    && 'API Key',
      !watsonUrl && 'Watson ML URL',
      !projId    && 'Project ID',
    ].filter(Boolean).join(', ');
    el.textContent = `⚠️ Missing: ${missing}. IBM Granite AI features are disabled until all three fields are filled.`;
    el.className = 'api-status error';
  }
}

function updateIBMStatusDot() {
  const dot   = document.getElementById('ibm-status-dot');
  const label = dot?.querySelector('.ibm-status-label');
  if (!dot) return;

  const ready = hasIBMCredentials();
  dot.className = ready ? 'ibm-status-dot connected' : 'ibm-status-dot error';
  if (label) label.textContent = ready ? 'Granite Live' : 'No Credentials';

  const chatTag = document.getElementById('chat-model-tag');
  if (chatTag) {
    chatTag.textContent = ready ? (STATE.settings.modelId || 'ibm/granite-3-8b-instruct') : '⚠️ Not Connected';
    chatTag.className   = `chat-model-tag ${ready ? 'real' : ''}`;
  }
}

async function testConnection() {
  const el = document.getElementById('api-status');
  if (!el) return;
  const apiKey = document.getElementById('cfg-apikey').value.trim();
  if (!apiKey) {
    el.textContent = '⚠️ Please provide an API Key before testing.';
    el.className = 'api-status error'; return;
  }
  el.textContent = 'Testing IBM Cloud IAM connection via server...';
  el.className = 'api-status muted-label';
  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      el.textContent = '✅ IBM Cloud IAM token obtained via server. API credentials valid.';
      el.className = 'api-status connected';
    } else {
      el.textContent = `❌ Authentication failed: ${data.error || 'Check your API key.'}`;
      el.className = 'api-status error';
    }
  } catch (e) {
    el.textContent = `❌ Connection error: ${e.message}`;
    el.className = 'api-status error';
  }
}

/* ──────────────────────────────────────────────
   17. AI CHAT
────────────────────────────────────────────────── */
function toggleChat() {
  document.getElementById('chat-window').classList.toggle('open');
}
function chatKeydown(e) { if (e.key === 'Enter') sendChat(); }
function sendSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

/* Returns true when the three mandatory IBM credentials are present */
function hasIBMCredentials() {
  const s = STATE.settings;
  return !!((s.apiKey && s.watsonUrl && s.projectId) || STATE.hasServerCredentials);
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msgs  = document.getElementById('chat-messages');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  appendChatMsg(text, 'user', msgs);

  const typingEl = document.createElement('div');
  typingEl.className = 'msg ai typing typing-dots';
  typingEl.id = 'chat-typing';
  const typingContent = document.createElement('div');
  typingContent.className = 'msg-content';
  typingEl.appendChild(typingContent);
  msgs.appendChild(typingEl);
  msgs.scrollTop = msgs.scrollHeight;

  const p = STATE.patients[STATE.activePatientIdx];

  if (!hasIBMCredentials()) {
    /* Credentials missing — prompt user to configure, do not use simulator */
    typingEl.remove();
    appendChatMsg(
      '⚠️ IBM Granite credentials are required.\n\nPlease open ⚙️ Settings and enter your:\n  • IBM Cloud API Key\n  • Watson ML Service URL\n  • watsonx.ai Project ID\n\nThis application requires IBM Cloud Lite services. See SETUP.md for a step-by-step provisioning guide.',
      'ai', msgs
    );
    setTimeout(() => openSettings(), 800);
    return;
  }

  /* Route through real IBM Granite — simulator only if API call fails */
  callRealGraniteChat(text, p)
    .then(response => {
      typingEl.remove();
      appendChatMsg(response, 'ai', msgs);
    })
    .catch(err => {
      typingEl.remove();
      const fallbackAllowed = window.APP_CONFIG?.simulatorFallback === true;
      if (fallbackAllowed) {
        const simResponse = graniteChat(text, p);
        appendChatMsg(
          `⚠️ IBM Granite API unavailable: ${err.message}\n\n[SIMULATOR FALLBACK — not a real IBM response]\n\n${simResponse}`,
          'ai', msgs
        );
      } else {
        appendChatMsg(`❌ IBM Granite API error: ${err.message}\n\nPlease check your credentials in ⚙️ Settings.`, 'ai', msgs);
      }
    });
}

function appendChatMsg(text, role, container) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  const content = document.createElement('div');
  content.className = 'msg-content';
  content.textContent = text;
  el.appendChild(content);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

/* ──────────────────────────────────────────────
   18. REAL IBM GRANITE API CALL
────────────────────────────────────────────────── */
async function callRealGraniteChat(query, patient) {
  if (!window.callGraniteAPI) throw new Error('config.js not loaded. Ensure <script src="config.js"> is present before app.js.');
  const v        = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);

  // RAG: retrieve relevant passages from client vector store
  const ragPassages = VectorStore.search(query, 3);

  const prompt =
    PROMPT_TEMPLATES.patientContext(patient, v, analysis) +
    PROMPT_TEMPLATES.ragContext(ragPassages) +
    PROMPT_TEMPLATES.userQuery(query);

  return await callGraniteAPI(prompt, STATE.settings);
}

/* ──────────────────────────────────────────────
   19. IBM GRANITE SIMULATOR (Clinical LLM)
────────────────────────────────────────────────── */
function graniteChat(query, patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const q = query.toLowerCase();

  // RAG context injection (local vector store)
  const ragPassages = VectorStore.search(query, 2);
  const ragNote = ragPassages.length
    ? `\n\n📚 Evidence context: ${ragPassages.map(p => p.split(']')[1]?.trim().slice(0,120)).filter(Boolean).join(' | ')}`
    : '';

  if (q.includes('glucose') || q.includes('sugar') || q.includes('blood sugar')) {
    const avg = avgField(patient.history, 'glucose');
    const trend = trendArrow(patient.history, 'glucose');
    const status = v?.glucose > patient.targets.glucoseMax ? 'above target' : 'within target range';
    return `📊 Glucose Analysis — ${patient.name}:\n\nLatest: ${v?.glucose ?? '—'} mg/dL\nTarget: ${patient.targets.glucoseMin}–${patient.targets.glucoseMax} mg/dL\n14-day average: ${avg} mg/dL\nTrend: ${trend} (${status})\n\n${glucoseAdvice(v?.glucose, patient)}${ragNote}`;
  }

  if (q.includes('blood pressure') || q.includes(' bp ') || q.includes('hypertension') || q.includes('systolic') || q.includes('diastolic')) {
    const avg = avgField(patient.history, 'systolic');
    return `🩺 Blood Pressure — ${patient.name}:\n\nLatest: ${v?.systolic}/${v?.diastolic} mmHg\nTarget: <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax} mmHg\n14-day avg systolic: ${avg} mmHg\n\n${bpAdvice(v?.systolic, v?.diastolic, patient)}${ragNote}`;
  }

  if (q.includes('cardiac') || q.includes('heart') || q.includes('risk') || q.includes('danger')) {
    return `❤️ Cardiac Risk — ${patient.name}:\n\nRisk Score: ${analysis.risk}/100 (${analysis.level.toUpperCase()})\nHR: ${v?.hr} bpm · SpO₂: ${v?.spo2}%\n\n${analysis.flags.length ? 'Active flags:\n' + analysis.flags.map(f => '• ' + f.msg).join('\n') : '✅ No critical cardiac flags.'}\n\n${heartAdvice(patient, analysis)}${ragNote}`;
  }

  if (q.includes('diet') || q.includes('food') || q.includes('eat') || q.includes('nutrition') || q.includes('meal')) {
    return dietAdvice(patient) + ragNote;
  }

  if (q.includes('medication') || q.includes('medicine') || q.includes('drug') || q.includes('pill') || q.includes('dose')) {
    const meds = patient.medications.map(m => `• ${m.name} — ${m.dose}`).join('\n');
    return `💊 Medications — ${patient.name}:\n\n${meds}\n\n⚠️ Never stop or change doses without consulting your prescriber. Consistent adherence is critical for ${patient.diagnosis.replace(/_/g, ' ')} management.${ragNote}`;
  }

  if (q.includes('spo2') || q.includes('oxygen') || q.includes('saturation') || q.includes('breathing')) {
    const st = v?.spo2 < 90 ? '🔴 Critically low — seek emergency care immediately.'
             : v?.spo2 < 95 ? '🟡 Below target. Rest, avoid exertion, follow up with physician.'
             : '✅ Within normal range.';
    return `🫁 SpO₂: ${v?.spo2}% (Target ≥${patient.targets.spo2Min}%)\n\n${st}\n\nIf persistent readings below 90%, chest pain, or severe shortness of breath — call emergency services immediately.${ragNote}`;
  }

  if (q.includes('weight') || q.includes('bmi') || q.includes('overweight')) {
    return `⚖️ Weight — ${patient.name}:\nCurrent: ${v?.weight} kg · Target: ${patient.targets.weightMin}–${patient.targets.weightMax} kg\nTrend: ${trendArrow(patient.history, 'weight')}\n\nEven a 5–10% reduction in body weight significantly improves BP, insulin sensitivity, and cardiac outcomes. Aim for 150 min/week of moderate activity.${ragNote}`;
  }

  if (q.includes('summary') || q.includes('overall') || q.includes('report') || q.includes('analyz') || q.includes('how am i')) {
    return graniteGeneratePatientSummary(patient);
  }

  if (q.includes('emergency') || q.includes('chest pain') || q.includes('stroke') || q.includes('faint') || q.includes('unconscious')) {
    return '🚨 EMERGENCY:\n\nIf experiencing chest pain, sudden numbness, severe shortness of breath, or loss of consciousness — call emergency services (911) IMMEDIATELY.\n\nDo NOT drive yourself. Stay calm, sit or lie down, and wait for emergency responders.';
  }

  return `🤖 IBM Granite Clinical AI — ${patient.name}:\n\nLatest vitals:\n• Glucose: ${v?.glucose ?? '—'} mg/dL\n• BP: ${v?.systolic}/${v?.diastolic} mmHg\n• HR: ${v?.hr} bpm · SpO₂: ${v?.spo2}%\n• Risk: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)\n\n${analysis.flags.length ? 'Active concerns:\n' + analysis.flags.map(f => '• ' + f.msg).join('\n') : '✅ No critical flags.'}\n\nAsk about glucose, BP, cardiac risk, diet, medications, or request a full summary.`;
}

function graniteGeneratePatientSummary(patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const glucAvg = avgField(patient.history, 'glucose');
  const bpAvg   = avgField(patient.history, 'systolic');
  return `🤖 IBM Granite — Patient Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient:    ${patient.name}
Condition:  ${patient.condition}
Physician:  ${patient.primaryPhysician || 'N/A'}
Next Appt:  ${patient.nextAppointment || 'N/A'}
Risk Level: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)

📊 Latest Vitals:
  Blood Glucose:  ${v?.glucose ?? '—'} mg/dL  (14-day avg: ${glucAvg})
  Blood Pressure: ${v?.systolic}/${v?.diastolic} mmHg  (avg systolic: ${bpAvg})
  Heart Rate:     ${v?.hr} bpm  · SpO₂: ${v?.spo2}%
  Weight:         ${v?.weight} kg

${analysis.flags.length ? '⚠️ Active Flags:\n' + analysis.flags.map(f => '  • ' + f.msg).join('\n') : '✅ No critical flags detected.'}

💡 Recommendations:
${graniteRecommendations(patient, analysis)}`;
}

function graniteGenerateClinicalSummary(patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const glucAvg = avgField(patient.history, 'glucose');
  const bpAvg   = avgField(patient.history, 'systolic');
  const diaAvg  = avgField(patient.history, 'diastolic');
  const hrAvg   = avgField(patient.history, 'hr');

  return `IBM Granite Clinical AI — Structured Report
Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT:       ${patient.name}
CONDITION:     ${patient.condition}
PHYSICIAN:     ${patient.primaryPhysician || 'N/A'}
INSURANCE:     ${patient.insuranceId || 'N/A'}
NEXT APPT:     ${patient.nextAppointment || 'N/A'}
AI RISK LEVEL: ${analysis.level.toUpperCase()} · Score ${analysis.risk}/100

VITAL SIGNS SUMMARY (14-day longitudinal):
  Blood Glucose  — Latest: ${v?.glucose} mg/dL | Avg: ${glucAvg} | Target: ${patient.targets.glucoseMin}–${patient.targets.glucoseMax}
  Blood Pressure — Latest: ${v?.systolic}/${v?.diastolic} mmHg | Avg: ${bpAvg}/${diaAvg} | Target: <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax}
  Heart Rate     — Latest: ${v?.hr} bpm | Avg: ${hrAvg} | Target: ${patient.targets.hrMin}–${patient.targets.hrMax}
  SpO₂           — Latest: ${v?.spo2}%  | Target: ≥${patient.targets.spo2Min}%
  Weight         — Latest: ${v?.weight} kg | Target: ${patient.targets.weightMin}–${patient.targets.weightMax} kg

ACTIVE CLINICAL FLAGS:
${analysis.flags.length ? analysis.flags.map(f => '  ' + f.msg).join('\n') : '  None identified.'}

MEDICATIONS:
${patient.medications.map(m => '  • ' + m.name + ' (' + m.dose + ')').join('\n')}

CLINICAL RECOMMENDATIONS:
${graniteRecommendations(patient, analysis)}

TREND ANALYSIS:
  Glucose: ${trendArrow(patient.history, 'glucose')} · BP: ${trendArrow(patient.history, 'systolic')} · HR: ${trendArrow(patient.history, 'hr')}

NEXT STEPS:
  Review targets if flags persist >3 days.
  Schedule follow-up: ${analysis.level === 'critical' ? '48 hours (URGENT)' : analysis.level === 'warning' ? '1 week' : '4 weeks'}
  ${analysis.level === 'critical' ? '🚨 URGENT: Consider immediate clinical intervention.' : ''}

Note: Generated by IBM Granite Clinical AI Simulator. Not a substitute for clinical judgment.`;
}

/* ──────────────────────────────────────────────
   20. CLINICAL ADVICE GENERATORS
────────────────────────────────────────────────── */
function graniteRecommendations(patient, analysis) {
  const recs = [];
  const v = getLatestVitals(patient);
  if (!v) return '  Insufficient data.';

  if (patient.diagnosis.includes('diabetes')) {
    if (v.glucose > patient.targets.glucoseMax) recs.push('• Reduce refined carbohydrates; monitor post-meal glucose');
    if (v.glucose > 200) recs.push('• Contact prescriber to review medication/insulin dosing');
    recs.push('• 30 min moderate walking 5×/week improves insulin sensitivity');
    recs.push('• Log glucose before meals and 2 hours after each meal');
  }
  if (patient.diagnosis.includes('hypertension') || patient.diagnosis.includes('htn') || v.systolic > patient.targets.bpSystolicMax) {
    recs.push('• Limit sodium to <1500 mg/day; avoid processed foods');
    recs.push('• Stress reduction: deep breathing, meditation, yoga');
    if (v.systolic > 160) recs.push('• ⚠️ BP significantly elevated — contact provider today');
  }
  if (patient.diagnosis.includes('heart')) {
    recs.push('• Monitor daily weight; >2 kg gain in 48 h → contact provider immediately');
    recs.push('• Limit fluid intake as directed; avoid alcohol and smoking');
    recs.push('• Report chest pain, shortness of breath, or ankle swelling immediately');
    if (v.hr > patient.targets.hrMax) recs.push('• Elevated HR — avoid strenuous activity until reviewed');
  }
  if (patient.diagnosis.includes('copd')) {
    recs.push('• Use inhalers as prescribed; do not skip doses');
    recs.push('• Avoid respiratory triggers: smoke, dust, cold air');
    if (v.spo2 < 94) recs.push('• SpO₂ low — use supplemental O2 if prescribed; contact provider');
  }
  if (v.spo2 < patient.targets.spo2Min) recs.push('• SpO₂ below target — rest, avoid exertion, follow up with physician');
  recs.push('• Maintain medication schedule as prescribed');
  recs.push('• Log vitals at consistent times daily for accurate trend analysis');
  return recs.map(r => '  ' + r).join('\n');
}

function glucoseAdvice(glucose, patient) {
  if (!glucose) return 'No recent glucose reading.';
  if (glucose > 250) return '🔴 Critically elevated. Check for ketones, hydrate, contact your diabetes care team immediately. Do NOT exercise above 250 mg/dL.';
  if (glucose > patient.targets.glucoseMax) return '🟡 Above target. Reduce refined carbs, increase activity. If elevated >3 days, contact your provider.';
  if (glucose < 54) return '🔴 Severe hypoglycemia. Consume 15–20g fast-acting carbs immediately. Call emergency services if symptomatic or unable to self-treat.';
  if (glucose < 70) return '🔴 Hypoglycemia. Consume 15g fast-acting carbs (4 glucose tabs, ½ cup juice). Re-check in 15 min.';
  return '✅ Glucose within target range. Continue current management.';
}

function bpAdvice(sys, dia, patient) {
  if (!sys) return 'No recent BP reading.';
  if (sys > 180 || dia > 110) return '🔴 HYPERTENSIVE CRISIS. Seek emergency care immediately — call 911. Do not drive yourself.';
  if (sys > 160) return '🔴 Stage 2 hypertension. Contact your provider today. Avoid salt, caffeine, strenuous activity.';
  if (sys > patient.targets.bpSystolicMax) return '🟡 Above target. Reduce sodium, increase potassium-rich foods (bananas, leafy greens), practice stress reduction, take medications as prescribed.';
  return '✅ Blood pressure within target range. Excellent management.';
}

function heartAdvice(patient, analysis) {
  if (analysis.level === 'critical') return '🚨 Multiple critical flags. Contact your cardiologist or go to an emergency department now.';
  if (analysis.level === 'warning')  return '⚠️ Values outside target range. Review with your care team at next appointment or sooner if symptoms develop.';
  return '✅ Cardiac parameters within acceptable range. Continue current management and scheduled monitoring.';
}

function dietAdvice(patient) {
  const base = `🥗 Personalized Dietary Guidance — ${patient.name}:\n\n`;
  const tips = [];
  if (patient.diagnosis.includes('diabetes')) {
    tips.push('Diabetes-Friendly Diet (ADA Nutrition Therapy):',
      '• Choose whole grains, legumes, non-starchy vegetables for carbohydrates',
      '• Prefer low-GI foods: steel-cut oats, lentils, berries, leafy greens',
      '• Use the "Plate Method": ½ non-starchy veg, ¼ lean protein, ¼ complex carb',
      '• Limit: sugary beverages, white bread, pastries, fried foods',
      '• Hydration: 6–8 glasses water/day; avoid sweetened drinks');
  }
  if (patient.diagnosis.includes('hypertension') || patient.diagnosis.includes('htn')) {
    tips.push('DASH Diet for Hypertension (JNC-8 Recommendation):',
      '• Sodium: limit to <1500 mg/day; read labels on packaged foods',
      '• Increase: potassium (bananas, sweet potato), magnesium, calcium',
      '• Prioritize: fruits, vegetables, low-fat dairy, whole grains',
      '• Limit: red meat, saturated fats, alcohol (max 1 drink/day)');
  }
  if (patient.diagnosis.includes('heart') || patient.diagnosis.includes('cardiac')) {
    tips.push('Heart-Healthy Diet (AHA Guidelines):',
      '• Mediterranean-style: olive oil, oily fish 2×/week, nuts, legumes',
      '• Omega-3 fatty acids: salmon, mackerel, walnuts, flaxseed',
      '• Avoid: trans fats, high-sodium foods, excessive alcohol',
      '• Fluid management: monitor daily intake per cardiologist guidance',
      '• Small, frequent meals to reduce cardiac workload');
  }
  if (patient.diagnosis.includes('copd')) {
    tips.push('COPD Nutrition Guidance:',
      '• High-calorie, high-protein diet if underweight (breathing burns extra calories)',
      '• Small, frequent meals to avoid diaphragm compression from full stomach',
      '• Stay well hydrated to keep mucus thin',
      '• Limit carbonated drinks (bloating restricts breathing)');
  }
  if (!tips.length) {
    tips.push('General Healthy Diet:',
      '• Variety of fruits and vegetables (5+ servings/day)',
      '• Whole grains over refined carbohydrates',
      '• Lean proteins: fish, poultry, legumes, low-fat dairy',
      '• Limit processed foods, saturated fats, added sugar');
  }
  return base + tips.join('\n');
}

/* ──────────────────────────────────────────────
   21. AI ANALYSIS MODAL
────────────────────────────────────────────────── */
function requestAISummary() {
  const overlay = document.getElementById('ai-summary-overlay');
  const content = document.getElementById('ai-summary-content');
  overlay.classList.add('open');

  if (!hasIBMCredentials()) {
    content.textContent =
      '⚠️ IBM Granite credentials required.\n\n' +
      'This AI analysis requires a live IBM Granite model connection.\n\n' +
      'Please open ⚙️ Settings and enter:\n' +
      '  • IBM Cloud API Key\n' +
      '  • Watson ML Service URL  (e.g. https://us-south.ml.cloud.ibm.com)\n' +
      '  • watsonx.ai Project ID\n\n' +
      'IBM Cloud Lite plan is free — no credit card required.\n' +
      'See SETUP.md for step-by-step provisioning.';
    setTimeout(() => openSettings(), 600);
    return;
  }

  content.textContent = 'Connecting to IBM Granite (watsonx.ai)…';
  const p = STATE.patients[STATE.activePatientIdx];
  callRealGraniteChat(
    'Provide a comprehensive patient summary with risk assessment, active clinical flags, and evidence-based recommendations.',
    p
  )
    .then(res => { content.textContent = res; })
    .catch(err => {
      const fallbackAllowed = window.APP_CONFIG?.simulatorFallback === true;
      if (fallbackAllowed) {
        content.textContent =
          `⚠️ IBM Granite API unavailable: ${err.message}\n[SIMULATOR FALLBACK — not a real IBM response]\n\n` +
          graniteGeneratePatientSummary(p);
      } else {
        content.textContent = `❌ IBM Granite API error: ${err.message}\n\nCheck your credentials in ⚙️ Settings.`;
      }
    });
}

function closeAiSummary(e)    { if (e.target.id === 'ai-summary-overlay') closeAiSummaryDirect(); }
function closeAiSummaryDirect() { document.getElementById('ai-summary-overlay').classList.remove('open'); }

/* ──────────────────────────────────────────────
   22. PORTAL SWITCHING
────────────────────────────────────────────────── */
function switchPortal(name) {
  STATE.activePortal = name;
  document.querySelectorAll('.portal').forEach(p => p.classList.remove('active'));
  document.getElementById(`portal-${name}`)?.classList.add('active');
  document.querySelectorAll('.portal-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  const btn = document.getElementById(`btn-${name}`);
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }

  if (name === 'provider')   setTimeout(renderProviderPortal, 50);
  if (name === 'analytics')  setTimeout(renderAnalyticsPortal, 50);
}

function switchPatient(idx) {
  STATE.activePatientIdx = parseInt(idx);
  renderPatientDashboard();
}

/* ──────────────────────────────────────────────
   23. TOAST NOTIFICATIONS
────────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, color = 'blue') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:7rem;left:50%;transform:translateX(-50%) translateY(10px);
      padding:10px 20px;border-radius:10px;font-size:0.82rem;font-weight:500;
      z-index:900;transition:opacity 0.3s,transform 0.3s;opacity:0;pointer-events:none;
      font-family:'Inter',system-ui,sans-serif;backdrop-filter:blur(12px);
      border:1px solid transparent;white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  const colorMap = {
    emerald: { bg:'rgba(16,217,160,0.15)', border:'rgba(16,217,160,0.4)', color:'#10d9a0' },
    amber:   { bg:'rgba(245,166,35,0.15)', border:'rgba(245,166,35,0.4)', color:'#f5a623' },
    coral:   { bg:'rgba(255,75,110,0.15)', border:'rgba(255,75,110,0.4)', color:'#ff4b6e' },
    blue:    { bg:'rgba(59,130,246,0.15)', border:'rgba(59,130,246,0.4)', color:'#3b82f6' },
  };
  const c = colorMap[color] || colorMap.blue;
  toast.textContent = msg;
  toast.style.background  = c.bg;
  toast.style.borderColor = c.border;
  toast.style.color       = c.color;
  toast.style.opacity     = '1';
  toast.style.transform   = 'translateX(-50%) translateY(0)';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 3000);
}

/* ──────────────────────────────────────────────
   24. MANDATORY IBM CREDENTIAL ONBOARDING BANNER
   Shown on every load when credentials are absent
────────────────────────────────────────────────── */
function showIBMOnboardingBanner() {
  /* Inject a sticky banner at top of the page */
  const existing = document.getElementById('ibm-onboarding-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'ibm-onboarding-banner';
  banner.style.cssText = `
    position: sticky; top: 62px; z-index: 195;
    background: linear-gradient(135deg, rgba(255,75,110,0.18), rgba(245,166,35,0.14));
    border-bottom: 1px solid rgba(255,75,110,0.4);
    padding: 10px 2rem; display: flex; align-items: center; gap: 1rem;
    flex-wrap: wrap; font-family: 'Inter', system-ui, sans-serif; font-size: 0.82rem;
    backdrop-filter: blur(12px);
  `;
  banner.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4b6e" stroke-width="2" style="flex-shrink:0">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span style="color:#ff4b6e;font-weight:700">IBM Granite credentials required</span>
    <span style="color:#b0bbd0;flex:1">
      This application uses IBM Cloud Lite services. AI features are disabled until you configure your
      <strong style="color:#e8edf5">IBM Cloud API Key</strong>,
      <strong style="color:#e8edf5">Watson ML URL</strong>, and
      <strong style="color:#e8edf5">watsonx.ai Project ID</strong>.
      IBM Lite plan is free — no credit card needed.
    </span>
    <button onclick="openSettings()" style="
      padding:6px 16px; background:rgba(255,75,110,0.18); border:1px solid rgba(255,75,110,0.5);
      border-radius:6px; color:#ff4b6e; font-family:inherit; font-size:0.8rem; font-weight:600;
      cursor:pointer; white-space:nowrap; flex-shrink:0;">
      ⚙️ Configure Now
    </button>
    <button onclick="document.getElementById('ibm-onboarding-banner').remove()" style="
      background:none; border:none; color:#5a6780; cursor:pointer; font-size:1rem; padding:2px 6px;
      flex-shrink:0;" title="Dismiss (credentials still required for AI features)">✕</button>
  `;

  /* Insert after the topnav */
  const topnav = document.querySelector('.topnav');
  if (topnav && topnav.nextSibling) {
    topnav.parentNode.insertBefore(banner, topnav.nextSibling);
  } else {
    document.body.prepend(banner);
  }
}

function dismissIBMOnboardingBanner() {
  const b = document.getElementById('ibm-onboarding-banner');
  if (b) b.remove();
}

/* ──────────────────────────────────────────────
   25. INIT
────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Check if server environment credentials are set
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const serverConfig = await configRes.json();
      if (serverConfig.hasServerCredentials) {
        STATE.hasServerCredentials = true;
        STATE.settings.modelId = serverConfig.modelId || STATE.settings.modelId;
        STATE.settings.useReal = true; // Auto-enable real Granite API
      }
    }
  } catch (e) {
    console.warn('[VitalSense] Backend config check failed or offline:', e.message);
  }

  await loadState();
  renderPatientDashboard();
  renderNotifications();
  STATE.patients.forEach(p => evaluateAndAlert(p));
  renderNotifications();
  renderAlarmDashboard();
  updateIBMStatusDot();

  setEl('med-today-date', new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }));

  /* Enforce mandatory IBM credentials — show onboarding banner if missing */
  if (window.APP_CONFIG?.requireIBMCredentials && !hasIBMCredentials()) {
    showIBMOnboardingBanner();
  }

  console.log(
    `[VitalSense AI v${window.APP_CONFIG?.version || '2.0.0'}] Initialized.\n` +
    `  Patients: ${STATE.patients.length} | Vector store: ${CLINICAL_KNOWLEDGE.length} chunks\n` +
    `  IBM Granite: ${hasIBMCredentials() ? '✅ Credentials present' : '❌ MISSING — AI features require configuration'}`
  );
});
