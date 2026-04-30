// Patch only the Support poll raw block (lines 2300-2306)
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/evolution.service.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the line with "Support poll raw"
const idx = lines.findIndex(l => l.includes('Support poll raw'));
if (idx === -1) { console.error('NOT FOUND'); process.exit(1); }

console.log(`Found at line ${idx + 1}: ${lines[idx].trim()}`);

// Find the closing }); of this console.log block
let endIdx = idx;
let depth = 0;
for (let i = idx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{' || ch === '(') depth++;
    if (ch === '}' || ch === ')') depth--;
  }
  if (depth <= 0 && i > idx) {
    endIdx = i;
    break;
  }
}
console.log(`Block ends at line ${endIdx + 1}: ${lines[endIdx].trim()}`);

// Replace the block with a single logger.debug line
const indent = lines[idx].match(/^(\s*)/)[1];
const replacement = `${indent}logger.debug(\`Support poll raw | from=\${normalized.phoneNumber} | type=\${normalized.rawType || normalized.messageType} | selected=\${flattenedSelectionValues.filter(v => typeof v === 'string').join(', ') || 'none'}\`);`;

lines.splice(idx, endIdx - idx + 1, replacement);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Patched!');
