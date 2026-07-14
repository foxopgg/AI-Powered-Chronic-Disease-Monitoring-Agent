# VitalSense AI — Setup Guide
### IBM watsonx.ai Studio · Chronic Disease Intelligence Platform

> **Project Name:** VitalSense AI  
> **Version:** 2.0.0  
> **Stack:** IBM watsonx.ai Studio (Watson Machine Learning) · IBM Cloud Object Storage · Node.js/Express · Vanilla ES6 · Chart.js

> ⚠️ **IBM Cloud Lite services are mandatory for AI features.** The AI Chat, Risk Prediction, Report Analysis, and Clinical Summaries require valid IBM credentials. The **IBM Cloud Lite plan is free** — no credit card required.
>
> Quick links: [Register IBM Cloud (free)](https://cloud.ibm.com/registration) | [Open watsonx.ai Studio](https://dataplatform.cloud.ibm.com) | [IAM API Keys](https://cloud.ibm.com/iam/apikeys) | [IBM COS](https://cloud.ibm.com/objectstorage/create)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Prerequisites](#3-prerequisites)
4. [Quick Start](#4-quick-start)
5. [IBM Cloud Setup](#5-ibm-cloud-setup)
   - [5A. IBM watsonx.ai Studio](#5a-ibm-watsonxai-studio)
   - [5B. IBM Cloud Object Storage](#5b-ibm-cloud-object-storage)
6. [Environment Configuration (.env)](#6-environment-configuration-env)
7. [In-App Settings](#7-in-app-settings)
8. [Application Flow](#8-application-flow)
9. [Features Reference](#9-features-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Project Overview

**VitalSense AI** is a production-ready AI-powered chronic disease monitoring platform that integrates:

- **IBM watsonx.ai Studio LLM** (via Watson Machine Learning API) for clinical AI chat, risk prediction, report analysis, and personalized recommendations
- **IBM Cloud Object Storage (COS)** for secure storage of uploaded PDFs, prescriptions, lab reports, medical images, and AI-generated health reports
- **Real-time vital signs monitoring** — 12 metrics including blood glucose, blood pressure, heart rate, SpO₂, temperature, sleep, activity, water intake, BMI
- **Predictive Risk Engine** — 10-year CVD risk, stroke risk, CKD/renal risk, hospitalization probability
- **Patient Portal** — Vitals monitor, AI chat, symptom checker, lifestyle coach, medical report analyzer
- **Provider Portal** — Clinical triage, patient overview, AI-generated clinical summaries, target management
- **Analytics Dashboard** — Population-level metrics, medication adherence, RAG/vector store status
- **Emergency Alert System** — Automated critical vital detection with banner escalation and doctor notification

---

## 2. Project Structure

```
vitalsense-ai/
├── server.js               # Express backend — IBM watsonx.ai & COS proxy
├── public/
│   ├── index.html          # Full SPA — all portals, modals, and UI
│   ├── app.js              # Core application logic (ES6 vanilla)
│   ├── config.js           # IBM Cloud configuration & API manager
│   ├── style.css           # Glassmorphism design system
│   ├── locales.js          # Multilingual support (EN, ES, FR)
│   └── uploads/            # Local file upload fallback (auto-created)
├── .env                    # Your credentials (never commit to git)
├── .env.example            # Credential template
├── package.json
└── SETUP.md
```

---

## 3. Prerequisites

- **Node.js ≥ 18** (`node --version` to check)
- **npm** (included with Node.js)
- **IBM Cloud account** — [Register free](https://cloud.ibm.com/registration) (no credit card needed for Lite tier)

---

## 4. Quick Start

```bash
# 1. Clone and install dependencies
npm install

# 2. Copy environment template
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/Mac

# 3. Edit .env with your IBM Cloud credentials (see Section 5)

# 4. Start the server
npm start

# 5. Open in browser
# http://localhost:3000
```

The application works immediately with an **offline simulator fallback** — no credentials required to explore the UI. Connect IBM Cloud credentials for live AI inference and COS storage.

---

## 5. IBM Cloud Setup

### 5A. IBM watsonx.ai Studio

1. **Create an IBM Cloud account** at [cloud.ibm.com/registration](https://cloud.ibm.com/registration)
2. **Get your IBM Cloud API Key**:
   - Go to [cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys)
   - Click **Create an IBM Cloud API key**
   - Save the key (only shown once)
3. **Create a watsonx.ai project**:
   - Go to [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
   - Click **New Project** → **Create an empty project**
   - Copy the **Project ID** from: Project → Manage → General → Project ID
4. **Note your Watson ML Service URL** (region-specific):
   - Dallas (US South): `https://us-south.ml.cloud.ibm.com`
   - Frankfurt (EU): `https://eu-de.ml.cloud.ibm.com`
   - London (EU): `https://eu-gb.ml.cloud.ibm.com`
   - Tokyo (AP): `https://jp-tok.ml.cloud.ibm.com`

### 5B. IBM Cloud Object Storage

1. **Create IBM Cloud Object Storage (COS)**:
   - Go to [cloud.ibm.com/objectstorage/create](https://cloud.ibm.com/objectstorage/create)
   - Select **Lite plan** (free) → Click **Create**
2. **Create a bucket**:
   - Inside your COS instance → **Create bucket**
   - Set bucket name: `vitalsense-reports`
   - Select your region (e.g., `us-south`)
3. **Get your service instance CRN**:
   - COS service → **Service credentials** → **New credential**
   - Look for `resource_instance_id` in the JSON — that is your **COS Instance ID**
4. **Get your COS endpoint**:
   - COS bucket → **Configuration** → **Endpoints**
   - Copy the **Public** endpoint (e.g., `s3.us-south.cloud-object-storage.appdomain.cloud`)

---

## 6. Environment Configuration (.env)

Create a `.env` file in the project root (copy from `.env.example`):

```ini
# IBM watsonx.ai Studio (Watson Machine Learning)
IBM_API_KEY=YOUR_IBM_CLOUD_API_KEY
WATSONX_PROJECT_ID=YOUR_WATSONX_PROJECT_ID
WATSON_ML_URL=https://us-south.ml.cloud.ibm.com
IBM_MODEL_ID=meta-llama/llama-3-8b-instruct

# IBM Cloud Object Storage
COS_ENDPOINT=s3.us-south.cloud-object-storage.appdomain.cloud
COS_BUCKET=vitalsense-reports
COS_INSTANCE_ID=crn:v1:bluemix:public:cloud-object-storage:global:a/...
COS_API_KEY=                 # Leave blank to use IBM_API_KEY

# Server
PORT=3000
```

**Supported model IDs (IBM watsonx.ai Lite):**
- `meta-llama/llama-3-8b-instruct` (default, fastest)
- `meta-llama/llama-3-70b-instruct` (most capable)
- `ibm/granite-3-8b-instruct`
- `mistralai/mistral-large`

---

## 7. In-App Settings

Alternatively, configure credentials **directly in the app** (stored in browser localStorage):

1. Click **⚙️ Settings** icon in the top navigation bar
2. Fill in:
   - **IBM Cloud API Key**
   - **Watson ML Service URL**
   - **watsonx.ai Project ID**
   - **IBM Model ID** (or leave default)
   - **COS Endpoint, Bucket Name, Service Instance ID** (for file storage)
3. Click **Save & Connect** → **Test Connection**

The status indicator in the nav bar will show `watsonx.ai Studio Live` when credentials are valid.

---

## 8. Application Flow

```
Patient Login (select from sidebar)
    ↓
Patient Profile (demographics, conditions, medications)
    ↓
Enter Medical History / Log Vitals
    ↓
Connect Wearable Device (Simulated/Live/External IoT modes)
    ↓
Upload Medical Reports (PDF, Image, Lab Reports)
    ↓
IBM COS stores all uploaded files securely
    ↓
IBM watsonx.ai Studio analyzes reports & patient data
    ↓
Generate health summary + disease risk predictions
    ↓
Display live dashboard (12 vital metrics, charts, trends)
    ↓
Emergency banner triggered if critical vitals detected
    ↓
Notify doctor + hospital recommendation
    ↓
Export AI Health Report PDF → stored to IBM COS
```

---

## 9. Features Reference

| Feature | Location | IBM Service |
|---|---|---|
| AI Chat Assistant | Floating button (bottom-right) | watsonx.ai Studio |
| Patient Health Dashboard | Patient Portal → Vitals Monitor | — |
| Predictive Risk Engine | Patient Portal → Predictive Risk Engine | watsonx.ai Studio |
| Symptom Checker | Patient Portal → Symptom Checker | watsonx.ai Studio |
| Lifestyle Coach | Patient Portal → Lifestyle Coach | watsonx.ai Studio |
| Medical Report Upload | Patient Portal → Medical Report Analyzer | IBM COS |
| Report Analysis (AI) | Patient Portal → Medical Report Analyzer | watsonx.ai Studio + IBM COS |
| PDF Health Export | Patient Hero → Export PDF button | IBM COS |
| Doctor Triage Dashboard | Provider Portal | watsonx.ai Studio |
| Clinical Summary | Provider Portal | watsonx.ai Studio |
| Analytics Dashboard | Analytics Portal | — |
| Emergency Alerts | Automatic (critical vitals) | — |

---

## 10. Troubleshooting

| Issue | Solution |
|---|---|
| `⚠️ IBM watsonx.ai Studio credentials required` | Open ⚙️ Settings → enter your API Key, Watson ML URL, and Project ID |
| `IBM IAM authentication failed` | Verify API Key at [cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys) |
| `watsonx.ai API error (HTTP 400)` | Check that your Project ID is correct and the model is available |
| `COS upload failed` | Verify `COS_ENDPOINT`, `COS_BUCKET`, and `COS_INSTANCE_ID` in `.env` |
| Files not appearing in reports | Verify bucket name matches; check `COS_INSTANCE_ID` is the full CRN |
| Simulator fallback mode | Configure IBM Cloud credentials; simulator activates when credentials are absent |
| Port 3000 in use | Set `PORT=3001` in `.env` and restart |

**Offline / Demo Mode**: All features work with realistic simulated data when IBM credentials are not configured. AI responses will be rule-based clinical simulations.

---

*VitalSense AI v2.0.0 — IBM watsonx.ai Studio & IBM Cloud Object Storage*
