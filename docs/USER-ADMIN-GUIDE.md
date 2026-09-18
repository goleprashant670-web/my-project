# DMS user and admin guide

## DMS NEWS
Open the studio, register/login, choose a template, edit the headline/script, upload media, then save a draft. Use Timeline to trim and reorder uploaded clips and add narration, music, intro and outro. PNG/JPG and MP4 exports check server quotas. AI voice and mobile OTP require configured live providers. My Projects keeps unfinished work. Same design duplicates a draft. Refresh loads the latest template catalog and prices.

There is no Administration menu or JSON import/export/converter in the user interface. Server and source configuration still use internal structured data; users do not edit it.

## DMS CONTROL
Open the separate admin app or `/admin/` and log in using the account created with the deployment CLI. Ordinary subscribers cannot enter.

- Templates → Add template/Edit → enter name, category, format, default headline, color and tags; optionally upload a JPG/PNG background under 4 MB. Select premium/free and publication/expiry dates (UTC), then activate and Save.
- Plans → Edit → enter price in rupees, validity days, AI/export limits and resolution; select premium access and watermark. Activate and Save. Free remains free and active; a paid active plan requires at least ₹1.
- Festivals → enter one occasion per line → Save.
- Settings → contact details, categories, languages, policy text and maintenance switch → Save.
- Users → activate/disable accounts. Payments and Audit show server records.

Changes are stored in the shared backend. Open/Refresh DMS NEWS to load them. No new APK is required. Offline previews only demonstrate forms; they cannot update a live app, authenticate, process payments or generate server video.
