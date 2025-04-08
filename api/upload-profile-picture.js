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
    return res.status(401).json(redirectToLogin());
  }

  try {
    const canvasSelf = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!canvasSelf.ok) {
      return res.status(401).json(redirectToLogin());
    }

    const imageFetch = await fetch(imageUrl);
    if (!imageFetch.ok) throw new Error('Failed to fetch image');
    const imageBuffer = Buffer.from(await imageFetch.arrayBuffer());

    const filename = `profile_${Date.now()}.png`;
    const uploadInit = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self/files`, {
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

    const uploadData = await uploadInit.json();
    if (!uploadInit.ok || !uploadData.upload_url) {
      return res.status(400).json({ error: 'Upload init failed', details: uploadData });
    }

    const form = new FormData();
    Object.entries(uploadData.upload_params).forEach(([key, value]) => form.append(key, value));
    form.append('file', imageBuffer, { filename });

    const finalize = await fetch(uploadData.upload_url, {
      method: 'POST',
      body: form,
    });

    const finalizedFile = await finalize.json();
    if (!finalizedFile.url) throw new Error('Finalized file URL missing');

    const update = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          avatar: {
            url: finalizedFile.url,
          },
        },
      }),
    });

    if (!update.ok) {
      return res.status(400).json({ error: 'Failed to update profile picture' });
    }

    return res.json({ message: 'Profile picture updated successfully!' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}