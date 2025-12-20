const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Core Playwright harness used by Dexchat and tool runners.
// Responsibilities:
// - Launch Chromium, apply storage state or cookie headers, and open the target URL.
// - Submit the prompt via the chat UI, watch transcripts until activity quiets down, and
//   collect console/event logs.
// - Persist JSON artifacts (and optional storage state) inside harness-results/.
// Limitations: assumes the Dexter chat DOM (input + bubble selectors) and closes the
// browser on failure—callers must catch surfaced errors.

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'harness-results');

function resolveOutputDir(rawDir) {
  const fallback = DEFAULT_OUTPUT_DIR;
  if (!rawDir || typeof rawDir !== 'string') {
    return fallback;
  }
  const trimmed = rawDir.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed === '~' || trimmed === '~/' || trimmed.startsWith('~/') || trimmed === '~\\' || trimmed.startsWith('~\\')) {
    console.warn('Ignoring unsafe output directory "~/" – using harness-results/ instead.');
    return fallback;
  }
  return path.resolve(trimmed);
}

async function runHarness({
  prompt,
  targetUrl = 'https://beta.dexter.cash/',
  waitMs = 45000,
  outputDir,
  headless = true,
  saveArtifact = true,
  extraEnv = {},
  storageState,
  storageStatePath,
  extraHTTPHeaders,
  cookies,
  onPageReady,
  beforeSend,
  followUpPrompts,
  followUpDelayMs = 3000,
  skipSyntheticGreeting = false,
} = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('runHarness requires a non-empty prompt.');
  }

  const artifactDir = resolveOutputDir(outputDir);

  const launchOptions = {
    headless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
    env: {
      ...process.env,
      ...extraEnv,
    },
  };

  // Allow overriding the browser channel (e.g. Chrome) to satisfy auth challenges
  // Set HARNESS_BROWSER=chrome to use the system Chrome instead of bundled Chromium
  const browserChannel = (process.env.HARNESS_BROWSER || '').trim();
  if (browserChannel) {
    launchOptions.channel = browserChannel;
  }

  // Allow an explicit executable path for Chrome/Edge, takes precedence over channel
  // HARNESS_EXECUTABLE=/usr/bin/google-chrome or HARNESS_CHROME_PATH=/opt/google/chrome/google-chrome
  const executablePath = (process.env.HARNESS_EXECUTABLE || process.env.HARNESS_CHROME_PATH || '').trim();
  if (executablePath) {
    // When executablePath is provided, Playwright ignores channel
    delete launchOptions.channel;
    launchOptions.executablePath = executablePath;
  }

  if (launchOptions.executablePath) {
    process.stdout.write(`Harness: launching browser executable: ${launchOptions.executablePath}\n`);
  } else if (launchOptions.channel) {
    process.stdout.write(`Harness: launching browser channel: ${launchOptions.channel}\n`);
  } else {
    process.stdout.write('Harness: launching bundled Chromium (no channel/executable override)\n');
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const contextOptions = { permissions: ['microphone'] };
    if (storageState) {
      contextOptions.storageState = storageState;
    }
    if (extraHTTPHeaders && typeof extraHTTPHeaders === 'object') {
      contextOptions.extraHTTPHeaders = extraHTTPHeaders;
    }

    const context = await browser.newContext(contextOptions);

    if (skipSyntheticGreeting) {
      await context.addInitScript(() => {
        window.__DEXTER_DISABLE_SYNTHETIC_GREETING = true;
        try {
          window.localStorage?.setItem('dexter:disableSyntheticGreeting', 'true');
        } catch (_storageError) {
          // Swallow storage writes silently; the in-memory flag is sufficient.
        }
      });
    }

    if (Array.isArray(cookies) && cookies.length > 0) {
      try {
        await context.addCookies(cookies);
      } catch (cookieErr) {
        console.warn('Failed adding Playwright cookies:', cookieErr?.message || cookieErr);
      }
    }

    const page = await context.newPage();

    if (typeof onPageReady === 'function') {
      await onPageReady({ browser, context, page });
    }

    const consoleLogs = [];
    let lastActivity = Date.now();
    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text() };
      consoleLogs.push(entry);
      // Surface to stdout in real time so the caller sees progress
      const prefix = `[console:${entry.type}]`;
      process.stdout.write(`${prefix} ${entry.text}\n`);
      lastActivity = Date.now();
    });
    page.on('pageerror', (err) => {
      const entry = { type: 'pageerror', text: err.message };
      consoleLogs.push(entry);
      let stackSnippet = '';
      if (err?.stack) {
        const parts = String(err.stack).split('\n').slice(1, 3).map((line) => line.trim());
        if (parts.length) {
          stackSnippet = ` | ${parts.join(' | ')}`;
        }
      }
      process.stderr.write(`[pageerror] ${err.message}${stackSnippet}\n`);
      lastActivity = Date.now();
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        let safeUrl = response.url();
        try {
          const parsed = new URL(safeUrl);
          safeUrl = `${parsed.origin}${parsed.pathname}`;
        } catch {
          /* ignore URL parsing errors */
        }
        const method = response.request()?.method?.() || 'GET';
        process.stderr.write(`[response:${status}] ${method} ${safeUrl}\n`);
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    const authGate = await page.evaluate(() => document.body && document.body.innerText);
    if (authGate && /401 Authorization Required/i.test(authGate)) {
      throw new Error(`Failed to load ${targetUrl}: received 401 Authorization Required.`);
    }

    if (typeof beforeSend === 'function') {
      await beforeSend({ browser, context, page });
    }

    const connectButton = page.locator('button:has-text("Connect")').first();
    if (await connectButton.count()) {
      const isDisabled = await connectButton.getAttribute('disabled');
      if (isDisabled === null) {
        await connectButton.click();
      }
    }

    await page.locator('button:has-text("Disconnect")').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    const startButton = page.locator('button:has-text("Start Conversation")').first();
    if (await startButton.count()) {
      await startButton.click().catch(() => {});
    }

    async function sendMessage(text) {
      const input = await page.waitForSelector('input[placeholder="Ask Dexter anything"], input[placeholder="Type a question or directive"], input[placeholder="Type a message..."]', { timeout: 30000 });
      await input.fill(text);
      const sendButton = page.locator('button:has(img[alt="Send"])');
      await sendButton.waitFor({ state: 'visible', timeout: 30000 });
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (await sendButton.isEnabled()) {
          await sendButton.click();
          return;
        }
        await page.waitForTimeout(500);
      }
      throw new Error('Send button was not enabled before timeout');
    }

    await sendMessage(prompt);

    const followUpQueue = Array.isArray(followUpPrompts)
      ? followUpPrompts.filter((text) => typeof text === 'string' && text.trim().length > 0)
      : [];

    const expectedAssistantMessages = Math.max(1, 1 + followUpQueue.length);

    if (followUpQueue.length > 0) {
      const delayMs = Math.max(0, Number(followUpDelayMs) || 0);
      for (const message of followUpQueue) {
        if (delayMs > 0) {
          await page.waitForTimeout(delayMs);
        }
        await sendMessage(message.trim());
      }
    }

    const readTranscriptTexts = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('.whitespace-pre-wrap'))
          .map((el) => el.innerText.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      );

    let previousTexts = await readTranscriptTexts();
    let assistantCount = previousTexts.filter((text) => !text.startsWith('▶')).length;
    const quietWindowMs = 5000;
    const deadline = Date.now() + waitMs;
    const startTime = Date.now();

    while (Date.now() < deadline) {
      await page.waitForTimeout(300);
      const currentTexts = await readTranscriptTexts();
      const assistantTexts = currentTexts.filter((text) => !text.startsWith('▶'));
      const activity =
        currentTexts.length !== previousTexts.length ||
        currentTexts.some((text, index) => text !== previousTexts[index]);

      if (activity) {
        lastActivity = Date.now();
      }

      if (assistantTexts.length > assistantCount) {
        assistantCount = assistantTexts.length;
        lastActivity = Date.now();
      }

      previousTexts = currentTexts;

      if (assistantCount >= expectedAssistantMessages && Date.now() - lastActivity > quietWindowMs) {
        break;
      }
    }

    const waitElapsedMs = Date.now() - startTime;
    const timedOut = Date.now() >= deadline;

    const structuredState = await page.evaluate(() => {
      const cloneSerializable = (value) => {
        const seen = new WeakSet();
        return JSON.parse(
          JSON.stringify(
            value,
            (_key, val) => {
              if (typeof val === 'function') {
                return '[Function]';
              }
              if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) {
                  return '[Circular]';
                }
                seen.add(val);
              }
              if (val instanceof Error) {
                return {
                  name: val.name,
                  message: val.message,
                  stack: val.stack,
                };
              }
              return val;
            },
          ),
        );
      };

      return {
        events: typeof window !== 'undefined'
          ? cloneSerializable(window.__DEXTER_EVENT_LOGS__ ?? [])
          : [],
        transcripts: typeof window !== 'undefined'
          ? cloneSerializable(window.__DEXTER_TRANSCRIPT_ITEMS__ ?? [])
          : [],
      };
    });

    const transcriptBubbles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.whitespace-pre-wrap'))
        .map((el) => ({
          text: el.innerText,
          classes: el.className,
        }))
        .filter((item) => item.text && item.text.trim().length > 0),
    );

    const timestamp = new Date().toISOString();
    const artifact = {
      timestamp,
      prompt,
      url: targetUrl,
      waitMs,
      consoleLogs,
      transcriptBubbles,
      structured: structuredState,
      meta: {
        assistantMessageCount: assistantCount,
        waitElapsedMs,
        timedOut,
        consoleErrorCount: consoleLogs.filter((log) => log.type === 'error').length,
      },
    };

    let artifactPath = null;
    let savedStorageStatePath = null;
    if (saveArtifact) {
      artifactPath = path.join(artifactDir, `run-${timestamp.replace(/[:.]/g, '-')}.json`);
      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
      process.stdout.write(`Harness artifact written to ${artifactPath}\n`);
    }

    if (storageStatePath) {
      try {
        const resolvedStoragePath = path.resolve(storageStatePath);
        fs.mkdirSync(path.dirname(resolvedStoragePath), { recursive: true });
        await context.storageState({ path: resolvedStoragePath });
        savedStorageStatePath = resolvedStoragePath;
        process.stdout.write(`Playwright storage state written to ${resolvedStoragePath}\n`);
      } catch (storageErr) {
        console.warn('Failed to write Playwright storage state:', storageErr?.message || storageErr);
      }
    }

    await browser.close();
    return { artifact, artifactPath, storageStatePath: savedStorageStatePath };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

module.exports = {
  runHarness,
  resolveOutputDir,
};
