const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = Number.parseInt(process.env.TUNNEL_MANAGER_PORT || '3002', 10);
const TARGET_URL = process.env.TUNNEL_TARGET_URL || 'http://client:80';
const STARTUP_TIMEOUT_MS = Number.parseInt(process.env.TUNNEL_STARTUP_TIMEOUT_MS || '45000', 10);
const RESTART_DELAY_MS = Number.parseInt(process.env.TUNNEL_RESTART_DELAY_MS || '3000', 10);

let child = null;
let childGeneration = 0;
let currentUrl = '';
let startupWaiters = [];
let refreshPromise = null;
let stopping = false;

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function publishUrl(url) {
  currentUrl = url.replace(/\/+$/, '');
  console.log(`Tunnel URL ready: ${currentUrl}`);
  for (const waiter of startupWaiters) waiter.resolve(currentUrl);
  startupWaiters = [];
}

function rejectStartupWaiters(error) {
  for (const waiter of startupWaiters) waiter.reject(error);
  startupWaiters = [];
}

function parseTunnelUrl(chunk, processGeneration) {
  if (processGeneration !== childGeneration) return;
  const text = chunk.toString();
  process.stdout.write(text);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match) publishUrl(match[0]);
}

function startTunnel() {
  if (child || stopping) return;
  childGeneration += 1;
  const processGeneration = childGeneration;
  console.log(`Starting cloudflared tunnel for ${TARGET_URL}`);
  const tunnelProcess = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', TARGET_URL], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child = tunnelProcess;
  tunnelProcess.stdout.on('data', (chunk) => parseTunnelUrl(chunk, processGeneration));
  tunnelProcess.stderr.on('data', (chunk) => parseTunnelUrl(chunk, processGeneration));
  tunnelProcess.on('error', (error) => {
    if (processGeneration !== childGeneration) return;
    console.error(`cloudflared failed to start: ${error.message}`);
    rejectStartupWaiters(error);
  });
  tunnelProcess.on('exit', (code, signal) => {
    if (processGeneration !== childGeneration) return;
    console.error(`cloudflared exited: code=${code ?? 'null'} signal=${signal ?? 'null'}`);
    child = null;
    currentUrl = '';
    if (!stopping) setTimeout(startTunnel, RESTART_DELAY_MS);
  });
}

function stopTunnel() {
  if (!child) return;
  const stoppingChild = child;
  childGeneration += 1;
  stoppingChild.kill('SIGTERM');
  setTimeout(() => {
    if (child === stoppingChild) stoppingChild.kill('SIGKILL');
  }, 5000).unref();
}

function waitForStoppedTunnel(previousChild, timeoutMs = 5000) {
  if (!previousChild) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child === previousChild) {
        previousChild.kill('SIGKILL');
        child = null;
      }
      resolve();
    }, timeoutMs);
    timer.unref();
    previousChild.once('exit', () => {
      clearTimeout(timer);
      if (child === previousChild) child = null;
      resolve();
    });
  });
}

function waitForUrl(timeoutMs = STARTUP_TIMEOUT_MS) {
  if (currentUrl) return Promise.resolve(currentUrl);
  startTunnel();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      startupWaiters = startupWaiters.filter((waiter) => waiter.resolve !== resolve);
      reject(new Error('Timed out waiting for cloudflared public URL'));
    }, timeoutMs);
    timer.unref();
    startupWaiters.push({
      resolve: (url) => {
        clearTimeout(timer);
        resolve(url);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
  });
}

async function refreshTunnel() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    currentUrl = '';
    const previousChild = child;
    stopTunnel();
    await waitForStoppedTunnel(previousChild);
    startTunnel();
    return waitForUrl();
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, currentUrl ? 200 : 503, {
        ok: Boolean(currentUrl),
        running: Boolean(child),
        publicBaseUrl: currentUrl || null,
        targetUrl: TARGET_URL,
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/url') {
      sendJson(res, 200, { publicBaseUrl: await waitForUrl() });
      return;
    }
    if (req.method === 'POST' && req.url === '/refresh') {
      sendJson(res, 200, { publicBaseUrl: await refreshTunnel() });
      return;
    }
    sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    sendJson(res, 503, { error: error instanceof Error ? error.message : String(error) });
  }
});

function shutdown() {
  stopping = true;
  stopTunnel();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tunnel manager listening on :${PORT}`);
  startTunnel();
});
