const prisma = require("../config/prisma");
const {
  buildInstanceName,
  createInstanceWithQr,
  disconnectInstance,
  getSafeConnectionState,
  normalizeInstanceName,
} = require("../services/evolution.service");

// Helper to save or update CONFIG_WHATSAPP
const persistWhatsappInstance = async ({ companyId, instanceName, phoneNumber, status }) => {
  let config = await prisma.cONFIG_WHATSAPP.findUnique({
    where: { id_empresa: companyId }
  });

  const isConnected = status === "open";

  if (config) {
    return await prisma.cONFIG_WHATSAPP.update({
      where: { id_whatsapp: config.id_whatsapp },
      data: {
        instance_name: instanceName,
        whatsapp_number: phoneNumber,
        conectado: isConnected,
      }
    });
  } else {
    return await prisma.cONFIG_WHATSAPP.create({
      data: {
        id_empresa: companyId,
        instance_name: instanceName,
        whatsapp_number: phoneNumber,
        conectado: isConnected,
      }
    });
  }
};

const createInstanceQr = async (req, res, next) => {
  try {
    const { number } = req.body || {};
    const companyId = req.user.id_empresa;

    const result = await createInstanceWithQr({
      number: number ? String(number).trim() : null,
      companyId,
    });

    const status = result.connectionState?.instance?.state || result.connectionState?.state || "close";

    await persistWhatsappInstance({
      companyId,
      instanceName: result.instanceName,
      phoneNumber: number ? String(number).trim() : null,
      status,
    });

    res.json({
      message: "Instancia creada correctamente",
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error al generar QR" });
  }
};

const getCurrentInstance = async (req, res, next) => {
  try {
    const companyId = req.user.id_empresa;
    let storedInstance = await prisma.cONFIG_WHATSAPP.findUnique({
      where: { id_empresa: companyId }
    });

    if (!storedInstance || !storedInstance.instance_name) {
      return res.json({ instance: null });
    }

    const instanceName = normalizeInstanceName(storedInstance.instance_name);
    const connectionState = await getSafeConnectionState(instanceName);
    const resolvedStatus = connectionState.instance?.state || connectionState.state || "unknown";

    // Mantenemos sincronizado el estado
    await persistWhatsappInstance({
      companyId,
      instanceName,
      phoneNumber: storedInstance.whatsapp_number,
      status: resolvedStatus,
    });

    res.json({
      instance: {
        id: storedInstance.id_whatsapp,
        instanceName,
        phoneNumber: storedInstance.whatsapp_number,
        status: resolvedStatus,
        conectado: resolvedStatus === 'open',
      },
      connectionState,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error al obtener la instancia" });
  }
};

const disconnectCurrentInstance = async (req, res, next) => {
  try {
    const companyId = req.user.id_empresa;
    const storedInstance = await prisma.cONFIG_WHATSAPP.findUnique({
      where: { id_empresa: companyId }
    });

    if (!storedInstance || !storedInstance.instance_name) {
      return res.status(400).json({
        message: "No hay una instancia de WhatsApp vinculada para desconectar",
      });
    }

    const instanceName = normalizeInstanceName(storedInstance.instance_name);
    const result = await disconnectInstance(instanceName);

    await persistWhatsappInstance({
      companyId,
      instanceName,
      phoneNumber: null,
      status: "close",
    });

    res.json({
      message: "WhatsApp desconectado correctamente",
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error al desconectar" });
  }
};

module.exports = {
  createInstanceQr,
  getCurrentInstance,
  disconnectCurrentInstance,
};
