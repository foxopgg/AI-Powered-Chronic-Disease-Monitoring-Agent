const fs = require('fs');
const path = require('path');

// Use exact absolute path to the .env file
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

console.log(`Using API key: ${apiKey.slice(0, 5)}...${apiKey.slice(-5)}`);

async function getIamToken(key) {
  const tokenUrl = 'https://iam.cloud.ibm.com/identity/token';
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(key)}`,
  });

  if (!res.ok) {
    throw new Error(`IAM token request failed with status ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function main() {
  try {
    console.log('Fetching IAM Token...');
    const token = await getIamToken(apiKey);
    console.log('IAM Token retrieved successfully.');

    // We'll try the main global dataplatform projects API endpoint first
    const endpoints = [
      'https://api.dataplatform.cloud.ibm.com/v2/projects',
      'https://api.us-south.dataplatform.cloud.ibm.com/v2/projects'
    ];

    for (const url of endpoints) {
      console.log(`\nCalling REST API endpoint: ${url}`);
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Response Status: ${res.status}`);
        const responseText = await res.text();
        
        try {
          const data = JSON.parse(responseText);
          if (data.resources) {
            console.log(`Found ${data.resources.length} projects:`);
            data.resources.forEach(proj => {
              console.log(`- Name: "${proj.entity.name}" | ID: ${proj.metadata.guid} | Created: ${proj.metadata.created_at}`);
            });
          } else {
            console.log('Response JSON (no resources key):', JSON.stringify(data, null, 2));
          }
        } catch (e) {
          console.log('Response text (could not parse as JSON):', responseText.slice(0, 1000));
        }
      } catch (err) {
        console.error(`Request to ${url} failed:`, err.message);
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
