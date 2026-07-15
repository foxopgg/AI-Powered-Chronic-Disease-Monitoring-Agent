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

async function listProjects(token, region) {
  const url = `https://api.${region}.dataplatform.cloud.ibm.com/v2/projects`;
  console.log(`\nListing projects in region "${region}" via: ${url}`);
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    console.error(`Failed to list projects in ${region}: ${res.status}`);
    return;
  }

  const data = await res.json();
  if (data.resources) {
    console.log(`Found ${data.resources.length} projects in ${region}:`);
    data.resources.forEach(p => {
      console.log(`- Name: "${p.entity.name}"`);
      console.log(`  ID: ${p.metadata.guid}`);
      console.log(`  Created: ${p.metadata.created_at}`);
      console.log(`  Storage Bucket: ${p.entity.storage?.properties?.bucket_name}`);
      console.log('------------------------------------');
    });
  } else {
    console.log(`No projects found or unexpected response:`, JSON.stringify(data, null, 2));
  }
}

async function main() {
  try {
    const token = await getIamToken(apiKey);
    await listProjects(token, 'eu-de');
    await listProjects(token, 'eu-gb');
  } catch (e) {
    console.error('Fatal error:', e);
  }
}

main();
