# DMS NEWS Android target

Connected Flutter WebView client for the current web studio. It replaces the earlier limited native editor prototype. Debug compilation and analysis passed in GitHub Actions; see `../docs/VERIFICATION.md` for exact emulator evidence and untested physical-device paths. See `../docs/DEPLOYMENT-HINGLISH.md`. Prepare both platform projects with `python3 scripts/prepare_android.py` from the repository root. Build with an HTTPS `API_BASE`. No admin route is exposed in this client.
