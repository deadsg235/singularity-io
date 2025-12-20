#!/usr/bin/env node

/**
 * Tool slug inventory helper.
 *
 * Scans:
 *  - dexter-mcp/toolsets for every registered MCP tool
 *  - src/app/hooks/usePromptProfiles.ts (DEFAULT_TOOL_SLUGS)
 *  - src/app/agentConfigs/customerServiceRetail/promptProfile.ts (toolDescriptions)
 *  - src/app/agentConfigs/customerServiceRetail/tools.ts (createConciergeToolset)
 *  - ../dexter-api/src/promptProfiles.ts (server default prompt profile)
 *
 * Prints a consolidated table showing where each tool is defined,
 * along with the slug (if any) from the concierge defaults.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MCP_TOOLSETS_DIR = path.resolve(ROOT, "../dexter-mcp/toolsets");
const CONCIERGE_HOOK_PATH = path.join(ROOT, "src/app/hooks/usePromptProfiles.ts");
const CONCIERGE_PROFILE_PATH = path.join(ROOT, "src/app/agentConfigs/customerServiceRetail/promptProfile.ts");
const CONCIERGE_TOOLS_PATH = path.join(ROOT, "src/app/agentConfigs/customerServiceRetail/tools.ts");
const DEXTER_API_PROMPTS_PATH = path.resolve(ROOT, "../dexter-api/src/promptProfiles.ts");

function ensureFile(pathname) {
  if (!fs.existsSync(pathname)) {
    throw new Error(`Missing expected file: ${pathname}`);
  }
}

function parseSimpleMap(filePath, startToken) {
  ensureFile(filePath);
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const map = new Map();
  let collecting = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!collecting) {
      if (line.startsWith(startToken)) {
        collecting = true;
      }
      continue;
    }
    if (line.startsWith("};") || line.startsWith("}")) {
      break;
    }
    const match = line.match(/^([a-z0-9_]+)\s*:\s*['"]([^'"]+)['"]/i);
    if (match) {
      map.set(match[1], match[2]);
    }
  }
  return map;
}

function parseToolsetNames(filePath) {
  ensureFile(filePath);
  const source = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  const regex = /\bname:\s*['"]([a-z0-9_]+)['"]/gi;
  let match;
  while ((match = regex.exec(source))) {
    names.add(match[1]);
  }
  return names;
}

function parseMcpTools(dirPath) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`dexter-mcp toolsets directory not found at ${dirPath}`);
  }
  const toolNames = new Set();
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const full = path.join(dirPath, file);
    const stats = fs.statSync(full);
    if (stats.isDirectory()) {
      const indexPath = path.join(full, "index.mjs");
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, "utf8");
        const regex = /registerTool\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = regex.exec(content))) {
          toolNames.add(match[1]);
        }
      }
    } else if (stats.isFile() && file.endsWith(".mjs")) {
      const content = fs.readFileSync(full, "utf8");
      const regex = /registerTool\s*\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content))) {
        toolNames.add(match[1]);
      }
    }
  }
  return toolNames;
}

function parseBlockKeys(filePath, startToken) {
  ensureFile(filePath);
  const source = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`${startToken}\\s*{`, "m");
  const patternMatch = pattern.exec(source);
  if (!patternMatch) return new Set();
  const braceStart = patternMatch.index + patternMatch[0].lastIndexOf("{");
  if (braceStart === -1) return new Set();
  let depth = 0;
  let endIndex = -1;
  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  if (endIndex === -1) return new Set();
  const block = source.slice(braceStart + 1, endIndex);
  const keys = new Set();
  const regex = /^\s*([a-z0-9_]+)\s*:/gim;
  let keyMatch;
  while ((keyMatch = regex.exec(block))) {
    keys.add(keyMatch[1]);
  }
  return keys;
}

function buildInventory() {
  const mcpTools = parseMcpTools(MCP_TOOLSETS_DIR);
  const defaultSlugs = parseSimpleMap(CONCIERGE_HOOK_PATH, "export const DEFAULT_TOOL_SLUGS");
  const conciergeDescriptions = parseBlockKeys(CONCIERGE_PROFILE_PATH, "toolDescriptions:");
  const conciergeToolset = parseToolsetNames(CONCIERGE_TOOLS_PATH);
  const apiPromptTools = parseBlockKeys(DEXTER_API_PROMPTS_PATH, "toolDescriptions:");

  const inventory = new Map();
  for (const tool of mcpTools) {
    inventory.set(tool, {
      mcp: true,
      defaultSlug: defaultSlugs.get(tool) ?? null,
      conciergeProfile: conciergeDescriptions.has(tool),
      conciergeToolset: conciergeToolset.has(tool),
      apiProfile: apiPromptTools.has(tool),
    });
  }

  // Include any tool that only appears in defaults (for completeness)
  for (const tool of defaultSlugs.keys()) {
    if (!inventory.has(tool)) {
      inventory.set(tool, {
        mcp: false,
        defaultSlug: defaultSlugs.get(tool) ?? null,
        conciergeProfile: conciergeDescriptions.has(tool),
        conciergeToolset: conciergeToolset.has(tool),
        apiProfile: apiPromptTools.has(tool),
      });
    }
  }

  return { inventory, defaultSlugs, conciergeDescriptions, conciergeToolset, apiPromptTools };
}

function printInventory() {
  const { inventory } = buildInventory();
  const tools = Array.from(inventory.keys()).sort();

  const colPad = (text, width) => {
    const str = String(text ?? "");
    return str.length >= width ? str : str + " ".repeat(width - str.length);
  };

  const headers = [
    colPad("tool", 28),
    colPad("mcp", 5),
    colPad("default slug", 36),
    colPad("concierge-profile", 17),
    colPad("concierge-toolset", 18),
    colPad("api-profile", 12),
  ];
  console.log(headers.join("  "));
  console.log("-".repeat(headers.join("  ").length));

  for (const tool of tools) {
    const info = inventory.get(tool);
    const mark = (bool) => (bool ? "✓" : "—");
    console.log(
      [
        colPad(tool, 28),
        colPad(mark(info.mcp), 5),
        colPad(info.defaultSlug ?? "—", 36),
        colPad(mark(info.conciergeProfile), 17),
        colPad(mark(info.conciergeToolset), 18),
        colPad(mark(info.apiProfile), 12),
      ].join("  "),
    );
  }
}

try {
  printInventory();
} catch (error) {
  console.error("Failed to generate tool slug inventory:", error);
  process.exitCode = 1;
}
