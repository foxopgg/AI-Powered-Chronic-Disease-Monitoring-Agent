const apiKey = 'uw36wf5xACkL6JEi-9v29H-U0ko5Et28GZmnEUF7rHyt';
const projId = 'c89cad83-028e-46da-8104-c2e1c97fa703';

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
  const urls = [
    `https://api.eu-de.dataplatform.cloud.ibm.com/v2/projects/${projId}`,
    `https://api.eu-gb.dataplatform.cloud.ibm.com/v2/projects/${projId}`,
    `https://api.dataplatform.cloud.ibm.com/v2/projects/${projId}`
  ];

  try {
    const token = await getIamToken(apiKey);
    for (const url of urls) {
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
    }
  } catch (e) {
    console.error('Failed to inspect project:', e);
  }
}

inspectProject();
