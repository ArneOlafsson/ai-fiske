const https = require('https');

https.get('https://firestore.googleapis.com/v1/projects/ai-fiske-c9441/databases/(default)/documents/catches', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        if (json.documents) {
            json.documents.forEach(doc => {
                console.log(doc.name);
                console.log(doc.fields.isPublic);
                console.log(doc.fields.createdAt);
            });
        } else {
            console.log(json);
        }
    } catch(e) { console.log(e); }
  });
}).on('error', err => console.log(err.message));
