# Rover Mode (Bedside Tablets)

Rover mode turns a tablet with a built-in barcode scanner into a bedside medication
rover, like the handhelds hospitals use for barcode medication administration. It uses
the same simulations, MAR and BCMA checks as the desktop app, with less on screen.

## Flow

1. **Sign in.** Rover devices always start at the simulation list, even if the last user
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

## How a device enters Rover mode

| How | Behaviour |
|-----|-----------|
| `https://rover.haccare.app` | Always Rover. `/` and `/app/*` redirect to `/rover`; no "Full view" button. |
| `https://haccare.app/rover` | Rover on the main site. The device remembers it, so later sign-ins land in Rover until someone taps **Full view**. |
| Banner on the main site | Touch-only devices (`pointer: coarse`, no fine pointer) see "Switch to Rover mode" in the desktop layout. Dismissing it hides it on that device. |

Device detection only suggests Rover mode; it never switches automatically. User-agent
sniffing is unreliable on tablets, so the subdomain or an explicit choice decides.

## Scanner setup

The scanner must send scans as keyboard input ending in Enter (often called
"keyboard wedge" or "keystroke output"). On Zebra devices that is the DataWedge
**Keystroke output** plugin with an **Enter** suffix. Honeywell calls it
**Keyboard wedge**. Scans then reach the app through the global listener in
`src/lib/barcode/barcodeScanner.ts`. No text box needs focus.

Wristband matching reuses `bcmaService.validatePatientBarcode`, so every wristband format
the BCMA check accepts also works at the rover scan screen. Matches must be exact.

## Netlify setup for rover.haccare.app

1. **Netlify → Site → Domain management → Add a domain alias** → `rover.haccare.app`.
2. **DNS:** if the domain uses Netlify DNS, the record is created for you. Otherwise add a
   `CNAME` record `rover` → `<site-name>.netlify.app` at the DNS provider.
3. **HTTPS:** Netlify issues the certificate for the alias automatically once DNS
   resolves (Domain management → HTTPS → *Verify DNS configuration* / *Renew* if needed).
4. **Supabase → Authentication → URL Configuration:** add `https://rover.haccare.app/**` to
   the redirect URLs so password-reset and OAuth links work from the rover host.

`netlify.toml` already has the rover SPA redirect, and `public/_headers` stops `/rover/*`
from being cached. `rover` is reserved in `subdomainService.ts` so it is never looked
up as a tenant. Avoid creating a program with the code `ROVER`, because its program
tenant would take that subdomain.

## Code

- `src/features/rover/roverMode.ts`: host detection, device preference, post-login path
- `src/features/rover/components/`: `RoverRoute` (providers), `RoverApp` (routes),
  `RoverSimulationList`, `RoverScanPatient`, `RoverPatientMAR`, `RoverModeSuggestion`
- `src/features/rover/findPatientByWristband.ts`: wristband → patient lookup (tested in
  `rover.test.ts`)
