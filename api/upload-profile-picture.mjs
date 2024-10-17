import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export default async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { imageUrl } = req.body;
  console.log('Received request to set profile picture. Image URL:', imageUrl);

  try {
    // Step 1: Verify the image URL (optional validation for a valid URL)
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL provided.');
    }

    // Step 2: Get avatar options from Canvas (optional if needed)
    console.log('Fetching avatar options from Canvas...');
    const avatarOptionsResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self/avatars`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const avatarOptions = await avatarOptionsResponse.json();
    console.log('Avatar Options:', avatarOptions);

    // Step 3: Set the image URL as the profile picture
    console.log('Setting image URL as profile picture...');
    const updateResponse = await fetch(`${process.env.CANVAS_BASE_URL}/api/v1/users/self`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          avatar: {
            url: imageUrl,  // Directly using the image URL
          },
        },
      }),
    });

    const updateData = await updateResponse.json();
    console.log('Update Profile Picture Response:', updateData);

    if (updateData.errors) {
      throw new Error('Failed to update profile picture in Canvas.');
    }

    res.status(200).json({ message: 'Profile picture updated successfully!' });

  } catch (error) {
    console.error('Error occurred during profile picture update:', error);
    res.status(500).json({ error: `Failed to update profile picture: ${error.message}` });
  }
};