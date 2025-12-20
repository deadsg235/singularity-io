#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: npm run harness:report -- <artifact.json>');
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const date = new Date(ts);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (err) {
    // fall through
  }
  return ts;
}

function printSection(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function printTranscript(transcripts) {
  const sorted = [...transcripts].sort((a, b) => {
    const tA = typeof a.createdAtMs === 'number' ? a.createdAtMs : 0;
    const tB = typeof b.createdAtMs === 'number' ? b.createdAtMs : 0;
    return tA - tB;
  });

  sorted.forEach((item) => {
    const ts = item.timestamp || new Date(item.createdAtMs || Date.now()).toLocaleTimeString();
    if (item.type === 'MESSAGE') {
      const role = item.role === 'user' ? 'USER' : 'ASSISTANT';
      const hidden = item.isHidden ? ' (hidden)' : '';
      process.stdout.write(`- [${ts}] ${role}${hidden}: ${item.title || ''}\n`);
    } else if (item.type === 'TOOL_NOTE') {
      process.stdout.write(`- [${ts}] TOOL ${item.title || ''}`);
      if (item.data) {
        process.stdout.write(`\n    ${JSON.stringify(item.data, null, 2).replace(/\n/g, '\n    ')}\n`);
      } else {
        process.stdout.write('\n');
      }
    } else if (item.type === 'BREADCRUMB') {
      process.stdout.write(`- [${ts}] NOTE: ${item.title}\n`);
    }
  });
}

function printToolsFromEvents(events) {
  const toolEvents = events.filter((ev) =>
    ev.eventName.includes('mcp_tool_call') ||
    ev.eventName.includes('function_call') ||
    ev.eventName.includes('mcp_call'),
  );
  toolEvents.forEach((ev) => {
    const details = JSON.stringify(ev.eventData, null, 2).replace(/\n/g, '\n    ');
    process.stdout.write(`- ${ev.direction.toUpperCase()} ${ev.eventName}\n    ${details}\n`);
  });
}

function printErrors(consoleLogs, events) {
  const errorLogs = (consoleLogs || []).filter((log) =>
    ['error', 'warning', 'pageerror'].includes(log.type),
  );
  const errorEvents = events.filter((ev) => ev.eventName.toLowerCase().includes('error'));

  errorLogs.forEach((log) => {
    process.stdout.write(`- console.${log.type}: ${log.text}\n`);
  });
  errorEvents.forEach((ev) => {
    const details = JSON.stringify(ev.eventData, null, 2).replace(/\n/g, '\n    ');
    process.stdout.write(`- event ${ev.eventName}\n    ${details}\n`);
  });
}

function main() {
  const [, , target] = process.argv;
  if (!target) {
    usage();
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(filePath)) {
    console.error(`Artifact not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let artifact;
  try {
    artifact = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON from ${filePath}:`, err.message);
    process.exit(1);
  }

  const structured = artifact.structured || {};
  const transcripts = structured.transcripts || [];
  const events = structured.events || [];
  const consoleLogs = artifact.consoleLogs || [];
  const meta = artifact.meta || {};

  process.stdout.write(`Harness artifact: ${filePath}\n`);
  process.stdout.write(`Timestamp: ${formatTimestamp(artifact.timestamp)}\n`);
  if (artifact.prompt) {
    process.stdout.write(`Prompt: ${artifact.prompt}\n`);
  }
  if (artifact.url) {
    process.stdout.write(`URL: ${artifact.url}\n`);
  }

  printSection('Transcript');
  if (transcripts.length === 0) {
    process.stdout.write('[no transcript items]\n');
  } else {
    printTranscript(transcripts);
  }

  printSection('Tool & MCP Events');
  if (events.length === 0) {
    process.stdout.write('[no events]\n');
  } else {
    printToolsFromEvents(events);
  }

  printSection('Errors & Warnings');
  if ((consoleLogs.length === 0) && events.filter((ev) => ev.eventName.toLowerCase().includes('error')).length === 0) {
    process.stdout.write('[none]\n');
  } else {
    printErrors(consoleLogs, events);
  }

  printSection('Meta');
  Object.entries(meta).forEach(([key, value]) => {
    process.stdout.write(`- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`);
  });
  const duration = meta.waitElapsedMs !== undefined ? `${meta.waitElapsedMs} ms` : '—';
  process.stdout.write(`- Duration: ${duration}\n`);
  const timedOut = meta.timedOut ? 'yes' : 'no';
  process.stdout.write(`- Timed out: ${timedOut}\n`);
}

main();
