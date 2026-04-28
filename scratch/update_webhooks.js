require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL.replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL;

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !BACKEND_PUBLIC_URL) {
    console.error('❌ Faltan variables en el .env (EVOLUTION_API_URL, EVOLUTION_API_KEY o BACKEND_PUBLIC_URL)');
    process.exit(1);
}

async function updateWebhooks() {
    try {
        console.log(`🔗 Usando BACKEND_PUBLIC_URL: ${BACKEND_PUBLIC_URL}`);
        
        // 1. Obtener todas las instancias
        const instancesRes = await axios.get(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            headers: { apikey: EVOLUTION_API_KEY }
        });
        
        const instances = Array.isArray(instancesRes.data) ? instancesRes.data : [];
        console.log(`found ${instances.length} instances.`);

        for (const instance of instances) {
            const instanceName = instance.instanceName || instance.name;
            if (!instanceName) continue;

            const webhookUrl = `${BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/whatsapp/webhook/${instanceName}`;
            
            console.log(`🔄 Actualizando webhook para: ${instanceName}...`);
            
            try {
                const res = await axios.post(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
                    webhook: {
                        enabled: true,
                        url: webhookUrl,
                        byEvents: false,
                        base64: false,
                        events: [
                            "MESSAGES_UPSERT",
                            "MESSAGES_UPDATE",
                            "QRCODE_UPDATED",
                            "CONNECTION_UPDATE"
                        ]
                    }
                }, {
                    headers: { apikey: EVOLUTION_API_KEY }
                });
                
                console.log(`✅ Webhook actualizado para ${instanceName}: ${webhookUrl}`);
            } catch (err) {
                console.error(`❌ Error actualizando ${instanceName}:`, err.response?.data || err.message);
            }
        }
        
        console.log('\n✨ Proceso de actualización finalizado.');
    } catch (error) {
        console.error('❌ Error general:', error.response?.data || error.message);
    }
}

updateWebhooks();
