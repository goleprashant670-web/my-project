# DMS NEWS + DMS CONTROL — deployment se Play Store tak

Updated: 18 September 2026. Yeh source build 0.3.0 ki guide hai. **APK/AAB abhi compile nahi hua; live deployment aur Play release complete nahi hain.** Neeche ke steps pending release work ko hide nahi karte. Code mein jo feature incomplete hai, sirf credentials bharne se complete nahi hoga.

## 1. Dono apps aur backend

- DMS NEWS: users ke liye, `flutter/`, package `com.dmsdigitalmediaservice.dmsnews`.
- DMS CONTROL: owner/admin ke liye, `admin_flutter/`, package `com.dmsdigitalmediaservice.dmscontrol`.
- Shared backend: Node 24 + PostgreSQL + FFmpeg; user interface `/`, admin `/admin/`.
- Flutter apps connected WebView clients hain. Editing/rendering web/backend mein hoti hai. Internet aur running backend required hain.
- Admin price/template forms normal controls hain. Internal APIs structured data use karte hain, lekin user ko JSON editor/converter nahi dikhaya jata.

## 2. Owner se required setup

Domain aur Linux server, GitHub repository, Razorpay merchant account, SMS provider, Azure Speech resource, script-AI adapter/provider, support email/number, approved policies, Play Console account aur private upload signing key chahiye. Secrets chat, APK, public repository ya screenshots mein mat rakhein. Unhe server environment aur GitHub Actions secrets mein configure karein.

Current GitHub repository inspection: `goleprashant670-web/my-project` public aur README-only thi; source upload/build run nahi kiya gaya. Proprietary source ke liye private repository use karein. Reference APK ko source repository mein upload na karein.

## 3. Pehle local backend test karein

Node.js 24, FFmpeg, Python 3 (media test fixtures ke liye Pillow) install karein. ZIP extract karke `dms-news` folder kholein:

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
4. Source ko private directory, jaise `/srv/dms-news`, mein rakhein. Production use se pehle container setup ko staging mein verify karein.
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
8. Live keys/webhook switch karke owner-authorized small real payment aur reconciliation test karein.

Yeh one-time paid validity model hai; recurring subscriptions, automated refunds, coupon redemption aur refund reconciliation unfinished hain. Native bank/UPI handoffs bhi complete/device-tested nahi hain. Current native Play build checkout block karta hai.

Official integration reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## 8. SMS OTP aur AI voice

Twilio Verify service create karein. Server-only `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` set karein. India delivery ke liye provider ke applicable sender/registration requirements complete karein. Real +91 number par receive, resend cooldown, incorrect/expired OTP, login aur disabled account test karein. Trial account restrictions provider dashboard mein check karein.

Azure Speech resource create karke `AZURE_SPEECH_ENDPOINT` (HTTPS resource endpoint ending in `.cognitiveservices.azure.com`) aur `AZURE_SPEECH_KEY` set karein. Backend catalog se locale/gender voice select karta hai. Har language mein har style available nahi hota; unsupported style par explicit error aata hai. Professional style se initial verification karein. Hindi/English aur required regional languages ka pronunciation, audio preview, quota aur exported video sync real device par test karein.

Script assistant ke liye `AI_ADAPTER_URL` + `AI_ADAPTER_TOKEN` configure karein; service ko `docs/API.md` ka `/script` contract implement karna hoga. Yeh adapter is source mein hosted service ke roop mein provided nahi hai. Generated news ko editorial review ke baad publish karein.

Provider references: https://www.twilio.com/docs/verify/api and https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech

## 9. Android build machine

Flutter stable, Android Studio/SDK, Android platform 36, platform tools, compatible build tools aur JDK install karein. Official Flutter setup: https://docs.flutter.dev/install

```sh
flutter doctor -v
flutter doctor --android-licenses
python3 scripts/prepare_android.py
```

Windows par `python3` ki jagah `py` use kar sakte hain. Android license prompts khud review/accept karein. Preparation dono Android projects generate karta hai, app IDs/labels/logo apply karta hai, min SDK 24 aur target 36 set karta hai, aur release signing environment configure karta hai. Script Flutter absent hone par explicit failure deta hai.

Dono targets mein `flutter analyze` run karein. Shared package `packages/dms_shell` mein bhi analysis karein. Compiler/analyzer errors ko resolve kiye bina APK ready na maanein.

## 10. Debug APK

Backend HTTPS origin ko real value se replace karein:

```sh
cd flutter
flutter build apk --debug --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
cd ../admin_flutter
flutter build apk --debug --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
```

Outputs respectively `flutter/build/app/outputs/flutter-apk/app-debug.apk` aur `admin_flutter/build/app/outputs/flutter-apk/app-debug.apk` honge. Connected Android phone par each APK install karein. Emulator local testing ke liye debug build mein `http://10.0.2.2:8080` allowed hai; real phone ke liye deployed HTTPS backend use karein.

## 11. Signed release APK aur AAB

Package name permanent identity hai; first Play release se pehle finalize karein. Current names Section 1 mein hain. Dono `pubspec.yaml` mein `version: 0.3.0+3`: left version name, right version code. Har update mein version code increase karein.

Owner-controlled upload key banayein aur encrypted backup rakhein:

```sh
keytool -genkeypair -v -keystore /PRIVATE_PATH/dms-upload.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias dms-upload
```

Build environment mein `DMS_KEYSTORE` (absolute path), `DMS_STORE_PASSWORD`, `DMS_KEY_ALIAS`, `DMS_KEY_PASSWORD` securely set karein. Values ko source/logs mein na likhein. Script missing signing values par release block karta hai.

Har app directory se:

```sh
flutter build apk --release --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
flutter build appbundle --release --dart-define=API_BASE=https://YOUR_DOMAIN --dart-define=DISTRIBUTION=play
```

Signed APK: `build/app/outputs/flutter-apk/app-release.apk`. AAB: `build/app/outputs/bundle/release/app-release.aab`. AAB phone par direct install nahi hota; Play testing track se test karein. Signing verification ke liye Android build-tools `apksigner verify --verbose APK_PATH` use karein. Flutter reference: https://docs.flutter.dev/deployment/android

## 12. GitHub Actions build

Private repository mein source root upload karein; `.github/workflows/android-build.yml` repository root mein hona chahiye. `.env`, data, reference APK aur keystore commit na karein. Source upload authorization aur repository visibility resolve hone tak public repository mein proprietary source push na karein.

Actions → Build DMS Android apps → Run workflow → `api_origin` mein live HTTPS backend → `signed_release=false` se debug build. Workflow backend health, analysis, tests aur both APK builds chalata hai. Green run ke baad DMS-Android artifact download karein. Build logs mein errors fix karke rerun karein.

Release ke liye Repository Settings → Secrets and variables → Actions mein `DMS_KEYSTORE_BASE64`, `DMS_STORE_PASSWORD`, `DMS_KEY_ALIAS`, `DMS_KEY_PASSWORD` add karein. First secret private keystore ka base64 hai. Phir `signed_release=true` se run karein. Artifact mein both signed APK/AAB milne chahiye. Workflow source provided hai; abhi run successfully nahi hua.

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

Current automated frontend test browser rendering test nahi hai. Android upload/download and native navigation paths abhi device-tested nahi hain.

## 14. Play billing decision — production gate

Digital subscription ke liye sirf Razorpay WebView add karna Play compliance complete nahi karta. India alternative-billing program ke required enrollment, Google Play choice/API integration, transaction reporting aur applicable fees review/implement karein, ya Play Billing implement karein. Current code mein yeh integration incomplete hai, isliye native Play checkout disabled hai. Is gate ko complete kiye bina paid production launch na karein.

Official policy: https://support.google.com/googleplay/android-developer/answer/13306652?hl=en

## 15. Play Console — step by step

1. Owner Play Console account create/verify karein; required developer identity and account verification complete karein.
2. Create app → DMS NEWS → default language → App → correct distribution choice.
3. Package identity Section 1 wali AAB se match karein; first publication ke baad package change ko separate app treat karein.
4. Accurate short/full description likhein: sirf tested working features claim karein.
5. DMS icon, actual phone screenshots aur feature graphic prepare karein; Console ki current specifications follow karein.
6. Support email, website aur applicable contact details fill karein.
7. Public HTTPS privacy policy publish karein. Data collection, processors, retention, sharing aur deletion accurately describe karein.
8. Account creation supported hone ke karan in-app deletion request aur public account-deletion web route/fulfilment implement karein. Current source mein complete deletion flow nahi; yeh release gate hai.
9. App access declaration mein reviewer ko working test account aur premium/OTP access instructions dein. Production admin credentials share na karein.
10. Ads declaration actual app ke according fill karein.
11. Data Safety form actual email/mobile/media/script/payment/provider behavior ke according fill karein; provider SDK data flows bhi include karein.
12. Content rating questionnaire complete karein.
13. Target audience select karein; children targeting ka unsupported claim na karein.
14. Store listing, category, countries aur pricing/distribution complete karein.
15. Play App Signing configure karein; owner upload key securely retain karein.
16. Internal testing release mein signed AAB upload karein. September 2026 new phone-app submissions ke liye target API 36 required hai; release ke waqt Console requirement recheck karein.
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

## 17. Abhi ka remaining work

Successful Android compilation and real-device/browser QA; live domain/PostgreSQL/SSL deployment; live provider verification; native payment handoffs and Play billing integration; recovery/email verification/2FA; account deletion fulfilment; full multi-layer editing, transitions/subtitles; coupon redemption, push, refund/recurring reconciliation; scalable storage/queues. Current source all original requirements ka completed production delivery nahi hai.
