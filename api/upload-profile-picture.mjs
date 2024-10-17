import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';  // For handling form uploads
import { Buffer } from 'buffer';  // To handle binary data

// Load environment variables from .env file
dotenv.config();

export default async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { imageUrl } = req.body;

  try {
    console.log('Fetching image from URL:', imageUrl);

    // Step 1: Fetch the image from the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Error fetching image from ${imageUrl}`);
    }

    // Step 2: Convert the image response to ArrayBuffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png'; // Get the correct content type

    console.log('Image fetched successfully.');

    // Step 3: Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(arrayBuffer);

    // Step 4: Prepare FormData for Canvas upload
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: 'profile_picture.png',
      contentType: contentType,
    });
    formData.append('parent_folder_path', 'profile pictures'); // Specify the folder

    console.log('Uploading image to Canvas...');

    // Step 5: Upload file to Canvas
    const uploadResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    console.log('Upload Response:', uploadData);

    if (!uploadData.upload_url) {
      return res.status(500).json({ error: 'Failed to initiate upload' });
    }

    // Step 6: Finalize the upload
    const finalFormData = new FormData();
    finalFormData.append('file', buffer, {
      filename: 'profile_picture.png',
      contentType: contentType,
    });

    console.log('Finalizing the image upload...');
    const finalUploadResponse = await fetch(uploadData.upload_url, {
      method: 'POST',
      body: finalFormData,
    });

    const finalUploadData = await finalUploadResponse.json();
    console.log('Final Upload Response:', finalUploadData);

    if (!finalUploadData.id) {
      throw new Error('Failed to upload the image.');
    }

    // Step 7: Get avatar options from Canvas
    const avatarOptionsResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/avatars`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const avatarOptions = await avatarOptionsResponse.json();
    console.log('Avatar Options:', avatarOptions);

    // Step 8: Find the uploaded image in the avatar options and get its token
    const uploadedAvatar = avatarOptions.find((option) => option.id === finalUploadData.id);
    if (!uploadedAvatar) {
      return res.status(500).json({ error: 'Uploaded image not found in avatar options.' });
    }

    const avatarToken = uploadedAvatar.token;
    console.log('Avatar Token:', avatarToken);

    // Step 9: Set the uploaded image as the profile picture using the avatar token
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
      return res.status(500).json({ error: 'Failed to update profile picture in Canvas.' });
    }

    // Step 10: Return a success response
    res.status(200).json({ message: 'Profile picture updated successfully!' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to upload and set profile picture.' });
  }
};