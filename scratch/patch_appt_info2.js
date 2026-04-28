const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// Strategy: inject the appointment_info direct handler right after decision is resolved
// to "yes" and the action is "appointment_info", before it goes to the gate opt-in flow.
// We insert it right after the "Poll resuelto por snapshot" log block.

const ANCHOR = `      // If poll payload matched a snapshot option but decision is still null, resolve it.
      if (!decision && selectedSurveyOption && isPollPayload) {
        decision = selectedSurveyOption.action === "none" ? "no" : "yes";
        console.log(
        \`📊 Poll resuelto por snapshot | from=\${maskPhoneForLog(normalized.phoneNumber)} | action=\${selectedSurveyOption.action} | label=\${selectedSurveyOption.label}\`,
      );
      }`;

const REPLACEMENT = `      // If poll payload matched a snapshot option but decision is still null, resolve it.
      if (!decision && selectedSurveyOption && isPollPayload) {
        decision = selectedSurveyOption.action === "none" ? "no" : "yes";
        console.log(
        \`📊 Poll resuelto por snapshot | from=\${maskPhoneForLog(normalized.phoneNumber)} | action=\${selectedSurveyOption.action} | label=\${selectedSurveyOption.label}\`,
      );
      }

      // ── Direct handler: appointment_info bypasses LLM entirely ──────────────
      if (decision === "yes" && selectedSurveyOption?.action === "appointment_info") {
        whatsappConversationGate.set(gateKey, { status: "opted-in", updatedAt: now });
        const infoSent = await sendAppointmentInfoMessage({
          instanceName,
          phoneNumber: normalized.phoneNumber,
        });
        if (infoSent) {
          appendConversationLog({
            event: "outbound_sent",
            instanceName,
            phone: normalized.phoneNumber,
            text: "[appointment_info_direct]",
          });
          continue;
        }
        // If it failed for some reason, fall through to the LLM
      }`;

if (!content.includes(ANCHOR)) {
    console.error('❌ Anchor not found!');
    process.exit(1);
}

content = content.replace(ANCHOR, REPLACEMENT);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Injected appointment_info direct handler into pending gate');
