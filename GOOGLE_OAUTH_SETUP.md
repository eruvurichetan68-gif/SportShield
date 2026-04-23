# Google OAuth 2.0 Setup Instructions for SportShield

Follow these steps to configure Google OAuth 2.0 for your SportShield application.

## 🚀 Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top
4. Click "NEW PROJECT"
5. Enter project name: `SportShield` (or your preferred name)
6. Click "CREATE"

### 2. Enable Google+ API

1. In your new project, go to the navigation menu (☰)
2. Select "APIs & Services" → "Library"
3. Search for "Google+ API" or "People API"
4. Click on it and click "ENABLE"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" and click "CREATE"
3. Fill in the required fields:
   - **App name**: SportShield
   - **User support email**: your-email@example.com
   - **Developer contact information**: your-email@example.com
4. Click "SAVE AND CONTINUE"
5. Add test users (add your Google email for testing)
6. Click "SAVE AND CONTINUE" through the remaining steps
7. Click "BACK TO DASHBOARD"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Select "Web application" as the application type
4. Give it a name: "SportShield Web Client"
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - (For production) `https://yourdomain.com/auth/google/callback`
6. Click "CREATE"

### 5. Get Your Credentials

After creating the credentials, you'll see:
- **Client ID**: Copy this value
- **Client Secret**: Click "SHOW" to reveal and copy this value

### 6. Configure Environment Variables

1. Open `backend/.env` file in your SportShield project
2. Replace the placeholder values with your actual credentials:

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here

# Session Configuration
SESSION_SECRET=your_secure_session_secret_here_change_in_production

# Server Configuration
PORT=3000

# JWT Configuration (for existing auth system)
JWT_SECRET=sportshield-secret-key-change-in-production
```

### 7. Generate a Secure Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the `SESSION_SECRET` value.

## 🧪 Testing the Setup

1. Start your SportShield server:
   ```bash
   cd backend
   npm start
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000
   ```

3. Click on "Login" and then "Sign in with Google"

4. You should be redirected to Google's OAuth consent screen

5. Sign in with your Google account and grant permissions

6. You should be redirected back to your SportShield dashboard

## 🔧 Troubleshooting

### Common Issues and Solutions

**Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/auth/google/callback`
- Check for trailing slashes or extra characters

**Error: "invalid_client"**
- Verify your Client ID and Client Secret are correctly copied to the `.env` file
- Make sure there are no extra spaces or quotes

**Error: "access_denied"**
- Make sure your Google account is added as a test user in the OAuth consent screen
- Check that the OAuth consent screen is properly configured

**Session not persisting**
- Verify your `SESSION_SECRET` is set in the `.env` file
- Check that cookies are enabled in your browser

## 🚀 Production Deployment

For production deployment:

1. **Update Redirect URIs**:
   - Add your production domain: `https://yourdomain.com/auth/google/callback`
   - Remove localhost URIs

2. **Enable HTTPS**:
   - Set `secure: true` in session configuration
   - Use HTTPS for all redirect URIs

3. **Publish App**:
   - Go to OAuth consent screen
   - Click "PUBLISH APP"
   - Complete the verification process if required

4. **Environment Variables**:
   - Use production environment variables
   - Generate a new secure session secret
   - Use environment variable management for security

## 📋 Checklist Before Going Live

- [ ] Google Cloud project created and configured
- [ ] OAuth consent screen completed and published
- [ ] Client ID and Secret added to `.env` file
- [ ] Redirect URIs correctly configured
- [ ] Session secret generated and configured
- [ ] HTTPS enabled (for production)
- [ ] Test users added (for testing phase)
- [ ] Application tested thoroughly

## 🆘 Support

If you encounter issues:

1. Check the Google Cloud Console for any API errors
2. Verify your environment variables are correctly set
3. Check the browser console for JavaScript errors
4. Review the server logs for authentication errors

For more information, visit:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy Documentation](http://www.passportjs.org/packages/passport-google-oauth20/)
