const axios = require("axios");

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "429683C4C977415CAAFCCE10F7D57E11";
const EVOLUTION_WEBHOOK_ENABLED = (process.env.EVOLUTION_WEBHOOK_ENABLED || "true") === "true";
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || "";

const evolutionClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  },
  timeout: 15000,
});

const evolutionOpenClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

const normalizeInstanceName = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
};

const buildInstanceName = ({ companyId }) => {
  return normalizeInstanceName(`citax-empresa-${companyId}-whatsapp`);
};

const getConnectionState = async (instanceName) => {
  const normalizedInstanceName = normalizeInstanceName(instanceName);
  const response = await evolutionClient.get(
    `/instance/connectionState/${normalizedInstanceName}`
  );
  return response.data;
};

const getSafeConnectionState = async (instanceName) => {
  try {
    const stateResponse = await getConnectionState(instanceName);
    return stateResponse;
  } catch (error) {
    return {
      instanceName: normalizeInstanceName(instanceName),
      state: "unknown",
      reason: error.response?.data || error.message,
    };
  }
};

const registerWebhook = async (instanceName) => {
  if (!BACKEND_PUBLIC_URL || !EVOLUTION_WEBHOOK_ENABLED) {
    return {
      configured: false,
      reason: "BACKEND_PUBLIC_URL no configurada o webhook deshabilitado",
    };
  }

  const normalizedInstanceName = normalizeInstanceName(instanceName);
  const webhookUrl = `${BACKEND_PUBLIC_URL.replace(/\/$/, "")}/api/whatsapp/webhook/${normalizedInstanceName}`;

  try {
    const response = await evolutionClient.post(
      `/webhook/set/${normalizedInstanceName}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "QRCODE_UPDATED", "CONNECTION_UPDATE"],
        },
      }
    );
    return { configured: true, webhookUrl, response: response.data };
  } catch (error) {
    return { configured: false, webhookUrl, reason: error.response?.data || error.message };
  }
};

const createInstanceWithQr = async ({ instanceName, number = null, companyId }) => {
  const resolvedInstanceName = normalizeInstanceName(
    instanceName || buildInstanceName({ companyId })
  );

  const payload = {
    instanceName: resolvedInstanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    rejectCall: false,
    alwaysOnline: true,
    syncFullHistory: false,
    groupsIgnore: true,
  };

  if (number) {
    payload.number = String(number);
  }

  let response;
  try {
    response = await evolutionOpenClient.post("/instance/create-qr", payload);
    // Delay de seguridad de 2 segundos para instancias nuevas
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    // Si la instancia ya existe, Evolution devuelve 400. En ese caso simplemente nos conectamos.
    if (error.response?.status === 400 || error.response?.status === 403) {
      response = await evolutionOpenClient.get(`/instance/connect/${resolvedInstanceName}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      throw error;
    }
  }

  const connectionState = await getSafeConnectionState(resolvedInstanceName);
  const webhook = await registerWebhook(resolvedInstanceName);

  return {
    instanceName: resolvedInstanceName,
    qrcode: response.data?.qrcode || null,
    raw: response.data,
    connectionState,
    webhook,
  };
};

const disconnectInstance = async (instanceName) => {
  const normalizedInstanceName = normalizeInstanceName(instanceName);
  try {
    const response = await evolutionClient.delete(
      `/instance/logout/${normalizedInstanceName}`
    );
    return { success: true, instanceName: normalizedInstanceName, response: response.data };
  } catch (error) {
    const status = error.response?.status;
    if (status === 404 || status === 400) {
      return {
        success: true,
        instanceName: normalizedInstanceName,
        response: error.response?.data || { message: "Instancia ya desconectada o no existe" },
      };
    }
    throw error;
  }
};

// ─── Send text message via Evolution API ──────────────────────────────
const sendTextMessage = async (phoneNumber, text, instanceName) => {
  const normalizedInstanceName = normalizeInstanceName(instanceName);
  const number = String(phoneNumber).replace(/[^\d]/g, "");
  const response = await evolutionClient.post(
    `/message/sendText/${normalizedInstanceName}`,
    {
      number,
      text,
    }
  );
  return response.data;
};

// ─── Extract messages from webhook payload ────────────────────────────
const extractIncomingMessages = (webhookData) => {
  if (!webhookData) return [];
  const event = webhookData.event || webhookData.type || "";
  if (event !== "messages.upsert") return [];
  const data = webhookData.data || webhookData;
  if (Array.isArray(data)) return data;
  if (data.key || data.message) return [data];
  return [];
};

// ─── Normalize an incoming message ────────────────────────────────────
const normalizeIncomingMessage = (instanceName, raw, webhookData) => {
  const key = raw?.key || {};
  const msg = raw?.message || {};
  const fromMe = key.fromMe === true;
  const isGroup = String(key.remoteJid || "").endsWith("@g.us");
  const phoneNumber = String(key.remoteJid || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/[^\d]/g, "")
    .trim();

  const text =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    "";

  return {
    instanceName,
    messageId: key.id || null,
    phoneNumber,
    pushName: raw.pushName || "",
    text,
    fromMe,
    isGroup,
    timestamp: raw.messageTimestamp || Date.now(),
    raw,
  };
};

// ─── In-memory recent messages store (for frontend) ───────────────────
const recentMessagesStore = new Map();
const MAX_RECENT = 100;

const storeRecentMessage = (instanceName, normalized) => {
  const key = normalizeInstanceName(instanceName);
  if (!recentMessagesStore.has(key)) recentMessagesStore.set(key, []);
  const list = recentMessagesStore.get(key);
  list.push({
    id: normalized.messageId,
    from: normalized.phoneNumber,
    pushName: normalized.pushName,
    text: normalized.text,
    fromMe: normalized.fromMe,
    isGroup: normalized.isGroup,
    timestamp: normalized.timestamp,
  });
  if (list.length > MAX_RECENT) list.splice(0, list.length - MAX_RECENT);
};

const getRecentMessages = (instanceName) => {
  return recentMessagesStore.get(normalizeInstanceName(instanceName)) || [];
};

// ─── Process incoming messages (AI pipeline) ──────────────────────────
const processIncomingMessage = async ({ instanceName, webhookData }) => {
  const messages = extractIncomingMessages(webhookData);

  if (!messages.length) {
    console.log("📡 Evento de WhatsApp recibido (sin mensajes):", {
      instanceName,
      event: webhookData?.event || webhookData?.type || "unknown",
    });
    return;
  }

  // Lazy-load AI to avoid circular deps at startup
  const { runWhatsappAssistant } = require("./ai/geminiService");

  for (const message of messages) {
    const normalized = normalizeIncomingMessage(instanceName, message, webhookData);
    storeRecentMessage(instanceName, normalized);

    console.log("📩 Mensaje entrante:", {
      instanceName,
      from: normalized.phoneNumber,
      pushName: normalized.pushName,
      text: String(normalized.text || "").slice(0, 100),
      fromMe: normalized.fromMe,
      isGroup: normalized.isGroup,
    });

    // Skip groups, self-messages, or messages without phone
    if (normalized.isGroup) { console.log("⏭️ Ignorado: es grupo"); continue; }
    if (normalized.fromMe) { console.log("⏭️ Ignorado: fromMe=true"); continue; }
    if (!normalized.phoneNumber) { console.log("⏭️ Ignorado: sin teléfono"); continue; }

    // Check connection state
    const connectionState = await getSafeConnectionState(instanceName);
    const status = connectionState?.instance?.state || connectionState?.state || "unknown";
    if (status !== "open") { console.log("⏭️ Ignorado: instancia no abierta, status:", status); continue; }

    console.log("🧠 Ejecutando asistente IA para:", normalized.phoneNumber);

    try {
      const aiResponse = await runWhatsappAssistant({
        instanceName,
        incomingMessage: normalized,
      });

      console.log("🤖 Resultado IA:", {
        enabled: aiResponse?.enabled,
        hasText: Boolean(aiResponse?.text),
        reason: aiResponse?.reason || null,
        textPreview: (aiResponse?.text || "").slice(0, 150),
      });

      if (aiResponse?.enabled && aiResponse?.text) {
        await sendTextMessage(normalized.phoneNumber, aiResponse.text, instanceName);
        console.log("✅ Respuesta IA enviada a:", normalized.phoneNumber);
      } else {
        console.log("ℹ️ IA no respondió:", aiResponse?.reason || "sin razón");
      }
    } catch (error) {
      console.error("❌ Error ejecutando asistente IA:", error.message, error.stack?.slice(0, 300));
    }
  }
};

module.exports = {
  buildInstanceName,
  createInstanceWithQr,
  disconnectInstance,
  getConnectionState,
  getRecentMessages,
  getSafeConnectionState,
  normalizeInstanceName,
  processIncomingMessage,
  registerWebhook,
  sendTextMessage,
};
