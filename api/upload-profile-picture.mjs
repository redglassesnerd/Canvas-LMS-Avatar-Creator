import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import fs from 'fs';

dotenv.config();

export default async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { imageUrl } = req.body;
  console.log('Received request to set profile picture. Image URL:', imageUrl);

  try {
    // Step 1: Fetch the image from the provided URL
    console.log('Fetching image from URL:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Error fetching image from ${imageUrl}`);
    }

    // Convert the image response to ArrayBuffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png'; // Get the correct content type
    console.log('Image fetched successfully.');

    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(arrayBuffer);

    // Step 2: Prepare FormData for Canvas upload (initial upload step)
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: 'profile_picture.png',
      contentType: contentType
    });
    formData.append('parent_folder_path', 'profile pictures');

    console.log('Uploading image to Canvas (initial step)...');

    // Upload file to Canvas
    const uploadResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    console.log('Upload Response:', uploadData);

    if (!uploadData.upload_url) {
      throw new Error('Failed to initiate upload to Canvas');
    }

    // Step 3: Finalize the upload to the provided `upload_url`
    const finalFormData = new FormData();
    finalFormData.append('file', buffer, {
      filename: 'profile_picture.png',
      contentType: contentType
    });

    console.log('Finalizing the image upload...');
    const finalUploadResponse = await fetch(uploadData.upload_url, {
      method: 'POST',
      body: finalFormData
    });

    const finalUploadData = await finalUploadResponse.json();
    console.log('Final Upload Response:', finalUploadData);

    if (!finalUploadData.id) {
      throw new Error('Failed to finalize image upload to Canvas');
    }

    // Step 4: Get avatar options from Canvas to locate the newly uploaded image
    console.log('Fetching avatar options from Canvas...');
    const avatarOptionsResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/avatars`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!avatarOptionsResponse.ok) {
      throw new Error('Failed to fetch avatar options from Canvas');
    }

    const avatarOptions = await avatarOptionsResponse.json();
    console.log('Avatar Options:', avatarOptions);

    // Step 5: Find the uploaded image in the avatar options and get its token
    const uploadedAvatar = avatarOptions.find(option => option.id === finalUploadData.id);
    if (!uploadedAvatar) {
      throw new Error('Uploaded avatar not found in the avatar options.');
    }

    const avatarToken = uploadedAvatar.token;
    console.log('Avatar Token:', avatarToken);

    // Step 6: Set the uploaded image as the profile picture using the avatar token
    console.log('Setting profile picture using avatar token...');
    const updateResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          avatar: {
            token: avatarToken, // Use the avatar token to set as profile picture
          },
        },
      }),
    });

    const updateData = await updateResponse.json();
    console.log('Update Profile Picture Response:', updateData);

    if (updateData.errors) {
      throw new Error('Failed to update profile picture in Canvas');
    }

    res.status(200).json({ message: 'Profile picture updated successfully!' });
  } catch (error) {
    console.error('Error occurred during profile picture update:', error);
    res.status(500).json({ error: `Failed to update profile picture: ${error.message}` });
  }
};