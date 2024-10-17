import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';
import { Buffer } from 'buffer';

// Load environment variables
dotenv.config();

export default async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('Received a non-POST request. Method:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  const { imageUrl } = req.body;
  console.log('Received request to upload profile picture. Image URL:', imageUrl);

  try {
    // Fetch the image
    console.log('Fetching image from URL:', imageUrl);
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      console.log(`Error fetching image from ${imageUrl}:`, imageResponse.status, imageResponse.statusText);
      throw new Error(`Error fetching image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    // Convert the image to buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Image fetched successfully. Uploading to Canvas...');

    // Prepare the form data
    const formData = new FormData();
    formData.append('file', buffer, { filename: 'profile_picture.png', contentType: 'image/png' });

    // Upload the file to Canvas
    const uploadResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    console.log('Upload Response Data:', uploadData);

    // Finalize the upload
    if (!uploadData.upload_url) {
      console.log('Failed to get upload URL from Canvas.');
      return res.status(500).json({ error: 'Failed to upload image to Canvas.' });
    }

    console.log('Image uploaded successfully. Fetching avatar options...');
    
    // Continue with the rest of the logic (setting the avatar)...

  } catch (error) {
    console.error('Error occurred during profile picture upload:', error);
    res.status(500).json({ error: 'Failed to upload and set profile picture.' });
  }
};