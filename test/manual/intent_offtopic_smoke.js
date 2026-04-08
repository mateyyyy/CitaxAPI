require("dotenv").config();

const { runWhatsappAssistant } = require("../../src/services/ai/geminiService");

const companyContext = {
  companyId: 2,
  companyName: "Citax Test",
  professionals: [
    {
      id: 1,
      name: "Sergio Pereira",
      services: [
        { id: 1, name: "Corte", duration: 30, price: 10000 },
        { id: 2, name: "Barba", duration: 30, price: 9000 },
      ],
    },
  ],
  services: [
    { id: 1, name: "Corte", duration: 30, price: 10000, description: "" },
    { id: 2, name: "Barba", duration: 30, price: 9000, description: "" },
  ],
  customerPendingAppointments: [],
  assistantPersonaName: "Sergio",
  timezone: "America/Argentina/Buenos_Aires",
  singleProviderMode: false,
  welcomeMessage:
    "Hola, como estas amigaso, queres reservar un turno para hoy?",
  ownPhrases: {},
};

const offTopicCases = [
  "Holaaa sergio estas para un padel?",
  "Noo, era para ver si salimos a comer",
  "Me pasas el resultado del partido?",
  "Che, juega river hoy?",
  "Trae mate que caigo en 20",
  "Tenes cambio de 20 mil?",
  "Donde compraste esas zapas?",
  "Jajaja que capo",
  "Mañana hacemos asado en casa",
  "Al final no puedo ir al cumple",
  "Sale una birra despues?",
  "Mandame la direccion de tu casa",
  "Estoy viendo una peli, recomendame otra",
  "Me olvide las llaves en tu auto",
  "Que onda el clima hoy para ir a la cancha?",
  "A que hora arranca el partido?",
  "Te paso a buscar en 10",
  "Traes la raqueta para el padel?",
  "Jajaja no era para turno",
  "Tenes Spotify premium?",
  "Que cenaste hoy?",
  "Pasame el link del grupo",
  "Nos juntamos el finde?",
  "Che Mati esta todo bien?",
  "Feliz cumple crack",
];

async function main() {
  const rows = [];

  for (let index = 0; index < offTopicCases.length; index += 1) {
    const text = offTopicCases[index];
    const phoneNumber = `549265799${String(index + 100).padStart(3, "0")}`;

    try {
      const result = await runWhatsappAssistant({
        instanceName: "citax-empresa-2-whatsapp",
        incomingMessage: {
          phoneNumber,
          pushName: "Mati",
          text,
          fromMe: false,
          isGroup: false,
        },
        companyContext,
      });

      rows.push({
        idx: index + 1,
        ignored: result?.enabled ? "NO" : "SI",
        enabled: Boolean(result?.enabled),
        reason: result?.reason || "-",
        replyPreview: String(result?.text || "").slice(0, 90),
        text,
      });
    } catch (error) {
      rows.push({
        idx: index + 1,
        ignored: "ERROR",
        enabled: false,
        reason: error.message,
        replyPreview: "",
        text,
      });
    }
  }

  const ignoredCount = rows.filter((row) => row.ignored === "SI").length;
  const repliedCount = rows.filter((row) => row.enabled).length;
  const errorCount = rows.filter((row) => row.ignored === "ERROR").length;

  console.log("\n=== RESULTADO SMOKE TEST OFF-TOPIC ===");
  console.log(`Total casos: ${rows.length}`);
  console.log(`Ignorados: ${ignoredCount}`);
  console.log(`Respondidos: ${repliedCount}`);
  console.log(`Errores: ${errorCount}\n`);

  for (const row of rows) {
    console.log(
      `#${row.idx} | ignored=${row.ignored} | reason=${row.reason} | msg="${row.text}" | reply="${row.replyPreview}"`,
    );
  }
}

main().catch((error) => {
  console.error("Error ejecutando smoke test:", error);
  process.exitCode = 1;
});
