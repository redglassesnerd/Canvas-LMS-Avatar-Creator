export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing.' });
  }

  // Exchange the authorization code for an access token
  const tokenResponse = await fetch(
    `${process.env.CANVAS_BASE_URL}/login/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        code
      }),
    }
  );

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('Token exchange failed:', tokenData);
    return res.status(400).json({ error: 'Failed to exchange token.' });
  }

  // Set the Canvas access token in an HttpOnly, Secure cookie
  res.setHeader(
    'Set-Cookie',
    `token=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=None`
  );

  console.log('OAuth success, token set, redirecting to /auth-success.html');
  res.writeHead(302, { Location: '/auth-success.html' });
  res.end();
}