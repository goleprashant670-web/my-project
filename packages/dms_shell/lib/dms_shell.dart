import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const apiBase = String.fromEnvironment('API_BASE');
const distribution = String.fromEnvironment('DISTRIBUTION', defaultValue: 'play');
class DmsApp extends StatelessWidget {
  final bool admin;
  const DmsApp({super.key, this.admin = false});
  @override Widget build(BuildContext context) => MaterialApp(
    title: admin ? 'DMS CONTROL' : 'DMS NEWS', debugShowCheckedModeBanner: false,
    theme: ThemeData(colorSchemeSeed: const Color(0xffdf2349), useMaterial3: true),
    home: DmsShell(admin: admin),
  );
}
class DmsShell extends StatefulWidget {
  final bool admin;
  const DmsShell({super.key, required this.admin});
  @override State<DmsShell> createState() => _DmsShellState();
}
class _DmsShellState extends State<DmsShell> {
  WebViewController? controller;
  Uri? origin;
  int progress = 0;
  String? error;
  bool saving = false;
  @override void initState() { super.initState(); setup(); }
  bool trusted(Uri uri) => uri.hasAuthority && ['https','http'].contains(uri.scheme) && uri.origin == origin?.origin && (widget.admin || !uri.path.startsWith('/admin'));
  void message(String text) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text))); }
  Future<void> setup() async {
    try {
      final uri = Uri.parse(apiBase);
      if (!uri.hasAuthority || uri.userInfo.isNotEmpty || uri.hasQuery || uri.hasFragment || (uri.path.isNotEmpty && uri.path != '/') ||
          (uri.scheme != 'https' && !(kDebugMode && uri.scheme == 'http' && ['localhost','127.0.0.1','10.0.2.2'].contains(uri.host)))) {
        throw Exception('Build configuration requires API_BASE with your HTTPS backend origin.');
      }
      origin = uri;
      final web = WebViewController(); controller = web;
      await web.setJavaScriptMode(JavaScriptMode.unrestricted);
      await web.setOnJavaScriptConfirmDialog((request) async {
        if (!mounted || !trusted(Uri.parse(await web.currentUrl() ?? ''))) return false;
        return await showDialog<bool>(context: context, builder: (context) => AlertDialog(
          title: const Text('Please confirm'), content: Text(request.message), actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
          ])) ?? false;
      });
      await web.addJavaScriptChannel('DmsDownload', onMessageReceived: (event) async {
        if (saving) return;
        try {
          if (!trusted(Uri.parse(await web.currentUrl() ?? '')) || event.message.length > 90 * 1024 * 1024) throw Exception('Download rejected.');
          final data = jsonDecode(event.message) as Map<String, dynamic>;
          final name = data['name'] as String;
          if (!RegExp(r'^DMS-[a-zA-Z0-9_-]+\.(png|jpg|mp4)$').hasMatch(name)) throw Exception('Unsupported file.');
          final encoded = data['data'] as String;
          if (!RegExp(r'^data:(image/png|image/jpeg|video/mp4);base64,').hasMatch(encoded)) throw Exception('Unsupported download format.');
          final bytes = base64Decode(encoded.substring(encoded.indexOf(',') + 1));
          if (bytes.length > 64 * 1024 * 1024) throw Exception('Download exceeds 64 MB.');
          saving = true;
          final result = await FilePicker.saveFile(fileName: name, bytes: bytes, mimeType: encoded.substring(5, encoded.indexOf(';')));
          message(result == null ? 'Save cancelled.' : 'File saved.');
        } catch (e) { message(e.toString()); } finally { saving = false; }
      });
      if (web.platform is AndroidWebViewController) {
        final android = web.platform as AndroidWebViewController;
        await android.setOnShowFileSelector((params) async {
          try {
            if (!trusted(Uri.parse(await web.currentUrl() ?? ''))) return <String>[];
            final accepted = params.acceptTypes.join(',');
            final type = accepted.contains('image/') ? FileType.image : accepted.contains('video/') ? FileType.video : accepted.contains('audio/') ? FileType.audio : FileType.any;
            final selected = await FilePicker.pickFiles(type: type);
            if (selected.isEmpty) return <String>[];
            final file = selected.first;
            final size = await file.length();
            if (size == null || size > 64 * 1024 * 1024) { message('Select a file under 64 MB.'); return <String>[]; }
            return [file.uri.toString()];
          } catch (e) { message(e.toString()); return <String>[]; }
        });
      }
      await web.setNavigationDelegate(NavigationDelegate(
        onProgress: (value) { if(mounted) setState(() => progress = value); },
        onWebResourceError: (e) { if (e.isForMainFrame == true && mounted) setState(() => error = 'Connection failed. Please check your internet and retry.'); },
        onNavigationRequest: (request) {
          final target = Uri.tryParse(request.url);
          if(target != null && target.hasAuthority && trusted(target)) return NavigationDecision.navigate;
          return NavigationDecision.prevent;
        },
      ));
      await web.loadRequest(uri.replace(path: widget.admin ? '/admin/' : '/', queryParameters: {'native':'1','distribution':distribution}));
      if(mounted) setState(() {});
    } catch(e) { if(mounted) setState(() => error = e.toString()); }
  }
  @override Widget build(BuildContext context) => Scaffold(body: SafeArea(child:
    error != null ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text(error!, textAlign: TextAlign.center), const SizedBox(height: 16),
      FilledButton(onPressed: () { setState(() { error = null; progress = 0; }); if(controller != null) { controller!.reload(); } else { setup(); } }, child: const Text('Retry')),
    ]))) : controller == null ? const Center(child: CircularProgressIndicator()) : Column(children: [
      if(progress < 100) LinearProgressIndicator(value: progress / 100), Expanded(child: WebViewWidget(controller: controller!)),
    ]),
  ));
}
