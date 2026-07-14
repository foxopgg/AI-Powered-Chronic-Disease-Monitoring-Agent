const apiKey = '70AR2D3PftmSR3W0mggrEakWuINUAZNHi3Nr5RtbrCDd';
const projId = 'b7f98012-b8b3-42ff-bd5d-a74f6ffb469e';

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
