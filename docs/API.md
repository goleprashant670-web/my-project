# API contract — development 0.3.0

Prefix: `/api`. JSON request/response except file responses and binary uploads. This document is for developers; the apps do not expose a JSON editor/converter. Errors use `{ "error": "message" }` with HTTP status. Same-origin web clients, including the current Flutter WebView shells, use HttpOnly SameSite cookies. Other API clients may use the returned opaque token as `Authorization: Bearer TOKEN`. Server stores only the SHA-256 token hash; sessions expire after seven days. These are opaque token sessions, not JWT.

| Method | Endpoint | Access / contract |
|---|---|---|
| GET | /health | Public service status |
| GET | /config | Public settings, available templates, plan display and integration capabilities |
| POST | /auth/register | `{name,email,password}`; returns `{user,token}` |
| POST | /auth/login | `{email,password}`; returns `{user,token}` |
| POST | /auth/logout | Authenticated; invalidates current token |
| POST | /auth/password | `{current,password}`; invalidates all sessions |
| POST | /auth/otp/send | `{phone}` in international format; returns `challengeId,expiresIn`; Twilio Verify required |
| POST | /auth/otp/check | `{challengeId,code,name?}`; verified phone user/session; no automatic email-account linking |
| GET | /me | User, effective plan, subscription and usage |
| GET/POST | /projects | List own drafts / create JSON project |
| PUT/DELETE | /projects/:id | Own project only |
| GET/POST/DELETE | /favourites[/:id] | Own records with `templateId` |
| GET/POST/DELETE | /support[/:id] | Own support records; no outgoing messages are sent |
| GET | /downloads | Own completed exports |
| GET | /media | Own uploaded audio/video metadata |
| POST | /media?name=... | Raw binary body, matching audio/video Content-Type; 64 MB max, valid media 0.1–600 seconds |
| GET/DELETE | /media/:id | Owner only; deletion rejects media used by saved projects or active render |
| GET | /files/:id.png or .jpg or .mp4 | Owner-authenticated binary response |
| POST | /exports | `{image: "data:image/png;base64,...", format: "png|jpg|mp4", templateId, name, duration}` |
| GET | /payments | Own order/payment history; amount in paise |
| POST | /payments/order | `{planId}`; server reads current amount; returns public key, order ID, amount, currency |
| POST | /payments/verify | Razorpay checkout IDs and signature; validates HMAC and captured payment against server order |
| POST | /payments/webhook | Raw body signed with webhook secret; handles payment.captured idempotently |
| POST | /ai/script | Authenticated editable text generation through adapter |
| POST | /ai/voice | Authenticated quota-controlled voice adapter |
| GET | /ai/voices | Authenticated Azure voice catalog; locale/gender/supported style metadata |
| GET | /admin/analytics | Real aggregate data; admin only |
| GET | /admin/users | Admin-only safe user fields |
| PUT | /admin/users/:id | `{active: true|false}` |
| PUT | /admin/subscriptions/:userId | `{planId,expires: ISO-date}`; manual admin change |
| GET | /admin/audit | Last 200 admin/login/payment events |
| GET | /admin/payments | Admin payment report |
| GET/POST/PUT | /admin/templates[/:id] | Dynamic template catalog |
| DELETE | /admin/templates/:id | Remove catalog record |
| GET/POST/PUT | /admin/plans[/:id] | Dynamic plans; disable rather than delete |
| GET/PUT | /admin/settings/app | Dynamic application settings |
| GET/POST/PUT/DELETE | /admin/coupons[/:id] | Configuration CRUD only; redemption not implemented |
| GET/POST/PUT/DELETE | /admin/notifications[/:id] | Record CRUD only; no push transport |

## Model conventions

Plan: `id,name,price,days,voiceLimit,exportLimit,premium,watermark,resolution,active`. Price is integer INR paise. Resolution is 720 or 1080. Free-plan defaults may be adjusted, but its free/watermarked/nonpremium identity is protected. Paid-plan usage starts at subscription activation; free usage uses the server calendar month. Renewal resets current subscription usage. Same-plan renewal extends from existing expiry; changing plans starts a new period immediately. Proration is not supported.

Template: `id,name,category,format,color,headline,premium,active,festival?,description,tags,publishAt?,expiresAt?`. Dates are ISO timestamps. News templates use the shared original rendering engine, not executable uploaded code. Custom template-file ingestion and an asset schema are pending. Publication checks apply to config and export.

Project: editable JSON including `name,headline,subheadline,breaking,reporter,location,channel,ticker,script,format,color,fontSize,x,y,rotation,templateId,image?,logo?`. Small raster images may be embedded as data URLs. Per-request/project limits are enforced; cloud object storage is not present.

## AI adapter interface

The server uses only the trusted deployment setting `AI_ADAPTER_URL`; users cannot override it. Configure a private HTTPS adapter and `AI_ADAPTER_TOKEN` in server environment. Secrets never go to clients.

`POST <adapter>/script`: JSON `{facts,duration,language}`. Return `{headline,script,caption?,description?}`. The script remains editable. Your adapter must constrain output to supplied facts and disclose unavailable sources.

`POST <adapter>/voice`: JSON `{script,language,gender,style,speed,pitch,volume}`. Return `{audioUrl:"https://..."}` using a signed, short-lived media URL. The generic path previews this audio; importing that external audio into private timeline media is pending.

With `AZURE_SPEECH_ENDPOINT` and `AZURE_SPEECH_KEY`, the direct Azure path takes precedence, selects a catalog voice, generates MP3 and stores it as authenticated user media. `/ai/voice` then returns `{audioUrl,mediaId,voice,style,language}`. The app applies `mediaId` as narration for MP4 composition. This is mock-tested integration code, not verified live synthesis.

## Timeline export additions

`POST /exports` supports `clips: [{mediaId,start,duration}]` (maximum 8 main clips), `introId,introDuration,outroId,outroDuration,narrationId,musicId,voiceSpeed,voiceVolume,musicVolume,clipVolume,ticker,tickerSpeed,tickerImage`. Durations/start are seconds; volume ranges 0–1. Media IDs must be owned by the authenticated user. Full composition including intro/outro is limited to 180 seconds. Intro/outro selection is uploaded media, not an already populated licensed library. Formats are PNG/JPG/MP4; server plan controls 720p/1080p and watermark. Existing raster frame plus basic timeline is not a full independent-layer editor.

An adapter is an integration contract, not a supplied cloud AI implementation. Unsupported languages/voices must return an error. Add provider-specific safety, retries, billing controls, audio ownership and retention before production.

## Data storage

`users`, `sessions`, `payments`, `subscriptions`, `usage_events`, `audit_logs` are dedicated relational tables. `records` stores typed JSON for templates, plans, settings, projects, favourites, downloads, coupons, notifications and support. This is a compact development schema, not the full normalized structure from the specification. There is no Admin password table separate from Users: role-protected users provide admin identities.

Schema uses TEXT JSON for portability. PostgreSQL uses parameterized queries through `pg`; default local development uses Node's SQLite module. Secrets are environment-only. Export file retrieval checks the owner before serving bytes.

## Source 0.3.0 additions

- `POST /api/admin-auth/login` accepts email/password and requires role admin before issuing an HttpOnly `dms_admin_session` cookie.
- `GET /api/admin-auth/me` and `POST /api/admin-auth/logout` operate on that separate session.
- `/api/admin/*` cookie auth reads the admin cookie; user `/api/*` reads `dms_session`. Bearer API auth remains role-checked.
- `/admin/` is the separate control interface; there is no user-app navigation to it.
- Templates can store validated PNG/JPEG data-URI `background` images up to 4 MB, used by the user editor. Publish/expiry inputs are normalized to UTC.
- Plan prices remain integer paise internally; admin forms show rupees. Active paid plans require a positive price of at least ₹1.
- Supplied reference media is not served by `/assets/`; only the DMS logo is publicly available there.
