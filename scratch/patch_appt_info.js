const fs = require('fs');
const filePath = 'src/services/evolution.service.js';
let content = fs.readFileSync(filePath, 'utf8');

// We need to add a new function sendAppointmentInfoDirectMessage and inject it
// right before enqueueIncomingMessageForAssistant at the end of the loop.

// 1. Add the helper function before processIncomingMessage
const HELPER_ANCHOR = 'const processIncomingMessage = async ({ instanceName, webhookData }) => {';

const NEW_HELPER = `// ─── Direct appointment info message (bypasses LLM) ──────────────────────────
const sendAppointmentInfoMessage = async ({ instanceName, phoneNumber }) => {
  const normalizedInstanceName = normalizeInstanceName(instanceName);
  const number = String(phoneNumber).replace(/[^\\d]/g, '');

  try {
    // Get upcoming appointments for this phone number from this company instance
    const [rows] = await pool.execute(
      \`SELECT
          t.id_turno,
          t.fecha_hora,
          t.estado,
          c.nombre_wa,
          s.nombre AS servicio_nombre,
          e.nombre_comercial,
          e.direccion
       FROM TURNO t
       JOIN CLIENTE c ON c.id_cliente = t.id_cliente
       JOIN SERVICIO s ON s.id_servicio = t.id_servicio
       JOIN EMPRESA e ON e.id_empresa = c.id_empresa
       JOIN CONFIG_WHATSAPP cw ON cw.id_empresa = e.id_empresa
       WHERE cw.instance_name = ?
         AND (c.whatsapp_id = ? OR c.whatsapp_id = ?)
         AND t.estado IN ('pendiente', 'pendiente_confirmacion', 'confirmado')
         AND t.fecha_hora >= NOW()
       ORDER BY t.fecha_hora ASC
       LIMIT 5\`,
      [normalizedInstanceName, number, \`549\${number}\`.slice(-11)],
    );

    if (!rows.length) {
      await sendTextMessage(
        number,
        '¡Hola! 👋 No encontré turnos próximos agendados para tu número. Si querés sacar uno, ¡con gusto te ayudo!',
        normalizedInstanceName,
      );
      return true;
    }

    const clientName = rows[0].nombre_wa || '';
    const address = rows[0].direccion || '';
    const companyName = rows[0].nombre_comercial || '';

    const greeting = clientName
      ? \`¡Hola, *\${clientName}*! 👋\`
      : '¡Hola! 👋';

    const turnosText = rows
      .map((row) => {
        const fecha = new Date(row.fecha_hora).toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        const hora = new Date(row.fecha_hora).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const estadoEmoji =
          row.estado === 'confirmado'
            ? '✅'
            : row.estado === 'pendiente_confirmacion'
            ? '⏳'
            : '📅';
        return \`\${estadoEmoji} *\${row.servicio_nombre}* — \${fecha} a las \${hora}\`;
      })
      .join('\\n');

    const lines = [
      greeting,
      '',
      \`Estos son tus turnos próximos en *\${companyName}*:\`,
      '',
      turnosText,
    ];

    if (address) {
      lines.push('');
      lines.push(\`📍 *Dirección:* \${address}\`);
    }

    lines.push('');
    lines.push('¡Te esperamos! 😊');

    await sendTextMessage(number, lines.join('\\n'), normalizedInstanceName);
    console.log(
      \`📋 Info turnos enviada directamente | to=\${maskPhoneForLog(number)} | count=\${rows.length}\`,
    );
    return true;
  } catch (error) {
    console.error('❌ Error enviando info de turnos:', error.message);
    return false;
  }
};

`;

if (!content.includes(HELPER_ANCHOR)) {
  console.error('❌ Cannot find processIncomingMessage anchor');
  process.exit(1);
}

content = content.replace(HELPER_ANCHOR, NEW_HELPER + HELPER_ANCHOR);

// 2. Inject the intercept right before enqueueIncomingMessageForAssistant
const ENQUEUE_ANCHOR = '    enqueueIncomingMessageForAssistant({ instanceName, normalized });\r\n  }\r\n};';

const NEW_INTERCEPT = `    // ── Direct handler: appointment_info bypasses LLM ──────────────────────
    if (normalized.rawType === 'pollResponseSynthetic' &&
        normalized._pollAction === 'appointment_info') {
      await sendAppointmentInfoMessage({
        instanceName,
        phoneNumber: normalized.phoneNumber,
      });
      appendConversationLog({
        event: 'outbound_sent',
        instanceName,
        phone: normalized.phoneNumber,
        text: '[appointment_info_direct]',
      });
      continue;
    }

    enqueueIncomingMessageForAssistant({ instanceName, normalized });\r\n  }\r\n};`;

if (!content.includes(ENQUEUE_ANCHOR)) {
  console.error('❌ Cannot find enqueueIncomingMessageForAssistant anchor');
  const idx = content.indexOf('enqueueIncomingMessageForAssistant');
  console.log('Index:', idx, content.slice(idx - 10, idx + 100));
  process.exit(1);
}

content = content.replace(ENQUEUE_ANCHOR, NEW_INTERCEPT);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Added sendAppointmentInfoMessage and intercept');
