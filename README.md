# Canvas Add Fixed Profile Project

This project aims to allow users to upload and set a profile picture using a form, along with other basic functionalities like serving static files and checking server status. The project originally used an Express server, but it has now been modified to work seamlessly with Vercel using serverless functions.

## Changes Made to Adapt to Vercel

### 1. Converting the Express Server to Serverless Functions

Previously, this project used an Express server (`server.mjs`) to handle requests. To make it compatible with Vercel's serverless architecture, we have:

- Split the functionality into separate serverless functions.
- Removed the ongoing Express server and converted each route into its own function in the `api/` directory.

#### Example Changes:
- `/` (root) is now handled by a serverless function in `api/index.js`.
- `/upload-profile-picture` is managed by `api/upload-profile-picture.mjs`.

### 2. Update to `vercel.json`

To ensure Vercel can find and build the correct functions, the `vercel.json` file has been updated:

- **Build Configuration**:
  ```json
  {
    "version": 2,
    "builds": [
      {
        "src": "api/upload-profile-picture.mjs",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/api/(.*)",
        "dest": "/api/upload-profile-picture.mjs"
      },
      {
        "src": "/(.*)",
        "dest": "/public/$1"
      }
    ]
  }
  ```
  This configuration builds the serverless functions and serves static files from the `public/` directory.

### 3. Handling Static Files

The `public/` directory serves static assets like HTML, images, and other resources. We made sure that these are properly configured in `vercel.json` to ensure they can be accessed directly without requiring a backend server.

### 4. Setting Up Environment Variables

The code relies on several environment variables, such as `CANVAS_BASE_URL` and `CANVAS_API_TOKEN`. Make sure these are set in the Vercel dashboard:

1. Go to the Vercel dashboard.
2. Select the project.
3. Navigate to the "Settings" tab.
4. Add environment variables for all necessary keys (`CANVAS_BASE_URL`, `CANVAS_API_TOKEN`, etc.).

### 5. Removing `server.mjs`

Since the Express server is no longer used, the `server.mjs` file has been removed. The logic for handling the `/upload-profile-picture` endpoint has been moved into a serverless function (`api/upload-profile-picture.mjs`).

### 6. Implementing a Two-Step Image Upload Process

To properly handle the profile picture upload, we implemented a **two-step upload process**:

1. **Initial Upload Request**: The image is first uploaded to Canvas to receive an `upload_url`. This initial step is crucial for allowing Canvas to process the file.
2. **Final Upload Request**: The image is then re-uploaded to the provided `upload_url` to complete the process.

This two-step approach aligns with Canvas's file handling requirements and ensures that the upload is accepted.

### 7. Using `avatar_token` to Set the Profile Picture

Instead of using `avatar_id` to set the profile picture, the new approach uses the **`avatar_token`**. This token is required by Canvas to identify the uploaded image and set it as the user's profile picture correctly. The `avatar_token` is retrieved from the avatar options list after the image is uploaded.

## How to Use the Project

### Local Development
To run the project locally and simulate Vercel's environment:

1. Install the Vercel CLI:
   ```sh
   npm install -g vercel
   ```

2. Run the project locally:
   ```sh
   vercel dev
   ```

3. This will serve the project locally, simulating Vercel's serverless functions.

### Deployment

To deploy to Vercel:

1. Run the deployment command:
   ```sh
   vercel
   ```

2. Follow the prompts to deploy the project.

## FAQ

### Should I Be Posting the Avatar URL?

No, you should not be directly posting the avatar URL. Instead, you need to use the `avatar token` returned by Canvas to set the user's profile picture. In the `upload-profile-picture` serverless function, we use the token from the avatar options to make a `PUT` request to update the user's profile picture in Canvas.

### Troubleshooting Common Issues

1. **Environment Variables Not Set**: Make sure all environment variables are correctly configured in the Vercel dashboard.
2. **Static Files Not Serving**: Ensure the `vercel.json` configuration for static files is correct (`public/` directory).
3. **Serverless Function Errors**: Check the function logs in the Vercel dashboard to debug any issues related to serverless function execution.
4. **Forbidden Error During Avatar Update**: If you receive a `403 Forbidden` error when updating the profile picture, it is likely due to insufficient permissions on the API token. Ensure that the `CANVAS_API_TOKEN` has full access to update user profiles, including setting avatars.

## Folder Structure

```
project-root/
  ├── api/
  │   ├── index.js                # Root URL handling
  │   └── upload-profile-picture.mjs # Upload profile picture handling
  ├── public/
  │   ├── index.html              # Main HTML file
  │   └── imgs/                   # Static images
  ├── vercel.json                 # Vercel configuration file
  ├── package.json                # Project dependencies and scripts
  └── README.md                   # Documentation (this file)
```

By following the steps and changes outlined here, you should be able to successfully deploy and run this project on Vercel. If you have further questions, feel free to ask!
