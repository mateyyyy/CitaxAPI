/**
 * Final comprehensive patch for evolution.service.js
 * Migrates all remaining console.log to logger, removes noisy multi-line blocks.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/evolution.service.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

let applied = 0;

// Line-by-line patches: { contentSubstring, fromCall, toCall }
const linePatches = [
  // sendTextMessage → debug
  { content: 'sendTextMessage | instance=', from: 'console.log(', to: 'logger.debug(' },
  // Rafaga agrupada → info
  { content: 'faga agrupada | from=', from: 'console.log(', to: 'logger.info(' },
  // Flujo reiniciado → info
  { content: 'Flujo reiniciado por inactividad', from: 'console.log(', to: 'logger.info(' },
  // Encuesta enviada (dos ocurrencias) → info
  { content: 'Encuesta | to=', from: 'console.log(', to: 'logger.info(' },
  // Poll empresa con selección → info
  { content: 'Poll empresa | from=', from: 'console.log(', to: 'logger.info(' },
  // Poll empresa sin selección legible → debug
  { content: 'Poll empresa sin selecci', from: 'console.log(', to: 'logger.debug(' },
  // Poll resuelto por snapshot → info
  { content: 'Poll resuelto por snapshot', from: 'console.log(', to: 'logger.info(' },
  // Encuesta=NO → info
  { content: 'Encuesta=NO | from=', from: 'console.log(', to: 'logger.info(' },
  // TOOLS → info
  { content: 'TOOLS | ', from: 'console.log(', to: 'logger.info(' },
  // OUT sent → info
  { content: 'OUT | to=', from: 'console.log(', to: 'logger.info(' },
  // OUT skipped → info
  { content: 'OUT | reason=', from: 'console.log(', to: 'logger.info(' },
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const { content, from, to } of linePatches) {
    if (line.includes(content)) {
      for (let j = Math.max(0, i - 2); j <= i; j++) {
        if (lines[j].includes(from)) {
          lines[j] = lines[j].replace(from, to);
          applied++;
          break;
        }
      }
      break;
    }
  }
}

// Handle "Support poll raw" block specially:
// Replace multi-line object log with single-line logger.debug
let src = lines.join('\n');

// Match the full block: console.log("🧪 Support poll raw", { ... });
// The block ends at the closing }); after sample:
const pollRawRegex = /console\.log\("[^"]*Support poll raw",[^;]*?\}\s*\}\s*\);/s;
const pollRawMatch = src.match(pollRawRegex);
if (pollRawMatch) {
  // Extract what info we need - just replace with a single-line logger.debug
  // that references the already-computed flattenedSelectionValues text values
  const replacement = `logger.debug(\`Support poll raw | from=\${normalized.phoneNumber} | type=\${normalized.rawType || normalized.messageType} | selections=\${flattenedSelectionValues.filter(v => typeof v === 'string').join(', ') || 'none'}\`)`;
  src = src.replace(pollRawRegex, replacement + ';');
  applied++;
  console.log('Patched: Support poll raw block');
} else {
  console.warn('SKIP: Support poll raw block not found');
}

fs.writeFileSync(filePath, src, 'utf8');
console.log(`\nDone. ${applied} patches applied.`);
