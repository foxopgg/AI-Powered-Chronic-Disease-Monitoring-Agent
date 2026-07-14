const apiKey = '5aBebNbNmb8Wx1Ni2gJ6QuRI9r3sxylMX94pf0dCI6w1';
const svcUrl = 'https://eu-gb.ml.cloud.ibm.com';
const projId = '95d58bf3-06bb-46cd-83b0-97ffd9eb2a34';
const model = 'meta-llama/llama-3-8b-instruct';

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
