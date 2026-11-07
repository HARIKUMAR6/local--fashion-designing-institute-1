import https from 'node:https';

const candidates = [
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=85', // Home 1 used this, but let's check other fashion illustration IDs:
  'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=85'
];

for (const u of candidates) {
  const req = https.request(new URL(u), { method: 'HEAD', timeout: 5000 }, (res) => {
    console.log(res.statusCode, u);
  });
  req.on('error', (e) => console.log('ERR', e.message));
  req.end();
}

