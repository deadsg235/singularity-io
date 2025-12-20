#!/usr/bin/env node

/**
 * Guest Access Verification Script (Dependency-Free)
 * 
 * Verifies that the Guest/Demo user flow is working correctly by:
 * 1. Connecting to the local dexter-agents API (default: http://localhost:3210)
 * 2. Using the server-side configured token (simulating a guest)
 * 3. Executing key wallet tools (resolve_wallet, solana_list_balances) via the MCP proxy
 * 
 * Usage:
 *   node scripts/verify-guest-access.js
 *   node scripts/verify-guest-access.js --url http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const urlArgIndex = args.indexOf('--url');
const BASE_URL = urlArgIndex !== -1 ? args[urlArgIndex + 1] : 'http://localhost:3210';

// ANSI escape codes for basic coloring
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BOLD = '\x1b[1m';

console.log(`${BOLD}${CYAN}\n🔍 Dexter Guest Access Verification\n${RESET}`);
console.log(`Target: ${BLUE}${BASE_URL}${RESET}\n`);

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return {};
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
      }
    });
    return env;
  } catch (err) {
    console.error('Failed to load .env:', err.message);
    return {};
  }
}

const env = loadEnv();
const HARNESS_COOKIE = env.HARNESS_COOKIE;

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          text: data
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function callMcpTool(toolName, toolArgs = {}, useCookie = false) {
  const endpoint = `${BASE_URL}/api/mcp`;
  const modeLabel = useCookie ? '(Authenticated)' : '(Guest)';
  
  process.stdout.write(`Testing tool ${modeLabel}: ${YELLOW}${toolName}${RESET}... `);
  const startTime = Date.now();

  const headers = {};
  if (useCookie && HARNESS_COOKIE) {
    // Basic cookie parsing if it's a full header string vs just the value
    headers['Cookie'] = HARNESS_COOKIE;
  }

  try {
    const res = await postJson(endpoint, {
      tool: toolName,
      args: toolArgs
    }, headers);

    const duration = Date.now() - startTime;
    let data;
    
    try {
      data = JSON.parse(res.text);
    } catch (e) {
      console.log(`${RED}✖ Failed to parse JSON response (${res.status})${RESET}`);
      console.log(`${GRAY}${res.text.slice(0, 200)}${RESET}`);
      return false;
    }

    if (!res.ok || data.error) {
      console.log(`${RED}✖ Failed (${res.status}) in ${duration}ms${RESET}`);
      if (data.error) {
        console.log(`  ${RED}Error: ${data.error}${RESET}`);
        if (data.message) console.log(`  ${RED}Message: ${data.message}${RESET}`);
      }
      return false;
    }

    console.log(`${GREEN}✔ Success (${res.status}) in ${duration}ms${RESET}`);
    
    // Pretty print a summary of content
    if (Array.isArray(data.content)) {
      data.content.forEach(item => {
        if (item.type === 'text') {
          try {
            // Try to parse nested JSON string if present (common in tool outputs)
            const nested = JSON.parse(item.text);
            const summary = JSON.stringify(nested, null, 2);
            // Limit output length
            const display = summary.length > 300 ? summary.slice(0, 300) + '... (truncated)' : summary;
            console.log(`${GRAY}${display}${RESET}`);
          } catch {
            const display = item.text.length > 300 ? item.text.slice(0, 300) + '... (truncated)' : item.text;
            console.log(`${GRAY}${display}${RESET}`);
          }
        } else {
          console.log(`${GRAY}[${item.type}] content${RESET}`);
        }
      });
    } else {
      const summary = JSON.stringify(data, null, 2);
      console.log(`${GRAY}${summary.slice(0, 300)}${RESET}`);
    }
    console.log(''); // newline
    return true;

  } catch (err) {
    console.log(`${RED}✖ Network Error: ${err.message}${RESET}`);
    return false;
  }
}

async function run() {
  let successCount = 0;
  let failCount = 0;

  console.log(`${BOLD}--- Guest Mode Tests ---${RESET}`);
  // Test 1: Resolve Wallet (Basic Identity Check) - Guest
  if (await callMcpTool('resolve_wallet')) {
    successCount++;
  } else {
    failCount++;
  }

  // Test 2: List Balances (Auth & Data Access Check) - Guest
  if (await callMcpTool('solana_list_balances')) {
    successCount++;
  } else {
    failCount++;
  }

  if (HARNESS_COOKIE) {
    console.log(`\n${BOLD}--- Authenticated User Tests (using HARNESS_COOKIE) ---${RESET}`);
    // Test 3: Resolve Wallet - Authenticated
    if (await callMcpTool('resolve_wallet', {}, true)) {
      successCount++;
    } else {
      failCount++;
    }

    // Test 4: List Balances - Authenticated
    if (await callMcpTool('solana_list_balances', {}, true)) {
      successCount++;
    } else {
      failCount++;
    }
  } else {
    console.log(`\n${YELLOW}Skipping Authenticated Tests (HARNESS_COOKIE not found in .env)${RESET}`);
  }

  console.log(`\n${BOLD}─────────────────────────────${RESET}`);
  if (failCount === 0) {
    console.log(`${BOLD}${GREEN}✅ All Checks Passed${RESET}`);
    console.log(`${GREEN}System operational.${RESET}`);
  } else {
    console.log(`${BOLD}${RED}❌ Some Checks Failed${RESET}`);
    console.log(`${YELLOW}Please check logs: pm2 logs dexter-agents --lines 50${RESET}`);
    process.exit(1);
  }
}

run();
