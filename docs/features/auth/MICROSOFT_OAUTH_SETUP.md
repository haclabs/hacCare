# Microsoft Office 365 / Azure AD OAuth Setup Guide

This guide will help you configure Microsoft Office 365 (Azure AD) sign-in for HacCare.

## Prerequisites

- Azure AD tenant (Office 365 account)
- Admin access to Azure Portal
- Supabase project with authentication enabled

## Step 1: Register Application in Azure Portal

1. **Go to Azure Portal**
   - Navigate to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Office 365 admin account

2. **Register a New Application**
   - Go to **Azure Active Directory** → **App registrations**
   - Click **New registration**
   - Fill in the details:
     ```
     Name: HacCare Healthcare System
     Supported account types: Accounts in this organizational directory only (Single tenant)
     Redirect URI: Web - https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     ```
   - Click **Register**

3. **Note Your Application Details**
   - Copy the **Application (client) ID** - you'll need this
   - Copy the **Directory (tenant) ID** - you'll need this

4. **Create a Client Secret**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Add a description: "HacCare Production"
   - Choose expiration (recommend 24 months)
   - Click **Add**
   - **IMPORTANT**: Copy the secret **Value** immediately (it won't be shown again)

5. **Configure API Permissions**
   - Go to **API permissions**
   - Click **Add a permission**
   - Choose **Microsoft Graph**
   - Choose **Delegated permissions**
   - Add these permissions:
     - `email`
     - `openid`
     - `profile`
     - `User.Read`
   - Click **Add permissions**
   - Click **Grant admin consent** (requires admin rights)

6. **Configure Authentication Settings**
   - Go to **Authentication**
   - Under **Implicit grant and hybrid flows**, enable:
     - ✅ ID tokens (used for implicit and hybrid flows)
   - Click **Save**

## Step 2: Configure Supabase

1. **Go to Your Supabase Dashboard**
   - Navigate to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Enable Azure OAuth Provider**
   - Go to **Authentication** → **Providers**
   - Find **Azure** in the list
   - Toggle it **ON**

3. **Enter Azure Credentials**
   ```
   Azure Client ID: [Your Application (client) ID from Step 1.3]
   Azure Secret: [Your Client Secret Value from Step 1.4]
   Azure Tenant ID: [Your Directory (tenant) ID from Step 1.3]
   ```

4. **Configure Redirect URLs**
   - In Supabase, go to **Authentication** → **URL Configuration**
   - Add your application URL to **Redirect URLs**:
     ```
     http://localhost:5173/auth/callback    (for development)
     https://yourdomain.com/auth/callback   (for production)
     ```

## Step 3: Update Your Application Routes

Add the auth callback route to your React Router configuration:

```tsx
import { AuthCallback } from './components/Auth/AuthCallback';

// In your router:
<Route path="/auth/callback" element={<AuthCallback />} />
```

## Step 4: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to login page**
   - Go to `http://localhost:5173/login`

3. **Click "Sign in with Microsoft"**
   - You should be redirected to Microsoft login
   - Sign in with your Office 365 account
   - Grant permissions when prompted
   - You should be redirected back to your app

## Troubleshooting

### Error: "AADSTS50011: Reply URL mismatch"
- **Problem**: The redirect URI in Azure doesn't match Supabase's callback URL
- **Solution**: In Azure Portal → App registration → Authentication, verify the redirect URI is exactly:
  ```
  https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
  ```

### Error: "AADSTS65001: User consent required"
- **Problem**: Admin consent not granted for permissions
- **Solution**: In Azure Portal → API permissions, click "Grant admin consent for [Your Organization]"

### Error: "Invalid client secret"
- **Problem**: The client secret expired or was entered incorrectly
- **Solution**: Generate a new client secret in Azure Portal and update it in Supabase

### Users redirected but not authenticated
- **Problem**: The callback route is not set up
- **Solution**: Ensure `/auth/callback` route is configured in your React Router

### "oauth_failed" error after redirect
- **Problem**: User profile not created or session not established
- **Solution**: Check Supabase logs for more details about the authentication failure

## Security Considerations

1. **Single Tenant vs Multi-Tenant**
   - Current setup is single tenant (your organization only)
   - For multi-tenant, choose "Accounts in any organizational directory" during app registration

2. **Client Secret Rotation**
   - Rotate client secrets regularly (every 6-12 months)
   - Azure allows multiple secrets, so you can add a new one before deleting the old

3. **User Provisioning**
   - First-time Microsoft users will need a user profile created in HacCare
   - Consider implementing automatic user provisioning or just-in-time (JIT) provisioning

4. **Session Management**
   - OAuth sessions follow your Supabase JWT token expiration settings
   - Configure in Supabase → Settings → API

## Additional Configuration

### Custom Login Domains (Optional)
If you want to use a custom domain instead of Supabase's:
1. Set up a custom domain in Supabase
2. Update the redirect URI in Azure to use your custom domain
3. Update the callback URL in your application

### Restrict Access by Email Domain
To only allow users from your organization:
1. In Azure Portal → App registration → Authentication
2. Under **Supported account types**, ensure "Single tenant" is selected
3. This automatically restricts to your Office 365 domain

### Add Company Branding
1. In Azure Portal → Azure Active Directory → Company branding
2. Upload your logo and customize the sign-in page
3. Users will see your branding during Microsoft login

## Production Checklist

Before going to production:

- [ ] Client secret stored securely (not in code)
- [ ] Redirect URLs configured for production domain
- [ ] Admin consent granted for all required permissions
- [ ] Custom domain configured (optional but recommended)
- [ ] Error handling tested
- [ ] User provisioning strategy implemented
- [ ] Client secret expiration reminder set
- [ ] Backup authentication method available (email/password)

## Support

For issues with:
- **Azure AD setup**: Contact Microsoft Azure Support
- **Supabase OAuth**: Check Supabase documentation or Discord
- **HacCare integration**: Contact your development team
