const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `  const isSupportInstance =\r\n    normalizedInstanceName === normalizeInstanceName(SUPPORT_INSTANCE_NAME);\r\n  if (!isSupportInstance) return false;\r\n`;

const newCode = `  // NOTE: The confirmation poll is sent FROM the support instance TO the company owner's number.\r\n  // However, the poll RESPONSE arrives on the company's own instance (the owner's phone is\r\n  // registered there). So we allow ANY instance to process pending poll confirmations.\r\n`;

if (!content.includes(oldCode)) {
    console.error('❌ Target text not found!');
    // Try to find nearby text
    const idx = content.indexOf('if (!isSupportInstance) return false;');
    console.log('Index of isSupportInstance check:', idx);
    if (idx !== -1) {
        console.log('Context:', JSON.stringify(content.slice(idx - 100, idx + 100)));
    }
    process.exit(1);
}

const replaced = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, replaced, 'utf8');
console.log('✅ Successfully patched handleAppointmentPollConfirmation');
