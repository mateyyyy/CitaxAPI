const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// We need to add poll payload handling for company instances in the "pending" gate state.
// Right now the code at line ~2329 handles "pending" gate state but doesn't handle
// the case where it's a poll payload from a company instance properly.
// We need to extract selectedOptions from pollUpdates (voters) for company instance polls.

const oldGatePendingBlock = `    if (activeGateState?.status === "pending") {\r\n      const surveyOutcome = resolveSurveyOutcome(normalized);\r\n      let decision = surveyOutcome.decision;\r\n      const isPollPayload = /poll/i.test(\r\n        String(normalized.rawType || normalized.messageType || ""),\r\n      );`;

const newGatePendingBlock = `    if (activeGateState?.status === "pending") {\r\n      const isPollPayload = /poll/i.test(\r\n        String(normalized.rawType || normalized.messageType || ""),\r\n      );\r\n\r\n      // For company instances (non-support), extract poll selection from pollUpdates.voters\r\n      // just like the support instance does, so the gate can resolve survey outcomes.\r\n      if (isPollPayload && !hasProcessableText(normalized.text)) {\r\n        const selectedFromPollUpdates = extractSelectedOptionsFromPollUpdates(\r\n          normalized.raw || {},\r\n        );\r\n        if (selectedFromPollUpdates.length > 0) {\r\n          normalized.text = selectedFromPollUpdates.join(", ");\r\n          console.log(\r\n            \`📊 Poll empresa | from=\${maskPhoneForLog(normalized.phoneNumber)} | selected=\${normalized.text}\`,\r\n          );\r\n        } else {\r\n          // Poll payload but no resolved selection (e.g. WhatsApp encrypted poll)\r\n          // Log it for debugging but skip — we cannot determine the selection.\r\n          console.log(\r\n            \`📊 Poll empresa sin selección legible | from=\${maskPhoneForLog(normalized.phoneNumber)} | type=\${normalized.rawType || normalized.messageType}\`,\r\n          );\r\n          continue;\r\n        }\r\n      }\r\n\r\n      const surveyOutcome = resolveSurveyOutcome(normalized);\r\n      let decision = surveyOutcome.decision;`;

if (!content.includes(oldGatePendingBlock)) {
    console.error('❌ Target block not found!');
    const idx = content.indexOf('if (activeGateState?.status === "pending")');
    console.log('Index of pending block:', idx);
    if (idx !== -1) {
        console.log('Context:', JSON.stringify(content.slice(idx, idx + 300)));
    }
    process.exit(1);
}

content = content.replace(oldGatePendingBlock, newGatePendingBlock);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully patched pending gate poll handling for company instances');
