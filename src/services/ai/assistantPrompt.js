/**
 * Build the system prompt for the WhatsApp AI assistant.
 * Adapts dynamically to the company context (services, professionals, etc.)
 */
const buildAssistantPrompt = (companyContext, customerName = "") => {
  const {
    companyName = "la empresa",
    professionals = [],
    services = [],
    customerPendingAppointments = [],
    assistantPersonaName = "Asistente",
    botConfig = {},
  } = companyContext || {};

  const profList = professionals.length
    ? professionals
        .map(
          (p) =>
            `- ${p.name} (ID: ${p.id})${
              p.services?.length
                ? ` → servicios: ${p.services.map((s) => `${s.name} ($${s.price}, ${s.duration}min)`).join(", ")}`
                : ""
            }`
        )
        .join("\n")
    : "No hay prestadores configurados aún.";

  const svcList = services.length
    ? services
        .map(
          (s) =>
            `- ${s.name} (ID: ${s.id}) — ${s.duration} min — $${s.price}${
              s.description ? ` — ${s.description}` : ""
            }`
        )
        .join("\n")
    : "No hay servicios configurados aún.";

  const pendingList = customerPendingAppointments.length
    ? customerPendingAppointments
        .map(
          (a) =>
            `- ${a.date} a las ${a.time} con ${a.professional} (${a.service})`
        )
        .join("\n")
    : "Sin turnos pendientes.";

  const rubroText = botConfig.rubro ? `Trabajás en el rubro de: ${botConfig.rubro}.` : "";
  const tonoText = botConfig.tono ? `Tu tono de conversación debe ser: ${botConfig.tono}.` : "Tono argentino, amable, directo. Mensajes cortos tipo WhatsApp.";
  const palabrasPropias = botConfig.palabras_propias ? `\nVOCABULARIO PROPIO (Usá estas palabras/frases de forma natural cuando sea posible):\n- ${botConfig.palabras_propias.replace(/\n/g, "\n- ")}` : "";
  
  let bienvenidaStr = botConfig.mensaje_bienvenida || "Si el cliente saluda, respondé con un saludo corto.";
  bienvenidaStr = bienvenidaStr.replace(/\{nombre_cliente\}/g, customerName || "cliente");

  const bienvenidaText = botConfig.mensaje_bienvenida ? `5. SIEMPRE QUE INICIES LA CONVERSACIÓN CON UN NUEVO CLIENTE (O SI EL HISTORIAL ESTÁ VACÍO), debés enviar EXACTAMENTE el siguiente Mensaje de Bienvenida (no le sumes ni le restes palabras):\n"${bienvenidaStr}"` : "If the customer says hello, reply with a short greeting and ask if they want to book an appointment.";

  return `Sos ${assistantPersonaName}, asistente virtual de ${companyName}. Respondés por WhatsApp.
${rubroText}
${tonoText}

REGLAS ESTRICTAS:
1. Sin markdown, sin asteriscos, sin bullet points. Usá emojis con moderación (1-2 por mensaje como máximo).
2. NUNCA inventes horarios, prestadores ni servicios. Solo usá los datos reales de las herramientas.
3. Para agendar: SIEMPRE buscá horarios disponibles con find_available_slots ANTES de confirmar.
4. Confirmá todos los detalles (día, hora, prestador, servicio) antes de crear el turno, y pedí nombre si no lo tenés.
${bienvenidaText}
6. Si no hay horarios disponibles, decilo honestamente y sugerí otros días.
7. Si te preguntan algo fuera del rubro de ${companyName}, respondé amablemente que solo gestionás consultas y turnos.
8. NO respondas con listas largas. Ofrecé 3-5 opciones máximo y preguntá si quiere ver más.${palabrasPropias}

PRESTADORES DISPONIBLES:
${profList}

SERVICIOS DISPONIBLES:
${svcList}

TURNOS PENDIENTES DEL CLIENTE:
${pendingList}`;
};

module.exports = { buildAssistantPrompt };
