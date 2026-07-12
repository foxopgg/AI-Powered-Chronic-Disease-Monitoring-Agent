# CareIQ — AI-Powered Chronic Disease Monitoring Agent

> An intelligent web application simulating a clinical AI agent for chronic disease monitoring, powered by a high-fidelity **IBM Granite Clinical AI Simulator** with optional real IBM Watson ML / Granite API integration.

---

## Quick Start

1. **Clone or download** this repository.
2. **Open `index.html`** in any modern browser (Chrome, Firefox, Edge, Safari).
3. No build step, no server, no dependencies to install — everything runs locally.

```
chronic-care-agent/
├── index.html   ← Entry point (open this in your browser)
├── style.css    ← Dark-mode glassmorphism design system
├── app.js       ← Application logic + IBM Granite AI simulator
└── README.md    ← This file
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

## Simulated Patients

| Patient | Condition | Pre-loaded scenario |
|---|---|---|
| **Elena Martinez** | Type 2 Diabetes | Fluctuating glucose 95–230 mg/dL, mildly elevated BP |
| **Robert Chen** | Hypertension | Consistently elevated systolic 138–175 mmHg |
| **Ama Owusu** | Heart Disease | Variable HR, borderline SpO₂, weight monitoring |

All patients have **14 days of realistic seed data** generated on first load, then persisted to `localStorage`.

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI | HTML5 Semantic, Vanilla CSS (custom properties, grid, flex) |
| Logic | Vanilla ES6 JavaScript (no framework, no build step) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Fonts | [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts |
| Storage | `localStorage` (client-side persistence) |
| AI | IBM Granite Simulator (built-in) / IBM Watson ML (optional) |

---

## License

MIT — free to use, modify, and distribute. Not intended as a substitute for professional medical advice.
