import fetch from 'node-fetch';
import FormData from 'form-data';

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
const redirectToLogin = () => ({
  error: 'Unauthorized. Access token invalid or revoked.',
  redirect: `${CANVAS_BASE_URL}/login/oauth2/auth?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}`,
});

export default async function handler(req, res) {
  const token = req.cookies?.token;
  const { imageUrl } = req.body;

  if (!token) {
    console.log('Token missing, redirecting to auth...');
    return res.status(401).json(redirectToLogin());
  }

  try {
    // Validate token
    const selfRes = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!selfRes.ok) {
      console.log('Token invalid or revoked');
      return res.status(401).json(redirectToLogin());
    }

    // Fetch and buffer image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image from imageUrl');

    const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    const filename = `profile_${Date.now()}.png`;

    // Initiate upload
    const initRes = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: filename,
        size: imageBuffer.length,
        content_type: 'image/png',
        parent_folder_path: 'profile_pictures',
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok || !initData.upload_url) {
      console.error('Upload init failed', initData);
      return res.status(400).json({ error: 'Upload init failed', details: initData });
    }

    // Finalize upload
    const form = new FormData();
    Object.entries(initData.upload_params).forEach(([key, value]) =>
      form.append(key, value)
    );
    form.append('file', imageBuffer, { filename });

    const finalizeRes = await fetch(initData.upload_url, {
      method: 'POST',
      body: form,
    });

    const fileData = await finalizeRes.json();
    if (!fileData.url) throw new Error('File URL missing after upload');

    // Set new avatar
    const updateRes = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          avatar: {
            url: fileData.url,
          },
        },
      }),
    });

    if (!updateRes.ok) {
      console.error('Failed to update avatar');
      return res.status(400).json({ error: 'Failed to update profile picture' });
    }

    console.log('Avatar updated successfully');
    return res.json({ message: 'Profile picture updated successfully!' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}