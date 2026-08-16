const fs = require('fs');

const userPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDH92WdRdiRKJow\ncoiBw1RhUmcWck5dl7+f7gMkSpYIaNqPw59WEI0/cJq/vROfgTfrUEhD6Rz6JBsy\nCaLtvi9cWRi/pOUyIsiG6PZSv8tNaakd4uwZdyC22EoqODgKgeKkgUaNEdESVX5b\nMRWcgOrwCT/dRfHgB+Wlvt0K0bjGcD3RGnuKL11ssetTtitLGj5CsIZv+QsOSvaV\n0EnobMFyep7QFcm3aDr248YpQaHlt9KB5FwuV/I04YZSsgZwcaYY5V6q0Q6IRysf\nSTLA4tD+fjjNyCEhqc2gijY/fbTLocchf6A4OcumKAKnFZvJ+964XK/Ai7wEIudH\nPlutxtc1AgMBAAECggEADdP53upZk5AvOXJyJicPyrscDd1Rtf8sbS7UYMoXnfVC\nR/bLKfRzEBQFX4T/umQBLfCbTrbsHhApIUixT6d7NvOiVn5cqx7kpw+tGQPSV0Qb\nQcnTcd9fD8XdOxYwKenZdm7KJi85Of9XgY7fY7c2h+rb071mgIuLQe708i6WjIJP\nLbTVHoAJSv24cDhd/YLVg3Fx6OjWaIfhuvhoM1q/F0+a9UDFzXIccTf7grXXl18u\nM6MrmLuL4UV4eWHeRrGSO3gdnoR0GYPfyd8TyggG7cEh8j2Md4X1VF+eNr1qUAR8\nYKyUPVIZ1mVdLLxOed+l8+Tjb1ye3L++7gHd7yaNAQKBgQDus4ES0Txlx7CoJJuP\nsHHRwAoovPI4vTWrqnx9KwwMvM/MzAxdpY2HnjxQZRZPGLJpVwrL+SkqvyTnPsRJ\nWIEEOAx+OxdpUCN1e4hws/Q2+f1qFbkr35qUc9khfoJsTaS7q0RdLOn8hHtp+ZuR\nTb8mk0NK5KdErK+kPMkFVqLkkQKBgQDWdURK71Zlgrdozs3i5dowDarO/hzG8SbJ\n96JANou5Vp3QKOG1YLcetbiXR9Iras2DN+Ccahpovbz5hayvR2XY83fiGGRQmm2/\nQcFXkOWCaxSYTPy6rT+HOJ0NKhGXuCALZXUNnOqhsBEq+U/VQ6FGvpV6T1lhzJIC\nUgoDz8UKZQKBgCzKzmvDi7vlrwa+Z9qc157ulHl0i1eOWeXuxhGO5GH3hF7/40on\naNmMHfFQJtGM5t3RkZsZFFqLJ9ek9Zx12S/7fIyrdgczHJRNLBtKCYfPfXhMv0S2\nXwGAg7w/SyYbo8/7oYaCiR3zll0ak9C+cCJC/BuvsJu4c/Uz2tz/lu2hAoGAKjMp\nHRW7in4OWTFYki1oocwOsGyQfRU27MctxjT1iaLhqvRgdbByWDip+hrH4INDrW5x\nZFX8nF+5r9/9+v+xqt8919+03aeFsPzfbru0bdVkWBPOJ22v8ovRW6XLkG9K3vM3\n9VXLVcWvmyUz8GM+eQ1HnKnAjN4UXSCHl/hqbYECgYB5WNZpmthySORvhdvv3SQ9\nQVcWa8whUAXj+fzEyhA+ZfKxEuTncWhUZ6Lz/kDiAhknuiwSSzeMXdojK8hvBmMa\njuNlML7fTThsrcR5qLSBKpnP+sYDWpNgT4C2GUk/SWhFL9aa/Pd+81oQBlCZQe8A\n5AMz1DRHNxZEqC6wCQsctg==\n-----END PRIVATE KEY-----\n";

const newB64 = Buffer.from(userPrivateKey, 'utf8').toString('base64');

let envFile = fs.readFileSync('.env.local', 'utf8');
envFile = envFile.replace(/FIREBASE_ADMIN_PRIVATE_KEY_B64=.*/, `FIREBASE_ADMIN_PRIVATE_KEY_B64=${newB64}`);
fs.writeFileSync('.env.local', envFile);

console.log("Updated .env.local with new Base64 key.");
