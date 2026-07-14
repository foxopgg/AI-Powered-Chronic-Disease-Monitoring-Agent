const apiKey = '5aBebNbNmb8Wx1Ni2gJ6QuRI9r3sxylMX94pf0dCI6w1';
const projId = 'b46fe928-720d-4d83-85ef-923c47553d2c';

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

async function inspectProject() {
  const url = `https://api.dataplatform.cloud.ibm.com/v2/projects/${projId}`;
  try {
    const token = await getIamToken(apiKey);
    console.log(`\nCalling: ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log('Project Details:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to inspect project:', e);
  }
}

inspectProject();
