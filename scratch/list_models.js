const apiKey = 'uw36wf5xACkL6JEi-9v29H-U0ko5Et28GZmnEUF7rHyt';

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

async function listModels() {
  try {
    const token = await getIamToken(apiKey);
    const url = 'https://eu-gb.ml.cloud.ibm.com/ml/v1/foundation_model_specs?version=2024-05-01';
    
    console.log(`Calling WML: ${url}`);
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
      console.log(`Found ${data.resources.length} models in eu-de:`);
      data.resources.forEach(m => {
        console.log(`- Model ID: "${m.model_id}"`);
        console.log(`  Label: "${m.label}"`);
        console.log(`  Provider: "${m.provider}"`);
        console.log('------------------------------------');
      });
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Failed to list models:', e);
  }
}

listModels();
