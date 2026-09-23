#!/usr/bin/env python3
"""Generate Android platform projects and apply explicit branding and signing."""
import os, re, shutil, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
if not shutil.which('flutter'):
    raise SystemExit('Flutter SDK is missing. Install Flutter and Android SDK; see docs/DEPLOYMENT-HINGLISH.md.')
for directory, name, appid, label in [
    ('flutter','dms_news','com.dmsdigitalmediaservice.dmsnews','DMS NEWS'),
    ('admin_flutter','dms_control','com.dmsdigitalmediaservice.dmscontrol','DMS CONTROL'),
]:
    p=root/directory
    if not (p/'android').exists():
        subprocess.run(['flutter','create','--no-pub','--platforms=android','--project-name',name,'--org','com.dmsdigitalmediaservice','.'],cwd=p,check=True)
        sample=p/'test/widget_test.dart'
        if sample.exists(): sample.unlink()
    manifest=p/'android/app/src/main/AndroidManifest.xml'
    text=manifest.read_text()
    if 'android.permission.INTERNET' not in text:
        text=text.replace('<application','<uses-permission android:name="android.permission.INTERNET"/>\n    <application',1)
    text=re.sub(r'android:label="[^"]*"',f'android:label="{label}"',text)
    text=re.sub(r'android:icon="[^"]*"','android:icon="@drawable/dms_logo"',text)
    if 'android:usesCleartextTraffic' not in text: text=text.replace('<application','<application android:usesCleartextTraffic="false" android:allowBackup="false"',1)
    manifest.write_text(text)
    debug=p/'android/app/src/debug/AndroidManifest.xml'
    debug.parent.mkdir(parents=True,exist_ok=True)
    debug.write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"><application android:usesCleartextTraffic="true" tools:replace="android:usesCleartextTraffic"/></manifest>')
    drawable=p/'android/app/src/main/res/drawable';drawable.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(root/'assets/logo.jpeg',drawable/'dms_logo.jpeg')
    gradle=p/'android/app/build.gradle.kts'
    text=gradle.read_text()
    text=re.sub(r'namespace = "[^"]+"',f'namespace = "{appid}"',text)
    text=re.sub(r'applicationId = "[^"]+"',f'applicationId = "{appid}"',text)
    text=re.sub(r'minSdk = [^\n]+','minSdk = 24',text)
    text=re.sub(r'targetSdk = [^\n]+','targetSdk = 36',text)
    text=re.sub(r'compileSdk = [^\n]+','compileSdk = maxOf(flutter.compileSdkVersion, 36)',text)
    if 'DMS_KEYSTORE' not in text:
        text=text.replace('    buildTypes {','''    signingConfigs {
        create("dmsRelease") {
            val store = System.getenv("DMS_KEYSTORE")
            if (!store.isNullOrBlank()) {
                storeFile = file(store)
                storePassword = System.getenv("DMS_STORE_PASSWORD")
                keyAlias = System.getenv("DMS_KEY_ALIAS")
                keyPassword = System.getenv("DMS_KEY_PASSWORD")
            }
        }
    }
    buildTypes {''')
        text=text.replace('signingConfig = signingConfigs.getByName("debug")','signingConfig = signingConfigs.getByName("dmsRelease")')
        text+='''
gradle.taskGraph.whenReady {
    if (allTasks.any { it.name.contains("Release", ignoreCase = true) }) {
        listOf("DMS_KEYSTORE", "DMS_STORE_PASSWORD", "DMS_KEY_ALIAS", "DMS_KEY_PASSWORD").forEach {
            require(!System.getenv(it).isNullOrBlank()) { "Missing release signing variable: $it" }
        }
    }
}
'''
    gradle.write_text(text)
    for activity in (p/'android/app/src/main/kotlin').rglob('MainActivity.kt'):
        activity.write_text(re.sub(r'package [^\n]+',f'package {appid}',activity.read_text()))
    subprocess.run(['flutter','pub','get'],cwd=p,check=True)
print('Both Android targets prepared. Run analyze and the debug build before signing a release.')
