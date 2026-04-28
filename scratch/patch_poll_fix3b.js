const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find line indices (0-based) for the block we need to change
// Line 2368-2378 (1-based) = indices 2367-2377 (0-based)
// We need to change selectedSurveyOption to also try currentText for isPollPayload

// Find the `let selectedSurveyOption =` line
let targetLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('let selectedSurveyOption =') && 
        lines[i + 1]?.includes('resolveSurveyActionFromSnapshot(') &&
        lines[i + 2]?.includes('surveySnapshot,') &&
        lines[i + 3]?.includes('text: selectedSurveyText,')) {
        targetLineIdx = i;
        break;
    }
}

if (targetLineIdx === -1) {
    console.error('❌ Could not find selectedSurveyOption block');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('let selectedSurveyOption =')) {
            console.log(`Found at line ${i+1}: ${JSON.stringify(lines[i])}`);
            console.log(`Next: ${JSON.stringify(lines[i+1])}`);
            console.log(`Next: ${JSON.stringify(lines[i+2])}`);
            console.log(`Next: ${JSON.stringify(lines[i+3])}`);
        }
    }
    process.exit(1);
}

console.log(`Found selectedSurveyOption at line ${targetLineIdx + 1}`);

// Find end of the let selectedSurveyOption block (ends at the null); line)
let endLineIdx = targetLineIdx;
for (let i = targetLineIdx; i < targetLineIdx + 20; i++) {
    if (lines[i].includes(': null);') || lines[i].trimEnd() === '          : null);') {
        endLineIdx = i;
        break;
    }
}
console.log(`Block ends at line ${endLineIdx + 1}: ${JSON.stringify(lines[endLineIdx])}`);

// Also find "if (!selectedSurveyText && selectedSurveyOption?.label)" block right after
// to keep it — we just need to patch selectedSurveyOption to also check currentText for polls

// Replace the selectedSurveyOption assignment:
// OLD: tries selectedSurveyText, and if !isPollPayload also tries currentText
// NEW: tries selectedSurveyText || currentText (always, even for polls)
const eol = lines[targetLineIdx].endsWith('\r') ? '\r' : '';
const indent = '      ';

const newLines = [
    `${indent}let selectedSurveyOption =\n`,
    `${indent}  resolveSurveyActionFromSnapshot({\n`,
    `${indent}    surveySnapshot,\n`,
    `${indent}    text: selectedSurveyText || currentText,\n`,
    `${indent}  });\n`,
    `\n`,
    `${indent}// If poll payload matched a snapshot option but decision is still null, resolve it.\n`,
    `${indent}if (!decision && selectedSurveyOption && isPollPayload) {\n`,
    `${indent}  decision = selectedSurveyOption.action === "none" ? "no" : "yes";\n`,
    `${indent}  console.log(\n`,
    "        `📊 Poll resuelto por snapshot | from=${maskPhoneForLog(normalized.phoneNumber)} | action=${selectedSurveyOption.action} | label=${selectedSurveyOption.label}`,\n",
    `${indent});\n`,
    `${indent}}\n`,
];

// Count lines to remove
const removeCount = endLineIdx - targetLineIdx + 1;
console.log(`Removing ${removeCount} lines starting at ${targetLineIdx + 1}`);

lines.splice(targetLineIdx, removeCount, ...newLines.map(l => l.replace('\n', '')));

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Patched selectedSurveyOption to resolve polls via snapshot directly');
