from pathlib import Path
import base64, zipfile, re, subprocess
root=Path(__file__).resolve().parents[1]; out=root.parent
logo='data:image/jpeg;base64,'+base64.b64encode((root/'assets/logo.jpeg').read_bytes()).decode()
def build_preview(admin=False):
 folder=root/('admin' if admin else 'web')
 html=(folder/'index.html').read_text()
 html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
 styles=(root/'web/style.css').read_text()+((root/'admin/admin.css').read_text() if admin else '')
 html=html.replace('</head>','<style>'+styles+'</style></head>')
 html=re.sub(r'<script src="[^"]+"></script>','',html)
 scripts='window.DMS_OFFLINE=true;window.DMS_LOGO='+repr(logo)+';\n'+(root/'web/seed.js').read_text()+'\n'+(folder/('admin.js' if admin else 'app.js')).read_text()
 html=html.replace('</body>','<script>'+scripts.replace('</script','<\\/script')+'</script></body>')
 name='DMS-CONTROL-Preview.html' if admin else 'DMS-NEWS-Preview.html'
 (root/name).write_text(html);(out/name).write_text(html)
for admin in [False,True]:build_preview(admin)
style='''<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:auto;padding:32px;color:#17243a;line-height:1.7}h1,h2{line-height:1.25}h1{border-bottom:5px solid #e82d4f;padding-bottom:24px}h2{margin-top:42px}pre{background:#101a2e;color:#eef4ff;padding:20px;overflow:auto;border-radius:12px}code{font-size:.88em}a{color:#1751c5}table{border-collapse:collapse}td,th{border:1px solid #ccd5e2;padding:10px}#TOC{background:#eef3fa;padding:20px;border-radius:12px}@media(max-width:600px){body{padding:18px}}@media print{pre{white-space:pre-wrap}h2{break-after:avoid}}</style>'''
css=out/'guide-style.html';css.write_text(style)
subprocess.run(['pandoc',str(root/'docs/DEPLOYMENT-HINGLISH.md'),'-s','--toc','--metadata','title=DMS NEWS — Deployment Guide','-H',str(css),'-o',str(out/'DMS-NEWS-Deployment-Guide.html')],check=True)
css.unlink()
with zipfile.ZipFile(out/'DMS-NEWS-Development-Source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if any(x in {'.git','node_modules','data','build','.dart_tool','__pycache__','.venv'} for x in rel.parts):continue
  if p.name=='.env' or p.suffix in {'.jks','.keystore','.apk','.aab'} or p.name=='key.properties':continue
  z.write(p,'dms-news/'+str(rel))
print('Prepared user/admin previews, deployment guide, and updated source ZIP.')
