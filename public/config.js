/* ═══════════════════════════════════════════════════════════════════
   VitalSense AI — IBM Cloud Configuration & API Manager
   config.js  ·  MANDATORY — Fill in IBM Cloud credentials before use

   ╔══════════════════════════════════════════════════════════════════╗
   ║  IBM CLOUD LITE SERVICES — ALL REQUIRED                        ║
   ║  This application exclusively uses IBM Cloud services.         ║
   ║  No fallback simulator is used for production AI responses.    ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║  1. IBM Watson Machine Learning (watsonx.ai Lite)              ║
   ║     → ibm/granite-3-8b-instruct (free Lite tier model)        ║
   ║  2. IBM IAM — OAuth 2.0 token exchange (always free)           ║
   ║  3. IBM Watson Discovery Lite — RAG document retrieval         ║
   ╚══════════════════════════════════════════════════════════════════╝

   QUICK START:
   ─────────────────────────────────────────────────────────────────
   Step 1: cloud.ibm.com → Manage → IAM → API keys → Create key
   Step 2: cloud.ibm.com/catalog → Watson Machine Learning → Lite
           Copy Service URL. Go to dataplatform.cloud.ibm.com →
           New project → copy Project ID.
   Step 3: Paste apiKey, projectId below OR enter via ⚙️ Settings UI
   ─────────────────────────────────────────────────────────────────── */

'use strict';

/* ──────────────────────────────────────────────
   SECTION 1 — IBM CLOUD CREDENTIALS  ← REQUIRED
   Obtain from: https://cloud.ibm.com/iam/apikeys
────────────────────────────────────────────────── */
const IBM_CONFIG = {

  /* ── IBM IAM (Identity & Access Management) — always free ── */
  iam: {
    tokenUrl:  'https://iam.cloud.ibm.com/identity/token',
    grantType: 'urn:ibm:params:oauth:grant-type:apikey',
    /* REQUIRED ↓ — paste your IBM Cloud API Key, or enter via Settings UI */
    apiKey:    '5aBebNbNmb8Wx1Ni2gJ6QuRI9r3sxylMX94pf0dCI6w1',
  },

  /* ── Watson Machine Learning / watsonx.ai Lite ── REQUIRED ── */
  watsonML: {
    /*
      Endpoint: https://<region>.ml.cloud.ibm.com
      Regions available on Lite: us-south | eu-de | eu-gb | jp-tok | au-syd

      IBM CLOUD LITE PLAN NOTES:
      • Free tier includes 50,000 tokens/month at no cost
      • No credit card required for Lite plan
      • Sign up: https://cloud.ibm.com/registration
    */
    serviceUrl:  'https://us-south.ml.cloud.ibm.com',

    /*
      IBM GRANITE MODELS (available on Lite via watsonx.ai):
        ibm/granite-3-8b-instruct     ← RECOMMENDED for Lite (fast, free)
        ibm/granite-13b-instruct-v2   ← More capable, uses more tokens
        ibm/granite-3-2b-instruct     ← Lightest, lowest latency
        ibm/granite-20b-multilingual  ← For non-English deployments

      Default: ibm/granite-3-8b-instruct (best Lite tier value)
    */
    modelId:     'ibm/granite-3-8b-instruct',

    /* REQUIRED ↓ — from dataplatform.cloud.ibm.com → project → Manage → General */
    projectId:   '',

    /* Granite inference parameters — tuned for clinical accuracy */
    params: {
      max_new_tokens:      512,
      min_new_tokens:       20,
      temperature:          0.3,
      top_p:                0.85,
      top_k:                45,
      repetition_penalty:   1.1,
      stop_sequences:      ['\n\n---', 'Human:', 'Patient:'],
    },

    /* watsonx.ai REST API version */
    version: '2024-05-01',
  },

  /* ── IBM Watson Discovery Lite (RAG) ── OPTIONAL but recommended ── */
  discovery: {
    /*
      IBM Watson Discovery Lite Plan:
      • Free — 1 collection, up to 1,000 documents
      • Enables real semantic RAG over your own clinical guidelines
      • Provision: cloud.ibm.com/catalog/services/watson-discovery
      • Upload ADA/JNC-8/AHA guideline PDFs to your collection
      • Leave enabled:false to use built-in vector store instead
    */
    enabled:      false,
    serviceUrl:   '',    /* https://api.<region>.discovery.watson.cloud.ibm.com */
    apiKey:       '',    /* Discovery instance API key (separate from WML key) */
    version:      '2020-08-30',
    projectId:    '',
    collectionId: '',
    maxResults:    3,
  },

  /* ── IBM Cloudant Lite (Patient Record Persistence) ── OPTIONAL ── */
  cloudant: {
    /*
      IBM Cloudant Lite Plan:
      • Free — 1 GB storage, 20 reads/sec, 10 writes/sec
      • Replaces localStorage with cloud NoSQL persistence
      • Provision: cloud.ibm.com/catalog/services/cloudant
    */
    enabled:  false,
    url:      '',    /* https://<account>.cloudant.com */
    apiKey:   '',
    dbName:   'vitalsense_patients',
  },
};

/* ──────────────────────────────────────────────
   SECTION 2 — LOCAL DATA SOURCE
   CSV file path for patient seed data
────────────────────────────────────────────────── */
const DATA_CONFIG = {
  patientsCSV:       './patients.csv',
  csvOverridesCache: false,
  vectorStore: {
    /* TF-IDF client-side fallback when Watson Discovery is not configured */
    enabled:         true,
    useIBMDiscovery: false,
    chunkSizeWords:  80,
    topK:            3,
  },
};

/* ──────────────────────────────────────────────
   SECTION 3 — APPLICATION SETTINGS
────────────────────────────────────────────────── */
const APP_CONFIG = {
  projectName:    'VitalSense AI',
  projectTagline: 'IBM Granite · Chronic Disease Intelligence',
  version:        '2.0.0',

  /*
   * MANDATORY IBM GRANITE MODE
   * requireIBMCredentials: true  → app will not allow AI features without
   *   valid IBM Cloud API key + Watson ML URL + Project ID.
   *   Users are shown a mandatory credential onboarding screen on first load.
   *
   * simulatorFallback: true  → allow simulator ONLY when IBM API call fails
   *   (network error, quota exceeded) so the UI remains usable. The UI will
   *   clearly label any simulator response with a warning banner.
   */
  requireIBMCredentials: true,
  simulatorFallback:     true,   /* graceful degradation on API failure only */

  features: {
    csvPatientLoader:    true,
    ragContextInjection: true,
    vectorStore:         true,
    realTimeAlerts:      true,
    providerPortal:      true,
    medicationTracker:   true,
    exportReport:        true,
    darkModeToggle:      false,
    multiLanguage:       false,
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

/* ──────────────────────────────────────────────
   SECTION 4 — IBM GRANITE PROMPT TEMPLATES
   System prompts used when calling the real API
────────────────────────────────────────────────── */
const PROMPT_TEMPLATES = {

  system: `You are IBM Granite Clinical AI, a board-level clinical decision support assistant embedded in VitalSense AI — an IBM-powered chronic disease monitoring platform. You provide accurate, concise, evidence-based clinical guidance. You follow ACC/AHA, ADA, and JNC-8 guidelines. You never replace a physician's judgment. Always recommend professional consultation for critical findings.`,

  patientContext: (patient, vitals, analysis) => `
PATIENT CONTEXT:
  Name: ${patient.name} | Age: ${patient.age} | Sex: ${patient.sex}
  Diagnosis: ${patient.condition}
  Latest Vitals: Glucose ${vitals?.glucose ?? '—'} mg/dL | BP ${vitals?.systolic}/${vitals?.diastolic} mmHg | HR ${vitals?.hr} bpm | SpO2 ${vitals?.spo2}%
  Clinical Targets: Glucose ${patient.targets.glucoseMin}–${patient.targets.glucoseMax} | BP <${patient.targets.bpSystolicMax}/${patient.targets.bpDiastolicMax} | HR ${patient.targets.hrMin}–${patient.targets.hrMax}
  Risk Level: ${analysis.level.toUpperCase()} (Score: ${analysis.risk}/100)
  Active Flags: ${analysis.flags.length ? analysis.flags.map(f => f.msg).join('; ') : 'None'}
  Medications: ${patient.medications.map(m => m.name).join(', ')}
`,

  ragContext: (passages) => passages.length
    ? `\nRELEVANT CLINICAL KNOWLEDGE:\n${passages.map((p, i) => `[${i + 1}] ${p}`).join('\n')}\n`
    : '',

  userQuery: (query) => `\nCLINICIAN QUERY: ${query}\n\nRESPONSE:`,
};

/* ──────────────────────────────────────────────
   SECTION 5 — IBM IAM TOKEN MANAGER
   Caches tokens for the 3,600-second IAM lifetime
────────────────────────────────────────────────── */
const TokenManager = (() => {
  let _token = null;
  let _expiry = 0;

  return {
    async getToken(apiKey) {
      if (!apiKey) throw new Error('IBM Cloud API key is required. Open ⚙️ Settings to configure.');
      if (_token && Date.now() < _expiry - 60000) return _token;
      const res = await fetch(IBM_CONFIG.iam.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=${IBM_CONFIG.iam.grantType}&apikey=${encodeURIComponent(apiKey)}`,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`IBM IAM authentication failed (HTTP ${res.status}). Verify your API key at cloud.ibm.com/iam. ${txt.slice(0,120)}`);
      }
      const data = await res.json();
      _token  = data.access_token;
      _expiry = Date.now() + (data.expires_in * 1000);
      return _token;
    },
    invalidate() { _token = null; _expiry = 0; },
  };
})();

/* ──────────────────────────────────────────────
   SECTION 6 — IBM WATSON ML INFERENCE  ← MANDATORY
   All AI responses route through this function.
   Throws on missing credentials — no silent fallback.
────────────────────────────────────────────────── */
async function callGraniteAPI(prompt, settings) {
  // Pass prompt and settings to backend. The backend prioritizes UI settings (if present) over env vars.
  const payload = {
    prompt,
    settings: {
      apiKey: settings?.apiKey || '',
      watsonUrl: settings?.watsonUrl || '',
      projectId: settings?.projectId || '',
      modelId: settings?.modelId || ''
    }
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(err.error || `IBM Granite API error (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.text;
}

/* Expose to global scope */
window.IBM_CONFIG       = IBM_CONFIG;
window.DATA_CONFIG      = DATA_CONFIG;
window.APP_CONFIG       = APP_CONFIG;
window.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
window.TokenManager     = TokenManager;
window.callGraniteAPI   = callGraniteAPI;
