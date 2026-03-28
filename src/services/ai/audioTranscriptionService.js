const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

/**
 * Obtiene el base64 de un mensaje multimedia desde Evolution API
 */
const getMediaBase64 = async (instanceName, messageId) => {
  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL.replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        message: {
          key: {
            id: messageId
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );
    
    return response.data.base64;
  } catch (error) {
    console.error('❌ Error obteniendo base64 del audio desde Evolution API:', error?.response?.data || error.message);
    return null;
  }
};

/**
 * Transcribe un audio en base64 usando Google Gemini
 */
const transcribeAudio = async (base64Data) => {
  if (!GOOGLE_API_KEY) {
    console.log("⚠️ No hay GOOGLE_API_KEY configurada para transcribir audios. Por favor, agregala en el archivo .env");
    return "[Audio recibido, pero la transcripción por IA no está configurada]";
  }

  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    // Usamos gemini-2.0-flash o superior que son rápidos y soportan audio nativamente
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 
    
    const result = await model.generateContent([
      "Desgraba el siguiente audio con total precisión. No agregues comillas, comentarios ni aclaraciones. Solo quiero el texto de lo que se dijo:",
      {
        inlineData: {
          mimeType: "audio/ogg", 
          data: base64Data
        }
      }
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error('❌ Error transcribiendo audio con Gemini:', error.message);
    return "[Audio recibido, pero falló la transcripción]";
  }
};

/**
 * Procesa un mensaje de audio entrante
 */
const processAudioMessage = async (instanceName, messageId) => {
  const base64 = await getMediaBase64(instanceName, messageId);
  if (!base64) {
    return "[Error al descargar el audio]";
  }

  const transcript = await transcribeAudio(base64);
  console.log(`🎙️ Audio transcrito (${messageId}):`, transcript);
  return transcript;
};

module.exports = {
  processAudioMessage,
  transcribeAudio
};
