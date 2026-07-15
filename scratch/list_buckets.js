const apiKey = 'uw36wf5xACkL6JEi-9v29H-U0ko5Et28GZmnEUF7rHyt';
const cosInstanceId = 'crn:v1:bluemix:public:cloud-object-storage:global:a/1dde7ce371ba4ac595d206c78ec7376e:f40bf114-8b4b-4d05-a7c1-c11817e94ee2::';

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

async function listBuckets(token, endpoint) {
  const url = `https://${endpoint}/`;
  console.log(`\nListing buckets via: ${url}`);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'ibm-service-instance-id': cosInstanceId
  };

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log('Response content:');
    console.log(text);
  } catch (e) {
    console.error(`Failed for endpoint ${endpoint}:`, e.message);
  }
}

async function main() {
  try {
    const token = await getIamToken(apiKey);
    await listBuckets(token, 's3.us-south.cloud-object-storage.appdomain.cloud');
    await listBuckets(token, 's3.eu-de.cloud-object-storage.appdomain.cloud');
  } catch (e) {
    console.error('Fatal error:', e);
  }
}

main();
