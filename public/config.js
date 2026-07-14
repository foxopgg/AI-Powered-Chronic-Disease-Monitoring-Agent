'use strict';

/* ======================================================================
   VitalSense AI — Client Configuration & API Helper
   config.js
   ====================================================================== */

const DATA_CONFIG = {
  patientsCSV:       './patients.csv',
  csvOverridesCache: true,
  vectorStore: {
    enabled:         true,
    useIBMDiscovery: false,
    chunkSizeWords:  80,
    topK:            3,
  },
};

const APP_CONFIG = {
  projectName:    'VitalSense AI',
  projectTagline: 'IBM watsonx.ai Studio · Chronic Disease Intelligence',
  version:        '2.0.0',

  requireIBMCredentials: true,
  simulatorFallback:     true,

  features: {
    csvPatientLoader:    true,
    ragContextInjection: true,
    vectorStore:         true,
    realTimeAlerts:      true,
    providerPortal:      true,
    medicationTracker:   true,
    exportReport:        true,
    darkModeToggle:      true,
    multiLanguage:       true,
  },

  charts: {
    historyDays: 14,
    animationMs: 400,
  },

  alertThresholds: {
    glucoseCriticalHigh:  250,
    glucoseCriticalLow:    60,
    bpCriticalSystolic:   180,
    bpCriticalDiastolic:  110,
    hrCriticalHigh:       120,
    hrCriticalLow:         45,
    spo2CriticalLow:       90,
  },
};

const PROMPT_TEMPLATES = {
  system: `You are IBM watsonx.ai Studio Clinical AI, a board-level clinical decision support assistant embedded in VitalSense AI — an IBM-powered chronic disease monitoring platform. You provide accurate, concise, evidence-based clinical guidance. You follow ACC/AHA, ADA, and JNC-8 guidelines. You never replace a physician's judgment. Always recommend professional consultation for critical findings.`,

  patientContext: (patient, vitals, analysis) => `
PATIENT CONTEXT:
  Name: ${patient.name} | Age: ${patient.age} | Sex: ${patient.sex}
  Diagnosis: ${patient.condition}
  Latest Vitals: Glucose ${vitals?.glucose ?? '—'} mg/dL | BP ${vitals?.systolic}/${vitals?.diastolic} mmHg | HR ${vitals?.hr} bpm | SpO2 ${vitals?.spo2}% | Temp ${vitals?.temp ?? '36.5'}°C | Resp ${vitals?.resp ?? '16'}/min | Sleep ${vitals?.sleep ?? '7.5'}h | Stress ${vitals?.stress ?? 'Low'} | Water ${vitals?.water ?? '2.0'}L
  Clinical Targets: Glucose ${patient.targets.glucoseMin}–${patient.targets.glucoseMax} | BP <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax} | HR ${patient.targets.hrMin}–${patient.targets.hrMax}
  Risk Level: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)
  Active Flags: ${analysis.flags.length ? analysis.flags.map(f => f.msg).join('; ') : 'None'}
  Medications: ${patient.medications.map(m => m.name).join(', ')}
`,

  ragContext: (passages) => passages.length
    ? `\nRELEVANT CLINICAL KNOWLEDGE:\n${passages.map((p, i) => `[${i + 1}] ${p}`).join('\n')}\n`
    : '',

  userQuery: (query) => `\nCLINICIAN QUERY: ${query}\n\nRESPONSE:`,

  symptomCheck: (symptoms, patient) => `
Patient details: ${patient.name}, ${patient.age}y/o ${patient.sex}, diagnosed with ${patient.condition}.
Symptoms complained: "${symptoms}"

Analyze the symptoms and output a valid JSON containing possible diseases, severity ("Mild" | "Moderate" | "Severe" | "Critical"), recommended doctor specialist, next actions list, and emergency level ("Low" | "Medium" | "High" | "Immediate Emergency").
Ensure to output ONLY valid JSON.
Format:
{
  "possibleDiseases": ["Condition 1", "Condition 2"],
  "severity": "Moderate",
  "recommendedSpecialist": "Cardiologist",
  "nextActions": ["Action 1", "Action 2"],
  "emergencyLevel": "High"
}`,

  lifestylePlan: (patient, analysis) => `
Patient profile: ${patient.name}, Age ${patient.age}, ${patient.sex}
Diagnosis: ${patient.condition}
Vitals status: Risk score ${analysis.risk}/100, Level: ${analysis.level}

Generate a personalized weekly lifestyle plan in structured JSON format containing a diet plan array (breakfast, lunch, dinner, snack ideas with healthy glycemic parameters), exercise plan array (safe exercises, step targets), water goal (in liters), sleep goal (in hours), stress management strategies array, daily challenges, and weekly goals.
Provide ONLY valid JSON.
Format:
{
  "dietPlan": ["Breakfast: ...", "Lunch: ...", "Dinner: ...", "Snack: ..."],
  "exercisePlan": ["Exercise 1", "Exercise 2"],
  "waterGoal": "3.0L",
  "sleepGoal": "8 Hours",
  "stressManagement": ["Strategy 1", "Strategy 2"],
  "challenges": ["Challenge 1", "Challenge 2"],
  "weeklyGoals": ["Goal 1", "Goal 2"]
}`,

  reportAnalyze: `You are IBM watsonx.ai Studio Clinical AI. Analyze the following medical report text and extract a structured JSON object containing:
1. "diagnoses": array of strings (diseases, conditions identified)
2. "medications": array of objects, each with "name" and "dosage"
3. "abnormalValues": array of objects, each with "parameter", "value", and "referenceRange"
4. "summary": string (brief overall clinical finding summary)
5. "recommendations": array of strings (lifestyle or medical actions)

Provide ONLY valid JSON. Do not write any explanations before or after the JSON.
Format:
{
  "diagnoses": [],
  "medications": [ {"name": "", "dosage": ""} ],
  "abnormalValues": [ {"parameter": "", "value": "", "referenceRange": ""} ],
  "summary": "",
  "recommendations": []
}`
};

async function callGraniteAPI(prompt, settings) {
  const payload = { prompt };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(err.error || `IBM watsonx.ai Studio API error (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.text;
}

/* Expose to global scope */
window.DATA_CONFIG      = DATA_CONFIG;
window.APP_CONFIG       = APP_CONFIG;
window.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
window.callGraniteAPI   = callGraniteAPI;
