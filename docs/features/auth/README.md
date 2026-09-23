# Authentication

Supabase Auth, with optional Microsoft Office 365 sign-in.

## Documentation

- **[Microsoft OAuth Setup](MICROSOFT_OAUTH_SETUP.md)** — Azure AD configuration

## Where the code lives

| Area | Path |
|---|---|
| Auth context | `src/contexts/auth/AuthContext.tsx` |
| Login form | `src/components/Auth/LoginForm.tsx` |
| OAuth callback | `src/components/Auth/AuthCallback.tsx` |

Roles are `super_admin` → `coordinator` → `admin` → `instructor` → `nurse`
(plus `student` for simulation participants). A role change needs a
logout/login to take effect. Filtering logic lives in
`src/hooks/useUserProgramAccess.ts`.

## Related

- [Security architecture](../../architecture/security/) — how authorization is
  actually enforced (Postgres RLS, not the client)
