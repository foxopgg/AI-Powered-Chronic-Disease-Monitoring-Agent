# VitalSense AI
### IBM Granite-Powered Chronic Disease Intelligence Platform

> **Project Name:** VitalSense AI
> **Version:** 2.0.0
> **Stack:** IBM Watson ML (watsonx.ai Lite) · **IBM Granite** · IBM Watson Discovery (RAG) · Vanilla ES6 · Chart.js · CSV Data Layer

> ⚠️ **IBM Cloud Lite services are mandatory.** This application exclusively uses real IBM Cloud infrastructure. AI features (chat, analysis, clinical reports) require valid IBM credentials. The **IBM Cloud Lite plan is free** — no credit card required.
>
> Quick links: [Register IBM Cloud (free)](https://cloud.ibm.com/registration) | [Open watsonx.ai](https://dataplatform.cloud.ibm.com) | [IAM API Keys](https://cloud.ibm.com/iam/apikeys)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Naming & Concept](#3-naming--concept)
4. [Prerequisites](#4-prerequisites)
5. [Step 1 — Clone & Open Locally](#step-1--clone--open-locally)
6. [Step 2 — Review & Edit the CSV Dataset](#step-2--review--edit-the-csv-dataset)
7. [Step 3 — Configure IBM Cloud Services](#step-3--configure-ibm-cloud-services)
8. [Step 4 — Configure `config.js`](#step-4--configure-configjs)
9. [Step 5 — Enable IBM Watson Discovery (RAG)](#step-5--enable-ibm-watson-discovery-rag)
10. [Step 6 — Enable IBM Cloudant Persistence](#step-6--enable-ibm-cloudant-persistence)
11. [Step 7 — Connect the Real IBM Granite API (In-App)](#step-7--connect-the-real-ibm-granite-api-in-app)
12. [Step 8 — Test the Full Integration](#step-8--test-the-full-integration)
13. [Architecture Diagram](#architecture-diagram)
14. [IBM Granite Prompt Engineering](#ibm-granite-prompt-engineering)
15. [RAG / Vector Store System](#rag--vector-store-system)
16. [Feature Reference](#feature-reference)
17. [Verification Walkthrough](#verification-walkthrough)
18. [Troubleshooting](#troubleshooting)

---

## 1. Project Overview

**VitalSense AI** is a professional-grade, AI-powered chronic disease monitoring platform that combines:

- **IBM Granite LLM** (via IBM Watson Machine Learning / watsonx.ai) for clinical AI reasoning
- **IBM Watson Discovery v2** for Retrieval-Augmented Generation (RAG) — enriching AI responses with real medical guidelines
- **Local CSV dataset** (`patients.csv`) for easily editable, version-controlled patient data
- **Client-side Vector Store** for semantic context matching when Watson Discovery is offline
- **Real-time vital signs monitoring** with multi-factor clinical risk scoring
- **Dual portal** — Patient self-management view and Provider clinical dashboard

The application runs entirely in the browser with zero build steps. IBM Cloud services are optional but dramatically enhance AI quality when configured.

---

## 2. Project Structure

```
vitalsense-ai/
├── index.html        ← Main application entry point (open in browser)
├── style.css         ← Next-generation design system (glassmorphism, bento grid)
├── app.js            ← Core application logic, AI engine, CSV loader, RAG
├── config.js         ← IBM Cloud API configuration & token management
├── patients.csv      ← Editable patient dataset (modify to add/change patients)
└── SETUP.md          ← This file — complete setup guide
```

---

## 3. Naming & Concept

### Why "VitalSense AI"?

| Element | Rationale |
|---|---|
| **Vital** | Core to life — vital signs (glucose, BP, HR, SpO₂, weight) |
| **Sense** | The intelligence that *senses* patterns, anomalies, and trends across patient data |
| **AI** | Powered by IBM Granite, the most capable enterprise clinical AI in the IBM Cloud |

The name is memorable, medically resonant, globally brandable, and clearly communicates both the clinical and AI dimensions of the platform.

**Alternative names considered:**
- `PulseGuard AI` — emphasizes cardiac monitoring
- `ChronoHealth` — emphasizes longitudinal tracking
- `GraniteCare` — IBM-specific branding
- ✅ **VitalSense AI** — selected for universality and clarity

---

## 4. Prerequisites

| Requirement | Details |
|---|---|
| Modern browser | Chrome 100+, Firefox 100+, Edge 100+, Safari 16+ |
| IBM Cloud account | [cloud.ibm.com](https://cloud.ibm.com) — free tier available |
| IBM watsonx.ai project | Required for real Granite inference |
| (Optional) IBM Watson Discovery | Required for RAG document retrieval |
| (Optional) IBM Cloudant | Required for cloud-persisted patient records |

No Node.js, no npm, no build step required for basic operation.

---

## Step 1 — Clone & Open Locally

```bash
# Clone the repository
git clone https://github.com/your-org/vitalsense-ai.git
cd vitalsense-ai

# Open in browser (no server needed for simulator mode)
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

> **Note:** For the CSV loader and IBM API calls to work correctly, serve the files from a local HTTP server:
>
> ```bash
> # Python 3
> python -m http.server 8080
> # Then navigate to: http://localhost:8080
> ```

The application will start in **Simulator Mode** — fully functional with built-in IBM Granite clinical AI, no API key required.

---

## Step 2 — Review & Edit the CSV Dataset

The file `patients.csv` is the **single source of truth** for patient data. It is plain text and can be edited in any spreadsheet application (Excel, Google Sheets, LibreOffice Calc) or text editor.

### CSV Column Reference

| Column | Description | Example |
|---|---|---|
| `id` | Unique patient index (0-based) | `0` |
| `name` | Full patient name | `Elena Martinez` |
| `initials` | 2-letter avatar initials | `EM` |
| `age` | Age in years | `54` |
| `sex` | `M` or `F` | `F` |
| `condition` | Display label for condition | `Type 2 Diabetes` |
| `diagnosis` | Programmatic diagnosis key | `type2_diabetes` |
| `med1_name` … `med4_name` | Medication names (up to 4) | `Metformin 1000mg` |
| `med1_dose` … `med4_dose` | Dosing instructions | `Morning with food` |
| `med1_time` … `med4_time` | `AM` or `PM` | `AM` |
| `glucose_min` / `glucose_max` | Target glucose range (mg/dL) | `70` / `140` |
| `bp_systolic_max` | Target max systolic BP | `130` |
| `bp_diastolic_max` | Target max diastolic BP | `80` |
| `hr_min` / `hr_max` | Target heart rate range (bpm) | `60` / `100` |
| `spo2_min` | Minimum target SpO₂ (%) | `95` |
| `weight_min` / `weight_max` | Target weight range (kg) | `58` / `72` |
| `emergency_contact` | Name and phone | `Maria Martinez +1-555-0192` |
| `primary_physician` | Assigned physician | `Dr. Sandra Patel` |
| `insurance_id` | Insurance identifier | `BCB-8821-ELM` |
| `next_appointment` | Next scheduled visit | `2025-08-15` |

### Adding a New Patient

1. Open `patients.csv` in Excel or a text editor.
2. Copy the last row and paste it as a new line.
3. Increment the `id` field.
4. Fill in all columns. Leave `med3_name` / `med4_name` blank if fewer than 4 medications.
5. Save the file.
6. Reload the browser — the new patient appears in the selector.

> **Tip:** Set `csvOverridesCache: true` in `config.js → DATA_CONFIG` to force CSV data to override any previously cached localStorage data after changes.

---

## Step 3 — Configure IBM Cloud Services

### 3a. Create an IBM Cloud Account

1. Go to [https://cloud.ibm.com/registration](https://cloud.ibm.com/registration)
2. Create a free account (no credit card required for Lite tier)

### 3b. Generate an API Key

1. Navigate to **Manage → Access (IAM) → API keys**
2. Click **Create an IBM Cloud API key**
3. Name it: `vitalsense-ai-key`
4. Copy and **securely store** the key — it is shown only once

### 3c. Provision Watson Machine Learning (watsonx.ai)

1. Go to [https://cloud.ibm.com/catalog/services/watson-machine-learning](https://cloud.ibm.com/catalog/services/watson-machine-learning)
2. Select the **Lite** plan (free) or **Standard**
3. Choose your region (e.g., `us-south`)
4. Click **Create**
5. From the service page, copy the **Service URL** (e.g., `https://us-south.ml.cloud.ibm.com`)

### 3d. Create a watsonx.ai Project

1. Navigate to [https://dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
2. Click **New project → Create an empty project**
3. Name it: `VitalSense AI`
4. Associate your Watson ML instance
5. From project **Manage** tab, copy the **Project ID**

### 3e. Verify Model Access

In your watsonx.ai project:
1. Click **Assets → Foundation models**
2. Confirm `ibm/granite-3-8b-instruct` is available
3. Note the exact Model ID for your region

---

## Step 4 — Configure `config.js`

Open `config.js` and update the following sections:

```javascript
/* SECTION 1 — IBM CLOUD CORE */
const IBM_CONFIG = {
  iam: {
    apiKey: 'YOUR_IBM_CLOUD_API_KEY_HERE',   // ← Paste your API key
  },
  watsonML: {
    serviceUrl: 'https://us-south.ml.cloud.ibm.com',  // ← Your region
    modelId:    'ibm/granite-3-8b-instruct',         // ← Your model
    projectId:  'YOUR_WATSONX_PROJECT_ID_HERE',        // ← Your project ID
  },
  // ... rest of config
};
```

> **Security Note:** For production deployment, never commit API keys to version control. Use environment variables or IBM Secrets Manager. The `config.js` file should be added to `.gitignore` if it contains real keys.

---

## Step 5 — Enable IBM Watson Discovery (RAG)

Watson Discovery enables **Retrieval-Augmented Generation** — the AI searches a knowledge base of clinical guidelines before answering, grounding its responses in evidence-based medicine.

### 5a. Provision Watson Discovery

1. Go to [https://cloud.ibm.com/catalog/services/watson-discovery](https://cloud.ibm.com/catalog/services/watson-discovery)
2. Select **Plus** or **Enterprise** plan (RAG requires Plus+)
3. Create the service, copy the **Service URL** and **API key**

### 5b. Create a Collection & Upload Documents

1. Open your Discovery instance → **New project**
2. Choose **Document Retrieval**
3. Upload clinical guidelines as PDF/DOCX files:
   - ADA Standards of Medical Care in Diabetes
   - JNC-8 Hypertension Guidelines
   - AHA/ACC Heart Failure Guidelines
   - ESC Guidelines on Cardiovascular Prevention
4. Copy the **Project ID** and **Collection ID**

### 5c. Update `config.js`

```javascript
discovery: {
  enabled:      true,                         // ← Enable RAG
  serviceUrl:   'https://api.us-south.discovery.watson.cloud.ibm.com',
  apiKey:       'YOUR_DISCOVERY_API_KEY',
  projectId:    'YOUR_DISCOVERY_PROJECT_ID',
  collectionId: 'YOUR_COLLECTION_ID',
  maxResults:    3,
},
```

When enabled, every AI query automatically:
1. Sends the patient query + context to Watson Discovery
2. Retrieves the top-3 most relevant clinical guideline passages
3. Injects them into the Granite prompt as authoritative context
4. The model's response is now grounded in real medical evidence

---

## Step 6 — Enable IBM Cloudant Persistence

Replace client-side `localStorage` with IBM Cloudant for multi-device, cloud-persisted patient records.

### 6a. Provision Cloudant

1. Go to [https://cloud.ibm.com/catalog/services/cloudant](https://cloud.ibm.com/catalog/services/cloudant)
2. Select **Lite** plan (free, 1 GB)
3. Create the service, create credentials with `Manager` role
4. Copy the **External Endpoint URL** and **API key**

### 6b. Create the Database

```bash
# Using curl to create the database
curl -u "apikey:YOUR_CLOUDANT_API_KEY" \
  -X PUT \
  https://YOUR_CLOUDANT_URL/vitalsense_patients
```

### 6c. Enable CORS in Cloudant

In Cloudant dashboard → **Account → CORS**, add `http://localhost:8080` (and your production domain).

### 6d. Update `config.js`

```javascript
cloudant: {
  enabled:  true,
  url:      'https://YOUR_ACCOUNT.cloudant.com',
  apiKey:   'YOUR_CLOUDANT_API_KEY',
  dbName:   'vitalsense_patients',
},
```

---

## Step 7 — Connect the Real IBM Granite API (In-App)

Even without editing `config.js`, you can configure the API from within the app:

1. Click **⚙️** in the top navigation bar
2. In the **Settings** modal:
   - Paste your **IBM Cloud API Key**
   - Enter your **Watson ML Service URL** (e.g., `https://us-south.ml.cloud.ibm.com`)
   - Enter your **Model ID** (e.g., `ibm/granite-3-8b-instruct`)
   - Enter your **watsonx.ai Project ID**
   - Toggle **Use Real IBM Granite API** → ON
3. Click **🔌 Test Connection**
4. ✅ Expect: `IBM Cloud IAM token obtained. API credentials valid.`
5. Click **💾 Save Settings**

All AI chat responses and clinical summaries will now route through the real IBM Granite model.

---

## Step 8 — Test the Full Integration

### Test 1: CSV Patient Loading
1. Add a new row to `patients.csv` with a test patient
2. Set `csvOverridesCache: true` in `config.js → DATA_CONFIG`
3. Reload the page
4. ✅ Expect: New patient appears in the dropdown selector

### Test 2: Critical Alert Trigger
1. Select **Elena Martinez** in the Patient Portal
2. Click **📊 Log Vitals**
3. Enter: Glucose = `285`, Systolic = `190`, Diastolic = `115`
4. Click **Submit**
5. ✅ Expect: Risk badge turns **CRITICAL** (red, pulsing), bell badge increments, alarm dashboard shows hypertensive crisis alert

### Test 3: Real IBM Granite AI Response
1. Configure real API (Step 7) and enable it
2. Open the AI Chat (🤖 FAB, bottom-right)
3. Ask: `Analyze my glucose trends and provide evidence-based recommendations`
4. ✅ Expect: Response from real IBM Granite model (slightly slower, ~2-3 sec)
5. If Watson Discovery RAG is enabled, the response will cite specific guideline passages

### Test 4: RAG Context Injection
1. Enable Watson Discovery in `config.js`
2. Ask the AI chat: `What does the ADA say about post-meal glucose targets?`
3. ✅ Expect: AI response references uploaded clinical guideline content

### Test 5: Provider Portal Clinical Report
1. Switch to **Provider Portal** (top nav)
2. Select **Ama Owusu** from the triage list
3. Click **Generate Summary**
4. ✅ Expect: Structured IBM Granite clinical report with longitudinal stats and next-step timing

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      VitalSense AI                          │
│                     Browser (SPA)                           │
├────────────┬──────────────────┬──────────────────────────── ┤
│  Patient   │    Provider      │        Settings              │
│   Portal   │    Portal        │        Config Panel          │
└────────────┴──────────────────┴──────────────────────────── ┘
       │                │                    │
       ▼                ▼                    ▼
┌──────────────────────────────────────────────────┐
│                    app.js                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ CSV Loader  │  │ Risk Engine  │  │ RAG Store│ │
│  │ (patients   │  │ (JNC-8/ADA/  │  │ (TF-IDF  │ │
│  │  .csv)      │  │  AHA rules)  │  │ vectors) │ │
│  └─────────────┘  └──────────────┘  └──────────┘ │
│  ┌─────────────────────────────────────────────┐  │
│  │         IBM Granite Simulator               │  │
│  │  (deterministic clinical reasoning engine)  │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
       │                              │
       ▼                              ▼
┌─────────────────┐         ┌──────────────────────┐
│   config.js      │         │   IBM Cloud Services  │
│  ┌────────────┐  │         │  ┌────────────────┐  │
│  │ IBM_CONFIG │  │────────►│  │ Watson ML /    │  │
│  │ DATA_CONFIG│  │         │  │ watsonx.ai     │  │
│  │ APP_CONFIG │  │         │  │ (Granite 13B)  │  │
│  │ TokenMgr   │  │         │  └────────────────┘  │
│  │ callGranite│  │         │  ┌────────────────┐  │
│  └────────────┘  │         │  │ Watson         │  │
└─────────────────┘          │  │ Discovery v2   │  │
                              │  │ (RAG / KB)     │  │
                              │  └────────────────┘  │
                              │  ┌────────────────┐  │
                              │  │ IBM Cloudant   │  │
                              │  │ (Patient DB)   │  │
                              │  └────────────────┘  │
                              │  ┌────────────────┐  │
                              │  │ IBM IAM        │  │
                              │  │ (OAuth tokens) │  │
                              │  └────────────────┘  │
                              └──────────────────────┘
                                         │
                              ┌──────────────────────┐
                              │   patients.csv        │
                              │   (local data file)   │
                              └──────────────────────┘
```

---

## IBM Granite Prompt Engineering

VitalSense AI uses a structured multi-layer prompting strategy:

```
[SYSTEM PROMPT]
  → Clinical AI persona, guidelines adherence, safety constraints

[PATIENT CONTEXT]
  → Current vitals, diagnosis, targets, active flags, medications

[RAG CONTEXT] (when Watson Discovery is enabled)
  → Retrieved clinical guideline passages relevant to the query

[USER QUERY]
  → Natural language clinical question or command

[RESPONSE]
  → IBM Granite generates evidence-grounded clinical response
```

All prompt templates are defined in `config.js → PROMPT_TEMPLATES` and are fully customizable.

### Key Design Decisions

1. **Temperature 0.35** — Low enough for clinical accuracy, high enough for natural language variety
2. **Stop sequences** — `['Human:', 'Patient:']` prevent the model from hallucinating dialogue turns
3. **max_new_tokens: 600** — Sufficient for comprehensive clinical summaries without runaway generation
4. **System prompt** — Anchors the model to ACC/AHA/ADA/JNC-8 guidelines explicitly

---

## RAG / Vector Store System

VitalSense AI implements two levels of RAG:

### Level 1: Client-Side Vector Store (Always Active)
Located in `app.js → VectorStore`, this lightweight system:
- Chunks patient history and clinical knowledge into ~80-word segments
- Computes TF-IDF style term frequency vectors in-browser
- On each query, cosine-similarity matches the top-K relevant chunks
- Injects them into the prompt as local context — no external service needed

### Level 2: IBM Watson Discovery (Optional, Cloud)
When `discovery.enabled = true` in `config.js`:
- Sends the query to Watson Discovery's `/query` endpoint
- Retrieves passages from uploaded medical guideline PDFs
- Provides semantic embeddings via IBM's NLP models
- Superior accuracy — grounded in actual published clinical guidelines

### Data Flow (RAG + Granite)

```
User Query
    │
    ├─► Client VectorStore.search(query)
    │       └─► Top-3 local context chunks
    │
    ├─► [If Discovery enabled] Discovery.query(query)
    │       └─► Top-3 guideline passages
    │
    └─► Granite Prompt = SystemPrompt + PatientCtx + RAGContext + Query
              └─► IBM Granite API → Clinical Response
```

---

## Feature Reference

| Feature | Portal | Description |
|---|---|---|
| **Vitals Dashboard** | Patient | Live metric cards: Glucose, BP, HR, SpO₂, Weight with status |
| **Log Vitals** | Patient | Enter readings; critical values trigger instant alerts |
| **Log Meal / Symptom** | Patient | Record diet, symptoms, activity with severity |
| **Medication Tracker** | Patient | Daily adherence with doughnut chart |
| **14-Day Trend Charts** | Patient | Chart.js: Glucose, BP, HR, Weight with targets |
| **AI Analysis** | Patient | IBM Granite patient summary with risk score |
| **AI Chat Companion** | Patient | Context-aware clinical chatbot (RAG-enhanced) |
| **Patient Info Card** | Patient | Emergency contact, physician, insurance, appointment |
| **Patient Triage** | Provider | AI-sorted risk list across all patients |
| **Longitudinal Charts** | Provider | Multi-metric overlay for any patient |
| **Vitals Log Table** | Provider | Last 10 readings in tabular format |
| **Clinical Targets** | Provider | Edit per-patient thresholds |
| **Clinical Report** | Provider | Structured IBM Granite report with next steps |
| **Alarm Dashboard** | Provider | All active critical/warning alerts |
| **CSV Data Layer** | System | Edit `patients.csv` to modify patient data |
| **IBM Cloud Config** | Settings | Connect real Granite API, Watson Discovery, Cloudant |
| **RAG Context** | System | Local vector store + optional IBM Watson Discovery |

---

## Verification Walkthrough

### 1. Critical Alert — Hypertensive Crisis
1. Select **Elena Martinez**
2. Click **📊 Log Vitals**
3. Enter: Systolic = `190`, Diastolic = `115`, Glucose = `285`
4. Submit
5. ✅ Risk badge → **CRITICAL** (red, pulsing), bell badge increments, alarm panel shows critical alerts

### 2. AI Chat — Glucose Analysis
1. Click the **🤖** FAB (bottom-right)
2. Type: `Analyze my glucose trends`
3. ✅ Response includes 14-day average, current vs. target, trend direction, specific dietary advice

### 3. Provider Clinical Report
1. Switch to **Provider Portal**
2. Select **Ama Owusu** from triage
3. Click **Generate Summary**
4. ✅ Full structured report with longitudinal stats, flags, and schedule timing

### 4. CSV Patient Edit
1. Open `patients.csv`, change Elena's `glucose_max` from `140` to `120`
2. Set `csvOverridesCache: true` in `config.js`
3. Reload the page
4. ✅ Elena's glucose target is now 120 mg/dL; her current reading shows as `Elevated`

### 5. IBM Cloud Connection Test
1. Open **⚙️ Settings**
2. Enter a valid IBM Cloud API Key and Watson ML URL
3. Click **🔌 Test Connection**
4. ✅ `IBM Cloud IAM token obtained. API credentials valid.`

---

## Troubleshooting

| Issue | Solution |
|---|---|
| CSV not loading | Serve via HTTP server (`python -m http.server 8080`), not file:// |
| IBM API returns 401 | API key invalid or expired — regenerate at cloud.ibm.com/iam |
| IBM API returns 404 | Wrong `serviceUrl` or `modelId` — verify in watsonx.ai project |
| IBM API returns 403 | Model access not enabled for your plan — check watsonx.ai project settings |
| IAM token error in console | CORS issue — IBM IAM does allow browser calls; check network tab |
| Discovery returns empty | Collection not indexed yet — wait 5-10 minutes after upload |
| Charts not rendering | Ensure Chart.js CDN is accessible; check browser console |
| Data not persisting | localStorage may be disabled (private/incognito mode) |
| Alerts not clearing | Click "Clear All" in notification panel or reset localStorage |

---

## License

MIT License — free to use, modify, and distribute.

> **Medical Disclaimer:** VitalSense AI is a demonstration platform. It is **not** a certified medical device and should **not** be used for actual clinical decision-making. Always consult qualified healthcare professionals for medical advice and treatment decisions.

---

*Built with IBM Granite · watsonx.ai · IBM Cloud · Chart.js*
