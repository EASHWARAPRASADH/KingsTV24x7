const http = require('http');

async function approveAd(id) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:8080/api/classifieds/admin/${id}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(500));
    req.end();
  });
}

async function run() {
  for (let i = 1; i <= 200; i++) {
    const status = await approveAd(i);
    if (status === 200) {
      console.log(`Approved ad ${i}`);
    }
  }
}

run();
