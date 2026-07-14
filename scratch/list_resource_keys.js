const apiKey = '5aBebNbNmb8Wx1Ni2gJ6QuRI9r3sxylMX94pf0dCI6w1';
const cosInstanceGuid = '99771c89-2157-4055-acaf-17a1e5dda4aa';

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

async function listResourceKeys() {
  try {
    const token = await getIamToken(apiKey);
    const url = `https://resource-controller.cloud.ibm.com/v2/resource_keys?source_id=${cosInstanceGuid}`;
    console.log(`Calling: ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log('Resource Keys:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to list resource keys:', e);
  }
}

listResourceKeys();
