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

// Middleware to enforce authentication
function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        console.log('Unauthorized access. Redirecting to login.');
        return res.redirect('/login'); // Ensure redirect on missing token
    }
    next();
}

// Token validation logic
async function validateToken(token) {
    try {
        const response = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.ok; // Token is valid if response is OK
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

// OAuth Login
app.get('/login', (req, res) => {
    console.log('REDIRECT_URI (from /login):', process.env.REDIRECT_URI);
    const authUrl = `${process.env.CANVAS_BASE_URL}/login/oauth2/auth?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}`;
    console.log('Redirecting to:', authUrl);
    res.redirect(authUrl); // Explicit server-side redirect
});

// Handle OAuth Callback
app.get('/login/oauth2', async (req, res) => {
    const { code } = req.query;
    console.log('Received OAuth code:', code);
    console.log('REDIRECT_URI (from /login/oauth2):', process.env.REDIRECT_URI);
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
        res.redirect('/app'); // Redirect to the main app after successful login
    } catch (error) {
        console.error('Error during token exchange:', error);
        res.status(500).send('Token exchange error.');
    }
});

// API endpoint for uploading profile picture
app.post('/api/upload-profile-picture', async (req, res) => {
    const token = req.cookies.token;
    const { imageUrl } = req.body;

    if (!token) {
        console.log('Token invalid or revoked. Redirecting to login.');
        return res.status(401).json({
            error: 'Unauthorized. Access token invalid or revoked.',
            redirect: `${process.env.CANVAS_BASE_URL}/login/oauth2/auth?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}`,
        });
    }

    try {
        console.log('Checking token validity...');
        const tokenCheckResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!tokenCheckResponse.ok) {
            console.error('Token invalid or revoked. Redirecting to login.');
            return res.status(401).json({
                error: 'Unauthorized. Access token invalid or revoked.',
                redirect: `${process.env.CANVAS_BASE_URL}/login/oauth2/auth?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}`,
            });
        }

        // Proceed with file upload logic...
        console.log('Token valid. Proceeding with upload.');
        // Add your file upload logic here

        res.json({ message: 'File uploaded successfully!' });
    } catch (error) {
        console.error('Error during profile picture update:', error);
        res.status(500).json({ error: error.message });
    }
});

// Main app route
app.get('/app', requireAuth, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// API for checking login status
app.get('/api/check-auth', (req, res) => {
    const token = req.cookies.token;
    if (token) {
        res.json({ authorized: true });
    } else {
        res.json({ authorized: false });
    }
});

// Start the server ssvercel --prod
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});