# Google OAuth Setup Guide for KopiSahaja

This guide will help you set up Google OAuth authentication for your KopiSahaja coffee ordering website.

## Prerequisites

- A Google account
- Your KopiSahaja website running locally or deployed

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Enter a project name (e.g., "KopiSahaja Auth")
4. Click "Create"

## Step 2: Enable Google Sign-In API

1. In your Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Identity Services API" or "Google+ API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" for user type
   - Fill in the required information:
     - App name: KopiSahaja
     - User support email: your email
     - Developer contact information: your email
   - Add your domain to authorized domains if deployed
4. For Application type, select "Web application"
5. Add authorized JavaScript origins:
   - For local development: `http://localhost:3000`
   - For production: your website URL (e.g., `https://yourdomain.com`)
6. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/auth.html`
   - For production: your auth page URL
7. Click "Create"

## Step 4: Configure Your Application

1. Copy the Client ID from the credentials you just created
2. Open your `.env` file in the KopiSahaja project
3. Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Client ID:
   ```
   GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```

## Step 5: Update Frontend Configuration

1. Open `public/js/auth.js`
2. Find the line with `const CLIENT_ID = '...'` (around line 380)
3. Replace the placeholder with your actual Google Client ID

## Step 6: Test the Integration

1. Restart your server: `npm start`
2. Go to `http://localhost:3000/auth.html`
3. You should see "Sign in with Google" buttons on both login and register forms
4. Click the button to test Google OAuth authentication

## Security Notes

- Keep your Client ID secure (though it's not as sensitive as a client secret)
- Only add trusted domains to your authorized origins
- For production, use HTTPS and proper domain configuration
- The client secret is not needed for web applications using the implicit flow

## Troubleshooting

### Common Issues:

1. **"This app isn't verified" warning**: This is normal during development. Click "Advanced" and "Go to KopiSahaja (unsafe)" for testing.

2. **"redirect_uri_mismatch" error**: Make sure your authorized redirect URIs in Google Console match your website URL exactly.

3. **"invalid_client" error**: Double-check that your Client ID is correct in both `.env` and `auth.js`.

4. **Button not appearing**: Check browser console for JavaScript errors and ensure the Google Sign-In library is loading.

### Testing Checklist:

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Web application credentials created
- [ ] Client ID added to `.env` file
- [ ] Client ID added to `auth.js` file
- [ ] Authorized origins include your website URL
- [ ] Server restarted after configuration changes

## Features Supported

✅ **Sign up with Google**: New users can create accounts using their Google account
✅ **Sign in with Google**: Existing users can log in with Google
✅ **Account linking**: Users who signed up with email can link their Google account
✅ **Profile sync**: Google profile picture and name are automatically imported
✅ **Seamless experience**: Users stay logged in and can use all website features

The integration automatically handles:
- Creating new accounts for first-time Google users
- Linking Google accounts to existing email accounts
- Importing profile information and pictures from Google
- Maintaining session consistency across authentication methods 