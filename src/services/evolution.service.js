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

  const response = await evolutionOpenClient.post("/instance/create-qr", payload);

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

module.exports = {
  buildInstanceName,
  createInstanceWithQr,
  disconnectInstance,
  getConnectionState,
  getSafeConnectionState,
  normalizeInstanceName,
};
