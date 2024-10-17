import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data'; 
import { Buffer } from 'buffer'; 

// Load environment variables
dotenv.config();

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Serve index.html for root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Upload profile picture API
app.post('/upload-profile-picture', async (req, res) => {
  const { imageUrl } = req.body;
  try {
    // Your existing logic for uploading the profile picture...
    // This code remains the same
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to upload and set profile picture.' });
  }
});

// Export the Express app as a Vercel handler
export default app;