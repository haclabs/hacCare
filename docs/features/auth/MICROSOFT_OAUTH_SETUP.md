# Microsoft (Azure / Entra ID) Sign-In Setup

The "Sign in with Microsoft" button on `/login` calls
`supabase.auth.signInWithOAuth({ provider: 'azure' })`. The code is in place; the button only
works once the **Azure provider is enabled on the Supabase project**. Until then it fails with
"Unsupported provider: provider is not enabled".

Check the live state with:

```bash
curl -s "$VITE_SUPABASE_URL/auth/v1/settings" -H "apikey: $VITE_SUPABASE_ANON_KEY" | grep -o '"azure":[a-z]*'
```

## How the flow works

1. `LoginForm.handleMicrosoftSignIn()` redirects to Microsoft (PKCE flow), with
   `redirectTo = <current origin>/login`.
2. Microsoft → Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`) → back to
   `/login?code=…`.
3. The Supabase client (`detectSessionInUrl: true`) exchanges the code on page load. The PKCE
   verifier is kept in `sessionStorage`, so the sign-in must start and finish on the **same origin
   in the same tab**.
4. `LoginForm`'s restored-session effect waits for the user and profile, applies the 2FA policy
   (`src/lib/security/mfaPolicy.ts`: TOTP challenge or required enrollment), then redirects to the app.
5. If the provider returns an error, Supabase appends `?error=…&error_description=…` and
   `LoginForm` shows it.

**Accounts are invitation-only.** Once public sign-up is turned off (Authentication → Sign In /
Providers → "Allow new users to sign up"), Microsoft sign-in works only for users an admin has
already created. Supabase links the Microsoft identity to the existing account when the emails
match and Microsoft reports the email as verified, which requires the `xms_edov` claim in Step 1.
While sign-up is still on, a first-time Microsoft user gets a `user_profiles` row from the
`on_auth_user_created` trigger (`ensure_user_profile()`), with role `nurse` and no tenant.

## Step 1: Register the app in Microsoft Entra ID

1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** →
   **New registration**.
2. **Supported account types**: *Accounts in this organizational directory only (Single tenant)*.
   This plus the tenant URL in Step 2 keeps outside Microsoft accounts from creating users.
3. **Redirect URI** (Web): `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Application (client) ID** and **Directory (tenant) ID**.
5. **Certificates & secrets** → **New client secret**. Copy the secret **Value** (not the Secret ID)
   and set a calendar reminder before it expires.
6. **Manifest**: add the `email` and `xms_edov` optional claims so Supabase can confirm the email is
   verified (prevents account impersonation through unverified email domains):

   ```json
   "optionalClaims": {
     "idToken": [
       { "name": "xms_edov", "source": null, "essential": false, "additionalProperties": [] },
       { "name": "email", "source": null, "essential": false, "additionalProperties": [] }
     ],
     "accessToken": [
       { "name": "xms_edov", "source": null, "essential": false, "additionalProperties": [] }
     ],
     "saml2Token": []
   }
   ```

No implicit-grant / ID-token checkbox is needed.

## Step 2: Enable the provider in Supabase

Dashboard → **Authentication** → **Sign In / Providers** → **Azure** → enable, then enter:

| Field | Value |
|---|---|
| Client ID | Application (client) ID |
| Secret | Client secret **Value** |
| Azure Tenant URL | `https://login.microsoftonline.com/<directory-tenant-id>` |

Leaving the tenant URL empty uses `common`, which accepts any Microsoft account.

Do **not** use `supabase config push` for this. It would also push the placeholder
`site_url` / redirect URLs from `supabase/config.toml` over production.

## Step 3: Allow the redirect URLs

Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**. Add every origin users
sign in from, with the `/login` path:

```
https://haccare.app/login
https://*.haccare.app/login
http://localhost:5173/login
```

If the `redirectTo` URL is not on the list, Supabase falls back to the Site URL. On a different
origin the PKCE verifier is missing and the sign-in silently fails.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Unsupported provider: provider is not enabled" | Step 2 not done |
| `AADSTS50011` reply URL mismatch | Azure redirect URI ≠ `https://<project-ref>.supabase.co/auth/v1/callback` |
| `AADSTS700016` / app not found in directory | Tenant URL points at a different directory than the app registration |
| "Error getting user email from external provider" | Missing `email` scope or optional claim (Step 1.6) |
| "Signups not allowed for this instance" | The user has no hacCare account yet. An admin must create one with the same email |
| Returned to the landing page or a different subdomain, not signed in | `redirectTo` URL not in the allow list (Step 3) |
