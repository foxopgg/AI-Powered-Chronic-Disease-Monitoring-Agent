const fs = require('fs');
const path = require('path');

const envPath = 'c:\\Users\\USER\\Documents\\GitHub\\AI-Powered-Chronic-Disease-Monitoring-Agent\\.env';
console.log(`Reading .env from: ${envPath}`);

let apiKey = '';
let svcUrl = '';
let projId = '';
let model = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'IBM_API_KEY' || key === 'IBM_CLOUD_API_KEY') apiKey = val;
      if (key === 'WATSON_ML_URL') svcUrl = val.replace(/\/$/, '');
      if (key === 'WATSONX_PROJECT_ID') projId = val;
      if (key === 'IBM_MODEL_ID') model = val;
    }
  }
} catch (e) {
  console.error(`Failed to read .env: ${e.message}`);
  process.exit(1);
}

if (!apiKey || !svcUrl || !projId) {
  console.error('Error: Missing required keys in .env');
  process.exit(1);
}

model = model || 'meta-llama/llama-3-8b-instruct';

console.log(`API Key: ${apiKey.slice(0, 5)}...${apiKey.slice(-5)}`);
console.log(`Service URL: ${svcUrl}`);
console.log(`Project ID: ${projId}`);
console.log(`Model ID: ${model}`);

async function getIamToken(key) {
  const tokenUrl = 'https://iam.cloud.ibm.com/identity/token';
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(key)}`,
  });

  if (!res.ok) {
    throw new Error(`IAM token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function testInference() {
  try {
    console.log('Fetching IAM token...');
    const token = await getIamToken(apiKey);
    console.log('Token fetched successfully.');

    const endpoint = `${svcUrl}/ml/v1/text/generation?version=2024-05-01`;
    const wmlBody = {
      model_id: model,
      input: 'Hello, what is your name and what can you do?',
      parameters: {
        max_new_tokens: 100,
        temperature: 0.7
      },
      project_id: projId
    };

    console.log('Sending text generation request to watsonx.ai...');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wmlBody)
    });

    console.log(`Response Status: ${res.status}`);
    const responseText = await res.text();
    console.log('Response Content:');
    console.log(responseText);
  } catch (e) {
    console.error('Inference test failed:', e);
  }
}

testInference();
