#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const { runHarness, resolveOutputDir } = require('./runHarness');

const COLUMN_WIDTH = 60;

const wrapText = (text, width) => {
  if (!text || !text.trim()) return [''];
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width && current) {
      lines.push(current);
      current = word;
    } else if (candidate.length > width) {
      lines.push(candidate);
      current = '';
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const padRight = (value, width) => {
  const str = value ?? '';
  if (str.length >= width) return str;
  return `${str}${' '.repeat(width - str.length)}`;
};

const truncate = (value, length = 160) => {
  if (!value) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > length ? `${str.slice(0, length - 1)}…` : str;
};

const extractMessageText = (item) => {
  if (!Array.isArray(item?.content)) return '';
  const parts = item.content
    .map((part) => (typeof part?.text === 'string' ? part.text : typeof part?.transcript === 'string' ? part.transcript : ''))
    .filter(Boolean);
  return parts.join(' ').trim();
};

const buildSummary = (artifact) => {
  const events = Array.isArray(artifact?.structured?.events) ? artifact.structured.events : [];
  if (!events.length) return 'No structured events captured.\n';

  const transcriptMap = new Map();
  const structuredTranscripts = Array.isArray(artifact?.structured?.transcripts)
    ? artifact.structured.transcripts
    : [];
  for (const item of structuredTranscripts) {
    if (item?.itemId) {
      transcriptMap.set(item.itemId, item);
    }
  }

  const toolOutputs = new Map();
  for (const event of events) {
    if (event?.eventName === 'response.output_item.done' && event?.eventData?.item?.type === 'mcp_call') {
      const item = event.eventData.item;
      const itemId = item.id || event.eventData.item_id;
      toolOutputs.set(itemId, {
        output: item.output ?? null,
        timestamp: event.timestamp || '',
      });
    }
  }

  const rows = [];
  for (const event of events) {
    if (event?.eventName !== 'conversation.item.created') continue;
    const item = event?.eventData?.item;
    if (!item) continue;
    const timestamp = event.timestamp || '';

    if (item.type === 'message') {
      const role = item.role === 'user' ? 'user' : item.role === 'assistant' ? 'assistant' : 'other';
      const messageItemId = item.id || item.item_id || item.itemId;
      let text = extractMessageText(item);
      if (!text) {
        const fallback = transcriptMap.get(messageItemId || '');
        if (fallback && typeof fallback.title === 'string' && fallback.title.trim()) {
          text = fallback.title.trim();
        }
      }
      if (!text) {
        text = '[no text captured]';
      }
      rows.push({ kind: 'message', role, text, timestamp });
    } else if (item.type === 'mcp_call') {
      const itemId = item.id || item.item_id;
      const result = toolOutputs.get(itemId) || {};
      rows.push({
        kind: 'tool',
        role: 'assistant',
        timestamp,
        name: item.name || 'mcp_call',
        args: typeof item.arguments === 'string' ? item.arguments.trim() : '',
        output: result.output || null,
      });
    }
  }

  if (!rows.length) return 'No conversation items recorded.\n';

  const header = `${padRight('Assistant (left)', COLUMN_WIDTH)}│ User (right)`;
  const divider = `${'─'.repeat(COLUMN_WIDTH)}┼${'─'.repeat(COLUMN_WIDTH)}`;
  const lines = [header, divider];

  const formatAssistantLines = (text, timestamp) => {
    const wrapped = wrapText(text, COLUMN_WIDTH - (timestamp ? timestamp.length + 2 : 0));
    return wrapped.map((line, index) => {
      if (!timestamp) return line;
      if (index === 0) return `${timestamp}  ${line}`;
      return `${' '.repeat(timestamp.length + 2)}${line}`;
    });
  };

  const formatUserLines = (text, timestamp) => {
    const wrapped = wrapText(text, COLUMN_WIDTH - (timestamp ? timestamp.length + 2 : 0));
    return wrapped.map((line, index) => {
      if (!timestamp) return line;
      if (index === 0) return `${timestamp}  ${line}`;
      return `${' '.repeat(timestamp.length + 2)}${line}`;
    });
  };

  for (const row of rows) {
    let leftLines = [];
    let rightLines = [];

    if (row.kind === 'message') {
      if (row.role === 'assistant') {
        leftLines = formatAssistantLines(row.text, row.timestamp);
      } else if (row.role === 'user') {
        rightLines = formatUserLines(row.text, row.timestamp);
      }
    } else if (row.kind === 'tool') {
      const toolHeader = `↳ tool ${row.name}`;
      const segments = [toolHeader];
      if (row.args) {
        segments.push(`  args: ${truncate(row.args, 140)}`);
      }
      if (row.output) {
        segments.push(`  result: ${truncate(row.output, 140)}`);
      }
      leftLines = formatAssistantLines(segments.join('\n'), row.timestamp);
    }

    const maxLen = Math.max(leftLines.length, rightLines.length) || 1;
    for (let i = 0; i < maxLen; i += 1) {
      const left = leftLines[i] ?? '';
      const right = rightLines[i] ?? '';
      lines.push(`${padRight(left, COLUMN_WIDTH)}│ ${right}`);
    }
  }

  return `${lines.join('\n')}\n`;
};

async function runRefreshCommand(argv) {
  const pythonBin = process.env.DEXCHAT_PYTHON || 'python3';
  const scriptPath = path.join(__dirname, 'update_harness_cookie.py');
  const refreshArgs = [scriptPath, '--refresh-storage'];

  const customPrompt = typeof argv.prompt === 'string' && argv.prompt.trim()
    ? argv.prompt.trim()
    : null;
  if (customPrompt) {
    refreshArgs.push('--prompt', customPrompt);
  }

  if (argv.stdin) {
    refreshArgs.push('--stdin');
  }

  const cookieValue = typeof argv.cookie === 'string' && argv.cookie.trim()
    ? argv.cookie.trim()
    : null;
  if (cookieValue) {
    refreshArgs.push('--value', cookieValue);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(pythonBin, refreshArgs, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`update_harness_cookie.py exited with code ${code}`));
      }
    });
  });
}

(async () => {
  const [{ default: yargsFactory }, { hideBin }] = await Promise.all([
    import('yargs'),
    import('yargs/helpers'),
  ]);

  const parser = yargsFactory(hideBin(process.argv))
    .usage('$0 [options]', 'Run a scripted chat against the Dexter realtime agent.', (cmd) =>
      cmd
        .option('prompt', {
          alias: 'p',
          type: 'string',
          describe: 'Message to send to the agent.',
        })
        .option('url', {
          alias: 'u',
          type: 'string',
          describe: 'Target URL to load before running the conversation.',
        })
        .option('wait', {
          alias: 'w',
          type: 'number',
          describe: 'Time to wait (ms) after sending the prompt before snapshotting results.',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          describe: 'Directory where run artifacts will be stored.',
        })
        .option('artifact', {
          type: 'boolean',
          describe: 'Write JSON artifact to disk (disable with --no-artifact).',
        })
        .option('follow-up', {
          type: 'string',
          array: true,
          describe: 'Optional follow-up message(s) to send after the initial prompt (repeat flag for multiple turns).',
        })
        .option('follow-up-delay', {
          type: 'number',
          describe: 'Delay (ms) between the initial message and follow-up (default 3000).',
        })
        .option('skip-greeting', {
          type: 'boolean',
          describe: 'Skip the synthetic "hi" handshake when starting the session.',
        })
        .option('summary', {
          type: 'boolean',
          describe: 'Print a left/right transcript summary after the run completes.',
        })
        .option('headful', {
          type: 'boolean',
          describe: 'Run Playwright in headed mode (visible browser).',
        })
        .option('json', {
          type: 'boolean',
          describe: 'Print the artifact JSON to stdout when the run completes.',
        })
        .option('storage', {
          type: 'string',
          describe: 'Write Playwright storage state to the provided path.',
        })
        .option('storage-state', {
          type: 'string',
          describe: 'Load Playwright storage state before running.',
        })
        .option('guest', {
          type: 'boolean',
          describe: 'Ignore stored auth and run as a guest.',
        })
        .option('cookie', {
          type: 'string',
          describe: 'URL-encoded HARNESS_COOKIE (for the refresh command).',
        })
        .option('stdin', {
          type: 'boolean',
          describe: 'Read HARNESS_COOKIE from STDIN (for the refresh command).',
        })
        .example('$0 --prompt "Check my wallet"', 'Run against beta with default settings.')
        .example('$0 -p "Test" -u http://localhost:3000/ -w 30000', 'Run against local dev for 30 seconds.')
        .example('$0 refresh', 'Interactively refresh HARNESS_COOKIE + storage state.')
        .help()
        .alias('help', 'h'));

  const argv = await parser.parseAsync();

  try {
    const subcommand = Array.isArray(argv._) && argv._.length > 0 ? argv._[0] : null;
    if (subcommand === 'refresh') {
      await runRefreshCommand(argv);
      return;
    }

    const promptFromEnv = typeof process.env.HARNESS_PROMPT === 'string'
      ? process.env.HARNESS_PROMPT.trim()
      : '';
    const prompt = typeof argv.prompt === 'string' && argv.prompt.trim()
      ? argv.prompt.trim()
      : promptFromEnv;
    if (!prompt) {
      throw new Error('Prompt is required (pass --prompt or set HARNESS_PROMPT).');
    }

    const envUrl = typeof process.env.HARNESS_TARGET_URL === 'string'
      ? process.env.HARNESS_TARGET_URL.trim()
      : '';
    const targetUrl = typeof argv.url === 'string' && argv.url.trim()
      ? argv.url.trim()
      : envUrl || 'https://beta.dexter.cash/';

    const waitCandidates = [argv.wait, Number(process.env.HARNESS_WAIT_MS)];
    const waitMs = waitCandidates.find((value) => Number.isFinite(value) && value > 0) || 45000;

    const rawOutputDir = typeof argv.output === 'string' && argv.output.trim()
      ? argv.output.trim()
      : (typeof process.env.HARNESS_OUTPUT_DIR === 'string' ? process.env.HARNESS_OUTPUT_DIR.trim() : undefined);
    const outputDir = resolveOutputDir(rawOutputDir);

    const headless = argv.headful
      ? false
      : process.env.HARNESS_HEADLESS === 'false'
        ? false
        : true;

    const artifactFlag = argv.artifact === undefined ? true : argv.artifact;
    const saveArtifact = artifactFlag && process.env.HARNESS_SAVE_ARTIFACT !== 'false';

    const storageStatePath = typeof argv.storage === 'string' && argv.storage.trim()
      ? argv.storage.trim()
      : undefined;

    let storageStateToLoad = typeof argv.storageState === 'string' && argv.storageState.trim()
      ? argv.storageState.trim()
      : (typeof process.env.HARNESS_STORAGE_STATE === 'string'
          ? process.env.HARNESS_STORAGE_STATE.trim()
          : '') || undefined;

    if (argv.guest) {
      storageStateToLoad = undefined;
      process.stdout.write('Guest mode enabled – skipping stored authentication.\n');
    }

    const jsonOutput = argv.json || process.env.HARNESS_JSON === '1';
    const skipGreeting = argv['skip-greeting'] !== undefined
      ? Boolean(argv['skip-greeting'])
      : process.env.HARNESS_SKIP_GREETING === 'true';

    const followUpRaw = argv['follow-up'];
    const followUpPrompts = Array.isArray(followUpRaw)
      ? followUpRaw.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : typeof followUpRaw === 'string' && followUpRaw.trim().length > 0
        ? [followUpRaw.trim()]
        : [];

    const showSummary = argv.summary || process.env.HARNESS_SUMMARY === 'true';

    const { artifact, artifactPath } = await runHarness({
      prompt,
      targetUrl,
      waitMs,
      outputDir,
      headless,
      saveArtifact,
      storageState: storageStateToLoad,
      storageStatePath,
      followUpPrompts,
      followUpDelayMs: argv['follow-up-delay'],
      skipSyntheticGreeting: skipGreeting,
    });

    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    }

    if (artifactPath) {
      process.stdout.write(`Saved artifact: ${artifactPath}\n`);
    } else if (saveArtifact) {
      process.stdout.write('Run completed, but no artifact was written.\n');
    }

    if (showSummary) {
      process.stdout.write('\n');
      process.stdout.write(buildSummary(artifact));
    }
  } catch (error) {
    console.error('dexchat failed:', error.message || error);
    process.exitCode = 1;
  }
})();
