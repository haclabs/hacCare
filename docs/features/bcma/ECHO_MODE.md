# Echo Mode (Bedside Tablets)

Echo mode turns a tablet with a built-in barcode scanner, or any phone or tablet with a
camera, into a bedside medication scanner, like the handhelds hospitals use for barcode medication administration. It uses
the same simulations, MAR and BCMA checks as the desktop app, with less on screen.

## Flow

1. **Sign in.** Echo devices always start at the simulation list, even if the last user
   was in a simulation.
2. **Select a simulation.** Shows the simulations the signed-in user is assigned to
   (same `get_user_simulation_assignments` RPC as the Simulation Portal).
3. **Scan patient wristband.** Opens that patient's MAR. A patient list is shown
   below for tapping instead.
4. **Patient MAR.** The standard `MARModule`. Tap **Administer** / **Give PRN** to
   run the normal BCMA patient + medication scan. The patient bar (name, room,
   DOB, allergies) stays pinned at the top.
5. **Next patient.** Returns to the wristband scan. Scanning another wristband from
   the MAR also switches patient (ignored while a BCMA check is open).

**Switch user** signs out, forgets the simulation and clears cached patient data.
Auth sessions are kept in `sessionStorage`, so closing the browser tab also signs out.

## How a device enters Echo mode

| How | Behaviour |
|-----|-----------|
| `https://echo.haccare.app` | Always Echo. `/` and `/app/*` redirect to `/echo`; no "Full view" button. |
| `https://haccare.app/echo` | Echo on the main site. The device remembers it, so later sign-ins land in Echo until someone taps **Full view**. |
| Banner on the main site | Touch-only devices (`pointer: coarse`, no fine pointer) see "Switch to Echo mode" in the desktop layout. Dismissing it hides it on that device. |

Device detection only suggests Echo mode; it never switches automatically. User-agent
sniffing is unreliable on tablets, so the subdomain or an explicit choice decides.

## Scanner setup

The scanner must send scans as keyboard input ending in Enter (often called
"keyboard wedge" or "keystroke output"). On Zebra devices that is the DataWedge
**Keystroke output** plugin with an **Enter** suffix. Honeywell calls it
**Keyboard wedge**. Scans then reach the app through the global listener in
`src/lib/barcode/barcodeScanner.ts`. No text box needs focus.

Wristband matching reuses `bcmaService.validatePatientBarcode`, so every wristband format
the BCMA check accepts also works at the echo scan screen. Matches must be exact.

## Camera scanning (phones and tablets without a scanner)

Below the `md` breakpoint (768 px) the MAR rows stack with a full-width **Administer**
button and the BCMA dialog goes full-screen as a single scrolling column (the side
checklist is replaced by the step pills). These are responsive classes on the shared
`MedicationAdministrationGrid`, `MARModule` and `BCMAAdministration`, so tablets and
desktops keep their existing layout.

Inside a simulation, a teal **Camera** button floats at the bottom right of every Echo
screen, above the BCMA dialog too. The wristband screen also has a large **Scan with
camera** button. Either one opens the back camera full-screen with a square window; the
first code read inside the window closes the camera and counts as a scan. Codes outside
the window are ignored, so a neighbouring label on a label sheet isn't picked up by mistake.

A camera scan sends the same `barcodescanned` event as a scanner gun, so wristband lookup,
the MAR and the BCMA checks handle it with no changes.

- **Decoder:** the browser's built-in `BarcodeDetector` where available (Chrome on
  Android), otherwise the `barcode-detector` ponyfill backed by `zxing-wasm` (Safari on
  iOS). Reads QR and Code 128. The WASM file (~950 KB) is bundled and served from our own
  domain, and it and the `vendor-scanner` chunk load only when the camera is first opened.
- **Requirements:** HTTPS (Netlify provides it; plain `http://` on a LAN IP hides the
  button) and camera permission, which the browser asks for once per device.
  `public/_headers` sets `Permissions-Policy: camera=(self)` and allows
  `'wasm-unsafe-eval'` in `script-src` for this.
- **If the camera is blocked:** the scanner explains how to allow it in browser settings.
  The patient list on the wristband screen still works without it.

## Netlify setup for echo.haccare.app

1. **Netlify → Site → Domain management → Add a domain alias** → `echo.haccare.app`.
2. **DNS:** if the domain uses Netlify DNS, the record is created for you. Otherwise add a
   `CNAME` record `echo` → `<site-name>.netlify.app` at the DNS provider.
3. **HTTPS:** Netlify issues the certificate for the alias automatically once DNS
   resolves (Domain management → HTTPS → *Verify DNS configuration* / *Renew* if needed).
4. **Supabase → Authentication → URL Configuration:** add `https://echo.haccare.app/**` to
   the redirect URLs so password-reset and OAuth links work from the echo host.

`netlify.toml` already has the echo SPA redirect, and `public/_headers` stops `/echo/*`
from being cached. `echo` is reserved in `subdomainService.ts` so it is never looked
up as a tenant. Avoid creating a program with the code `ECHO`, because its program
tenant would take that subdomain.

## Code

- `src/features/echo/echoMode.ts`: host detection, device preference, post-login path
- `src/features/echo/components/`: `EchoRoute` (providers), `EchoApp` (routes),
  `EchoSimulationList`, `EchoScanPatient`, `EchoPatientMAR`, `EchoModeSuggestion`,
  `EchoCamera` (camera button + `useEchoCamera`), `EchoCameraScanner` (camera view)
- `src/features/echo/cameraScanner.ts`: decoder loading and scan-window crop maths
- `src/features/echo/findPatientByWristband.ts`: wristband → patient lookup (tested in
  `echo.test.ts`)
