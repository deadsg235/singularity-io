import fs from 'node:fs';
import path from 'node:path';

const agentsDir = path.resolve('src/app/agentConfigs/customerServiceRetail');
const agentFiles = fs
  .readdirSync(agentsDir)
  .filter((name) => name.endsWith('.ts') && name !== 'index.ts' && name !== 'tools.ts');

const toolsFile = path.join(agentsDir, 'tools.ts');
const toolsSource = fs.readFileSync(toolsFile, 'utf8');
const toolNameRegex = /export const (\w+) = tool\(\{\s*name: '([^']+)'/g;
const toolMapping = new Map();
let match;
while ((match = toolNameRegex.exec(toolsSource))) {
  toolMapping.set(match[1], match[2]);
}

const expandToolSet = (setName) => {
  const setRegex = new RegExp(`export const ${setName} = \\[(.*?)\\];`, 's');
  const setMatch = toolsSource.match(setRegex);
  if (!setMatch) return [];
  return setMatch[1]
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/\]|\[/g, ''));
};

const agentToolMatrix = [];

for (const file of agentFiles) {
  const filePath = path.join(agentsDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const nameMatch = source.match(/name:\s*'([^']+)'/);
  const agentName = nameMatch ? nameMatch[1] : path.basename(file, '.ts');
  const toolsArrayMatch = source.match(/tools:\s*\[(.*?)\]/s);
  const collected = new Set();

  if (toolsArrayMatch) {
    const entries = toolsArrayMatch[1].split(',').map((token) => token.trim()).filter(Boolean);
    for (const entry of entries) {
      if (entry.startsWith('...')) {
        const setName = entry.replace(/\.{3}|\]|\[/g, '').trim();
        expandToolSet(setName).forEach((toolConst) => {
          const toolId = toolMapping.get(toolConst);
          if (toolId) collected.add(toolId);
        });
      } else {
        const toolConst = entry.replace(/\]|\[/g, '').trim();
        const toolId = toolMapping.get(toolConst);
        if (toolId) collected.add(toolId);
      }
    }
  }

  agentToolMatrix.push({ agent: agentName, tools: Array.from(collected).sort() });
}

for (const { agent, tools } of agentToolMatrix.sort((a, b) => a.agent.localeCompare(b.agent))) {
  if (tools.length === 0) continue;
  console.log(`${agent} — ${tools.length} tool${tools.length === 1 ? '' : 's'}`);
  for (const tool of tools) {
    console.log(`  • ${tool}`);
  }
  console.log();
}
