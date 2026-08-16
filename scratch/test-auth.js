const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/csrf',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`GET /api/auth/csrf status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    
    // Attempt credentials login
    const postData = JSON.stringify({
      username: 'ADMIN',
      password: '123456',
      redirect: false
    });
    
    const postOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const postReq = http.request(postOptions, (postRes) => {
      let postDataResp = '';
      postRes.on('data', (chunk) => { postDataResp += chunk; });
      postRes.on('end', () => {
        console.log(`POST /api/auth/callback/credentials status: ${postRes.statusCode}`);
        console.log(`Response: ${postDataResp}`);
      });
    });
    
    postReq.write(postData);
    postReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});
req.end();
