#!/bin/zsh
# Load .env safely using node to handle special characters in values
eval "$(node -e "
const fs = require('fs');
const lines = fs.readFileSync('.env', 'utf8').split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  process.stdout.write('export ' + key + '=' + JSON.stringify(val) + '\n');
}
")"
exec pnpm --filter @workspace/api-server run start
