# DMS NEWS + DMS CONTROL — deployment se Play Store tak

Updated: 23 September 2026. Source/app version 0.3.0+3. **Dono debug APK compile ho chuke hain. Signed release APK/AAB, live deployment aur Play release complete nahi hain.** Code mein jo feature incomplete hai, sirf credentials bharne se complete nahi hoga.

## 0. Last completed stage aur ab kahan se shuru karna hai

Last completed stage: dono debug APK build hone ke baad **Android API 35 emulator par install/start aur seven core WebView checks pass** hue. Registration, draft save/reopen, separate admin login, normal ₹ price/template forms aur admin changes ka user app mein Refresh se aana verified hai. [Verified build run](https://github.com/goleprashant670-web/my-project/actions/runs/35314676135) · [Verified emulator run](https://github.com/goleprashant670-web/my-project/actions/runs/35839263082). Supplied APKs `http://10.0.2.2:8080` par backend expect karte hain; yeh emulator test builds hain. Ordinary phone par internet se chalne ke liye live HTTPS backend wala naya build chahiye.

| Kaam | Actual state | Agla step |
|---|---|---|
| User app/admin separation, normal template/price forms | Both APK built; real Android WebView forms passed | Full native/physical acceptance, Section 13 |
| Android emulator launch/core flow | Both apps + 7 WebView checks passed | Touch, accessibility, picker/save aur real phone tests abhi baaki |
| Live backend/SSL/database | Server/domain access available nahi | Sections 4–5 |
| Real OTP / AI voice / payment | Integrations present, real credentials/test evidence absent | Sections 7–8; mocks live verification nahi hain |
| AI script generator | Adapter contract only; hosted generator absent | Section 8C developer steps |
| Signed release APK/AAB | Owner signing secrets aur live URL absent | Sections 11–12 |
| Play production | Billing, deletion, device acceptance aur owner Console setup incomplete | Sections 14–15 |
| Full original 57-section product | Several modules still partial | Section 17 and `docs/REQUIREMENT-STATUS.md` |

Owner ke liye next sequence: **server/domain → staging backend → admin account → test providers → remaining release code → real-device acceptance → signing → Play internal/closed test → production review**. Accounts already hain toh unhe dobara create na karein. Is guide ke commands mein `YOUR_DOMAIN`, email aur private paths ko apne values se replace karein.

## 1. Dono apps aur backend

- DMS NEWS: users ke liye, `flutter/`, package `com.dmsdigitalmediaservice.dmsnews`.
- DMS CONTROL: owner/admin ke liye, `admin_flutter/`, package `com.dmsdigitalmediaservice.dmscontrol`.
- Shared backend: Node 24 + PostgreSQL + FFmpeg; user interface `/`, admin `/admin/`.
- Flutter apps connected WebView clients hain. Editing/rendering web/backend mein hoti hai. Internet aur running backend required hain.
- Admin price/template forms normal controls hain. Internal APIs structured data use karte hain, lekin user ko JSON editor/converter nahi dikhaya jata.

## 2. Owner se required setup

Domain aur Linux server, GitHub repository, Razorpay merchant account, SMS provider, Azure Speech resource, script-AI adapter/provider, support email/number, approved policies, Play Console account aur private upload signing key chahiye. Secrets chat, APK, public repository ya screenshots mein mat rakhein. Unhe server environment aur GitHub Actions secrets mein configure karein.

Source user ki authorization se public repository [goleprashant670-web/my-project](https://github.com/goleprashant670-web/my-project/tree/dms-android-build) ki `dms-android-build` branch par hai. [Draft PR #1](https://github.com/goleprashant670-web/my-project/pull/1) open hai. `main` par abhi project merged nahi hai. Reference APK/videos aur private credentials source upload ka part nahi hain.

| Owner ko kya configure karna hai | Kahan | Kab ready maana jayega |
|---|---|---|
| Domain + server access | DNS/hosting account | HTTPS health aur both interfaces open |
| Razorpay merchant + test/live keys | Server `backend/.env` only | Captured test payment, webhook, exact validity verified |
| Twilio Verify | Server `backend/.env` only | Owner test phone par actual OTP receive/login |
| Azure Speech | Server `backend/.env` only | Actual audio generate, preview aur MP4 mein play |
| Script AI provider/adapter | Private deployed service | Factual editable script generated through app |
| Upload key | Owner computer + GitHub Actions secrets | Signature verification + Play internal upload |
| Play Console | Owner account | Required declarations, testing and review complete |

Passwords, provider keys ya keystore chat mein bhejne ki zarurat nahi. Hosting/domain name, chosen accounts aur configuration complete hone ka non-secret confirmation enough hai; execution ke liye authorized service access separately chahiye.

## 3. Pehle local backend test karein

Node.js 24, FFmpeg, Python 3 (media test fixtures ke liye Pillow) install karein. Current source clone karein:

```sh
git clone --branch dms-android-build --single-branch https://github.com/goleprashant670-web/my-project.git dms-news
cd dms-news
```

Backend start karein:

```sh
cd backend
cp .env.example .env
node --env-file=.env server.mjs
```

Browser mein `http://localhost:8080` aur `http://localhost:8080/admin/` kholein. SQLite development database automatically banta hai. PostgreSQL ke liye backend mein `npm install --omit=dev` aur `DATABASE_URL` set karna hoga.

Alag terminal mein project root se:

```sh
node tests/api.mjs
node tests/admin.mjs
node tests/providers.mjs
node tests/media.mjs
node tests/frontend.mjs
```

Provider tests mock hain. Inke pass hone ka matlab real SMS/AI/payment live hona nahi hai.

## 4. Server aur domain

1. Linux server par Docker Engine + Compose official installation instructions se install karein: https://docs.docker.com/engine/install/ubuntu/
2. Domain ka A record server IPv4 par point karein. AAAA record tabhi add karein jab IPv6 correctly configured ho.
3. SSH access apne trusted IP tak restrict karein. Public HTTP/HTTPS ports 80/443 allow karein. Database port public expose na karein.
4. Section 3 ka Git clone apne controlled directory, jaise `/srv/dms-news`, mein karein. Docker commands project root se run karein. Production use se pehle container setup ko staging mein verify karein; Docker/PostgreSQL production runtime yahan verify nahi hua hai.
5. Project root ki private `.env` banayein:

```dotenv
DMS_DOMAIN=news.your-domain.example
DMS_DB_PASSWORD=REPLACE_WITH_RANDOM_HEX_PASSWORD
```

`your-domain.example` placeholder hai, live address nahi. Password URL-safe hex rakhein; `openssl rand -hex 32` se generate kar sakte hain. `backend/.env.example` ko `backend/.env` mein copy karein aur sirf required provider fields configure karein. Dono `.env` files ko permissions 600 dein aur Git se exclude rakhein.

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api gateway
curl --fail https://news.your-domain.example/api/health
```

Caddy certificate issue/renew karega jab DNS aur ports sahi hon. API ka host, secure cookies, public origin aur database URL Compose set karta hai. Media private named volume mein hai. Production mein storage space, CPU, backup aur failures monitor karein. Current render concurrency 2 hai; multiple server instances se pehle shared queue/limiter implement karein.

**Pass check:** health response mein `ok: true` aur `database: postgresql`; `https://YOUR_DOMAIN/` par DMS NEWS; `https://YOUR_DOMAIN/admin/` par DMS CONTROL login. Browser certificate valid ho. Test user register karke draft save/reopen karein, server restart ke baad bhi draft aur login work karein. Failed health ko ignore karke APK build na karein.

**Agar fail ho:** certificate error par DNS/80/443 check; gateway 502 par `docker compose logs --tail=100 api gateway`; database login error par root `.env` password aur existing database-volume password ka match check. Existing database ka password sirf `.env` badalne se rotate nahi hota. Server response/logs share karne se pehle private data redact karein.

## 5. First admin securely create karein

`backend/.env` mein temporary values set karein:

```dotenv
ADMIN_EMAIL=your-owner-email@example.com
ADMIN_PASSWORD=YOUR_UNIQUE_PASSWORD_AT_LEAST_12_CHARACTERS
```

Phir project root se:

```sh
docker compose run --rm api node server.mjs --create-admin
```

Success ke baad temporary bootstrap fields remove karein, phir `docker compose up -d --force-recreate api` karein. Default admin login nahi hai. `/admin/` par log in karke templates, plans aur settings manage karein. Server role check normal users ko admin access se rokta hai. 2FA aur admin password recovery abhi implement karni hain.

Admin login ka password kisi sample se copy na karein. Bootstrap command naya admin create karta hai; existing admin ka password reset command nahi hai. Recovery code complete hone tak apne owner credentials ka secure backup rakhein.

## 6. Template aur price changes

DMS CONTROL → Templates → Add/Edit → name, category, festival, format, headline, color, JPG/PNG background → premium/free → publish/expiry (UTC) → activate → Save.

DMS CONTROL → Plans → price **rupees** mein → days → AI/export limits → resolution → watermark → activate → Save. Backend paise mein store karta hai; conversion automatic hai. Default paid plans disabled hain jab tak aap real price set nahi karte.

DMS NEWS mein Refresh press karein ya app reopen karein. Same backend hone ke karan new catalog/prices load honge. APK rebuild nahi chahiye. Running editor ka current draft automatically overwrite nahi hota. Background upload design image hai; arbitrary proprietary template package import nahi.

## 7. Razorpay test se live

1. Apne merchant account ka onboarding/KYC complete karein.
2. Dashboard Test Mode mein API keys generate karein.
3. Server `backend/.env` mein `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` aur alag `RAZORPAY_WEBHOOK_SECRET` set karein. Secret APK mein nahi jayega.
4. Webhook URL `https://YOUR_DOMAIN/api/payments/webhook` aur `payment.captured` event configure karein. Same webhook secret backend mein rakhein.
5. API restart karein. Staging web studio mein test plan se checkout karein.
6. Successful, cancelled, failed aur duplicate webhook scenarios verify karein. Server captured amount/currency/order aur signature verify karta hai; sirf client success screen subscription activate karne ke liye enough nahi.
7. Payment report aur subscription expiry verify karein. Test aur live records/keys ko mix na karein.
8. Staging successful hone ke baad production mein live keys aur live-mode webhook configure karein. API force-recreate karein. Owner ke apne test account se approved small real payment aur reconciliation test karein; yeh actual charge hoga. Refund dashboard se test kiya jaye toh app entitlement adjustment manually reconcile karein, kyunki automatic refund reconciliation abhi implemented nahi.

Yeh one-time paid validity model hai; recurring subscriptions, automated refunds, coupon redemption aur refund reconciliation unfinished hain. Native bank/UPI handoffs bhi complete/device-tested nahi hain. Current native Play build checkout block karta hai.

Official integration reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

**Pass evidence:** test order ID, payment ID, amount in paise, captured status, webhook HTTP success, app payment history aur exact subscription expiry record karein. Callback aur webhook dono aane par duration sirf ek baar add ho. Cancel/failed payment par subscription activate na ho. Koi real payment humne execute nahi kiya hai.

**Native payment ke liye developer work:** Section 14 ka billing path implement karein. Current WebView same-origin navigation allow karta hai; UPI/bank app handoff complete nahi hai. Sirf `DISTRIBUTION` flag badal kar Play checkout unblock karna completed integration nahi hai.

## 8. SMS OTP, AI voice aur script assistant

### 8A. Actual SMS OTP

1. Owner Twilio account → Verify → service create karein. Service SID `VA…` hota hai; account SID `AC…` hota hai. Dono alag fields hain.
2. India delivery ke liye provider ke applicable sender/registration requirements aur trial restrictions complete karein; required destination geographies enable karein.
3. Private `backend/.env` mein `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` set karein.
4. `docker compose up -d --force-recreate api` run karein; sirf restart changed environment reload karne ke liye sufficient nahi.
5. DMS NEWS reopen → Login → Mobile OTP → name aur apna actual `+91` number → Send OTP. Received code app mein enter karein.
6. Logout/relogin se same phone account verify karein. Wrong code reject, 60-second resend cooldown, maximum 5 attempts aur 10-minute local expiry test karein. Provider code expiry isse shorter ho sakti hai.
7. Disable kiye gaye user ko login na mile aur phone account ko admin access na mile. Provider dashboard delivery status aur app result dono record karein.

Current implementation phone login ko existing email account se automatically link nahi karta. Account linking/email verification/recovery alag unfinished features hain. **Pass:** actual SMS delivered + verified session persists; capability flag ya mock test alone enough nahi.

### 8B. Actual AI voice

1. Azure owner subscription mein Speech resource create karein; resource ka Keys and Endpoint page kholein. Resource ke billing/budget controls set karein.
2. `AZURE_SPEECH_ENDPOINT` mein HTTPS resource origin ending `.cognitiveservices.azure.com` aur `AZURE_SPEECH_KEY` mein usi resource ka key server par set karein. Regional `tts.speech.microsoft.com` URL current adapter config mein supported nahi hai.
3. API force-recreate karein. DMS NEWS mein registered user login → AI Voice → 1–2 sentence script → Hindi → Female/Male → Professional → Generate.
4. Preview play karein; pronunciation/speed/volume check karein. Generated narration editor ki video timeline par apply honi chahiye.
5. Image ya clip add karke short MP4 export karein. Downloaded MP4 mein actual narration, correct duration aur music balance verify karein.
6. Required regional languages/genders aur offered styles ko separately validate karein. Hinglish currently Hindi locale use karta hai. Har locale ke liye har style available nahi; current UI ke unsupported combinations error denge. Full spec meet karne ke liye supported voice/style selection improve karna hoga.
7. Provider outage aur exhausted voice quota par clear error aur failed-generation quota refund verify karein.

**Pass:** real audio preview + actual exported MP4 narration. A key present hone se service verified nahi hoti. No real Azure synthesis request has been executed in this delivery.

### 8C. Script generator — code work before setup

Current code `AI_ADAPTER_URL` ke `<base>/script` endpoint ko call karta hai; supplied source mein hosted text-generation service nahi hai. Is part ko developer ko implement/deploy karna hoga:

1. Owner ke chosen AI provider ka server-only account/key configure karein. Provider key ko Flutter app mein mat rakhein.
2. HTTPS adapter par authenticated `POST /script` implement karein. Input: `facts`, `duration`, `language`. Output: `headline`, `script`, optional `caption`, `description`. Contract `docs/API.md` mein hai.
3. Adapter `Authorization: Bearer <AI_ADAPTER_TOKEN>` validate kare; only supplied facts use karne ka instruction, input/output length validation, timeout, usage limits aur provider error handling add karein. Generated claims ko automatically verified news na label karein.
4. Empty facts, unsupported duration/language, malformed output aur provider failure tests add karein. Generated text editable rahe. Existing UI currently headline/script apply karta hai; other generated fields ke editing controls separately finish karein.
5. Adapter deploy karke `AI_ADAPTER_URL` + `AI_ADAPTER_TOKEN` backend par set karein; API force-recreate.
6. DMS NEWS Script assistant mein verified facts → 30 Seconds → Generate → text edit → voice → MP4 test karein. Expected duration approximate hai; actual narration ko measure/trim karein.

Azure direct voice config ho toh voice us provider se aata hai; generic adapter ka `/voice` hosted-audio contract primarily preview ke liye hai, automatic private media import us path par complete nahi hai.

Provider references: https://www.twilio.com/docs/verify/api and https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech

## 9. Android build machine

Flutter stable, Android Studio/SDK, Android platform 36, platform tools, compatible build tools aur JDK install karein. Official Flutter setup: https://docs.flutter.dev/install

```sh
flutter doctor -v
flutter doctor --android-licenses
python3 scripts/prepare_android.py
```

Windows par `python3` ki jagah `py` use kar sakte hain. Android license prompts khud review/accept karein. Preparation dono Android projects generate karta hai, app IDs/labels/logo apply karta hai, min SDK 24 aur target 36 set karta hai, aur release signing environment configure karta hai. Script Flutter absent hone par explicit failure deta hai.

Dono targets mein `flutter analyze` run karein. Shared package `packages/dms_shell` mein bhi analysis karein. Existing verified CI baseline Flutter **3.47.4** hai; local Flutter upgrade ke baad analysis aur build dobara verify karein. Compiler/analyzer errors ko resolve kiye bina APK ready na maanein.

## 10. Debug APK

Backend HTTPS origin ko real value se replace karein:

```sh
cd flutter
flutter build apk --debug --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
cd ../admin_flutter
flutter build apk --debug --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
```

Outputs respectively `flutter/build/app/outputs/flutter-apk/app-debug.apk` aur `admin_flutter/build/app/outputs/flutter-apk/app-debug.apk` honge. Connected Android phone par each APK install karein. Emulator local testing ke liye debug build mein `http://10.0.2.2:8080` allowed hai; real phone ke liye deployed HTTPS backend use karein.

**Already delivered emulator APKs ko kaise chalayein:** host computer par Section 3 ka backend use karein, lekin emulator ke liye `backend/.env` mein `PUBLIC_ORIGIN=http://10.0.2.2:8080` set karke backend restart karein. Yeh login/save jaise API writes ke origin check ke liye zaroori hai. Local browser-only testing ke liye baad mein `http://localhost:8080` restore karein. Android Studio → Device Manager → Android virtual device start karein. Host terminal mein Android platform-tools PATH configured hona chahiye. Downloaded APK folder se:

```sh
adb devices
adb install -r DMS-NEWS-debug.apk
adb install -r DMS-CONTROL-debug.apk
adb shell am start -n com.dmsdigitalmediaservice.dmsnews/.MainActivity
adb shell am start -n com.dmsdigitalmediaservice.dmscontrol/.MainActivity
```

Emulator ka `10.0.2.2` host machine ke localhost ko point karta hai. Yeh IP ordinary phone ka backend address nahi hai. Multiple devices connected hon toh `adb -s DEVICE_SERIAL ...` use karein. Backend band ho toh Connection failed expected hai. Existing app ki signing key different ho toh Android update reject karega; important drafts/data preserve kiye bina app uninstall na karein.

## 11. Signed release APK aur AAB

Package name permanent identity hai; first Play release se pehle finalize karein. Current names Section 1 mein hain. Dono `pubspec.yaml` mein `version: 0.3.0+3`: left version name, right version code. Har update mein version code increase karein.

Owner-controlled upload key banayein aur encrypted backup rakhein:

```sh
keytool -genkeypair -v -keystore /PRIVATE_PATH/dms-upload.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias dms-upload
```

**Windows PC par:** Android Studio/JDK install karke `keytool` PATH mein available karein. Apne private local folder ka actual path use karein. PowerShell example:

```powershell
New-Item -ItemType Directory -Force C:\DMS-private
keytool -genkeypair -v -keystore C:\DMS-private\dms-upload.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias dms-upload
```

Password keytool ke private prompt mein enter karein. Is folder ko shared/public folder na banayein. Windows owner ke liye Section 12 ka GitHub Actions build path use karna possible hai; Bash `export/read` commands PowerShell mein directly paste na karein.

Build environment mein `DMS_KEYSTORE` (absolute path), `DMS_STORE_PASSWORD`, `DMS_KEY_ALIAS`, `DMS_KEY_PASSWORD` securely set karein. Values ko source/logs mein na likhein. Script missing signing values par release block karta hai.

Linux/macOS Bash terminal ka local example (passwords screen/history par nahi likhte):

```sh
export DMS_KEYSTORE=/PRIVATE_PATH/dms-upload.jks
export DMS_KEY_ALIAS=dms-upload
read -rsp 'Keystore password: ' DMS_STORE_PASSWORD
export DMS_STORE_PASSWORD
read -rsp 'Key password: ' DMS_KEY_PASSWORD
export DMS_KEY_PASSWORD
```

Keystore aur passwords ka encrypted backup **owner ke control** mein rakhein. Already published package ke liye existing upload key use karein; random replacement key se update nahi chalega. Build ke baad terminal close karein ya signing variables unset karein.

Har app directory se:

```sh
flutter build apk --release --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
flutter build appbundle --release --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
```

Signed APK: `build/app/outputs/flutter-apk/app-release.apk`. AAB: `build/app/outputs/bundle/release/app-release.aab`. AAB phone par direct install nahi hota; Play testing track se test karein. Signing verification ke liye Android build-tools `apksigner verify --verbose APK_PATH` use karein. Flutter reference: https://docs.flutter.dev/deployment/android

AAB JAR signature ko `jarsigner -verify -verbose -certs AAB_PATH` se check karein; bundle/package/API validation Play internal-track upload par bhi honi chahiye. APK signing certificate SHA-256 aur AAB upload certificate owner ke expected key se match karein. Self-signed upload certificates Android apps ke liye normal hain; signing success ko functional QA ya Play approval na samjhein.

## 12. GitHub Actions build

Current repository mein workflow `dms-android-build` branch par already uploaded hai. Automatic debug builds successful ho chuke hain. `.env`, data, reference APK aur keystore commit na karein. Source ko phir se upload karne ki zarurat nahi. Manual workflow reference: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow

1. [PR #1](https://github.com/goleprashant670-web/my-project/pull/1) review karein. GitHub ka manual **Run workflow** button available karne ke liye workflow file default branch (`main`) par honi chahiye. Owner draft ko Ready for review karke reviewed PR merge kar sakta hai; is delivery ne PR merge nahi kiya hai. Merge se backend/Play automatically publish nahi hote.
2. Repository → Actions → **Build DMS Android apps** → Run workflow → correct branch select karein.
3. `api_origin` = actual `https://YOUR_DOMAIN`, path ke bina. `signed_release=false` se pehle phone-compatible debug APK banayein.
4. Workflow backend health, Flutter analysis, tests aur both APK builds chalata hai. Green run → Artifacts → **DMS-Android** download/unzip karein. Artifacts 14 days retain hote hain; owner apni copy rakhein.
5. User output `flutter-debug.apk`; admin output `admin_flutter-debug.apk`. Local delivered files ke names DMS-NEWS-debug.apk / DMS-CONTROL-debug.apk hain.
6. Section 13 complete karein. Failure logs resolve kiye bina signing step continue na karein.

7. Release ke liye Repository Settings → Secrets and variables → Actions → New repository secret. Exact names: `DMS_KEYSTORE_BASE64`, `DMS_STORE_PASSWORD`, `DMS_KEY_ALIAS`, `DMS_KEY_PASSWORD`.
8. First secret owner ke private keystore ka base64 text hai. Python 3 se apne computer par protected temporary file bana sakte hain (actual keystore path replace karein):

```sh
python3 - <<'PY'
from pathlib import Path
import base64, os
source = Path('/PRIVATE_PATH/dms-upload.jks')
target = source.with_name('dms-upload-base64.txt')
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'wb') as out:
    out.write(base64.b64encode(source.read_bytes()))
PY
```

Windows par Python code mein path `C:/PRIVATE_PATH/dms-upload.jks` use karein aur folder ki access permissions owner-only rakhein. Temporary text locally open → full content secret field mein paste → Save. Base64 encryption nahi hai; temp file ko secret configure hone ke baad securely manage/remove karein. Actual keystore backup retain karein.

Windows PowerShell mein Python heredoc ki jagah yeh equivalent command use kar sakte hain; yeh contents terminal par print nahi karta:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\DMS-private\dms-upload.jks')) | Set-Content -Encoding ascii -NoNewline 'C:\DMS-private\dms-upload-base64.txt'
```

9. Workflow dobara live origin + `signed_release=true` se run karein. Expected outputs: `flutter-release.apk`, `flutter-release.aab`, `admin_flutter-release.apk`, `admin_flutter-release.aab` aur lockfiles.
10. Signing verification Section 11, then Play internal test Section 15. Abhi tak koi signed build run ya release AAB verified nahi hua hai. Missing secrets par signing step fail hona intentional hai.

## 13. Real device acceptance

- User APK mein Administrator/JSON controls absent; admin APK alag install ho.
- Register, login, logout, restart/session expiry; real OTP receive; wrong OTP reject.
- Admin mobile par price change; user mobile par Refresh se exact price reflect.
- New free/premium template publish/disable; correct entitlement enforce.
- Hindi + regional headlines, image upload, portrait/landscape, draft reopen/duplicate.
- Clip trimming/reordering, narrator + music, intro/outro, ticker aur MP4 duration/sync.
- PNG/JPG/MP4 native Save dialog, actual saved file playback, large-file error.
- Light/dark text contrast, Android back, keyboard, rotation, interruption, poor internet.
- Real payment/cancel/refund policy and no double subscription activation.
- Maintenance, disabled user, cross-account file access, server restart and backup recovery.

Existing `tests/frontend.mjs` DOM/canvas test double use karta hai. Separate emulator workflow actual installed APK ke WebView ko test karta hai; latest executed scope `docs/VERIFICATION.md` mein hai. WebView DOM interaction native touch/keyboard/accessibility testing ka replacement nahi. Android upload/download and native navigation paths abhi fully device-tested nahi hain.

Repository ka `DMS Android emulator smoke` workflow explicitly original successful APK run `35314676135` aur matching source commit `ab4d39d…` ko test karta hai. Yeh future app changes ko automatically validate nahi karta. New APK test karne ke liye developer ko successful artifact run ID aur matching checkout commit dono saath update karne honge; purane artifact ka green result naye release ka certificate nahi hai.

**Physical phone par repeatable procedure:**

1. Live/staging HTTPS origin wala fresh debug APK build karein. Apne primary phone ke alawa ek lower-memory supported Android phone use karein. Android version, model, app version aur source commit note karein.
2. USB debugging enable → `adb devices` par device authorize → both APK install. Store-release acceptance baad mein Play internal track se repeat karni hai.
3. User app → register → create a draft → close/reopen → same draft open. Admin app mein own admin login; normal user credentials se admin login reject hona chahiye.
4. Admin mein test template publish aur plan price change → user app Refresh → correct template/price. Ordinary user UI mein Administrator ya JSON editor/converter nahi hona chahiye.
5. Phone gallery se photo/logo/video pick karein. 10–15 second sample mein two clips trim/reorder, narration + music, ticker aur intro/outro add karein. PNG/JPG/MP4 export karke native Save dialog complete karein. Gallery/player se saved files kholkar dimensions, order, narration sync aur watermark check karein.
6. Upload/save dialog cancel, app background/resume, keyboard, Android Back, offline → reconnect aur large-media error test karein. Back-navigation handling complete nahi; defect milne par shared Flutter shell mein fix karke repeat karein.
7. Actual OTP aur live/test provider flows Sections 7–8 se check karein. SMS/payment delivery ke liye real phone/account access required hai; emulator mock isko replace nahi karta.
8. Har row par PASS/FAIL, evidence filename aur issue note karein. Release tabhi ready jab required cases pass hon; known failures ko “done” mark na karein.

| Test group | Required evidence | Current coverage |
|---|---|---|
| Install/start separate apps | Package list + both screenshots | Emulator result verification report mein |
| Admin forms → user update | Before/after screen, same backend | Android WebView test passed; physical UI unverified |
| Login/draft persistence | Reload/reopen and saved headline | Android WebView registration/reload passed; physical/native relaunch unverified |
| Gallery/media/save bridge | Saved real PNG/JPG/MP4 | Physical unverified |
| Audio/video synchronization | Watch/listen exported file | Automated FFmpeg fixtures; real provider unverified |
| OTP/AI/payment | Provider record + matching app result | Mock/integration code only |
| Crash, Back, keyboard, rotation | Screen recording and issue notes | Full matrix pending |

## 14. Play billing decision — production gate

Digital subscription ke liye sirf Razorpay WebView add karna Play compliance complete nahi karta. India alternative-billing program ke required enrollment, Google Play choice/API integration, transaction reporting aur applicable fees review/implement karein, ya Play Billing implement karein. Current code mein yeh integration incomplete hai, isliye native Play checkout disabled hai. Is gate ko complete kiye bina paid production launch na karein.

Official policy: https://support.google.com/googleplay/android-developer/answer/13306652?hl=en

**Developer implementation order:**

1. Owner decide kare ki India alternative billing with user choice chahiye ya standard Play Billing. Available countries/eligibility Console mein confirm karein. India alternative route mein enrollment, Play choice integration, reporting (authorized transactions within 24 hours) aur applicable fees required hain.
2. Flutter shell mein chosen billing SDK integration, purchase-state callbacks aur restore purchases add karein. Current same-origin WebView ko arbitrary redirects allow karke payment fix na karein.
3. Backend plan IDs ko store product/base-plan IDs se map karein; signed store/provider proof server par verify karke entitlement grant karein. Client success event alone trusted na ho.
4. Pending, purchased, cancelled, renewed, expired, refunded aur duplicate notifications ke state transitions/idempotency implement karein. Play transactions ke acknowledgement/reconciliation aur chosen program's reporting requirements implement karein.
5. Test account/license testers se buy, cancel, restore, expiry, refund aur duplicate-event tests run karein; app history/admin reports match hon.
6. Verified integration ke baad hi native paid checkout enable karein. Current Razorpay order logic web purchases ki foundation hai; this Play integration is still coding work.

## 15. Play Console — step by step

1. Owner Play Console account create/verify karein; required developer identity and account verification complete karein.
2. Create app → DMS NEWS → default language → App → correct distribution choice.
3. Package identity Section 1 wali AAB se match karein; first publication ke baad package change ko separate app treat karein.
4. Accurate short/full description likhein: sirf tested working features claim karein.
5. DMS icon, actual phone screenshots aur feature graphic prepare karein; Console ki current specifications follow karein.
6. Support email, website aur applicable contact details fill karein.
7. Public HTTPS privacy policy publish karein. Data collection, processors, retention, sharing aur deletion accurately describe karein. Current app policy text settings/Help mein dikhata hai; a separate stable public policy URL aur account-deletion page deployment/development mein publish karna baaki hai.
8. Account creation supported hone ke karan in-app deletion request aur public account-deletion web route/fulfilment implement karein. Current source mein complete deletion flow nahi; yeh release gate hai.
9. App access declaration mein reviewer ko working test account aur premium/OTP access instructions dein. Production admin credentials share na karein.
10. Ads declaration actual app ke according fill karein.
11. Data Safety form actual email/mobile/media/script/payment/provider behavior ke according fill karein; provider SDK data flows bhi include karein.
12. Content rating questionnaire complete karein.
13. Target audience select karein; children targeting ka unsupported claim na karein.
14. Store listing, category, countries aur pricing/distribution complete karein.
15. Play App Signing configure karein; owner upload key securely retain karein.
16. Internal testing release mein signed AAB upload karein. 23 September 2026 ko checked official policy ke mutabik new phone apps/updates target API 36 ya higher chahiye; release ke waqt Console requirement recheck karein. Current preparation target 36 set karta hai.
17. Automated pre-launch report, crashes, accessibility aur device compatibility findings resolve karein.
18. Applicable personal-account closed testing complete karein: relevant new accounts ke liye minimum 12 opted-in testers, 14 continuous days; production access questionnaire bhi required ho sakta hai.
19. Production access milne aur all gates pass hone ke baad release notes, rollout percentage aur production release configure karein.
20. Review submission bhejein; Google approval guaranteed nahi hai. Reviewer queries/policy issues resolve karein.
21. Approval ke baad crash/ANR, export failures, payment events, server load aur support monitor karein. Future updates same package/signing identity aur higher version code ke saath testing → production se publish karein.

DMS CONTROL ko privately distribute kar sakte hain. Agar Play par publish karna ho to uska separate app record/listing/access declaration chahiye.

Official references:
- App setup: https://support.google.com/googleplay/android-developer/answer/9859152?hl=en
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
- Testing: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en

## 16. Backup and restore

PostgreSQL aur media dono ka matching backup chahiye. Maintenance ON karein, active renders finish hone dein, phir API stop karke consistent copy banayein. Project root:

```sh
mkdir -p backups
docker compose stop api
docker compose exec -T db pg_dump -U dms -d dms -Fc > backups/dms.dump
docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup" api tar czf /backup/media.tgz -C /app/backend/data .
docker compose start api
```

Backups encrypt karke off-server store karein. Private `.env`, signing key aur DNS/hosting configuration ka separate secured backup rakhein. Restore pehle staging machine par verify karein. Clean staging database/volume mein:

```sh
docker compose stop api
docker compose exec -T db pg_restore -U dms -d dms --no-owner < backups/dms.dump
docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup:ro" api sh -c 'tar xzf /backup/media.tgz -C /app/backend/data && chown -R node:node /app/backend/data'
docker compose start api
```

Existing production database par overwrite/clean restore bina reviewed recovery plan ke mat chalayein. Restore ke baad user/project counts, private exports, media, admin login, entitlement aur payment reconciliation verify karein. Retention aur periodic restore drills owner operations plan ka part hon.

## 17. Abhi ka remaining development — developer handoff

Yeh list account setup se alag **code work** hai. Android compilation done hai; current source all original requirements ka completed production delivery nahi hai. Detailed 57-section matrix repository ke `docs/REQUIREMENT-STATUS.md` mein hai.

### A. Account deletion, recovery and admin access

1. Profile mein Delete account action aur public website par discoverable deletion-request page banayein. Recent password/verified OTP se ownership check, explicit confirmation aur request status dein.
2. Server par all sessions revoke; projects, uploads, generated voices, downloads, favourites aur personal records ke deletion jobs implement karein. Required retention exceptions owner ki published policy ke according document karein; applicable payment records ko intentionally handle karein.
3. Object files, DB records aur backup retention lifecycle cover karein. Kisi doosre user ka data delete na ho; retry safe/idempotent ho.
4. Authenticated deletion aur logged-out web request dono test karein. Deletion URL aur actual retention Data Safety/privacy fields mein match hon.
5. Separate password-reset/email verification tokens (hashed, single-use, expiring), server email provider aur rate limits implement karein. Admin recovery aur optional TOTP 2FA with backup codes add karein. Test leaked/expired/reused tokens, disabled account aur session invalidation.

### B. Full video/template editing

1. Existing `web/app.js` editor, `backend/media.mjs` composition aur project API ko extend karein; existing drafts ke liye versioned migration add karein. Internal scene schema backend concern rahe—user/admin ko JSON editing na dikhayein.
2. Text, photo, video, logo, ticker aur lower-third ko independent layers banayein: drag/resize/rotate/crop/align, duplicate/delete, layer order, fonts/colors aur undo/redo controls. Preview and exported positions identical hon.
3. Multi-track timeline: clip trim, reorder, audio fades, pauses, transitions, intro/outro, duration indicators. Server renderer sirf validated supported commands/assets execute kare.
4. Provider voice catalog se language/gender/style combinations choose karwayein; unsupported styles hide/disable karein. Current first matching voice logic ko explicit voice selection se improve karein.
5. Hindi/Urdu/regional font shaping, portrait/landscape crop aur audio/video sync fixtures add karein. 720p/1080p exports real phone par play karein. Quality/watermark/quota rules server enforce kare.
6. Admin template-image upload se aage reusable layer layouts aur preview/scheduling/versioning implement karein. Admin form + visual designer use kare; raw template source arbitrary execute na ho. Licensed assets owner se approve karwayein.

### C. Other requested modules

1. Coupons: eligibility/date/max uses/per-user rules; server amount calculation; concurrent redemption transaction tests. Current CRUD record ko working discount na label karein.
2. Recurring/refund billing: provider event mapping, reconciliation, cancellation, expiry reminders aur admin adjustments/audit. One-time validity already exists; auto-renewal nahi.
3. Push: owner Firebase project, token registration/rotation, consent, authenticated send API, expiry/template alerts and delivery retries. User instruction ke bina kisi real customer ko notification send na karein.
4. Admin: subscription extension/limit reset screens, payment/config status, plan access matrix, chart time series, search/user reports, lower-thirds/intros/outros catalogue.
5. Storage/scaling: private object storage and signed downloads, render job queue, retry/cancel/status, cross-instance quota locks, backup/restore drills. Current single-node local storage ko distributed architecture na assume karein.
6. Final UI: profile photo/history, full filters/custom poster size, theme/accessibility/device QA; feature inventory ko actual result ke according update karein.

Har module ke liye acceptance condition: user/admin UI se action complete ho, server mein durable result ho, unauthorized access reject ho aur saved/exported output actual phone par open ho. Pending features ko disabled/clear status mein rakhein; production listing mein implemented se zyada claim na karein.

## 18. Aapki taraf se next actionable handover

1. Hosting provider aur intended DMS domain choose/confirm karein. Credentials chat mein mat paste karein.
2. Sections 4–5 complete karke HTTPS URL, health success aur admin login ka non-secret confirmation record karein.
3. Sections 7–8 ke provider values server par set karein; owner ke test phone/account se real verification karein.
4. Developer ko Section 17 aur Play billing Section 14 ke remaining code tasks dein; each required feature ke acceptance results lein.
5. Upload key securely generate/configure karein; phone build → device tests → signed AAB → Play testing run karein.
6. Google Play owner ko policies, app access, data declarations, testers aur review submit karna hoga. Play approval, KYC/account activation aur real device actions yahan se complete nahi hue hain.

**Completed stage ko repeat karne ki zarurat nahi:** source upload, app separation, debug compilation aur seven core emulator checks ho chuke hain. Ab primary external dependency live backend access hai. Uske bina existing emulator APK ko public working app nahi kaha ja sakta.
