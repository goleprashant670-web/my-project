# DMS NEWS / DMS CONTROL — source update 0.3.0

DMS NEWS and DMS CONTROL **debug APKs have compiled successfully** in GitHub Actions, including Flutter analysis and backend CI checks. They target the emulator host backend at `http://10.0.2.2:8080`. Signed release APK/AAB, live deployment and Play publication are not complete. Both APKs also passed installation/launch and seven core Android API 35 WebView checks, including registration, draft persistence and admin-to-user price/template updates. Exact scope and evidence are recorded in `docs/VERIFICATION.md`. Read `docs/DEPLOYMENT-HINGLISH.md` for the deployment path and remaining release gates.

## What changed

- DMS NEWS has no Administration route, JSON project import/export or converter UI.
- Separate DMS CONTROL at `/admin/` uses normal template, price, festival and settings forms. Price fields are in rupees.
- Admin sessions use a separate HttpOnly cookie. A normal user cannot log into the admin app. There are no default admin credentials.
- Published template and plan changes come from the shared backend; users press Refresh or reopen the app. No APK update is needed for catalog/pricing changes.
- Templates support JPG/PNG backgrounds, name/category/festival, headline, format, color, tags, premium status and scheduling.
- Separate Flutter targets use the connected interfaces through a shared WebView shell, with different Android application IDs, file picking and a save-file bridge. Both native targets are compiled; full upload/download and physical-device acceptance remain unverified.
- Existing FFmpeg timeline composition supports trimmed/reordered clips, narration, music, ticker and intro/outro. Direct Azure Speech and Twilio Verify integrations exist but require credentials and live testing.

## Run locally

Node 24 and FFmpeg are required. From the project directory:

```sh
cd backend
cp .env.example .env
node --env-file=.env server.mjs
```

User studio: `http://localhost:8080`. Admin: `http://localhost:8080/admin/`.
Create the first admin with temporary `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, then run `node --env-file=.env server.mjs --create-admin`. Remove these temporary variables afterwards. Password minimum: 12 characters.

Tests: `node tests/api.mjs`, `node tests/admin.mjs`, `node tests/providers.mjs`, `node tests/media.mjs`, `node tests/frontend.mjs`. Provider tests use mocks; frontend tests use a DOM/canvas test double, not a real browser.

## Boundaries

- Verified debug build: https://github.com/goleprashant670-web/my-project/actions/runs/35314676135. No signed release AAB or production APK exists.
- AI/OTP/payment live accounts, domain/server, release signing and Play access are not configured.
- Play Billing / alternative-billing integration is unfinished. Default native Play builds block checkout; native Razorpay bank/UPI handoffs remain unfinished.
- Password recovery, email verification, 2FA, actual account/data deletion, push delivery, refund/recurring reconciliation and coupon redemption are unfinished.
- Editor is not a full keyframe/multilayer NLE; advanced layers, transitions, subtitles and arbitrary template-package import are unfinished.
- Cloud object storage and distributed queues are unfinished. Current media storage is private local disk on a single server; PostgreSQL deployment has not been exercised here.
- All 57 original requirements are not complete. Older per-module status notes in `docs/REQUIREMENT-STATUS.md` remain a backlog, not a completion certificate.
- Reference clips are supplied for development inspection only and are blocked from public static serving. They are not auto-published as DMS templates.

## CI development build

Pushes to `dms-android-build` compile debug APKs for Android emulator backend `http://10.0.2.2:8080`. These require the local backend and are not live production apps. Manual workflow builds require a deployed HTTPS origin.
