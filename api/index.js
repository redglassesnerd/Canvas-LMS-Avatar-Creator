import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import cookieParser from 'cookie-parser';
import FormData from 'form-data';
import { Buffer } from 'buffer';

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// OAuth Login
app.get('/login', (req, res) => {
    const authUrl = `${process.env.CANVAS_BASE_URL}/login/oauth2/auth?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}`;
    console.log('Redirecting to:', authUrl);
    res.redirect(authUrl);
});

// Handle OAuth Callback
app.get('/login/oauth2', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Authorization code missing.');

    try {
        const payload = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const response = await fetch(`${process.env.CANVAS_BASE_URL}/login/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload,
        });

        const tokenData = await response.json();
        if (!response.ok) {
            console.error('Token exchange failed:', tokenData);
            return res.status(400).send('Failed to exchange token.');
        }

        res.cookie('token', tokenData.access_token, { httpOnly: true });
        res.redirect('/app');
    } catch (error) {
        console.error('Error during token exchange:', error);
        res.status(500).send('Token exchange error.');
    }
});

// Upload Profile Picture
app.post('/api/upload-profile-picture', async (req, res) => {
    const token = req.cookies.token;
    const { imageUrl } = req.body;

    if (!token) return res.status(401).send('User not authenticated.');
    if (!imageUrl) return res.status(400).send('Image URL is required.');

    try {
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) throw new Error('Failed to fetch image.');

        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const uniqueFilename = `profile_picture_${Date.now()}.png`;

        console.log('Initiating file upload...');
        const uploadResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/files`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: uniqueFilename,
                size: buffer.length,
                content_type: 'image/png',
                parent_folder_path: 'profile_pictures',
            }),
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.upload_url) {
            console.error('Upload initiation failed:', uploadData);
            throw new Error('Failed to initiate upload.');
        }

        const formData = new FormData();
        formData.append('file', buffer, { filename: uniqueFilename });

        console.log('Finalizing upload...');
        const finalizeResponse = await fetch(uploadData.upload_url, {
            method: 'POST',
            body: formData,
        });

        if (!finalizeResponse.ok) throw new Error('Failed to finalize upload.');

        const uploadedFile = await finalizeResponse.json();
        if (!uploadedFile.url) throw new Error('Uploaded file URL not available.');

        console.log('Updating profile picture...');
        const updateResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: {
                    avatar: {
                        url: uploadedFile.url, // Use the file's URL as the avatar
                    },
                },
            }),
        });

        if (!updateResponse.ok) {
            console.error('Failed to update profile picture:', await updateResponse.text());
            throw new Error('Failed to update profile picture.');
        }

        console.log('Profile picture updated successfully.');
        res.json({ message: 'Profile picture updated successfully!' });
    } catch (error) {
        console.error('Error during profile picture update:', error);
        res.status(500).json({ error: error.message });
    }
});

// App Route
app.get('/app', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

//check login
app.get('/api/check-auth', (req, res) => {
  const token = req.cookies.token; // Check for existing OAuth token in cookies

  if (token) {
      res.json({ authorized: true });
  } else {
      res.json({ authorized: false });
  }
});