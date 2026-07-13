const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing
app.use(express.json());

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Token Cache configuration
let tokenCache = {
  token: null,
  expiry: 0
};

/**
 * Fetch and cache the IBM Cloud IAM OAuth token
 */
async function getServerToken(apiKey) {
  if (tokenCache.token && Date.now() < tokenCache.expiry - 60000) {
    return tokenCache.token;
  }

  const tokenUrl = 'https://iam.cloud.ibm.com/identity/token';
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`IBM IAM authentication failed (HTTP ${res.status}). Verify API key. ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  tokenCache.token = data.access_token;
  tokenCache.expiry = Date.now() + (data.expires_in * 1000);
  return tokenCache.token;
}

/**
 * Endpoint: GET /api/config
 * Tells the client if server-side environment credentials are set and returns the configured Model ID.
 */
app.get('/api/config', (req, res) => {
  const hasCreds = !!(
    (process.env.IBM_API_KEY || process.env.IBM_CLOUD_API_KEY) &&
    process.env.WATSON_ML_URL &&
    process.env.WATSONX_PROJECT_ID
  );
  
  res.json({
    hasServerCredentials: hasCreds,
    modelId: process.env.IBM_MODEL_ID || 'ibm/granite-3-8b-instruct'
  });
});

/**
 * Endpoint: POST /api/test-connection
 * Tests client-submitted API Key directly against IBM Cloud to avoid CORS.
 */
app.post('/api/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
    });

    if (tokenRes.ok) {
      res.json({ success: true });
    } else {
      const errText = await tokenRes.text().catch(() => '');
      res.status(tokenRes.status).json({ success: false, error: errText.slice(0, 150) });
    }
  } catch (error) {
    console.error('Error in /api/test-connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint: POST /api/chat
 * Proxy endpoint to query IBM Granite via Watson Machine Learning.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, settings } = req.body;

    // Retrieve settings, prioritizing client overrides, falling back to server environment variables
    const apiKey = settings?.apiKey || process.env.IBM_API_KEY || process.env.IBM_CLOUD_API_KEY;
    const svcUrl = (settings?.watsonUrl || process.env.WATSON_ML_URL || '').replace(/\/$/, '');
    const model = settings?.modelId || process.env.IBM_MODEL_ID || 'ibm/granite-3-8b-instruct';
    const projId = settings?.projectId || process.env.WATSONX_PROJECT_ID;

    if (!apiKey) {
      return res.status(400).json({ error: 'IBM Cloud API key not configured.' });
    }
    if (!svcUrl) {
      return res.status(400).json({ error: 'Watson ML Service URL not configured.' });
    }
    if (!projId) {
      return res.status(400).json({ error: 'watsonx.ai Project ID not configured.' });
    }

    // Exchange API Key for OAuth token
    const token = await getServerToken(apiKey);

    const endpoint = `${svcUrl}/ml/v1/text/generation?version=2024-05-01`;
    const wmlBody = {
      model_id: model,
      input: prompt,
      parameters: {
        max_new_tokens: 512,
        min_new_tokens: 20,
        temperature: 0.3,
        top_p: 0.85,
        top_k: 45,
        repetition_penalty: 1.1,
        stop_sequences: ['\n\n---', 'Human:', 'Patient:']
      },
      project_id: projId
    };

    const wmlRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wmlBody)
    });

    if (!wmlRes.ok) {
      const errText = await wmlRes.text().catch(() => '');
      return res.status(wmlRes.status).json({ error: `watsonx.ai API error: ${errText.slice(0, 200)}` });
    }

    const wmlData = await wmlRes.json();
    const text = wmlData?.results?.[0]?.generated_text?.trim() || '(No response from model)';
    
    res.json({ text });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory store for live IoT telemetry streams
let liveTelemetry = {};

/**
 * Endpoint: POST /api/live-vitals
 * Receives vital readings from external IoT sensors or the simulation deck.
 */
app.post('/api/live-vitals', (req, res) => {
  try {
    const { patientId, glucose, systolic, diastolic, hr, spo2, weight } = req.body;
    if (patientId === undefined) {
      return res.status(400).json({ error: 'patientId is required' });
    }
    const pid = parseInt(patientId);
    
    // Store vital reading with current timestamp
    liveTelemetry[pid] = {
      ts: Date.now(),
      glucose: glucose !== undefined && glucose !== '' ? parseFloat(glucose) : null,
      systolic: systolic !== undefined && systolic !== '' ? parseFloat(systolic) : null,
      diastolic: diastolic !== undefined && diastolic !== '' ? parseFloat(diastolic) : null,
      hr: hr !== undefined && hr !== '' ? parseFloat(hr) : null,
      spo2: spo2 !== undefined && spo2 !== '' ? parseFloat(spo2) : null,
      weight: weight !== undefined && weight !== '' ? parseFloat(weight) : null,
    };
    
    res.json({ success: true, data: liveTelemetry[pid] });
  } catch (error) {
    console.error('Error in POST /api/live-vitals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint: GET /api/live-vitals/:patientId
 * Retrieves the latest streamed vital reading for a patient.
 */
app.get('/api/live-vitals/:patientId', (req, res) => {
  try {
    const pid = parseInt(req.params.patientId);
    const data = liveTelemetry[pid] || null;
    res.json({ data });
  } catch (error) {
    console.error('Error in GET /api/live-vitals/:patientId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback for SPA routing or index.html serving
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`VitalSense AI Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from ./public`);
  console.log(`Backend proxy API active.`);
  console.log(`==================================================`);
});
