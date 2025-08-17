module.exports = (req, res) => {
  console.log('🔍 DEBUG FUNCTION CALLED');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.json({
    message: 'Debug function working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL || 'not set',
    vercelEnv: process.env.VERCEL_ENV || 'not set'
  });
}; 