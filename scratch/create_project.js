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
      if (key === 'IBM_API_KEY' || key === 'IBM_CLOUD_API_KEY') {
        apiKey = val;
      }
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

const cosInstanceGuid = '99771c89-2157-4055-acaf-17a1e5dda4aa';
const bssAccountId = '1dde7ce371ba4ac595d206c78ec7376e';

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

async function createProject(token, name, guid, bssId) {
  const url = 'https://api.dataplatform.cloud.ibm.com/v2/projects';
  const payload = {
    name: name,
    generator: 'vitalsense-ai',
    storage: {
      type: 'bmcos_object_storage',
      guid: guid,
      properties: {
        bucket_name: 'vettalsenseai-donotdelete-pr-u462nlwdi5bhpw',
        bucket_region: 'us-south',
        endpoint_url: 'https://s3.us-south.cloud-object-storage.appdomain.cloud'
      }
    },
    scope: {
      bss: bssId
    }
  };

  console.log(`Sending POST request to ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log(`Response Status: ${res.status}`);
  const responseText = await res.text();
  try {
    return JSON.parse(responseText);
  } catch (e) {
    return responseText;
  }
}

async function main() {
  try {
    console.log('Fetching IAM Token...');
    const token = await getIamToken(apiKey);
    console.log('IAM Token retrieved successfully.');

    console.log('\n--- Attempting to create project with storage properties ---');
    const result = await createProject(token, 'VitalSense AI Studio', cosInstanceGuid, bssAccountId);
    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.metadata && result.metadata.guid) {
      console.log(`\n🎉 Project successfully created! Project ID: ${result.metadata.guid}`);
    } else {
      console.log('\n❌ Failed to create project.');
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
