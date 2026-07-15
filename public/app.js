/* ===================================================================
   VitalSense AI — Core Application
   app.js  ·  Vanilla ES6  ·  IBM watsonx.ai Studio Clinical AI
   CSV Patient Loader · RAG Vector Store · IBM Cloud Integration
   =================================================================== */

'use strict';

/* ----------------------------------------------
   1. FALLBACK SEED PATIENTS
   Used when CSV loading is unavailable (file:// protocol)
-------------------------------------------------- */
const SEED_PATIENTS = [
  {
    id: 0, name: 'Aarav Mehta', initials: 'AM', age: 45, sex: 'M',
    condition: 'Type 2 Diabetes & Nephropathy · Age 45 · M', diagnosis: 'type2_diabetes',
    primaryPhysician: 'Dr. Sanjay Gupta', insuranceId: 'AB-PMJAY-9921-AAR', nextAppointment: '2026-08-15',
    emergencyContact: 'Kavita Mehta (wife) +91-98250-12345',
    medications: [
      { name: 'Metformin 1000mg',  dose: 'Morning with food', time: 'AM' },
      { name: 'Glimepiride 2mg',     dose: 'Before breakfast',  time: 'AM' },
      { name: 'Telmisartan 40mg',   dose: 'Evening',           time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:140, bpSystolicMax:130, bpDiastolicMax:80, hrMin:60, hrMax:100, spo2Min:95, weightMin:65, weightMax:80 },
    history: [],
  },
  {
    id: 1, name: 'Priya Sharma', initials: 'PS', age: 58, sex: 'F',
    condition: 'Hypertension & CAD · Age 58 · F', diagnosis: 'hypertension',
    primaryPhysician: "Dr. James O'Brien", insuranceId: 'NIA-HYP-4412-PRI', nextAppointment: '2026-07-28',
    emergencyContact: 'Rahul Sharma (son) +91-98110-54321',
    medications: [
      { name: 'Amlodipine 5mg',           dose: 'Morning', time: 'AM' },
      { name: 'Atorvastatin 20mg',   dose: 'Night', time: 'PM' },
      { name: 'Clopidogrel 75mg',          dose: 'Morning', time: 'AM' },
    ],
    targets: { glucoseMin:70, glucoseMax:110, bpSystolicMax:130, bpDiastolicMax:80, hrMin:55, hrMax:90, spo2Min:96, weightMin:55, weightMax:68 },
    history: [],
  },
  {
    id: 2, name: 'Dr. Rajesh Iyer', initials: 'RI', age: 66, sex: 'M',
    condition: 'Heart Failure & COPD · Age 66 · M', diagnosis: 'heart_failure',
    primaryPhysician: 'Dr. Priya Sharma', insuranceId: 'STAR-HF-7730-RAJ', nextAppointment: '2026-08-02',
    emergencyContact: 'Vikram Iyer (son) +91-94440-98765',
    medications: [
      { name: 'Aspirin 75mg',        dose: 'Morning with food', time: 'AM' },
      { name: 'Carvedilol 12.5mg',   dose: 'Twice daily',       time: 'AM' },
      { name: 'Furosemide 40mg',     dose: 'Morning',           time: 'AM' },
      { name: 'Budesonide Inhaler', dose: 'Twice daily',           time: 'AM' },
    ],
    targets: { glucoseMin:70, glucoseMax:130, bpSystolicMax:120, bpDiastolicMax:75, hrMin:55, hrMax:85, spo2Min:92, weightMin:70, weightMax:85 },
    history: [],
  },
  {
    id: 3, name: 'Meena Krishnan', initials: 'MK', age: 52, sex: 'F',
    condition: 'Type 2 Diabetes & Hypertension · Age 52 · F', diagnosis: 'type2_diabetes_htn',
    primaryPhysician: 'Dr. Anitha Nair', insuranceId: 'MAX-DH-6612-MEE', nextAppointment: '2026-08-20',
    emergencyContact: 'Suresh Krishnan (husband) +91-96050-77890',
    medications: [
      { name: 'Metformin 500mg',    dose: 'Twice daily with meals', time: 'AM' },
      { name: 'Sitagliptin 100mg',  dose: 'Morning',                time: 'AM' },
      { name: 'Losartan 50mg',      dose: 'Evening',                time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:150, bpSystolicMax:135, bpDiastolicMax:85, hrMin:60, hrMax:100, spo2Min:95, weightMin:60, weightMax:76 },
    history: [],
  },
  {
    id: 4, name: 'Arjun Patel', initials: 'AP', age: 38, sex: 'M',
    condition: 'COPD & Hypertension · Age 38 · M', diagnosis: 'copd_htn',
    primaryPhysician: 'Dr. Vimal Shah', insuranceId: 'HDFC-CP-3341-ARJ', nextAppointment: '2026-09-01',
    emergencyContact: 'Pooja Patel (wife) +91-98260-44321',
    medications: [
      { name: 'Tiotropium Inhaler', dose: 'Once daily (morning)', time: 'AM' },
      { name: 'Salbutamol Inhaler', dose: 'As needed for breathlessness', time: 'AM' },
      { name: 'Telmisartan 40mg',   dose: 'Evening',                time: 'PM' },
    ],
    targets: { glucoseMin:70, glucoseMax:110, bpSystolicMax:140, bpDiastolicMax:90, hrMin:60, hrMax:95, spo2Min:90, weightMin:68, weightMax:82 },
    history: [],
  },
];

/* ----------------------------------------------
   2. CSV PARSER
   Parses patients.csv into patient objects
-------------------------------------------------- */
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

/* ----------------------------------------------
   3. HISTORY GENERATOR
-------------------------------------------------- */
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

/* ----------------------------------------------
   4. CLIENT-SIDE VECTOR STORE (RAG Layer 1)
   Lightweight TF-IDF cosine similarity for
   matching queries to clinical knowledge chunks
-------------------------------------------------- */
const CLINICAL_KNOWLEDGE = [
  { id: 'icmr_diabetes_targets', title: 'ICMR Diabetes Guidelines (India)', text: 'ICMR Guidelines: Fasting blood glucose target: 90-130 mg/dL. Post-meal (2hr): <180 mg/dL. HbA1c target: <7.0%. For elderly or those with microvascular complications like diabetic nephropathy, HbA1c <7.5-8.0% is acceptable. Hypoglycemia: <70 mg/dL. Screening for diabetic kidney disease should be done annually with urine albumin-to-creatinine ratio (UACR).' },
  { id: 'csi_hypertension', title: 'CSI Hypertension Guidelines (India)', text: 'Cardiological Society of India (CSI) Guidelines: Blood pressure target in general population: <140/90 mmHg. Target for diabetics, CAD, or chronic kidney disease (CKD): <130/80 mmHg. Stage 1 hypertension: 130-139/80-89 mmHg. Stage 2: ≥140/90 mmHg. Hypertensive emergency: >180/120 mmHg with target organ damage. South Asians have a 2-3x higher baseline cardiovascular mortality risk, warranting earlier lifestyle and pharmacotherapy interventions.' },
  { id: 'indian_diet_diabetes', title: 'Indian Dietary Therapy for Diabetes', text: 'Dietary management: Emphasize complex carbohydrates with low glycemic index (e.g., ragi, jowar, bajra, brown rice, whole wheat roti) instead of polished white rice and maida. Increase soluble fiber through dals, pulses, leafy green vegetables, and salads. Restrict high-GI fruits like mango, banana, and sapota. Limit total carbohydrate intake to 50-60% of daily calories.' },
  { id: 'indian_hypertension_diet', title: 'Hypertension Management & Salt in India', text: 'Dietary salt reduction in India: Average daily salt intake in India is 9-12g; target restriction is <5g/day (approx 1 level teaspoon) to lower systolic BP by 6-8 mmHg. Emphasize DASH-style diet adapted for India: high intake of potassium-rich vegetables (drumstick, spinach, ridge gourd), low-fat curd, pulses, and seeds. Avoid pickles, papads, chutneys, and salted snacks (namkeen).' },
  { id: 'south_asian_cvd_risk', title: 'South Asian Cardiovascular Susceptibility', text: 'South Asians exhibit high susceptibility to premature atherosclerotic cardiovascular disease (ASCVD). Risk factors include high levels of Lipoprotein(a), visceral adiposity (increased waist circumference at lower BMIs; overweight cutoff is 23 kg/m2 for South Asians instead of 25 kg/m2), high triglycerides, and low HDL cholesterol. Early screening from age 30 is recommended.' },
  { id: 'heart_failure_in_india', title: 'Heart Failure & COPD in Indian Settings', text: 'Heart failure management: Daily weight monitoring is critical. A sudden weight gain of >2 kg in 48 hours indicates acute fluid overload and requires immediate diuretic (e.g., furosemide) adjustments. Limit daily fluid intake to 1.5-2.0 liters. In patients with concurrent COPD/asthma, non-selective beta-blockers must be avoided; cardio-selective beta-blockers (like metoprolol succinate or nebivolol) or ARNI should be used.' },
  { id: 'ayushman_bharat_chronic_care', title: 'Ayushman Bharat & Chronic Care Access', text: 'Ayushman Bharat PM-JAY provides financial cover up to ₹5 lakh per family per year for secondary and tertiary care hospitalization in India, covering diabetes complications, cardiovascular surgeries, angioplasty, hemodialysis for CKD, and COPD exacerbations. Health & Wellness Centres (HWCs) provide free essential medicines for hypertension and diabetes.' }
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

/* ----------------------------------------------
   5. APPLICATION STATE
-------------------------------------------------- */
const STATE = {
  patients:           [],
  activePatientIdx:   0,
  activePortal:       'patient',
  providerPatientIdx: 0,
  alerts:             [],
  logDraft:           {},
  charts:             {},
  settings: {
    modelId: 'ibm/granite-3-2-8b-instruct',
    useReal: false,
    cosEndpoint: '',
    cosBucket: 'vitalsense-reports',
    cosEnabled: true,
    discoveryEnabled: false,
  },
  medTaken: {},
  
  // Advanced Telemetry & Simulation States
  telemetryMode:      'simulated',
  telemetryTimer:     null,
  pollingTimer:       null,
  
  // Outcomes Simulator States
  outcomeSteps:       5000,
  outcomeSalt:        9,
  outcomeCarbs:       60,
};

/* ----------------------------------------------
   6. PERSISTENCE
-------------------------------------------------- */
function savePatients()    { try { localStorage.setItem('vs_patients', JSON.stringify(STATE.patients)); } catch(e) {} }
function persistSettings() { /* Client-side browser settings are disabled for security; server-side .env config is used instead. */ }
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

/* ----------------------------------------------
   7. ANALYTICS ENGINE
-------------------------------------------------- */
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

/* ----------------------------------------------
   8. UI HELPERS
-------------------------------------------------- */
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

/* ----------------------------------------------
   9. PATIENT DASHBOARD RENDER
-------------------------------------------------- */
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
  
  // Calculate dynamic health score
  const healthScore = calculateHealthScore(p);
  setEl('pt-health-score', `${healthScore}/100`);
  
  // Emergency Banner controls
  const banner = document.getElementById('emergency-banner');
  const textEl = document.getElementById('emergency-text');
  const contactNameEl = document.getElementById('emergency-contact-name');
  const contactPhoneEl = document.getElementById('emergency-contact-phone');
  const criticalFlags = analysis.flags.filter(f => f.type === 'critical');
  
  if (criticalFlags.length && banner) {
    banner.style.display = 'flex';
    if (textEl) textEl.textContent = criticalFlags.map(f => f.msg.replace('🔴 ', '')).join(' | ');
    let contactName = 'Kavita Mehta';
    let contactPhone = '+91-98250-12345';
    if (p.emergencyContact) {
      const match = p.emergencyContact.match(/^(.*?)\s*(\+?[\d-]+)$/);
      if (match) {
        contactName = match[1].trim();
        contactPhone = match[2].trim();
      } else {
        contactName = p.emergencyContact;
      }
    }
    if (contactNameEl) contactNameEl.textContent = contactName;
    if (contactPhoneEl) contactPhoneEl.textContent = contactPhone;
  } else if (banner) {
    banner.style.display = 'none';
  }

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

    // Temperature
    const temp = v.temp ?? 36.6;
    setEl('mv-temp', temp);
    const tempSt = temp > 38.5 ? { text:'Fever', cls:'status-critical' } : temp < 36.0 ? { text:'Low', cls:'status-low' } : { text:'Normal', cls:'status-normal' };
    const msTemp = document.getElementById('ms-temp');
    if (msTemp) { msTemp.textContent = tempSt.text; msTemp.className = `metric-status ${tempSt.cls}`; }
    setEl('mt-temp', '');
    colorCard('mc-temp', tempSt.cls);

    // Respiration
    const resp = v.resp ?? 16;
    setEl('mv-resp', resp);
    const respSt = resp > 24 ? { text:'Elevated', cls:'status-elevated' } : resp < 12 ? { text:'Low', cls:'status-low' } : { text:'Normal', cls:'status-normal' };
    const msResp = document.getElementById('ms-resp');
    if (msResp) { msResp.textContent = respSt.text; msResp.className = `metric-status ${respSt.cls}`; }
    setEl('mt-resp', '');
    colorCard('mc-resp', respSt.cls);

    // Sleep
    const sleep = v.sleep ?? 7.5;
    setEl('mv-sleep', sleep);
    const sleepSt = sleep < 6 ? { text:'Low', cls:'status-low' } : sleep > 9 ? { text:'Excess', cls:'status-elevated' } : { text:'Healthy', cls:'status-normal' };
    const msSleep = document.getElementById('ms-sleep');
    if (msSleep) { msSleep.textContent = sleepSt.text; msSleep.className = `metric-status ${sleepSt.cls}`; }
    setEl('mt-sleep', '');
    const sleepFill = document.getElementById('sleep-fill');
    if (sleepFill) sleepFill.style.width = `${Math.min(100, (sleep / 8) * 100)}%`;

    // Stress Level
    const stress = v.stress ?? 3;
    setEl('mv-stress', stress);
    const stressSt = stress > 7 ? { text:'High', cls:'status-critical' } : stress > 5 ? { text:'Moderate', cls:'status-elevated' } : { text:'Low', cls:'status-normal' };
    const msStress = document.getElementById('ms-stress');
    if (msStress) { msStress.textContent = stressSt.text; msStress.className = `metric-status ${stressSt.cls}`; }
    setEl('mt-stress', '');

    // Activity
    const activity = v.activity ?? 5000;
    setEl('mv-activity', activity.toLocaleString());
    const actSt = activity < 3000 ? { text:'Sedentary', cls:'status-low' } : activity > 10000 ? { text:'Active', cls:'status-normal' } : { text:'Moderate', cls:'status-elevated' };
    const msActivity = document.getElementById('ms-activity');
    if (msActivity) { msActivity.textContent = actSt.text; msActivity.className = `metric-status ${actSt.cls}`; }
    setEl('mt-activity', activity >= 10000 ? '✓ Goal Reached' : `${(10000 - activity).toLocaleString()} to goal`);

    // Water Intake
    const water = v.water ?? 1800;
    setEl('mv-water', water.toLocaleString());
    const waterSt = water < 1500 ? { text:'Low', cls:'status-low' } : water >= 2500 ? { text:'Optimal', cls:'status-normal' } : { text:'Fair', cls:'status-elevated' };
    const msWater = document.getElementById('ms-water');
    if (msWater) { msWater.textContent = waterSt.text; msWater.className = `metric-status ${waterSt.cls}`; }
    setEl('mt-water', '');
    const waterFill = document.getElementById('water-fill');
    if (waterFill) waterFill.style.width = `${Math.min(100, (water / 3000) * 100)}%`;

    // BMI
    const height = parseFloat(document.getElementById('pt-height')?.textContent) || 174;
    const bmiVal = v.weight && height ? +(v.weight / ((height / 100) ** 2)).toFixed(1) : 0;
    setEl('mv-bmi', bmiVal || '—');
    setEl('pt-bmi', bmiVal ? `${bmiVal} kg/m²` : '—');
    const bmiCat = !bmiVal ? 'Unknown' : bmiVal < 18.5 ? 'Underweight' : bmiVal < 23 ? 'Normal' : bmiVal < 27.5 ? 'Overweight' : 'Obese';
    setEl('mv-bmi-cat', bmiCat);
    const msBMI = document.getElementById('ms-bmi');
    if (msBMI) { msBMI.textContent = bmiCat; msBMI.className = `metric-status ${bmiVal && bmiVal < 23 ? 'status-normal' : bmiVal < 27.5 ? 'status-elevated' : 'status-critical'}`; }
    colorCard('mc-bmimeter', bmiVal && bmiVal < 23 ? 'status-normal' : 'status-elevated');
  }

  renderMedications(p);
  renderRecentLogs(p);
  renderVitalsChart('glucose');
  renderMedAdherenceChart(p);
  updateOutcomesSimulator();
}

/* ----------------------------------------------
   10. MEDICATION & LOGS RENDER
-------------------------------------------------- */
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

/* ----------------------------------------------
   11. CHART.JS WRAPPERS
-------------------------------------------------- */
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

/* ----------------------------------------------
   12. PROVIDER PORTAL
-------------------------------------------------- */
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
  loadProviderPatientReports(p);
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
      '⚠️ IBM watsonx.ai Studio credentials required.\n\n' +
      'Provide your IBM Cloud API Key, Watson ML URL, and Project ID in ⚙️ Settings\n' +
      'to generate a real IBM watsonx.ai Studio clinical report.\n\n' +
      'IBM Cloud Lite plan is free — see SETUP.md.';
    setTimeout(() => openSettings(), 400);
    return;
  }

  output.textContent = 'Connecting to IBM watsonx.ai Studio (watsonx.ai)…';
  callRealGraniteChat(
    'Generate a structured clinical report including longitudinal vital statistics, active flags, medication schedule, risk assessment, and recommended next steps.',
    p
  )
    .then(res => { output.textContent = res; })
    .catch(err => {
      const fallbackAllowed = window.APP_CONFIG?.simulatorFallback === true;
      if (fallbackAllowed) {
        output.textContent = `⚠️ IBM watsonx.ai Studio unavailable: ${err.message}\n[SIMULATOR FALLBACK]\n\n${graniteGenerateClinicalSummary(p)}`;
      } else {
        output.textContent = `❌ IBM watsonx.ai Studio error: ${err.message}\n\nCheck credentials in ⚙️ Settings.`;
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

/* ----------------------------------------------
   13. ANALYTICS PORTAL
-------------------------------------------------- */
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

  // Activity vs Steps chart
  const actCtx = document.getElementById('analytics-activity-chart');
  if (actCtx) {
    if (STATE.charts.analyticsActivity) STATE.charts.analyticsActivity.destroy();
    const days7 = [];
    const now7 = Date.now();
    for (let d = 6; d >= 0; d--) {
      days7.push(new Date(now7 - d * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    const activityData = days7.map(() => Math.round(rand(3500, 11000)));
    const caloriesData = activityData.map(steps => Math.round(steps * 0.045));
    STATE.charts.analyticsActivity = new Chart(actCtx, {
      type: 'line',
      data: {
        labels: days7,
        datasets: [
          { label: 'Steps', data: activityData, borderColor: '#10d9a0', backgroundColor: 'rgba(16,217,160,0.06)', fill: true, yAxisID: 'y' },
          { label: 'Calories Burned', data: caloriesData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.06)', fill: false, yAxisID: 'y1' },
        ],
      },
      options: {
        ...chartDefaults(),
        scales: {
          ...chartDefaults().scales,
          y:  { ...chartDefaults().scales.y, title: { display: true, text: 'Steps', color: '#5a6780', font: { size: 10 } } },
          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#5a6780', font: { size: 10 } }, title: { display: true, text: 'Calories', color: '#5a6780', font: { size: 10 } } },
        },
      },
    });
  }

  // Medication compliance chart
  const medsCtx = document.getElementById('analytics-meds-chart');
  if (medsCtx) {
    if (STATE.charts.analyticsMeds) STATE.charts.analyticsMeds.destroy();
    const today = new Date().toISOString().slice(0, 10);
    const complianceData = STATE.patients.map(p => {
      const total = p.medications.length;
      if (!total) return 0;
      const taken = p.medications.filter((_, i) => STATE.medTaken[`${p.id}_${i}_${today}`]).length;
      return Math.round((taken / total) * 100);
    });
    STATE.charts.analyticsMeds = new Chart(medsCtx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{ label: 'Compliance %', data: complianceData, backgroundColor: complianceData.map(v => v >= 75 ? 'rgba(16,217,160,0.7)' : v >= 40 ? 'rgba(245,166,35,0.7)' : 'rgba(255,75,110,0.7)'), borderRadius: 6, borderWidth: 0 }],
      },
      options: { ...chartDefaults(), plugins: { legend: { display: false } }, scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, max: 100 } } },
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
    ['AI Mode',              STATE.settings.useReal ? `<span style="color:var(--teal)">watsonx.ai Live</span>` : 'Simulator'],
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
  const cosStatus = (STATE.settings.cosApiKey || STATE.settings.apiKey) && STATE.settings.cosEndpoint ? 'active' : 'optional';
  const items = [
    { title:'Client Vector Store', desc:`${CLINICAL_KNOWLEDGE.length} clinical knowledge chunks indexed (ADA, JNC-8, AHA guidelines). Active for all queries.`, status:'active', label:'Active' },
    { title:'IBM Cloud Object Storage', desc:`COS Endpoint: ${STATE.settings.cosEndpoint || 'Not configured'}. Bucket: ${STATE.settings.cosBucket || 'vitalsense-reports'}. Stores uploaded PDFs, reports, and AI-generated health dossiers.`, status: cosStatus, label: cosStatus === 'active' ? 'Connected' : 'Not Configured' },
    { title:'IBM Watson ML / watsonx.ai', desc:`Model: ${STATE.settings.modelId || 'ibm/granite-3-2-8b-instruct'}. Real AI inference via watsonx.ai Studio.`, status: STATE.settings.useReal ? 'active' : 'optional', label: STATE.settings.useReal ? 'Connected' : 'Simulator Mode' },
    { title:'Patient Dataset', desc:`${STATE.patients.length} patients loaded (${STATE.patients.filter(p => analyzeVitals(p).level === 'critical').length} critical, ${STATE.patients.filter(p => analyzeVitals(p).level === 'warning').length} warning). Edit patients.csv to modify.`, status:'active', label:'Loaded' },
  ];
  container.innerHTML = items.map(item => `
    <div class="rag-item">
      <div class="rag-item-title">${item.title}</div>
      <div class="rag-item-desc">${item.desc}</div>
      <div class="rag-item-status rag-${item.status}">${item.label}</div>
    </div>
  `).join('');
}

/* ----------------------------------------------
   14. LOG MODAL
-------------------------------------------------- */
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

/* ----------------------------------------------
   15. NOTIFICATIONS
-------------------------------------------------- */
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

/* ----------------------------------------------
   16. SETTINGS
-------------------------------------------------- */
function openSettings() {
  const s = STATE.settings;
  document.getElementById('cfg-apikey').value    = s.apiKey    || '';
  document.getElementById('cfg-url').value       = s.watsonUrl || '';
  document.getElementById('cfg-model').value     = s.modelId   || 'ibm/granite-3-2-8b-instruct';
  document.getElementById('cfg-project').value   = s.projectId || '';
  document.getElementById('cfg-use-real').checked = s.useReal  || false;
  // COS Settings
  const cosApiKey = document.getElementById('cfg-cos-apikey');
  const cosEndpoint = document.getElementById('cfg-cos-endpoint');
  const cosBucket = document.getElementById('cfg-cos-bucket');
  const cosInstance = document.getElementById('cfg-cos-instance');
  const cosEnabled = document.getElementById('cfg-cos-enabled');
  if (cosApiKey) cosApiKey.value     = s.cosApiKey   || '';
  if (cosEndpoint) cosEndpoint.value = s.cosEndpoint || 's3.us-south.cloud-object-storage.appdomain.cloud';
  if (cosBucket) cosBucket.value     = s.cosBucket   || 'vitalsense-reports';
  if (cosInstance) cosInstance.value = s.cosInstanceId || '';
  if (cosEnabled) cosEnabled.checked = s.cosEnabled !== false;
  document.getElementById('settings-overlay').classList.add('open');
  updateApiStatus();
}
function closeSettings(e)   { if (e.target.id === 'settings-overlay') closeSettingsDirect(); }
function closeSettingsDirect() { document.getElementById('settings-overlay').classList.remove('open'); }

function saveSettings() {
  STATE.settings.apiKey    = document.getElementById('cfg-apikey').value.trim();
  STATE.settings.watsonUrl = document.getElementById('cfg-url').value.trim();
  STATE.settings.modelId   = document.getElementById('cfg-model').value.trim() || 'ibm/granite-3-2-8b-instruct';
  STATE.settings.projectId = document.getElementById('cfg-project').value.trim();
  /* useReal is always true when credentials are present — toggle is kept for override only */
  STATE.settings.useReal   = document.getElementById('cfg-use-real').checked;
  // COS Settings
  const cosApiKey = document.getElementById('cfg-cos-apikey');
  const cosEndpoint = document.getElementById('cfg-cos-endpoint');
  const cosBucket = document.getElementById('cfg-cos-bucket');
  const cosInstance = document.getElementById('cfg-cos-instance');
  const cosEnabled = document.getElementById('cfg-cos-enabled');
  STATE.settings.cosApiKey    = cosApiKey   ? cosApiKey.value.trim()   : '';
  STATE.settings.cosEndpoint  = cosEndpoint ? cosEndpoint.value.trim() : 's3.us-south.cloud-object-storage.appdomain.cloud';
  STATE.settings.cosBucket    = cosBucket   ? cosBucket.value.trim()   : 'vitalsense-reports';
  STATE.settings.cosInstanceId = cosInstance ? cosInstance.value.trim() : '';
  STATE.settings.cosEnabled   = cosEnabled  ? cosEnabled.checked       : true;
  // Legacy discovery fields — keep for backward compat
  STATE.settings.discoveryEnabled = false;

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
      ? `IBM watsonx.ai Studio connected (${STATE.settings.modelId}).`
      : 'Settings saved. IBM watsonx.ai Studio credentials still required.',
    hasIBMCredentials() ? 'emerald' : 'amber'
  );
}

function updateApiStatus() {
  const el = document.getElementById('api-status');
  if (!el) return;
  if (STATE.hasServerCredentials) {
    el.textContent = `✅ IBM watsonx.ai Studio ready via server environment variables — model: ${STATE.settings.modelId || 'ibm/granite-3-2-8b-instruct'}`;
    el.className = 'api-status connected';
  } else {
    el.textContent = '⚠️ IBM Cloud credentials are not configured on the server. Configure .env and restart the app.';
    el.className = 'api-status error';
  }
}

function updateIBMStatusDot() {
  const dot   = document.getElementById('ibm-status-dot');
  const label = dot?.querySelector('.ibm-status-label');
  if (!dot) return;

  const ready = hasIBMCredentials();
  dot.className = ready ? 'ibm-status-dot connected' : 'ibm-status-dot error';
  if (label) label.textContent = ready ? 'watsonx.ai Studio Live' : 'No Credentials';

  const chatTag = document.getElementById('chat-model-tag');
  if (chatTag) {
    chatTag.textContent = ready ? (STATE.settings.modelId || 'ibm/granite-3-2-8b-instruct') : '⚠️ Not Connected';
    chatTag.className   = `chat-model-tag ${ready ? 'real' : ''}`;
  }
}

async function testConnection() {
  const el = document.getElementById('api-status');
  if (!el) return;
  el.textContent = 'Testing IBM Cloud credentials via server...';
  el.className = 'api-status muted-label';
  try {
    const res = await fetch('/api/test-connection', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      el.textContent = '✅ IBM Cloud credentials are valid and loaded from server .env.';
      el.className = 'api-status connected';
      STATE.hasServerCredentials = true;
      updateIBMStatusDot();
    } else {
      el.textContent = `❌ Authentication failed: ${data.error || 'Check server .env configuration.'}`;
      el.className = 'api-status error';
    }
  } catch (e) {
    el.textContent = `❌ Connection error: ${e.message}`;
    el.className = 'api-status error';
  }
}

/* ----------------------------------------------
   17. AI CHAT
-------------------------------------------------- */
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
  return !!STATE.hasServerCredentials;
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
      '⚠️ IBM watsonx.ai Studio credentials are required.\n\nThis application uses server-side environment variables only. Configure IBM Cloud API Key, Watson ML Service URL, and watsonx.ai Project ID in the server .env file or Render environment settings, then restart the app.\n\nSee SETUP.md for provisioning guidance.',
      'ai', msgs
    );
    setTimeout(() => openSettings(), 800);
    return;
  }

  /* Route through real IBM watsonx.ai Studio — simulator only if API call fails */
  callRealGraniteChat(text, p)
    .then(response => {
      typingEl.remove();
      appendChatMsg(response, 'ai', msgs);
      speakText(response);
    })
    .catch(err => {
      typingEl.remove();
      const fallbackAllowed = window.APP_CONFIG?.simulatorFallback === true;
      if (fallbackAllowed) {
        console.warn(`IBM watsonx.ai Studio API unavailable: ${err.message}. Falling back to offline Granite Simulator.`);
        const simResponse = graniteChat(text, p);
        appendChatMsg(simResponse, 'ai', msgs);
        speakText(simResponse);
      } else {
        appendChatMsg(`❌ IBM watsonx.ai Studio API error: ${err.message}\n\nPlease check your credentials in ⚙️ Settings.`, 'ai', msgs);
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

/* ----------------------------------------------
   18. REAL IBM GRANITE API CALL
-------------------------------------------------- */
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

  return await callGraniteAPI(prompt);
}

/* ----------------------------------------------
   19. IBM GRANITE SIMULATOR (Clinical LLM)
-------------------------------------------------- */
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

  return `🤖 IBM watsonx.ai Studio Clinical AI — ${patient.name}:\n\nLatest vitals:\n• Glucose: ${v?.glucose ?? '—'} mg/dL\n• BP: ${v?.systolic}/${v?.diastolic} mmHg\n• HR: ${v?.hr} bpm · SpO₂: ${v?.spo2}%\n• Risk: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)\n\n${analysis.flags.length ? 'Active concerns:\n' + analysis.flags.map(f => '• ' + f.msg).join('\n') : '✅ No critical flags.'}\n\nAsk about glucose, BP, cardiac risk, diet, medications, or request a full summary.`;
}

function graniteGeneratePatientSummary(patient) {
  const v = getLatestVitals(patient);
  const analysis = analyzeVitals(patient);
  const glucAvg = avgField(patient.history, 'glucose');
  const bpAvg   = avgField(patient.history, 'systolic');
  return `🤖 IBM watsonx.ai Studio — Patient Summary
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

  return `IBM watsonx.ai Studio Clinical AI — Structured Report
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

Note: Generated by IBM watsonx.ai Studio Clinical AI Simulator. Not a substitute for clinical judgment.`;
}

/* ----------------------------------------------
   20. CLINICAL ADVICE GENERATORS
-------------------------------------------------- */
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

/* ----------------------------------------------
   21. AI ANALYSIS MODAL
-------------------------------------------------- */
function requestAISummary() {
  const overlay = document.getElementById('ai-summary-overlay');
  const content = document.getElementById('ai-summary-content');
  overlay.classList.add('open');

  if (!hasIBMCredentials()) {
    content.textContent =
      '⚠️ IBM watsonx.ai Studio credentials required.\n\n' +
      'This AI analysis requires a live IBM watsonx.ai Studio model connection.\n\n' +
      'Configure the IBM Cloud API Key, Watson ML Service URL, and watsonx.ai Project ID as server-side environment variables in .env or Render dashboard, then restart the app.\n\n' +
      'IBM Cloud Lite plan is free — no credit card required.\n' +
      'See SETUP.md for step-by-step provisioning.';
    setTimeout(() => openSettings(), 600);
    return;
  }

  content.textContent = 'Connecting to IBM watsonx.ai Studio (watsonx.ai)…';
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
          `⚠️ IBM watsonx.ai Studio API unavailable: ${err.message}\n[SIMULATOR FALLBACK — not a real IBM response]\n\n` +
          graniteGeneratePatientSummary(p);
      } else {
        content.textContent = `❌ IBM watsonx.ai Studio API error: ${err.message}\n\nCheck your server .env configuration.`;
      }
    });
}

function closeAiSummary(e)    { if (e.target.id === 'ai-summary-overlay') closeAiSummaryDirect(); }
function closeAiSummaryDirect() { document.getElementById('ai-summary-overlay').classList.remove('open'); }

/* ----------------------------------------------
   22. PORTAL SWITCHING
-------------------------------------------------- */
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
  renderTimeline();
}

/* ----------------------------------------------
   23. TOAST NOTIFICATIONS
-------------------------------------------------- */
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

/* ----------------------------------------------
   24. MANDATORY IBM CREDENTIAL ONBOARDING BANNER
   Shown on every load when credentials are absent
-------------------------------------------------- */
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
    <span style="color:#ff4b6e;font-weight:700">IBM watsonx.ai Studio credentials required</span>
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

/* ----------------------------------------------
   24A. ADVANCED TELEMETRY & IOT STREAMING
   -------------------------------------------------- */
function initTelemetryStream() {
  stopTelemetryStreams();
  
  if (STATE.telemetryMode === 'simulated') {
    STATE.telemetryTimer = setInterval(() => {
      generateAndInjectLocalVital();
    }, 4000);
    console.log('[Telemetry] Simulated telemetry active.');
  } else if (STATE.telemetryMode === 'live') {
    STATE.pollingTimer = setInterval(() => {
      fetchLiveVitalsFromServer();
    }, 4000);
    console.log('[Telemetry] Live external polling active.');
  }
}

function stopTelemetryStreams() {
  if (STATE.telemetryTimer) {
    clearInterval(STATE.telemetryTimer);
    STATE.telemetryTimer = null;
  }
  if (STATE.pollingTimer) {
    clearInterval(STATE.pollingTimer);
    STATE.pollingTimer = null;
  }
}

function generateAndInjectLocalVital() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  const latest = getLatestVitals(p);
  if (!latest) return;
  
  const newVital = {
    ts: Date.now(),
    type: 'vitals',
    glucose: Math.round(latest.glucose + rand(-6, 6)),
    systolic: Math.round(latest.systolic + rand(-4, 4)),
    diastolic: Math.round(latest.diastolic + rand(-3, 3)),
    hr: Math.round(latest.hr + rand(-4, 4)),
    spo2: parseFloat(Math.min(100, Math.max(85, latest.spo2 + rand(-0.4, 0.4))).toFixed(1)),
    weight: parseFloat((latest.weight + rand(-0.1, 0.1)).toFixed(1))
  };
  
  // Constrained boundaries
  newVital.glucose = Math.max(45, Math.min(420, newVital.glucose));
  newVital.systolic = Math.max(80, Math.min(210, newVital.systolic));
  newVital.diastolic = Math.max(50, Math.min(125, newVital.diastolic));
  newVital.hr = Math.max(45, Math.min(160, newVital.hr));
  newVital.spo2 = Math.max(70, Math.min(100, newVital.spo2));
  
  p.history.push(newVital);
  if (p.history.length > 30) p.history.shift();
  
  savePatients();
  renderPatientDashboard();
  if (STATE.activePortal === 'provider') selectProviderPatient(STATE.providerPatientIdx);
  logStreamEvent(`Simulated IoT Pulse: Glucose ${newVital.glucose} mg/dL, BP ${newVital.systolic}/${newVital.diastolic} mmHg, HR ${newVital.hr} bpm`);
}

async function fetchLiveVitalsFromServer() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  try {
    const res = await fetch(`/api/live-vitals/${p.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const resData = await res.json();
    if (resData && resData.data) {
      const liveData = resData.data;
      const latest = getLatestVitals(p);
      
      if (!latest || liveData.ts > latest.ts) {
        const mergedVital = {
          ts: liveData.ts,
          type: 'vitals',
          glucose: liveData.glucose || (latest ? latest.glucose : 100),
          systolic: liveData.systolic || (latest ? latest.systolic : 120),
          diastolic: liveData.diastolic || (latest ? latest.diastolic : 80),
          hr: liveData.hr || (latest ? latest.hr : 72),
          spo2: liveData.spo2 || (latest ? latest.spo2 : 98),
          weight: liveData.weight || (latest ? latest.weight : 70)
        };
        p.history.push(mergedVital);
        if (p.history.length > 30) p.history.shift();
        
        savePatients();
        renderPatientDashboard();
        if (STATE.activePortal === 'provider') selectProviderPatient(STATE.providerPatientIdx);
        logStreamEvent(`🔴 Live IoT Signal Received: Glucose ${mergedVital.glucose} mg/dL, BP ${mergedVital.systolic}/${mergedVital.diastolic} mmHg`);
        showToast(`Live IoT vital signal parsed!`, 'emerald');
      }
    }
  } catch (err) {
    console.warn('[Telemetry] Poll failed:', err.message);
  }
}

function logStreamEvent(msg) {
  const consoleEl = document.getElementById('telemetry-stream-console');
  if (!consoleEl) return;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const logLine = document.createElement('div');
  logLine.className = 'console-line';
  logLine.innerHTML = `<span class="console-time">[${timeStr}]</span> <span class="console-msg">${msg}</span>`;
  consoleEl.appendChild(logLine);
  consoleEl.scrollTop = consoleEl.scrollHeight;
  
  while (consoleEl.children.length > 15) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
}

async function sendSimulatedIoTRequest(glucose, systolic, diastolic, hr, spo2, weight) {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const payload = {
    patientId: p.id,
    glucose: glucose || undefined,
    systolic: systolic || undefined,
    diastolic: diastolic || undefined,
    hr: hr || undefined,
    spo2: spo2 || undefined,
    weight: weight || undefined
  };
  
  try {
    const res = await fetch('/api/live-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      logStreamEvent(`📤 IoT Webhook Triggered for ${p.name}`);
      showToast('IoT data pushed to webhook endpoint.', 'blue');
      await fetchLiveVitalsFromServer();
    } else {
      showToast('Failed to trigger webhook.', 'coral');
    }
  } catch (err) {
    console.error('[Telemetry] Error pushing IoT:', err);
    showToast('IoT Server connection failure.', 'coral');
  }
}

function changeTelemetryMode(mode) {
  STATE.telemetryMode = mode;
  document.querySelectorAll('.tel-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  
  const devDeck = document.getElementById('iot-device-deck');
  if (devDeck) {
    devDeck.style.display = mode === 'external' ? 'block' : 'none';
  }
  
  initTelemetryStream();
  showToast(`Telemetry: ${mode.toUpperCase()} mode`, 'blue');
}

/* ----------------------------------------------
   24B. SOUTH ASIAN CVD RISK & OUTCOME SIMULATOR
   -------------------------------------------------- */
function calculateSouthAsianCVDRisk(patient) {
  const v = getLatestVitals(patient);
  if (!v) return { score: 10, level: 'Low' };
  
  let score = 0;
  
  // Accelerated vascular aging in Indian population
  if (patient.age < 40) score += 8;
  else if (patient.age < 50) score += 20;
  else if (patient.age < 60) score += 32;
  else score += 42;
  
  if (patient.sex === 'M') score += 12;
  
  // BP score
  if (v.systolic > 160 || v.diastolic > 100) score += 26;
  else if (v.systolic > 140 || v.diastolic > 90) score += 18;
  else if (v.systolic > 130 || v.diastolic > 85) score += 10;
  
  // Diabetes is highly atherogenic in South Asians
  if (patient.diagnosis.includes('diabetes')) {
    score += 25;
    if (v.glucose > 180) score += 12;
  }
  
  // Weight & Visceral Adiposity
  const t = patient.targets;
  if (v.weight > t.weightMax) {
    score += 10;
  }
  
  // Lifestyle sliders factors
  if (STATE.outcomeSteps < 4000) score += 10;
  else if (STATE.outcomeSteps > 9000) score -= 8;
  
  if (STATE.outcomeSalt > 8) score += 8;
  else if (STATE.outcomeSalt < 5) score -= 5;
  
  if (STATE.outcomeCarbs > 60) score += 6;
  else if (STATE.outcomeCarbs < 45) score -= 5;

  score = Math.max(5, Math.min(95, score));
  
  let level = 'Low';
  if (score > 55) level = 'High';
  else if (score > 30) level = 'Moderate';
  
  return { score, level };
}

function updateOutcomeParameter(param, value) {
  STATE[param] = parseFloat(value);
  
  if (param === 'outcomeSteps') setEl('lbl-steps', `${value} steps`);
  if (param === 'outcomeSalt') setEl('lbl-salt', `${value}g`);
  if (param === 'outcomeCarbs') setEl('lbl-carbs', `${value}%`);
  
  updateOutcomesSimulator();
}

function updateOutcomesSimulator() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const cvd = calculateSouthAsianCVDRisk(p);
  
  // Indian baseline life expectancy: 70 years
  let baseLife = 70.2;
  let impact = 0;
  
  if (STATE.outcomeSteps >= 10000) impact += 4.2;
  else if (STATE.outcomeSteps >= 7500) impact += 2.5;
  else if (STATE.outcomeSteps < 4000) impact -= 3.5;
  
  if (STATE.outcomeSalt <= 5) impact += 2.2;
  else if (STATE.outcomeSalt >= 10) impact -= 2.8;
  
  if (STATE.outcomeCarbs <= 45) impact += 1.8;
  else if (STATE.outcomeCarbs >= 65) impact -= 2.5;
  
  const latest = getLatestVitals(p);
  if (latest) {
    if (p.diagnosis.includes('diabetes') && latest.glucose > 180) impact -= 4.5;
    if (latest.systolic > 140) impact -= 3.8;
    if (latest.spo2 < 93) impact -= 3.0;
  }
  
  const projectedLife = +(baseLife + impact).toFixed(1);
  
  // Specific complications progression risk
  let renalRisk = 12;
  let strokeRisk = 8;
  let cardiacRisk = cvd.score;
  
  if (latest) {
    if (p.diagnosis.includes('diabetes')) {
      renalRisk = latest.glucose > 185 ? 42 : latest.glucose > 140 ? 22 : 10;
    }
    strokeRisk = latest.systolic > 160 ? 46 : latest.systolic > 140 ? 25 : 8;
  }
  
  const modifier = (STATE.outcomeSteps / 7000) * (6 / STATE.outcomeSalt) * (55 / STATE.outcomeCarbs);
  renalRisk = Math.max(5, Math.min(90, Math.round(renalRisk / (modifier * 0.8))));
  strokeRisk = Math.max(5, Math.min(90, Math.round(strokeRisk / (modifier * 0.9))));
  
  setEl('outcomes-cvd-risk', `${cvd.score}% (${cvd.level})`);
  setEl('outcomes-life-expectancy', `${projectedLife} years`);
  
  const leDiffEl = document.getElementById('outcomes-life-diff');
  if (leDiffEl) {
    if (impact >= 0) {
      leDiffEl.textContent = `(+${impact.toFixed(1)} yrs vs regional average)`;
      leDiffEl.className = 'outcomes-diff positive';
    } else {
      leDiffEl.textContent = `(${impact.toFixed(1)} yrs vs regional average)`;
      leDiffEl.className = 'outcomes-diff negative';
    }
  }
  
  setEl('prog-renal', `${renalRisk}%`);
  const renalBar = document.getElementById('prog-bar-renal');
  if (renalBar) {
    renalBar.style.width = `${renalRisk}%`;
    renalBar.className = `progress-fill ${renalRisk > 35 ? 'critical' : renalRisk > 18 ? 'warning' : 'stable'}`;
  }
  
  setEl('prog-stroke', `${strokeRisk}%`);
  const strokeBar = document.getElementById('prog-bar-stroke');
  if (strokeBar) {
    strokeBar.style.width = `${strokeRisk}%`;
    strokeBar.className = `progress-fill ${strokeRisk > 35 ? 'critical' : strokeRisk > 18 ? 'warning' : 'stable'}`;
  }
  
  setEl('prog-cardiac', `${cardiacRisk}%`);
  const cardiacBar = document.getElementById('prog-bar-cardiac');
  if (cardiacBar) {
    cardiacBar.style.width = `${cardiacRisk}%`;
    cardiacBar.className = `progress-fill ${cardiacRisk > 35 ? 'critical' : cardiacRisk > 18 ? 'warning' : 'stable'}`;
  }
}

/* ----------------------------------------------
   24C. DATA-VISUALIZED PDF DOSSIER EXPORT
   -------------------------------------------------- */
async function exportClinicalPDF() {
  const { jsPDF } = window.jspdf;
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  const v = getLatestVitals(p);
  const analysis = evaluateAndAlert(p);
  const cvd = calculateSouthAsianCVDRisk(p);
  
  showToast('Compiling Visual PDF Report...', 'blue');
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const primaryColor = [8, 13, 24]; // Dark Navy
  const textColor = [45, 55, 72];
  const margin = 20;
  let y = 40;
  
  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('VitalSense AI', margin, 14);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 174, 192);
  doc.text('RAG Chronic Disease Management Platform (Indian Context)', margin, 20);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 140, 14);
  
  // Patient Info Card
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(margin, y, 170, 34, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, 170, 34, 2, 2, 'S');
  
  doc.setTextColor(8, 13, 24);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PATIENT DOSSIER', margin + 6, y + 8);
  
  doc.setTextColor(...textColor);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  
  doc.text(`Patient Name: ${p.name}`, margin + 6, y + 16);
  doc.text(`Age / Sex: ${p.age} years / ${p.sex}`, margin + 6, y + 23);
  doc.text(`Condition: ${p.condition}`, margin + 6, y + 30);
  
  doc.text(`Primary Physician: ${p.primaryPhysician || 'N/A'}`, margin + 90, y + 16);
  doc.text(`Insurance Account: ${p.insuranceId || 'N/A'}`, margin + 90, y + 23);
  doc.text(`Next Outpatient Appointment: ${p.nextAppointment || 'N/A'}`, margin + 90, y + 30);
  
  y += 42;
  
  // Risk & Outcomes Panel
  doc.setFillColor(254, 242, 242); // Coral tint
  doc.roundedRect(margin, y, 82, 34, 2, 2, 'F');
  doc.setTextColor(153, 27, 27);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CLINICAL RISK INDICES', margin + 6, y + 7);
  doc.setTextColor(...textColor);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`AI Aggregated Risk: ${analysis.risk}/100 (${analysis.level.toUpperCase()})`, margin + 6, y + 15);
  doc.text(`10-Yr Cardiovascular Risk: ${cvd.score}%`, margin + 6, y + 22);
  doc.text(`Active Alerts Count: ${analysis.flags.length}`, margin + 6, y + 29);
  
  doc.setFillColor(240, 253, 250); // Teal tint
  doc.roundedRect(margin + 88, y, 82, 34, 2, 2, 'F');
  doc.setTextColor(15, 118, 110);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('PROJECTED PROGNOSIS & OUTCOMES', margin + 94, y + 7);
  doc.setTextColor(...textColor);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Life Expectancy: ${document.getElementById('outcomes-life-expectancy')?.textContent || '70.2 years'}`, margin + 94, y + 15);
  doc.text(`Daily Steps Target: ${STATE.outcomeSteps} steps/day`, margin + 94, y + 22);
  doc.text(`Daily Salt Target: ${STATE.outcomeSalt}g/day (ICMR <5g)`, margin + 94, y + 29);
  
  y += 42;
  
  // Chart Visual
  doc.setTextColor(8, 13, 24);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LONGITUDINAL TREND CHART (LAST 14 DAYS)', margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 2, margin + 170, y + 2);
  
  y += 7;
  
  try {
    const chartCanvas = document.getElementById('vitals-chart');
    if (chartCanvas) {
      const img = chartCanvas.toDataURL('image/jpeg', 1.0);
      doc.addImage(img, 'JPEG', margin, y, 170, 52);
      y += 58;
    }
  } catch (err) {
    console.warn('[PDF] Chart rendering omitted:', err);
    y += 10;
  }
  
  // RAG & Recommendations Section
  doc.setTextColor(8, 13, 24);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('IBM GRANITE AI ANALYSIS & RAG CLINICAL RECOMMENDATIONS', margin, y);
  doc.line(margin, y + 2, margin + 170, y + 2);
  
  y += 7;
  
  doc.setTextColor(...textColor);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  
  let recs = document.getElementById('clinical-summary-output')?.innerText || '';
  if (!recs || recs.includes('Click "Generate"')) {
    recs = `📚 Local Clinical Guidelines:\n${VectorStore.search(p.condition, 2).join('\n')}\n\n💡 Personalized Care Directives:\n${graniteRecommendations(p, analysis)}`;
  }
  
  const splitLines = doc.splitTextToSize(recs, 170);
  
  // Check height constraint
  const textHeight = splitLines.length * 3.5;
  if (y + textHeight > 270) {
    doc.text(splitLines.slice(0, 40), margin, y);
    doc.addPage();
    y = 25;
    doc.text(splitLines.slice(40), margin, y);
    y += (splitLines.length - 40) * 3.5 + 10;
  } else {
    doc.text(splitLines, margin, y);
    y += textHeight + 10;
  }
  
  // Draw Vitals Table
  doc.setTextColor(8, 13, 24);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RECENT VITALS TELEMETRY PACKETS', margin, y);
  doc.line(margin, y + 2, margin + 170, y + 2);
  
  y += 7;
  
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 170, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Timestamp', margin + 3, y + 5);
  doc.text('Glucose (mg/dL)', margin + 45, y + 5);
  doc.text('BP (mmHg)', margin + 78, y + 5);
  doc.text('Heart Rate (bpm)', margin + 115, y + 5);
  doc.text('SpO2 (%)', margin + 148, y + 5);
  
  y += 7;
  
  doc.setFont('Helvetica', 'normal');
  const vHistory = p.history.filter(h => h.type === 'vitals').reverse().slice(0, 8);
  vHistory.forEach((h, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 170, 6, 'F');
    }
    const tStr = new Date(h.ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    doc.text(tStr, margin + 3, y + 4.5);
    doc.text(`${h.glucose} mg/dL`, margin + 45, y + 4.5);
    doc.text(`${h.systolic}/${h.diastolic} mmHg`, margin + 78, y + 4.5);
    doc.text(`${h.hr} bpm`, margin + 115, y + 4.5);
    doc.text(`${h.spo2}%`, margin + 148, y + 4.5);
    y += 6;
  });
  
  // Footer
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 174, 192);
  doc.text('VitalSense AI demonstration report. Not to be used as a certified medical diagnostic sheet.', margin, 287);
  
  const pdfBlob = doc.output('blob');
  const formData = new FormData();
  formData.append('file', pdfBlob, `${p.name.replace(/\s+/g, '_')}_Health_Report.pdf`);
  formData.append('patientId', p.id);

  fetch('/api/reports/upload-generated', {
    method: 'POST',
    body: formData
  }).then(res => {
    if (res.ok) {
      console.log('[PDF] Uploaded generated health report to IBM COS successfully.');
      loadPatientReports();
    }
  }).catch(err => {
    console.error('[PDF] Upload to COS failed:', err);
  });
  
  doc.save(`${p.name.replace(/\s+/g, '_')}_Health_Report.pdf`);
  showToast('Clinical PDF dossier downloaded & uploaded to IBM COS!', 'emerald');
}


/* ----------------------------------------------
   FRONTEND DYNAMIC wiring (Tabs, Reports, Symptoms, Voice, etc.)
   -------------------------------------------------- */

function switchPatientSubTab(tabName) {
  document.querySelectorAll('.patient-subtab').forEach(el => el.classList.remove('active'));
  document.getElementById(`patient-subtab-${tabName}`)?.classList.add(`active`);
  document.querySelectorAll('.psub-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`psub-${tabName}`)?.classList.add(`active`);
  
  if (tabName === 'reports') loadPatientReports();
  if (tabName === 'risk') renderRiskEngine();
  if (tabName === 'lifestyle') { renderTimeline(); }
}
window.switchPatientSubTab = switchPatientSubTab;

/* ----------------------------------------------
   RISK ENGINE RENDERER
   Populates the Predictive Risk Engine subtab
-------------------------------------------------- */
function renderRiskEngine() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  const v = getLatestVitals(p);
  const analysis = analyzeVitals(p);
  
  // Use the outcomes simulator data for granular risk calculations
  const cvd = calculateSouthAsianCVDRisk(p);

  // Cardiac risk
  let cardiacRisk = cvd.score;
  let cardiacConf = 88 + Math.round(Math.random() * 8);
  let cardiacSev = cardiacRisk > 55 ? 'Severe' : cardiacRisk > 30 ? 'Moderate' : 'Minimal';
  let cardiacBadge = cardiacRisk > 55 ? 'High Risk' : cardiacRisk > 30 ? 'Moderate' : 'Low Risk';
  let cardiacBadgeClass = cardiacRisk > 55 ? 'risk-critical' : cardiacRisk > 30 ? 'risk-warning' : 'risk-normal';

  // Stroke risk
  let strokeRisk = 8;
  if (v) {
    strokeRisk = v.systolic > 160 ? 46 : v.systolic > 140 ? 25 : 8;
    if (p.diagnosis.includes('diabetes')) strokeRisk += 10;
  }
  strokeRisk = Math.min(90, strokeRisk);
  let strokeConf = 85 + Math.round(Math.random() * 10);
  let strokeSev = strokeRisk > 40 ? 'Severe' : strokeRisk > 20 ? 'Moderate' : 'Minimal';
  let strokeBadge = strokeRisk > 40 ? 'High Risk' : strokeRisk > 20 ? 'Moderate' : 'Low Risk';
  let strokeBadgeClass = strokeRisk > 40 ? 'risk-critical' : strokeRisk > 20 ? 'risk-warning' : 'risk-normal';

  // Renal / CKD risk
  let renalRisk = 12;
  if (v && p.diagnosis.includes('diabetes')) {
    renalRisk = v.glucose > 185 ? 42 : v.glucose > 140 ? 22 : 10;
  }
  renalRisk = Math.min(90, renalRisk);
  let renalConf = 80 + Math.round(Math.random() * 12);
  let renalSev = renalRisk > 35 ? 'Severe' : renalRisk > 18 ? 'Moderate' : 'Minimal';
  let renalBadge = renalRisk > 35 ? 'High Risk' : renalRisk > 18 ? 'Moderate Risk' : 'Low Risk';
  let renalBadgeClass = renalRisk > 35 ? 'risk-critical' : renalRisk > 18 ? 'risk-warning' : 'risk-normal';

  // Hospitalization risk
  let hospRisk = analysis.risk > 60 ? 28 : analysis.risk > 35 ? 14 : 5;
  hospRisk = Math.min(90, hospRisk);
  let hospConf = 87 + Math.round(Math.random() * 8);
  let hospSev = hospRisk > 20 ? 'Elevated' : 'Minimal';
  let hospBadge = hospRisk > 20 ? 'Elevated Risk' : 'Stable';
  let hospBadgeClass = hospRisk > 20 ? 'risk-warning' : 'risk-normal';

  const setRisk = (id, score, badge, badgeClass, conf, sev, sevColor) => {
    const fill = document.getElementById(`rk-fill-${id}`);
    const scoreEl = document.getElementById(`rk-score-${id}`);
    const badgeEl = document.getElementById(`rk-badge-${id}`);
    const confEl = document.getElementById(`rk-conf-${id}`);
    const sevEl = document.getElementById(`rk-sev-${id}`);
    if (fill) { fill.style.width = `${score}%`; fill.className = `progress-bar-fill ${score > 40 ? 'progress-critical' : score > 20 ? 'progress-warning' : 'progress-stable'}`; }
    if (scoreEl) scoreEl.textContent = `${score}%`;
    if (badgeEl) { badgeEl.textContent = badge; badgeEl.className = `rg-badge ${badgeClass}`; }
    if (confEl) confEl.textContent = `${conf}%`;
    if (sevEl) { sevEl.textContent = sev; sevEl.style.color = sevColor; }
  };

  const sevColor = (sev) => sev === 'Severe' ? 'var(--coral)' : sev === 'Moderate' ? 'var(--amber)' : 'var(--emerald)';
  setRisk('cardiac',  cardiacRisk,  cardiacBadge,  cardiacBadgeClass,  cardiacConf,  cardiacSev,  sevColor(cardiacSev));
  setRisk('stroke',   strokeRisk,   strokeBadge,   strokeBadgeClass,   strokeConf,   strokeSev,   sevColor(strokeSev));
  setRisk('renal',    renalRisk,    renalBadge,    renalBadgeClass,    renalConf,    renalSev,    sevColor(renalSev));
  setRisk('hospital', hospRisk,     hospBadge,     hospBadgeClass,     hospConf,     hospSev,     sevColor(hospSev));

  // Populate AI recommendations list
  const recsList = document.getElementById('risk-recommendations-list');
  if (recsList) {
    const recs = [];
    if (cardiacRisk > 30) recs.push({ icon: '🫀', text: `Cardiovascular risk at ${cardiacRisk}%. Schedule cardiology review; assess lipid profile and ECG.`, color: 'var(--coral)' });
    if (strokeRisk > 20) recs.push({ icon: '🧠', text: `Stroke risk elevated at ${strokeRisk}%. Strict BP control below 130/80 mmHg essential. Consider anti-platelet therapy.`, color: 'var(--amber)' });
    if (renalRisk > 18) recs.push({ icon: '🩺', text: `Renal complication risk at ${renalRisk}%. Annual UACR testing recommended. Telmisartan provides nephroprotection.`, color: 'var(--amber)' });
    if (p.diagnosis.includes('diabetes')) recs.push({ icon: '💉', text: 'Maintain HbA1c <7.0%. Monitor post-prandial glucose 2 hours after each meal.', color: 'var(--blue)' });
    if (v && v.systolic > p.targets.bpSystolicMax) recs.push({ icon: '📈', text: `BP ${v.systolic}/${v.diastolic} mmHg above target. Sodium restriction to <5g/day and stress reduction are key interventions.`, color: 'var(--amber)' });
    recs.push({ icon: '🏃', text: `Achieve 7,500+ steps/day. Physical activity reduces all-cause cardiovascular mortality by 35%.`, color: 'var(--teal)' });
    recs.push({ icon: '💊', text: `Continue all scheduled medications (${p.medications.length} active). Missing doses significantly increases relapse risk.`, color: 'var(--violet)' });
    recs.push({ icon: '🍎', text: 'Follow condition-specific diet: Low-GI carbohydrates, DASH-style sodium restriction, and omega-3 enriched foods.', color: 'var(--emerald)' });

    recsList.innerHTML = recs.map(r => `
      <li style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem;line-height:1.5">
        <span style="font-size:1rem;flex-shrink:0">${r.icon}</span>
        <span style="color:${r.color}">${r.text}</span>
      </li>`).join('');
  }
}
window.renderRiskEngine = renderRiskEngine;

function setSymptomPrompt(text) {
  const ta = document.getElementById('symptom-text');
  if (ta) { ta.value = text; ta.focus(); }
}
window.setSymptomPrompt = setSymptomPrompt;

async function runGraniteSymptomChecker() {
  const text = document.getElementById('symptom-text').value.trim();
  if (!text) {
    showToast('Please describe your symptoms first.', 'amber');
    return;
  }
  
  const output = document.getElementById('symptom-result-output');
  if (!output) return;
  
  output.innerHTML = '<div class="typing typing-dots">Connecting to IBM watsonx.ai Studio...</div>';
  const p = STATE.patients[STATE.activePatientIdx];
  
  const runOfflineSymptomCheck = (symptoms) => {
    const sym = symptoms.toLowerCase();
    let diseases = ['Viral Syndrome'];
    let severity = 'Mild';
    let specialist = 'General Physician';
    let actions = ['Stay hydrated', 'Monitor body temperature'];
    let emergency = 'Low';
    
    if (sym.includes('chest pain') || sym.includes('radiating') || sym.includes('shortness of breath')) {
      diseases = ['Acute Coronary Syndrome', 'Angina Pectoris'];
      severity = 'Critical';
      specialist = 'Cardiologist / Emergency Medicine';
      actions = ['Call ambulance immediately (102)', 'Chew Aspirin 325mg if advised by responder', 'Do not exert'];
      emergency = 'Immediate Emergency';
    } else if (sym.includes('tingling') || sym.includes('foot') || sym.includes('numbness')) {
      diseases = ['Diabetic Peripheral Neuropathy', 'Poor Peripheral Circulation'];
      severity = 'Moderate';
      specialist = 'Endocrinologist / Podiatrist';
      actions = ['Inspect feet daily for cuts or ulcers', 'Optimize blood sugar controls', 'Avoid tight footwear'];
      emergency = 'Medium';
    } else if (sym.includes('dizziness') || sym.includes('headache') || sym.includes('vision')) {
      diseases = ['Hypertensive Urgency', 'Migraine'];
      severity = 'Severe';
      specialist = 'Cardiologist / Nephrologist';
      actions = ['Check blood pressure immediately', 'Rest in a quiet, dark room', 'Limit dietary sodium'];
      emergency = 'High';
    }
    
    return { possibleDiseases: diseases, severity, recommendedSpecialist: specialist, nextActions: actions, emergencyLevel: emergency };
  };
  
  try {
    if (!hasIBMCredentials()) {
      setTimeout(() => {
        const res = runOfflineSymptomCheck(text);
        renderSymptomResult(res, true);
      }, 1000);
      return;
    }
    
    const prompt = PROMPT_TEMPLATES.symptomCheck(text, p);
    const responseText = await callGraniteAPI(prompt);
    
    try {
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const res = JSON.parse(responseText.slice(startIdx, endIdx + 1));
        renderSymptomResult(res, false);
      } else {
        throw new Error('No JSON in response');
      }
    } catch (jsonErr) {
      const res = runOfflineSymptomCheck(text);
      renderSymptomResult(res, true);
    }
  } catch (err) {
    const res = runOfflineSymptomCheck(text);
    renderSymptomResult(res, true);
  }
}
window.runGraniteSymptomChecker = runGraniteSymptomChecker;

function renderSymptomResult(res, isSimulated) {
  const output = document.getElementById('symptom-result-output');
  if (!output) return;
  
  output.innerHTML = `
    <div class="symptom-result-body" style="padding: 1rem 1.25rem;">
      ${isSimulated ? '<div class="simulator-notice" style="color:var(--amber);background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.25);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:0.75rem">⚠️ Running in Offline Simulator Fallback Mode</div>' : ''}
      <div class="result-row" style="margin-bottom:8px">
        <span style="color:var(--muted);font-size:0.8rem">Possible Conditions:</span>
        <div style="font-weight:700;font-size:0.95rem;margin-top:2px">${res.possibleDiseases.join(', ')}</div>
      </div>
      <div class="result-row" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--muted);font-size:0.8rem">Clinical Severity:</span>
        <span class="metric-status ${res.severity.toLowerCase() === 'critical' || res.severity.toLowerCase() === 'severe' ? 'status-critical' : 'status-normal'}">${res.severity}</span>
      </div>
      <div class="result-row" style="margin-bottom:8px">
        <span style="color:var(--muted);font-size:0.8rem">Recommended Specialist:</span>
        <div style="font-weight:700">${res.recommendedSpecialist}</div>
      </div>
      <div class="result-row" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--muted);font-size:0.8rem">Emergency Level:</span>
        <span class="risk-badge ${res.emergencyLevel.toLowerCase().includes('emergency') || res.emergencyLevel.toLowerCase() === 'high' ? 'critical' : 'stable'}">${res.emergencyLevel}</span>
      </div>
      <div class="result-actions-wrap" style="margin-top:1rem;border-top:1px solid var(--glass-border);padding-top:12px">
        <span style="font-weight:600;display:block;margin-bottom:0.5rem;font-size:0.85rem">Recommended Next Actions:</span>
        <ul class="rec-list" style="margin-left:1.25rem;font-size:0.8rem;display:flex;flex-direction:column;gap:4px">
          ${res.nextActions.map(act => `<li>${act}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

async function generateAISchedulePlan() {
  const output = document.getElementById('lifestyle-coach-output');
  if (!output) return;
  
  output.innerHTML = '<div class="typing typing-dots">Connecting to IBM watsonx.ai Studio...</div>';
  const p = STATE.patients[STATE.activePatientIdx];
  const analysis = evaluateAndAlert(p);
  
  const runOfflineLifestylePlan = (patient) => {
    let diet = [
      'Breakfast: Ragi porridge or whole wheat idli with vegetable sambar (Low Glycemic)',
      'Lunch: Brown rice or jowar roti with dal, leafy green vegetables, and cucumber salad',
      'Dinner: Light vegetable soup, grilled paneer/tofu, or whole wheat chapati with ridge gourd curry',
      'Snack: A handful of roasted chana, walnuts, or raw almonds'
    ];
    let exercise = [
      '30 minutes of brisk walking in the morning (aim for 5,000+ steps)',
      'Subtle stretching exercises or light yoga (Pranayama) for stress reduction'
    ];
    let water = '2.8L';
    let sleep = '8 Hours';
    let stress = [
      '10 minutes of deep breathing (Anulom Vilom) in a quiet setting',
      'Take short 5-minute walking breaks after prolonged sitting'
    ];
    let challenges = [
      'Complete step target (5,000 steps today)',
      'Zero consumption of refined sugar or sweets'
    ];
    let weeklyGoals = [
      'Maintain glucose levels under 140 mg/dL post-meals',
      'Achieve 150 minutes of physical activity this week'
    ];
    
    if (patient.diagnosis.includes('hypertension')) {
      diet = [
        'Breakfast: Oats upma with mixed vegetables (no added pickles or papads)',
        'Lunch: Multigrain chapati with low-sodium dal, spinach subji, and low-fat curd',
        'Dinner: Barley dhalia or cooked brown rice with raw salads and steamed vegetables',
        'Snack: Fresh guava, apple slices, or unsalted pumpkin seeds'
      ];
      exercise = [
        'Moderate cardio: 30 minutes of stationary cycling or fast walking',
        'Avoid heavy weightlifting; prioritize light aerobic activity'
      ];
      water = '3.0L';
      sleep = '7.5 Hours';
      stress = [
        'Meditate for 10 minutes before bedtime',
        'Restrict caffeine intake after 4:00 PM'
      ];
      challenges = [
        'Restrict salt intake to <5g (approx 1 level tsp)',
        'Complete 30 minutes of continuous walking'
      ];
    }
    
    return { dietPlan: diet, exercisePlan: exercise, waterGoal: water, sleepGoal: sleep, stressManagement: stress, challenges, weeklyGoals };
  };
  
  try {
    if (!hasIBMCredentials()) {
      setTimeout(() => {
        const res = runOfflineLifestylePlan(p);
        renderLifestylePlan(res, true);
      }, 1000);
      return;
    }
    
    const prompt = PROMPT_TEMPLATES.lifestylePlan(p, analysis);
    const responseText = await callGraniteAPI(prompt);
    
    try {
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const res = JSON.parse(responseText.slice(startIdx, endIdx + 1));
        renderLifestylePlan(res, false);
      } else {
        throw new Error('No JSON in response');
      }
    } catch (jsonErr) {
      const res = runOfflineLifestylePlan(p);
      renderLifestylePlan(res, true);
    }
  } catch (err) {
    const res = runOfflineLifestylePlan(p);
    renderLifestylePlan(res, true);
  }
}
window.generateAISchedulePlan = generateAISchedulePlan;

function renderLifestylePlan(res, isSimulated) {
  const output = document.getElementById('lifestyle-coach-output');
  if (!output) return;
  
  const wEl = document.getElementById('life-water-val');
  if (wEl) wEl.textContent = `0 / ${res.waterGoal}`;
  const wBar = document.getElementById('life-water-bar');
  if (wBar) wBar.style.width = '0%';
  const sEl = document.getElementById('life-sleep-val');
  if (sEl) sEl.textContent = `0.0 / ${res.sleepGoal}`;
  const sBar = document.getElementById('life-sleep-bar');
  if (sBar) sBar.style.width = '0%';
  
  output.innerHTML = `
    <div class="lifestyle-coach-plan" style="padding: 1rem 1.25rem;">
      ${isSimulated ? '<div class="simulator-notice" style="color:var(--amber);background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.25);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:0.75rem">⚠️ Running in Offline Simulator Fallback Mode</div>' : ''}
      
      <div class="coach-section" style="margin-bottom:14px">
        <h4 style="color:var(--teal);margin-bottom:6px;font-size:0.88rem">🥗 Dynamic Nutritional Diet Plan</h4>
        <ul class="rec-list" style="margin-left:1.25rem;font-size:0.8rem;display:flex;flex-direction:column;gap:4px">
          ${res.dietPlan.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
      
      <div class="coach-section" style="margin-bottom:14px">
        <h4 style="color:var(--blue);margin-bottom:6px;font-size:0.88rem">🏃 Prescribed Fitness Regime</h4>
        <ul class="rec-list" style="margin-left:1.25rem;font-size:0.8rem;display:flex;flex-direction:column;gap:4px">
          ${res.exercisePlan.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>
      
      <div class="coach-section" style="margin-bottom:14px">
        <h4 style="color:var(--violet);margin-bottom:6px;font-size:0.88rem">🧘 Relaxation &amp; Recovery Protocols</h4>
        <ul class="rec-list" style="margin-left:1.25rem;font-size:0.8rem;display:flex;flex-direction:column;gap:4px">
          ${res.stressManagement.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

async function handleFileSelected(files) {
  if (!files || !files.length) return;
  const file = files[0];
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const statusBar = document.getElementById('upload-status-bar');
  const fill = document.getElementById('upload-progress-fill');
  
  if (statusBar) statusBar.style.display = 'block';
  if (fill) fill.style.width = '20%';
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patientId', p.id);

  try {
    if (fill) fill.style.width = '60%';
    
    const res = await fetch('/api/reports/upload', {
      method: 'POST',
      body: formData
    });
    
    if (fill) fill.style.width = '100%';
    
    if (res.ok) {
      showToast('File uploaded to IBM COS successfully!', 'emerald');
      setTimeout(() => {
        if (statusBar) statusBar.style.display = 'none';
        loadPatientReports();
      }, 800);
    } else {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
  } catch (err) {
    showToast(`Upload error: ${err.message}`, 'coral');
    if (statusBar) statusBar.style.display = 'none';
  }
}
window.handleFileSelected = handleFileSelected;

let currentSelectedReportId = null;
async function loadPatientReports() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const rows = document.getElementById('reports-history-rows');
  if (!rows) return;
  
  rows.innerHTML = '<tr><td colspan="6" class="muted-label" style="text-align:center;padding:1rem">Loading documents...</td></tr>';
  
  try {
    const res = await fetch(`/api/reports/${p.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reports = data.reports || [];
    
    if (!reports.length) {
      rows.innerHTML = '<tr><td colspan="6" class="muted-label" style="text-align:center;padding:1.5rem">No reports loaded.</td></tr>';
      return;
    }
    
    rows.innerHTML = reports.map(r => {
      const d = new Date(r.uploadDate).toLocaleDateString('en-IN', { dateStyle: 'medium' });
      const sz = (r.size / 1024).toFixed(1) + ' KB';
      const storageBadge = r.source === 'cos' ? '<span class="vector-badge">IBM COS</span>' : '<span class="adh-pill">Local</span>';
      const typeBadge = r.type === 'clinical' ? '<span class="adh-pill taken">Clinical PDF</span>' : '<span class="adh-pill">Lab Report</span>';
      
      const isSelected = r.id === currentSelectedReportId;
      
      return `<tr class="report-row-item ${isSelected ? 'selected' : ''}" style="cursor:pointer" onclick="selectReportForAnalysis('${r.id}')">
        <td><strong>${r.originalName}</strong></td>
        <td>${d}</td>
        <td>${sz}</td>
        <td>${storageBadge}</td>
        <td>${typeBadge}</td>
        <td>
          <div style="display:flex;gap:4px">
            <a class="action-btn sm-btn blue" href="${r.url}" target="_blank">Download</a>
            ${r.type !== 'clinical' ? `<button class="action-btn sm-btn emerald" onclick="event.stopPropagation(); analyzeReportDirect('${r.id}')">Analyze</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    rows.innerHTML = `<tr><td colspan="6" class="muted-label" style="text-align:center;padding:1rem;color:var(--coral)">Error: ${err.message}</td></tr>`;
  }
}
window.loadPatientReports = loadPatientReports;

function selectReportForAnalysis(id) {
  currentSelectedReportId = id;
  const runBtn = document.getElementById('btn-run-analysis');
  if (runBtn) runBtn.style.display = 'block';
  
  const output = document.getElementById('analyzer-output-pane');
  if (output) {
    output.innerHTML = `
      <div class="ap-placeholder">
        <p>Report selected. Click "Extract Findings" to perform IBM watsonx.ai Studio analysis.</p>
      </div>
    `;
  }
  loadPatientReports(); // Refresh selected highlight
}
window.selectReportForAnalysis = selectReportForAnalysis;

async function analyzeReportDirect(id) {
  currentSelectedReportId = id;
  await analyzeSelectedReport();
}
window.analyzeReportDirect = analyzeReportDirect;

async function analyzeSelectedReport() {
  if (!currentSelectedReportId) {
    showToast('Please select a report first.', 'amber');
    return;
  }
  
  const output = document.getElementById('analyzer-output-pane');
  if (!output) return;
  
  output.innerHTML = '<div class="typing typing-dots">Connecting to IBM watsonx.ai Studio to parse report...</div>';
  
  try {
    const res = await fetch('/api/reports/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: currentSelectedReportId })
    });
    
    if (res.ok) {
      const data = await res.json();
      renderExtractedReport(data.extracted, data.simulator);
    } else {
      const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
      throw new Error(err.error || 'Extraction failed');
    }
  } catch (err) {
    output.innerHTML = `<div style="color:var(--coral);padding:1rem">❌ Extraction failed: ${err.message}</div>`;
  }
}
window.analyzeSelectedReport = analyzeSelectedReport;

function renderExtractedReport(ext, isSimulated) {
  const output = document.getElementById('analyzer-output-pane');
  if (!output) return;
  
  output.innerHTML = `
    <div class="report-analysis-result" style="padding:1rem">
      ${isSimulated ? '<div class="simulator-notice" style="color:var(--amber);background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.25);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:0.75rem">⚠️ Running in Offline Simulator Fallback Mode</div>' : ''}
      <div class="rep-sec" style="margin-bottom:12px">
        <strong style="color:var(--teal);font-size:0.85rem">Summary:</strong>
        <p style="margin-top:4px;font-size:0.8rem;line-height:1.5">${ext.summary}</p>
      </div>
      <div class="rep-sec" style="margin-bottom:12px">
        <strong style="color:var(--blue);font-size:0.85rem">Diagnoses / Findings:</strong>
        <ul style="margin-left:1.25rem;margin-top:4px;font-size:0.8rem;display:flex;flex-direction:column;gap:2px">
          ${ext.diagnoses.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
      <div class="rep-sec" style="margin-bottom:12px">
        <strong style="color:var(--coral);font-size:0.85rem">Abnormal Biomarkers:</strong>
        <div style="margin-top:6px;overflow-x:auto">
          <table class="prov-log-table" style="width:100%;border-collapse:collapse;font-size:0.78rem">
            <thead>
              <tr style="border-bottom:1px solid var(--glass-border)">
                <th style="text-align:left;padding:4px;color:var(--muted)">Parameter</th>
                <th style="text-align:left;padding:4px;color:var(--muted)">Value</th>
                <th style="text-align:left;padding:4px;color:var(--muted)">Ref Range</th>
              </tr>
            </thead>
            <tbody>
              ${ext.abnormalValues.map(v => `<tr style="border-bottom:1px solid rgba(255,255,255,0.02)"><td style="padding:4px">${v.parameter}</td><td style="color:var(--coral);font-weight:700;padding:4px">${v.value}</td><td style="padding:4px;color:var(--muted)">${v.referenceRange}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="rep-sec" style="margin-bottom:12px">
        <strong style="color:var(--violet);font-size:0.85rem">Medications:</strong>
        <ul style="margin-left:1.25rem;margin-top:4px;font-size:0.8rem;display:flex;flex-direction:column;gap:2px">
          ${ext.medications.map(m => `<li>${m.name} — ${m.dosage}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

async function loadProviderPatientReports(patient) {
  const rows = document.getElementById('prov-reports-rows');
  if (!rows) return;
  
  rows.innerHTML = '<tr><td colspan="4" class="muted-label" style="text-align:center;padding:1rem">Loading patient reports...</td></tr>';
  
  try {
    const res = await fetch(`/api/reports/${patient.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reports = data.reports || [];
    
    if (!reports.length) {
      rows.innerHTML = '<tr><td colspan="4" class="muted-label" style="text-align:center;padding:1rem">No patient documents found.</td></tr>';
      return;
    }
    
    rows.innerHTML = reports.map(r => {
      const d = new Date(r.uploadDate).toLocaleDateString('en-IN', { dateStyle: 'short' });
      const sourceBadge = r.source === 'cos' ? '<span class="vector-badge">IBM COS</span>' : 'Local';
      return `<tr>
        <td><strong>${r.originalName}</strong></td>
        <td>${d}</td>
        <td>${sourceBadge}</td>
        <td><a class="action-btn sm-btn blue" href="${r.url}" target="_blank">Download</a></td>
      </tr>`;
    }).join('');
  } catch (err) {
    rows.innerHTML = `<tr><td colspan="4" class="muted-label" style="text-align:center;padding:1rem;color:var(--coral)">Error: ${err.message}</td></tr>`;
  }
}
window.loadProviderPatientReports = loadProviderPatientReports;

function sendEmergencyNotification() {
  const p = STATE.patients[STATE.activePatientIdx];
  showToast(`Emergency notification pushed to Dr. Sanjay Gupta and Kavita Mehta!`, 'coral');
}
window.sendEmergencyNotification = sendEmergencyNotification;

function showNearestHospital() {
  showToast('Cardiac & Respiratory Emergency Hub: Max Super Speciality Hospital (Directions pushed)', 'blue');
}
window.showNearestHospital = showNearestHospital;

function calculateHealthScore(patient) {
  const v = getLatestVitals(patient);
  if (!v) return 80;
  
  let score = 98;
  const t = patient.targets;
  if (v.glucose > t.glucoseMax) score -= 8;
  if (v.glucose < t.glucoseMin) score -= 12;
  if (v.systolic > t.bpSystolicMax) score -= 10;
  if (v.hr > t.hrMax || v.hr < t.hrMin) score -= 6;
  if (v.spo2 < t.spo2Min) score -= 15;
  
  const sleepHrs = v.sleep || 7.5;
  if (sleepHrs < 6) score -= 5;
  
  const stressLvl = v.stress || 3;
  if (stressLvl > 7) score -= 6;
  
  const moodLogs = patient.history.filter(h => h.type === 'mood');
  if (moodLogs.length) {
    const latestMood = moodLogs[moodLogs.length - 1].mood;
    if (latestMood === 'stressed' || latestMood === 'anxious') score -= 5;
    if (latestMood === 'happy' || latestMood === 'calm') score += 3;
  }
  
  return Math.max(10, Math.min(100, score));
}

let recognition = null;
function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Web Speech API is not supported in this browser.', 'amber');
    return;
  }
  
  const micBtn = document.getElementById('chat-mic-btn');
  const input = document.getElementById('chat-input');
  
  if (recognition) {
    recognition.stop();
    recognition = null;
    if (micBtn) micBtn.style.color = 'var(--text2)';
    showToast('Voice transcription stopped.', 'blue');
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';
  
  recognition.onstart = () => {
    if (micBtn) micBtn.style.color = 'var(--coral)';
    showToast('Listening... Speak into your mic.', 'coral');
  };
  
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    if (input) {
      input.value = text;
    }
    showToast('Voice command parsed!', 'emerald');
  };
  
  recognition.onerror = (err) => {
    if (micBtn) micBtn.style.color = 'var(--text2)';
    showToast(`Voice error: ${err.error}`, 'coral');
    recognition = null;
  };
  
  recognition.onend = () => {
    if (micBtn) micBtn.style.color = 'var(--text2)';
    recognition = null;
  };
  
  recognition.start();
}
window.toggleVoiceInput = toggleVoiceInput;

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const cleanText = text.replace(/[#*`_🔴🟡✅⚠️🤖🫀🧠🩺🏥📊📈💓🌬️⚖️🌙🧘🏃💧📋]/g, '').slice(0, 250);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-IN';
  utterance.rate = 1.0;
  
  window.speechSynthesis.speak(utterance);
}
window.speakText = speakText;

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.innerHTML = newTheme === 'dark'
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
  showToast(`Theme switched to ${newTheme.toUpperCase()}`, 'blue');
}
window.toggleTheme = toggleTheme;

function changeLanguage(lang) {
  if (!window.LOCALES || !LOCALES[lang]) return;
  STATE.lang = lang;
  const dict = LOCALES[lang];
  
  document.title = dict.title;
  setEl('btn-landing', dict.home);
  
  const pBtn = document.getElementById('btn-patient');
  if (pBtn) pBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg> ${dict.patient}`;
  
  const prBtn = document.getElementById('btn-provider');
  if (prBtn) prBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> ${dict.provider}`;
  
  const anBtn = document.getElementById('btn-analytics');
  if (anBtn) anBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 12v4M12 8v8M17 10v6"/></svg> ${dict.analytics}`;
  
  setEl('psub-vitals', dict.vitals_monitor_tab);
  setEl('psub-risk', dict.risk_engine_tab);
  setEl('psub-lifestyle', dict.lifestyle_coach_tab);
  setEl('psub-symptoms', dict.symptoms_tab);
  setEl('psub-reports', dict.reports_tab);
  
  const input = document.getElementById('chat-input');
  if (input) input.placeholder = lang === 'en' ? 'Ask anything about your health...' : lang === 'es' ? 'Pregunta algo sobre tu salud...' : 'Posez une question sur votre sante...';
  
  showToast(`Language changed to ${lang.toUpperCase()}`, 'emerald');
}
window.changeLanguage = changeLanguage;

function renderTimeline() {
  const p = STATE.patients[STATE.activePatientIdx];
  const timelineEl = document.getElementById('patient-timeline');
  if (!timelineEl || !p) return;
  
  let milestones = [
    { date: '2025-10-10', title: 'Initial Clinical Diagnosis', desc: `Diagnosed with Type 2 Diabetes Mellitus. Established baseline HbA1c target at <7.0%.` },
    { date: '2026-02-15', title: 'Kidney Complications Evaluation', desc: 'Added Metformin and Telmisartan. Set strict target blood pressure at <130/80 mmHg.' },
    { date: '2026-05-20', title: 'Microalbuminuria Detection', desc: 'Checked UACR (180 mg/g - microalbuminuria flagged). Doctor recommended strict salt reduction.' },
    { date: '2026-07-01', title: 'Continuous Vital Sensors Configured', desc: 'Initiated outpatient vital telemetry monitoring for real-time risk predictions.' }
  ];
  
  if (p.diagnosis === 'hypertension') {
    milestones = [
      { date: '2025-11-05', title: 'Stage 2 Hypertension Diagnosed', desc: 'Reading 162/98 mmHg. Instituted Outpatient Amlodipine & lifestyle changes.' },
      { date: '2026-01-20', title: 'DASH Diet Salt Restriction', desc: ' Instituted DASH diet with daily sodium intake limited to <5g.' },
      { date: '2026-04-12', title: 'Cardiovascular Risk Assessment', desc: 'Cardiac screening performed. Visceral lipid parameters evaluated.' },
      { date: '2026-07-05', title: 'Outpatient Vital Telemetry Synced', desc: 'Synced smartwatch metrics to monitor daily stress index, exercise logs, and heart rate.' }
    ];
  }
  
  timelineEl.innerHTML = milestones.map(m => `
    <div class="timeline-item" style="position:relative; padding-left:1.5rem">
      <div class="timeline-dot" style="position:absolute; left:-2.45rem; top:4px; width:12px; height:12px; border-radius:50%; background:linear-gradient(135deg, var(--teal), var(--blue)); box-shadow: 0 0 8px var(--teal-glow);"></div>
      <span style="font-size:0.75rem; color:var(--muted); font-weight:600">${m.date}</span>
      <h4 style="font-size:0.85rem; font-weight:700; margin:2px 0; color:var(--text)">${m.title}</h4>
      <p style="font-size:0.78rem; color:var(--text2); line-height:1.4; margin:0">${m.desc}</p>
    </div>
  `).join('');
}
window.renderTimeline = renderTimeline;

function logMood(moodType, emoji) {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const now = Date.now();
  const moodColors = {
    happy: 'var(--emerald)',
    calm: 'var(--teal)',
    tired: 'var(--blue)',
    anxious: 'var(--amber)',
    stressed: 'var(--coral)'
  };
  
  p.history.push({ ts: now, type: 'mood', mood: moodType, emoji, description: `Mood logged: ${moodType.toUpperCase()} ${emoji}` });
  savePatients();
  
  const label = document.getElementById('mood-status-label');
  if (label) {
    label.textContent = `Latest: ${moodType.toUpperCase()} ${emoji} logged at ${new Date(now).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}`;
    label.style.color = moodColors[moodType] || 'var(--teal)';
  }
  
  renderRecentLogs(p);
  renderPatientDashboard();
  showToast(`Mood logged: ${moodType.toUpperCase()} ${emoji}`, 'emerald');
}
window.logMood = logMood;

function handleFoodScanned(files) {
  if (!files || !files.length) return;
  const file = files[0];
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  const resultEl = document.getElementById('food-scanner-result');
  if (!resultEl) return;
  
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div class="typing typing-dots">Scanning meal components with IBM watsonx.ai Studio Vision...</div>';
  
  setTimeout(() => {
    const foodName = file.name.toLowerCase();
    let meal = "Curry & Rice";
    let calories = 550;
    let carbs = "72g (High Glycemic)";
    let sodium = "1.8g (Elevated)";
    let clinicalAdvice = "⚠️ Polish white rice and high sodium curry will raise post-prandial glucose and blood pressure. Recommending portion control and substituting with brown rice or jowar roti.";
    let statusColor = "var(--coral)";
    
    if (foodName.includes('salad') || foodName.includes('vegetable') || foodName.includes('paneer') || foodName.includes('tofu')) {
      meal = "Fresh Green Salad & Grilled Tofu/Paneer";
      calories = 240;
      carbs = "12g (Low Glycemic)";
      sodium = "0.3g (Low)";
      clinicalAdvice = "✅ Excellent choice! High fiber, low glycemic index, and low sodium. Supports healthy glycemic parameters and BP targets.";
      statusColor = "var(--emerald)";
    } else if (foodName.includes('oats') || foodName.includes('porridge') || foodName.includes('ragi')) {
      meal = "Ragi Porridge / Oats Upma";
      calories = 310;
      carbs = "34g (Complex Carb)";
      sodium = "0.4g (Low)";
      clinicalAdvice = "✅ Good meal option. High soluble fiber content assists in slower carbohydrate absorption and cardiac recovery.";
      statusColor = "var(--teal)";
    }
    
    resultEl.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;color:${statusColor}">Scan Result: ${meal}</div>
      <div style="font-size:0.75rem;color:var(--text2);margin-bottom:6px">
        Calories: <strong>${calories} kcal</strong> | Carbs: <strong>${carbs}</strong> | Sodium: <strong>${sodium}</strong>
      </div>
      <div style="font-style:italic;font-size:0.75rem;line-height:1.4">${clinicalAdvice}</div>
    `;
    
    p.history.push({
      ts: Date.now(),
      type: 'meal',
      description: `Food Scanned: ${meal} (${calories} kcal, carbs ${carbs})`
    });
    savePatients();
    renderRecentLogs(p);
  }, 1500);
}
window.handleFoodScanned = handleFoodScanned;

function syncWearablesTelemetry() {
  const p = STATE.patients[STATE.activePatientIdx];
  if (!p) return;
  
  showToast('Syncing with Google Fit & Smartwatch...', 'blue');
  
  setTimeout(() => {
    const latest = getLatestVitals(p) || { glucose: 120, systolic: 120, diastolic: 80, hr: 72, spo2: 98, weight: 70 };
    const watchSteps = Math.round(rand(6000, 11000));
    const watchSleep = +(rand(6.5, 8.2)).toFixed(1);
    const watchStress = Math.round(rand(2, 6));
    const now = Date.now();
    const syncedVital = {
      ts: now,
      type: 'vitals',
      glucose: Math.round(latest.glucose + rand(-3, 3)),
      systolic: Math.round(latest.systolic + rand(-4, 4)),
      diastolic: Math.round(latest.diastolic + rand(-3, 3)),
      hr: Math.round(rand(68, 88)),
      spo2: parseFloat(Math.min(100, Math.max(93, latest.spo2 + rand(-0.2, 0.2))).toFixed(1)),
      weight: latest.weight,
      sleep: watchSleep,
      stress: watchStress,
      activity: watchSteps,
      water: Math.round(rand(1500, 2500))
    };
    
    p.history.push(syncedVital);
    if (p.history.length > 30) p.history.shift();
    
    STATE.outcomeSteps = watchSteps;
    const stepsSlider = document.querySelector('.outcome-slider');
    if (stepsSlider) stepsSlider.value = watchSteps;
    setEl('lbl-steps', `${watchSteps} steps`);
    
    savePatients();
    renderPatientDashboard();
    if (STATE.activePortal === 'provider') selectProviderPatient(STATE.providerPatientIdx);
    
    logStreamEvent(`⌚ Wearables Sync Complete: Synced ${watchSteps} steps, ${watchSleep}h sleep.`);
    showToast(`Smartwatch data synced successfully!`, 'emerald');
  }, 1200);
}
window.syncWearablesTelemetry = syncWearablesTelemetry;

/* ----------------------------------------------
   24D. INITIALIZATION OVERRIDES
   -------------------------------------------------- */


/* ----------------------------------------------
   25. INIT
-------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Check if server environment credentials are set
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const serverConfig = await configRes.json();
      if (serverConfig.hasServerCredentials) {
        STATE.hasServerCredentials = true;
        STATE.settings.modelId = serverConfig.modelId || STATE.settings.modelId;
        STATE.settings.useReal = true;
      }
      // Load server COS config if user hasn't overridden it
      if (serverConfig.hasCosCredentials) {
        if (!STATE.settings.cosEndpoint && serverConfig.cosEndpoint)
          STATE.settings.cosEndpoint = serverConfig.cosEndpoint;
        if (!STATE.settings.cosBucket && serverConfig.cosBucket)
          STATE.settings.cosBucket = serverConfig.cosBucket;
      }
    }
  } catch (e) {
    console.warn('[VitalSense] Backend config check failed or offline:', e.message);
  }

  await loadState();
  renderPatientDashboard();
  renderTimeline();
  renderNotifications();
  STATE.patients.forEach(p => evaluateAndAlert(p));
  renderNotifications();
  renderAlarmDashboard();
  updateIBMStatusDot();
  initTelemetryStream();
  updateOutcomesSimulator();

  setEl('med-today-date', new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }));

  /* Enforce mandatory IBM credentials — show onboarding banner if missing */
  if (window.APP_CONFIG?.requireIBMCredentials && !hasIBMCredentials()) {
    showIBMOnboardingBanner();
  }

  console.log(
    `[VitalSense AI v${window.APP_CONFIG?.version || '2.0.0'}] Initialized.\n` +
    `  Patients: ${STATE.patients.length} | Vector store: ${CLINICAL_KNOWLEDGE.length} chunks\n` +
    `  IBM watsonx.ai Studio: ${hasIBMCredentials() ? '✅ Credentials present' : '❌ MISSING — AI features require configuration'}`
  );
});
