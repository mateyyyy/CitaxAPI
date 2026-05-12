const pool = require("../config/db");
const logger = require("../utils/logger");
const { sendTextMessage } = require("./evolution.service");

const POLL_INTERVAL_MS = 60_000;
const WINDOW_SECONDS = 90;
const LOOKAHEAD_HOURS = 48;

let intervalHandle = null;

function resolveTemplate(template, vars) {
  return template
    .replace(/\{\{cliente_nombre\}\}/g, vars.cliente_nombre || "")
    .replace(/\{\{fecha\}\}/g, vars.fecha || "")
    .replace(/\{\{hora\}\}/g, vars.hora || "")
    .replace(/\{\{empresa_nombre\}\}/g, vars.empresa_nombre || "");
}

function formatDateLocal(date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatTimeLocal(date) {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

async function processReminders() {
  try {
    const [rows] = await pool.execute(
      `SELECT
        t.id_turno,
        t.fecha_hora,
        c.nombre_wa AS cliente_nombre,
        c.whatsapp_id,
        e.id_empresa,
        e.nombre_comercial AS empresa_nombre,
        e.config_recordatorios,
        cw.instance_name
      FROM TURNO t
      JOIN CLIENTE c ON c.id_cliente = t.id_cliente
      JOIN EMPRESA e ON e.id_empresa = c.id_empresa
      LEFT JOIN CONFIG_WHATSAPP cw ON cw.id_empresa = e.id_empresa
      WHERE t.estado IN ('pendiente', 'pendiente_confirmacion', 'confirmado')
        AND t.fecha_hora BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)`,
      [LOOKAHEAD_HOURS],
    );

    for (const row of rows) {
      try {
        await processSingleReminder(row);
      } catch (err) {
        logger.error(
          { err, id_turno: row.id_turno },
          "Error procesando recordatorio para turno",
        );
      }
    }
  } catch (err) {
    logger.error({ err }, "Error en ciclo de recordatorios");
  }
}

async function processSingleReminder(row) {
  if (!row.whatsapp_id || !row.instance_name) return;
  if (!row.config_recordatorios) return;

  const config =
    typeof row.config_recordatorios === "string"
      ? JSON.parse(row.config_recordatorios)
      : row.config_recordatorios;

  if (!config.recordatorio_activo) return;

  const offsets = config.recordatorio_offsets_minutos;
  if (!Array.isArray(offsets) || offsets.length === 0) return;

  const appointmentDate = new Date(row.fecha_hora);
  const now = new Date();

  for (const offset of offsets) {
    const idealSendTime = new Date(appointmentDate.getTime() - offset * 60_000);
    const diffMs = idealSendTime.getTime() - now.getTime();

    if (Math.abs(diffMs) > WINDOW_SECONDS * 1000) continue;

    const [[sentRow]] = await pool.execute(
      "SELECT 1 FROM TURNO_RECORDATORIO WHERE id_turno = ? AND offset_minutos = ? LIMIT 1",
      [row.id_turno, offset],
    );

    if (sentRow) continue;

    const template =
      config.recordatorio_mensaje?.trim() ||
      "Hola {{cliente_nombre}}, te recordamos tu turno para {{fecha}} a las {{hora}} en {{empresa_nombre}}.";

    const message = resolveTemplate(template, {
      cliente_nombre: row.cliente_nombre || "",
      fecha: formatDateLocal(appointmentDate),
      hora: formatTimeLocal(appointmentDate),
      empresa_nombre: row.empresa_nombre || "",
    });

    await sendTextMessage(row.whatsapp_id, message, row.instance_name);

    await pool.execute(
      "INSERT INTO TURNO_RECORDATORIO (id_turno, offset_minutos, enviado_at) VALUES (?, ?, NOW())",
      [row.id_turno, offset],
    );

    logger.info(
      { id_turno: row.id_turno, offset, empresa: row.id_empresa },
      `Recordatorio enviado | turno=${row.id_turno} offset=${offset}min`,
    );
  }
}

function start() {
  if (intervalHandle) return;
  logger.info("Iniciando scheduler de recordatorios (cada 60s)");
  intervalHandle = setInterval(processReminders, POLL_INTERVAL_MS);
  processReminders().catch((err) =>
    logger.error({ err }, "Error en primer ciclo de recordatorios"),
  );
}

function stop() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
  logger.info("Scheduler de recordatorios detenido");
}

module.exports = { start, stop };
