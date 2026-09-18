# Requirement backlog — DMS NEWS

**Update 0.3.0 (18 September 2026):** The historical matrix below is a backlog, not a completion certificate. Admin is now separate, JSON editing/import/export controls removed, form-based template/plan/festival/settings management implemented, and separate Flutter connected targets supplied but uncompiled. Timeline media composition and mock-tested OTP/Azure adapters exist. No APK/AAB, live provider verification or Play release exists. See README and VERIFICATION for current tested scope. Older matrix entries describing missing separation/forms/timeline are superseded by this update.

The supplied specification has 57 numbered sections. Its final “Cloud Project Syn…” line is truncated. No unseen section 58 or completed cloud-sync feature has been invented. This matrix describes actual code and verification, not a claim of complete production delivery.

| No. | Requirement | Status | Delivered / remaining |
|---:|---|---|---|
| 1 | Project overview | Partial | Working web studio/API plus uncompiled Flutter client; full production platform incomplete. |
| 2 | Branding | Implemented in preview/source | Supplied DMS logo and original DMS layouts. Third-party reference clips excluded from published catalog. |
| 3 | 3D DMS logo | Partial | Lightweight perspective rotation; Flutter uses supplied logo. Not a geometric 3D model or metallic conversion. |
| 4 | Splash screen | Implemented in source | Automatic splash transition; native runtime untested. |
| 5 | Login and registration | Partial | Email/password, logout and password change; mock-tested Twilio OTP. Live OTP, recovery, email verification and profile image pending. |
| 6 | Main dashboard | Partial | Main studio routes and shortcuts implemented; some advanced modules pending. |
| 7 | Create news | Partial | Headline/script/reporter/location/channel/logo/images plus video timeline; date/category editing incomplete. |
| 8 | AI script to voice | Integration, mock-tested | Azure Speech adapter, voice controls and preview; live credentials and per-language/style validation pending. |
| 9 | Multilanguage AI news | Partial | 12 selectable language labels and configurable list; actual voice availability requires provider validation. |
| 10 | AI script assistant | Integration contract | Editable text adapter/UI; no live generation without a provider. |
| 11 | News template library | Implemented basic catalog | 21 original category layouts, access flags, search, favourites, preview and use action. |
| 12 | Template formats | Partial | 16:9, 9:16, 1:1 and 4:5. Arbitrary custom dimensions pending. |
| 13 | Festival templates | Implemented basic catalog | 33 original typography layouts; dynamic metadata. Not a fully art-directed festival asset collection. |
| 14 | Template editor | Partial | Text/image/logo/color, headline drag/rotation/size and center-fill image crop. Full layers, arbitrary resize/align/crop tools pending. |
| 15 | News video creator | Implemented basic composition | FFmpeg clip trim/reorder, narration/music mixing and frame/ticker composition. Advanced NLE tools pending. |
| 16 | News ticker | Partial | Bottom scrolling ticker and speed in server video; top ticker and full styling controls pending. |
| 17 | Lower third | Partial | Basic reporter/location band; guest/designation/custom lower-third import pending. |
| 18 | Intro and outro | Partial | User-uploaded intro/outro concatenation supported. Curated licensed library pending. |
| 19 | Save project | Implemented web/API | Save, reopen, duplicate and delete drafts. JSON import/export removed as requested. |
| 20 | Export and download | Partial | Actual PNG/JPG/MP4 with audiovisual timeline and server 720p/1080p rules. Native save source uncompiled; 2K/4K pending. |
| 21 | Watermark | Implemented basic server rule | Plan-controlled rendered watermark on connected exports; offline exports watermarked. |
| 22 | Subscriptions | Partial | Dynamic plans, duration, limits and access checks; prices unset, plans disabled, recurring billing pending. |
| 23 | Razorpay | Source integration, untested live | Server orders, HMAC verification, captured-payment checks and webhook settlement. Credentials absent. |
| 24 | Payment history | Implemented API/web | Own payment list, admin API report; no real transactions yet. |
| 25 | Admin panel | Implemented subset | Separate DMS CONTROL web UI and Flutter target, shared backend, distinct admin cookie and role protection. |
| 26 | Admin dashboard | Partial | User/subscription/revenue/download cards and catalog counts; chart/time-series suite pending. |
| 27 | Admin template management | Implemented core forms | Normal fields, JPG/PNG background, category/format/free-premium/scheduling/activate/delete; arbitrary template package support pending. |
| 28 | Admin festival management | Implemented core forms | Dedicated festival list form plus festival template/image editing; advanced campaign workflow pending. |
| 29 | Admin user management | Partial | List/activate/disable in UI, manual subscription API; search, reset selected usage and detailed user report pending. |
| 30 | Admin subscription management | Implemented basic metadata | Create/update multiple plans without rebuilding app; no per-template plan matrix. |
| 31 | Admin payment settings | Partial | Secrets in server environment and price editing; gateway-status UI and offers pending. |
| 32 | Coupons | Partial data API only | CRUD storage; eligibility, discount calculation and redemption limits are not implemented. |
| 33 | Notifications | Partial data API only | Records can be stored; push transport, reminders and automated alerts pending. |
| 34 | Search and filter | Partial | Template/festival name, category and access filters; popularity/date/orientation/project search pending. |
| 35 | Favourites | Implemented web/API | Per-user connected favourites and local offline favourites. |
| 36 | Same design / order | Implemented | Reuse layout/settings and duplicate project as a separate draft. |
| 37 | Help and support | Partial | Quick start, configured contact/policies and support request storage. No outbound support notification. |
| 38 | Security | Partial development baseline | Scrypt, hashed tokens, role/ownership checks, HMAC payments, quotas and rate limits. Production review, 2FA, recovery and cloud upload hardening pending. |
| 39 | User roles | Partial | User/admin only; other future role capabilities not implemented. |
| 40 | Themes | Implemented source | Light/dark interfaces; real browser/native visual QA not completed. |
| 41 | Technical architecture | Partial / documented deviation | Flutter client, Node backend, vanilla web admin, SQLite default and optional untested PostgreSQL. Cloud storage not provisioned. |
| 42 | Database modules | Partial compact schema | Dedicated identity/payment/usage tables and JSON records for core entities; not full normalized requested schema. |
| 43 | Reference APK | Limited static inspection | Manifest strings inspected. APK not executed; no navigation/UX claims or proprietary asset/source reuse. |
| 44 | Template import | Partial | JPG/PNG background design upload and dynamic metadata publishing; arbitrary template package import pending. |
| 45 | App settings from admin | Partial | Languages/categories/contact/policies/maintenance/plan values editable; global logo/name propagation and social links pending. |
| 46 | Maintenance mode | Implemented API | Ordinary authenticated APIs blocked, admin stays accessible; public preview remains visible. |
| 47 | Analytics | Partial | Basic aggregate counts/revenue; engagement, conversion and popularity trends pending. |
| 48 | Final user workflow | Partial | Select/edit/save/voice adapter/media composition/export source available; live providers and native QA incomplete. |
| 49 | Festival user flow | Implemented web subset | Select greeting, customize text/logo/image, preview and download PNG/JPG. |
| 50 | Admin template flow | Implemented basic flow | Separate admin normal form with design image upload and dynamic publication; full template format support pending. |
| 51 | Admin access | Partial | CLI bootstrap, no defaults, isolated admin session/logout and audit log. Native/admin password recovery and 2FA pending. |
| 52 | Deployment documentation | Provided | Local/cloud/backend/database/secrets/Razorpay guide; not a deployment or production certification. |
| 53 | APK / AAB build | Blocked | Flutter/Android SDK absent. Source and commands provided; no compiled APK/AAB. |
| 54 | Google Play guide | Provided | 21-step guide with current official source links; listing, billing compliance and submission not completed. |
| 55 | Source delivery | Partial | Source/schema/API/env/build/user/admin/backup docs supplied. APK/AAB and complete production feature set absent. |
| 56 | Dynamic platform principle | Implemented for core metadata | Catalog, festivals, plans and settings from backend without APK rebuild; custom renderer features still require code updates. |
| 57 | Future-ready features | Planned only | Listed future AI/avatar/anchor/transcription/teams/live/teleprompter capabilities are not implemented. |
