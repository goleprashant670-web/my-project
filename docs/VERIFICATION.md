# Verification — 23 September 2026, app 0.3.0+3

Executed in this workspace:

- API: 21 checks passed — auth, ownership, quotas, actual FFmpeg PNG/MP4 output, payment signature rejection and maintenance.
- Separate admin: 16 checks passed — separate login/cookies, role rejection, static route, no user JSON/admin controls, reference-media blocking, template publication/disable, invalid image rejection, dynamic pricing and logout.
- Providers: 12 mock checks passed — OTP challenge/rate/replay and voice catalog/SSML. No real SMS/AI request sent.
- Media: 13 checks passed — authenticated uploads, trim/intro/outro/narration/music composition, 720p audio output, visual segment order, cross-account protection and ticker.
- Frontend VM smoke passed — user routes, draft save/reopen/duplicate, portrait dimensions and filter reset. This uses a DOM/canvas test double, not a real browser.
- Node syntax checks passed for user frontend, admin frontend and backend.

Total: 62 named backend/admin/provider/media checks plus frontend logic smoke.

## Android build evidence

- Both debug APKs compiled successfully, Flutter analysis passed for user/admin/shared shell, and backend CI checks passed.
- Build: https://github.com/goleprashant670-web/my-project/actions/runs/35314676135
- App/backend source commit: `ab4d39da932d23aa1e141bf86e4e6e8e88b890da`.
- Flutter baseline in that run: 3.47.4. Application version 0.3.0+3, package IDs `com.dmsdigitalmediaservice.dmsnews` and `com.dmsdigitalmediaservice.dmscontrol`.
- DMS-Android artifact SHA-256: `e454431b1c8adf39c0a374165afd51ae00ae577f2c7c6c4284dda91e9e222eda`.
- Delivered DMS NEWS APK SHA-256: `bfb1d86170c7cc9f452b8480879048a9419f16bac6b6da3bbab7b8f21ae23cff`.
- Delivered DMS CONTROL APK SHA-256: `ae14c74c5cdec01e7b722006ea9760c960913d8bacb38371deeeaf8b95354d7c`.
- These debug builds use `API_BASE=http://10.0.2.2:8080`, `DISTRIBUTION=play`; the backend must run on the emulator host. They are not ordinary-phone production builds.
- Subsequent workflow-only build runs also passed; they do not mean new app features or live providers were added.

## Android runtime

- Android API 35 emulator: both original debug APKs installed successfully, launched in their separate native packages and loaded the shared backend.
- Successful runtime workflow: https://github.com/goleprashant670-web/my-project/actions/runs/35839263082
- Harness commit: `0506b61d67a0d155b6f772fd40feabbcd6f45977`. APK and backend remain pinned to `ab4d39da932d23aa1e141bf86e4e6e8e88b890da`; no app code was changed to make the checks pass.
- Seven real Android WebView DOM checks passed:
  1. User dashboard loaded with no administrator navigation.
  2. Email registration through the form established a connected session.
  3. The 1280×720 editor opened, a draft saved, and the session/project/headline survived page reload and reopen.
  4. The separate admin application authenticated and loaded its dashboard.
  5. A normal price form accepted ₹149.50 and saved the plan without any JSON editor.
  6. A normal template form published edited name/headline values.
  7. Refresh in DMS NEWS loaded the edited price/template, and the published headline applied in its editor without rebuilding either APK.
- Test admin credentials were randomly generated for the isolated CI database. The ₹149.50 value and template changes were test fixtures, not production pricing or a customer transaction.
- Evidence artifact `10740453717`, SHA-256 `6bffb27a0f7ab17ca0b48b05b92e18b6d640c2de4af76303156716e3ad91c13b`, contains native screenshots, device/backend logs and `webview-checks.json`. All seven screenshots were visually reviewed; captures wait for splash completion and the native compositor.
- Initial UIAutomator text assertions failed because its XML exposed the native WebView but omitted the HTML tree. The workflow now asserts native package/WebView presence and tests actual form behavior through that installed debug app's DevTools channel. It does not treat an empty XML tree as a successful content assertion.
- These checks use DOM form interaction inside Android's real WebView. Native touch/keyboard/accessibility, TalkBack, Android back, file picker/save and physical-device acceptance are still unverified. A successful smoke run is not full product or release acceptance.

## Not verified / not delivered

- Physical-device acceptance: file picker/save bridge, navigation/back/keyboard, interruption, themes, large media and audio/video synchronization with real provider output.
- Live domain/SSL/PostgreSQL/Docker staging, real SMS OTP, actual Azure/script AI calls, real Razorpay payment or bank/UPI handoff.
- Owner-signed release APK/AAB, Play Billing or alternative billing integration, Play Console submission/review/publication.
- Full original feature completeness; see REQUIREMENT-STATUS.md and remaining development steps in DEPLOYMENT-HINGLISH.md.

No live keys, OTP code, customer charge, signing key or production admin password were used for these checks. Provider mocks and a successful debug compile are not evidence of live integration.
