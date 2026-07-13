# VitalSense AI — RAG-Powered Indian Chronic Disease Monitoring Platform

> **Live Deployment:** [https://ai-powered-chronic-disease-monitoring.onrender.com/](https://ai-powered-chronic-disease-monitoring.onrender.com/)
>
> An advanced RAG-powered clinical intelligence platform tailored for Indian demographics, featuring real-time IoT vital signs streaming, a VenturePilot-style dark glassmorphism dashboard, dynamic lifestyle outcome projections, and data-visualized clinical PDF downloads. Powered by **IBM Granite Clinical AI** (via watsonx.ai) and localized health guidelines.

---

## Quick Start (Local & Server)

### Run Server Locally:
1. Ensure you have Node.js (version 18+) installed.
2. Run `npm install` to download dependencies.
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser to `http://localhost:3000`.

### Key Directories:
```
vitalsense-ai/
├── public/
│   ├── index.html   ← Redesigned VenturePilot dashboard
│   ├── app.js        ← Core application logic, RAG engine, outcomes simulator, PDF exporter
│   ├── style.css     ← Sleek glassmorphism dark-mode styles & glow effects
│   ├── config.js     ← IBM Cloud & telemetry threshold configuration
│   └── patients.csv  ← Local database of Indian patient profiles
├── server.js         ← Express server with Live IoT webhook routes
└── README.md         ← This file
```

---

## Features

### 👤 Patient Portal
| Feature | Description |
|---|---|
| **Vitals Dashboard** | Dynamic metric cards for Blood Glucose, Blood Pressure, Heart Rate, SpO₂, and Weight with real-time color-coded status badges |
| **Log Vitals** | Enter new readings; critical values (e.g., BP 185/110) immediately trigger `CRITICAL` badges and alarm notifications |
| **Log Meal / Symptom** | Record diet entries, symptoms, and physical activity with optional post-meal glucose |
| **Medication Tracker** | Mark daily medications as taken; doughnut adherence chart updates instantly |
| **14-Day Trend Charts** | Interactive Chart.js graphs (Glucose, BP, Heart Rate, Weight) with target reference lines |
| **AI Analysis** | One-click IBM Granite summary with risk score, active flags, and personalized recommendations |
| **AI Chat Companion** | Floating chat assistant; responds to clinical queries about glucose, BP, diet, medication, SpO₂, and cardiac risk |

### 🩺 Provider Portal
| Feature | Description |
|---|---|
| **AI-Triaged Patient List** | All patients sorted with calculated risk level (Critical / Warning / Stable) and score |
| **Longitudinal Charts** | Multi-metric overlay chart showing trends for any selected patient |
| **Vitals Log Table** | Tabular view of the last 10 vitals entries |
| **Clinical Targets Configurator** | Edit per-patient thresholds (glucose, BP, HR, SpO₂, weight); changes immediately update Patient View alerts |
| **IBM Granite Clinical Report** | Structured clinical summary with longitudinal stats, flags, recommendations, and next-step timing |
| **Alarm Dashboard** | Centralised view of all active critical/warning alarms across all patients |

### ⚙️ Settings & IBM Cloud Integration
- Enter real **IBM Cloud API Key**, **Watson ML Service URL**, and **Model ID**
- Toggle between the built-in simulator and real IBM Granite API
- Live **Test Connection** button validates IAM token against IBM Cloud

---

## Verification Walkthrough

### 1. Critical Alert Trigger
1. In the **Patient Portal**, select *Elena Martinez*.
2. Click **📊 Log Vitals**.
3. Enter: Systolic BP = `185`, Diastolic = `110`, Glucose = `280`.
4. Click **Submit**.
5. ✅ Expect: Patient hero badge turns **CRITICAL** (red, flashing), bell badge count increases, notification panel shows `🔴 Hypertensive Crisis` and `🔴 Critical: Blood Glucose`, Provider alarm dashboard shows the alarms.

### 2. AI Chat
1. Click the **🤖 FAB** (bottom-right).
2. Type: `Analyze my glucose trends`
3. ✅ Expect: Granite AI responds with 14-day average, current reading vs. target, trend arrow, and specific dietary advice.
4. Try: `Am I at risk for a cardiac event?` → risk score + active flags.
5. Try: `What should I eat?` → condition-specific DASH/diabetes/heart-healthy diet plan.

### 3. Provider Target Modification
1. Switch to **Provider Portal** → select *Robert Chen*.
2. In **Clinical Target Ranges**, change *BP Systolic Max* from `125` to `135`.
3. Click **💾 Save Targets**.
4. Switch back to **Patient Portal**, select Robert Chen.
5. ✅ Expect: BP metric card status updates to reflect the new threshold; chart reference line updates.

### 4. Data Persistence
1. Log a vitals entry for any patient.
2. Close and reopen the browser tab (or press F5 to refresh).
3. ✅ Expect: All logged entries, medication check states, and target configurations are preserved via `localStorage`.

### 5. Medication Adherence
1. In the Patient Portal, tick the ✓ circles for each medication.
2. ✅ Expect: Doughnut chart and "Adherence: X%" label update in real-time.

---

## IBM Granite Integration

### Built-in Simulator
The application ships with a **deterministic clinical reasoning engine** (`graniteChat`, `graniteGeneratePatientSummary`, `graniteGenerateClinicalSummary` in `app.js`) that:

- Understands natural-language queries about glucose, blood pressure, cardiac risk, diet, medications, SpO₂, and weight
- Applies per-patient clinical targets to calibrate advice
- Generates structured clinical reports for providers
- Calculates a multi-factor risk score (0–100) based on real clinical thresholds (JNC-8 BP guidelines, ADA glucose targets, AHA cardiac criteria)

### Connecting Real IBM Granite / Watson ML
1. Click **⚙️** in the top nav to open Settings.
2. Enter your **IBM Cloud API Key** (from [cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys)).
3. Enter your **Watson ML Service URL** (e.g., `https://us-south.ml.cloud.ibm.com`).
4. Enter your **Deployment / Model ID** (e.g., `ibm-granite-13b-instruct-v2`).
5. Enable the **Use Real IBM Granite API** toggle.
6. Click **🔌 Test Connection** to validate credentials.

> **Note:** When real API is enabled, chat queries are routed to your IBM WML deployment. The prompt is pre-constructed with the patient's vitals, targets, and query for clinical context. Extend `graniteChat()` in `app.js` to build the API call using your deployment's inference endpoint.

---

## Simulated Patients (Indian Context)

| Patient | Condition | Pre-loaded Scenario / Diagnostics |
|---|---|---|
| **Aarav Mehta** | Type 2 Diabetes | Fluctuating glucose 95–230 mg/dL, diabetic nephropathy (CKD risk) |
| **Priya Sharma** | Hypertension | Consistently elevated systolic 138–175 mmHg, coronary artery disease risk |
| **Dr. Rajesh Iyer** | Chronic Heart Failure | Left Ventricular Dysfunction, COPD symptoms, SpO₂ monitoring (90–95%) |
| **Sunita Rao** | Metabolic Syndrome | Elevated BMI, insulin resistance, dyslipidemia |
| **Amit Patel** | Early-Onset Hypertension | Stress-induced palpitations, work-lifestyle tracking |

All patients have **14 days of realistic seed data** generated on first load, then persisted to `localStorage` (or Cloudant if configured).

---

## Advanced Features

1. **RAG Clinical Guidelines Agent**: Uses local TF-IDF vector database containing Indian-specific medical guidelines (ICMR guidelines for diabetes, CSI guidelines for hypertension, API recommendations, and customized Indian diet plans with ragi, millets, local spices).
2. **IoT Live Telemetry Stream**: Connects to memory telemetry streams. Includes a live dashboard control panel where you can slide patient vitals and send "IoT pulses" directly via backend POST APIs to update charts instantly.
3. **Cardiovascular Risk Prediction**: Incorporates a 10-year CVD risk calculator calibrated for South Asian risk profiles.
4. **Clinical Outcome Prognosis**: Dynamic sliders showing patients how changes in physical activity, sodium reduction, or carbohydrate limits affect life expectancy and long-term organ complications.
5. **Data-Visualized PDF Exporter**: Renders structured multi-page clinical reports complete with embedded charts, history logs, risk assessments, and RAG guidelines.

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI / Design | HTML5 Semantic, Vanilla CSS (glowing card borders, glassmorphism, responsive grid) |
| Logic | Vanilla ES6 JavaScript (no framework overhead, zero-build SPA) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Export | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) & [html2canvas 1.4.1](https://html2canvas.hertzen.com/) via CDN |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter) & [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts |
| Storage | `localStorage` / optional IBM Cloudant NoSQL database |
| AI / RAG | IBM Granite via watsonx.ai (live API proxy via Express / Simulator fallback) |

---

## License

MIT — free to use, modify, and distribute. Developed as a demonstration of RAG clinical intelligence and IoT telemetry on IBM Granite. Not intended for actual medical diagnosis.
