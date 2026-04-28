const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// The problem: after extracting poll selection into normalized.text,
// resolveSurveyOutcome() still returns { decision: null, selectedText: "" } because
// it detects hasPollEnvelope=true in the raw payload and returns early.
// Then resolveSurveyActionFromSnapshot gets called with selectedSurveyText="" and misses.
//
// Fix: when we already have the extracted selection, try resolveSurveyActionFromSnapshot
// directly first, bypassing the hasPollEnvelope short-circuit in resolveSurveyOutcome.

const oldBlock = `      const surveyOutcome = resolveSurveyOutcome(normalized);\r\n      let decision = surveyOutcome.decision;\r\n      let selectedSurveyText = String(\n        surveyOutcome.selectedText || "",\n      ).trim();\n      const surveySnapshot = activeGateState?.surveySnapshot || null;\r\n\r\n      const currentText = hasProcessableText(normalized.text)\r\n        ? String(normalized.text || "").trim()\r\n        : "";\r\n      const bufferedText = String(\n        activeGateState?.pendingBufferedText || "",\n      ).trim();\n      let selectedSurveyOption =\n        resolveSurveyActionFromSnapshot({\n          surveySnapshot,\n          text: selectedSurveyText,\n        }) ||\n        (!isPollPayload\n          ? resolveSurveyActionFromSnapshot({\n              surveySnapshot,\n              text: currentText,\n            })\n          : null);`;

const newBlock = `      const surveySnapshot = activeGateState?.surveySnapshot || null;\r\n      const surveyOutcome = resolveSurveyOutcome(normalized);\r\n      let decision = surveyOutcome.decision;\r\n      let selectedSurveyText = String(\n        surveyOutcome.selectedText || "",\n      ).trim();\r\n\r\n      const currentText = hasProcessableText(normalized.text)\r\n        ? String(normalized.text || "").trim()\r\n        : "";\r\n      const bufferedText = String(\n        activeGateState?.pendingBufferedText || "",\n      ).trim();\n\r\n      // When it's a poll payload, resolveSurveyOutcome returns decision=null due to hasPollEnvelope.\r\n      // In that case, try to match the extracted text directly against the snapshot options.\r\n      let selectedSurveyOption =\n        resolveSurveyActionFromSnapshot({\n          surveySnapshot,\n          text: selectedSurveyText || currentText,\n        }) ||\n        (!isPollPayload\n          ? resolveSurveyActionFromSnapshot({\n              surveySnapshot,\n              text: currentText,\n            })\n          : null);\r\n\r\n      // If we matched an option from the snapshot and still have no decision, resolve it now.\r\n      if (!decision && selectedSurveyOption && isPollPayload) {\r\n        decision = selectedSurveyOption.action === "none" ? "no" : "yes";\r\n        console.log(\r\n          \`📊 Poll resuelto por snapshot | from=\${maskPhoneForLog(normalized.phoneNumber)} | action=\${selectedSurveyOption.action} | label=\${selectedSurveyOption.label}\`,\r\n        );\r\n      }`;

if (!content.includes(oldBlock)) {
    console.error('❌ Target block not found! Trying to diagnose...');
    const idx = content.indexOf('const surveyOutcome = resolveSurveyOutcome(normalized);');
    console.log('Index:', idx);
    if (idx !== -1) {
        console.log('Context:', JSON.stringify(content.slice(idx - 10, idx + 400)));
    }
    process.exit(1);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully patched surveySnapshot resolution for poll payloads');
