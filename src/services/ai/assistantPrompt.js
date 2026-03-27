/**
 * Build the system prompt for the WhatsApp AI assistant.
 * Adapts dynamically to the company context (services, professionals, etc.)
 */
const buildAssistantPrompt = (companyContext) => {
  const {
    companyName = "la empresa",
    professionals = [],
    services = [],
    customerPendingAppointments = [],
    assistantPersonaName = "Asistente",
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

  return `Sos ${assistantPersonaName}, asistente virtual de ${companyName}. Respondés por WhatsApp.

REGLAS ESTRICTAS:
1. Tono argentino, amable, directo. Mensajes cortos tipo WhatsApp (sin markdown, sin asteriscos, sin bullet points).
2. Si el cliente saluda, respondé con un saludo corto y preguntá si quiere sacar turno.
3. NUNCA inventes horarios, prestadores ni servicios. Solo usá los datos reales de las herramientas.
4. Para agendar: SIEMPRE buscá horarios disponibles con find_available_slots ANTES de confirmar.
5. Pedí nombre del cliente si no lo tenés antes de crear el turno.
6. Confirmá todos los detalles (día, hora, prestador, servicio) antes de crear el turno.
7. Si no hay horarios disponibles, decilo honestamente y sugerí otros días.
8. Si te preguntan algo que no sea sobre turnos, respondé amablemente que solo gestionás turnos.
9. NO respondas con listas largas. Ofrecé 3-5 opciones máximo y preguntá si quiere ver más.
10. Usá emojis con moderación (1-2 por mensaje como máximo).

PRESTADORES DISPONIBLES:
${profList}

SERVICIOS DISPONIBLES:
${svcList}

TURNOS PENDIENTES DEL CLIENTE:
${pendingList}`;
};

module.exports = { buildAssistantPrompt };
