// Runs against the installed DEBUG APKs on an isolated Android emulator.
// DOM-driven WebView checks; native gestures, picker/save and accessibility need separate tests.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = 'http://10.0.2.2:8080';
const evidence = process.env.DMS_EVIDENCE_DIR || 'evidence';
const adminPassword = process.env.DMS_TEST_ADMIN_PASSWORD;
assert(adminPassword?.length >= 12, 'An ephemeral test admin password is required.');
mkdirSync(evidence, { recursive: true });
const checks = [];
const sockets = new Set();
const adb = (...args) => execFileSync('adb', args, { timeout: 30000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function passed(name) { checks.push({ name, passed: true }); console.log('PASS: ' + name); }
function screenshot(name) {
  writeFileSync(`${evidence}/${name}.png`, execFileSync('adb', ['exec-out', 'screencap', '-p'], { timeout: 15000 }));
}
async function capture(ui, name, selector) {
  // The DOM can update before Flutter's native compositor presents that frame.
  // Wait for the splash and then capture the requested, scrolled-to screen.
  await ui.wait(`(() => {
    const splash = document.querySelector('#splash');
    if (!splash) return true;
    const style = getComputedStyle(splash);
    return style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.01;
  })()`, 'Splash did not finish');
  if (selector) await ui.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start'})`);
  await ui.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  await delay(1500);
  screenshot(name);
}
async function connect(app, port) {
  const pkg = `com.dmsdigitalmediaservice.${app}`;
  adb('shell', 'am', 'start', '-W', '-n', `${pkg}/.MainActivity`);
  const pid = adb('shell', 'pidof', pkg).split(/\s+/)[0];
  assert(/^\d+$/.test(pid), `${app} is not running`);
  adb('forward', `tcp:${port}`, `localabstract:webview_devtools_remote_${pid}`);
  let target;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
      const targets = await response.json();
      target = targets.find(t => t.type === 'page' && t.url.startsWith(origin + '/') &&
        (app === 'dmscontrol' ? new URL(t.url).pathname === '/admin/' : new URL(t.url).pathname === '/'));
      if (target?.webSocketDebuggerUrl) break;
    } catch {}
    await delay(500);
  }
  assert(target?.webSocketDebuggerUrl, `${app}: debug WebView target unavailable`);
  const url = new URL(target.webSocketDebuggerUrl);
  // Always keep the debugging channel on the local ADB-forwarded port.
  url.host = `127.0.0.1:${port}`;
  const socket = new WebSocket(url);
  sockets.add(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebView connection timeout')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebView connection failed')); }, { once: true });
  });
  let next = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const task = pending.get(message.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, 'WebView JavaScript evaluation failed');
    return result.result.value;
  };
  const wait = async (expression, label) => {
    const until = Date.now() + 25000;
    while (Date.now() < until) {
      if (await evaluate(expression)) return;
      await delay(300);
    }
    throw new Error(label);
  };
  const click = selector => evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element || element.disabled) throw new Error('Control missing or disabled');
    element.scrollIntoView({block:'center'}); element.click(); return true;
  })()`);
  const fill = (selector, value) => evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Field missing');
    element.value = ${JSON.stringify(value)};
    element.dispatchEvent(new Event('input', {bubbles:true}));
    element.dispatchEvent(new Event('change', {bubbles:true})); return true;
  })()`);
  await wait('document.readyState === "complete" && !!document.querySelector("#app")?.children.length', `${app}: UI not ready`);
  return { evaluate, wait, click, fill, send, close: () => { socket.close(); sockets.delete(socket); } };
}

try {
  let ui = await connect('dmsnews', 9222);
  await ui.wait('document.body.innerText.includes("Let’s make headlines.")', 'DMS NEWS dashboard not rendered');
  assert.equal(await ui.evaluate('!!document.querySelector(".nav [onclick*=admin]")'), false);
  passed('DMS NEWS dashboard loaded; no administrator navigation');
  await ui.click('header button[onclick="login()"]');
  await ui.wait('!!document.querySelector("#dialog[open]")', 'Login dialog did not open');
  await ui.click('#dialog button[onclick="login(true)"]');
  await ui.fill('#login-name', 'Android test user');
  await ui.fill('#login-email', `android-${randomBytes(6).toString('hex')}@example.invalid`);
  await ui.fill('#login-password', randomBytes(24).toString('hex'));
  await ui.click('#dialog form button.primary');
  await ui.wait('!document.querySelector("#dialog[open]") && document.querySelector(".topbar .badge")?.textContent === "CONNECTED"', 'Registration/session failed');
  passed('Email registration through the Android WebView form establishes a session');
  await ui.click('.section-head button.primary');
  await ui.wait('!!document.querySelector("#f-headline")', 'Editor did not open');
  await ui.fill('#f-name', 'Android verified draft');
  await ui.fill('#f-headline', 'DMS emulator verification');
  assert.deepEqual(await ui.evaluate('({width:document.querySelector("#canvas").width,height:document.querySelector("#canvas").height})'), { width:1280, height:720 });
  await ui.click('.section-head button.primary');
  await ui.wait('document.querySelector("#toast")?.textContent.includes("Draft saved")', 'Draft save failed');
  await ui.click('.nav button[onclick="go(\'projects\')"]');
  await ui.wait('document.querySelector("#main")?.innerText.includes("Android verified draft")', 'Saved project not listed');
  await ui.send('Page.reload');
  await ui.wait('document.querySelector(".topbar .badge")?.textContent === "CONNECTED"', 'Session did not survive reload');
  await ui.click('.nav button[onclick="go(\'projects\')"]');
  await ui.wait('document.querySelector("#main")?.innerText.includes("Android verified draft")', 'Server draft did not survive reload');
  await ui.click('#main .panel button.primary');
  await ui.wait('document.querySelector("#f-headline")?.value === "DMS emulator verification"', 'Saved headline did not reopen');
  await capture(ui, 'dmsnews-editor', '.editor-preview');
  passed('Editor canvas, save draft, session persistence and server project reopen');
  ui.close();

  ui = await connect('dmscontrol', 9223);
  await ui.wait('document.body.innerText.includes("Secure administration")', 'Separate admin login screen missing');
  await ui.click('.admin-header button[onclick="login()"]');
  await ui.fill('#a-email', 'android-ci@example.invalid');
  await ui.fill('#a-password', adminPassword);
  await ui.click('#dialog form button.primary');
  await ui.wait('!!document.querySelector("nav.tabs") && !document.querySelector("#dialog[open]")', 'Admin form login failed');
  passed('Separate DMS CONTROL admin authentication and dashboard');
  await ui.click('nav button[onclick="go(\'plans\')"]');
  await ui.wait('!!document.querySelector("button[data-id=monthly]")', 'Plan list missing');
  await ui.click('button[data-id="monthly"]');
  await ui.fill('#a-price', '149.50');
  await ui.evaluate('document.querySelector("#dialog input[name=active]").checked = true');
  assert.equal(await ui.evaluate('document.querySelector("#dialog")?.innerText.includes("Price (₹)")'), true);
  assert.equal(await ui.evaluate('/json|converter/i.test(document.querySelector("#dialog").innerText)'), false);
  await capture(ui, 'dmscontrol-price-form', '#a-price');
  await ui.click('#dialog form button.primary');
  await ui.wait('!document.querySelector("#dialog[open]") && document.querySelector("#content")?.innerText.includes("149.5")', 'Rupee price save failed');
  passed('Normal admin rupee-price form saves without a JSON editor');
  await ui.click('nav button[onclick="go(\'templates\')"]');
  await ui.wait('!!document.querySelector("button[data-id=news-0]")', 'Template list missing');
  await ui.click('button[data-id="news-0"]');
  await ui.fill('#a-name', 'Android verified template');
  await ui.fill('#a-headline', 'Published from DMS CONTROL');
  await ui.evaluate('document.querySelector("#dialog input[name=active]").checked = true; document.querySelector("#dialog input[name=premium]").checked = false');
  assert.equal(await ui.evaluate('/json|converter/i.test(document.querySelector("#dialog").innerText)'), false);
  await capture(ui, 'dmscontrol-template-form', '#a-name');
  await ui.click('#dialog form button.primary');
  await ui.wait('!document.querySelector("#dialog[open]") && document.querySelector("#content")?.innerText.includes("Android verified template")', 'Template publish failed');
  passed('Normal admin template form publishes an edited design');
  ui.close();

  ui = await connect('dmsnews', 9222);
  await ui.click('header button[onclick="refreshCatalog()"]');
  await ui.wait('document.querySelector("#toast")?.textContent.includes("Latest templates and prices loaded")', 'Catalog refresh failed');
  await ui.click('.nav button[onclick="go(\'subscription\')"]');
  await ui.wait('document.querySelector(".plans")?.innerText.includes("₹149.5")', 'Admin price did not reach user app');
  await ui.evaluate('document.querySelector(".plan button[data-id=monthly]").closest(".plan").scrollIntoView({block:"start"})');
  await capture(ui, 'dmsnews-updated-price');
  await ui.click('.nav button[onclick="go(\'templates\')"]');
  await ui.wait('document.querySelector("#cards")?.innerText.includes("Android verified template")', 'Admin template did not reach user app');
  await ui.evaluate('document.querySelector("#cards button.primary[data-template=news-0]").closest(".template").scrollIntoView({block:"start"})');
  await capture(ui, 'dmsnews-updated-template');
  await ui.click('#cards button.primary[data-template="news-0"]');
  await ui.wait('document.querySelector("#f-headline")?.value === "Published from DMS CONTROL"', 'Published template did not apply to editor');
  passed('Admin price and template update reach DMS NEWS without a new APK');
  ui.close();
  writeFileSync(`${evidence}/webview-checks.json`, JSON.stringify({ passed:true, mode:'Android API 35 debug WebView DOM', checks }, null, 2));
} catch (error) {
  writeFileSync(`${evidence}/webview-checks.json`, JSON.stringify({ passed:false, checks, failure:error.message }, null, 2));
  try { screenshot('webview-failure'); } catch {}
  throw error;
} finally {
  for (const socket of sockets) socket.close();
  try { adb('forward', '--remove', 'tcp:9222'); } catch {}
  try { adb('forward', '--remove', 'tcp:9223'); } catch {}
}
