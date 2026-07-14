const fs = require('fs');
const path = require('path');

const envPath = 'c:\\Users\\USER\\Documents\\GitHub\\AI-Powered-Chronic-Disease-Monitoring-Agent\\.env';
console.log(`Reading .env from: ${envPath}`);

let apiKey = '';

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
    }
  }
} catch (e) {
  console.error(`Failed to read .env: ${e.message}`);
  process.exit(1);
}

if (!apiKey) {
  console.error('Error: IBM_API_KEY not found in .env');
  process.exit(1);
}

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

async function listResources() {
  try {
    console.log('Fetching IAM token...');
    const token = await getIamToken(apiKey);
    console.log('Token fetched.');

    const url = 'https://resource-controller.cloud.ibm.com/v2/resource_instances?limit=100';
    console.log(`Calling Resource Controller: ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (data.resources) {
      console.log(`Found ${data.resources.length} resources:`);
      data.resources.forEach(r => {
        console.log(`- Name: "${r.name}"`);
        console.log(`  ID: ${r.guid}`);
        console.log(`  Crn: ${r.crn}`);
        console.log(`  Service: ${r.resource_id}`);
        console.log(`  State: ${r.state}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Region: ${r.region_id}`);
        console.log('------------------------------------');
      });
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Failed to list resources:', e);
  }
}

listResources();
