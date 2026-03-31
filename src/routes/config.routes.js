const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const {
    countCompanyProfessionals,
    ensureSingleProviderSetup,
    getCompanyBotConfig,
    getSingleProviderModeActivationStatus,
    sanitizeBotConfig,
} = require('../services/singleProviderMode.service');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT config_recordatorios FROM EMPRESA WHERE id_empresa = ?', [req.user.id_empresa]);
        if (rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
        
        res.json(rows[0].config_recordatorios || {});
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener config' });
    }
});

router.put('/', async (req, res) => {
    try {
        await pool.execute('UPDATE EMPRESA SET config_recordatorios = ? WHERE id_empresa = ?', [JSON.stringify(req.body), req.user.id_empresa]);
        res.json(req.body);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar config' });
    }
});

router.get('/bot', async (req, res) => {
    try {
        const config = await getCompanyBotConfig(req.user.id_empresa);
        if (config === null) return res.status(404).json({ error: 'Empresa no encontrada' });

        res.json(config);
    } catch (err) {
        console.error("Error al obtener config bot:", err);
        res.status(500).json({ error: 'Error al obtener config del bot' });
    }
});

router.put('/bot', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        
        // Sanear el payload para asegurarnos de que no hay código extraño
        const currentConfig = await getCompanyBotConfig(req.user.id_empresa, connection);
        if (currentConfig === null) {
            await connection.rollback();
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const config = sanitizeBotConfig(req.body || {}, currentConfig);
        const enablingSingleProviderMode =
            currentConfig.cuenta_prestador_unico !== true &&
            config.cuenta_prestador_unico === true;

        if (enablingSingleProviderMode) {
            const professionalCount = await countCompanyProfessionals(req.user.id_empresa, connection);
            const activationStatus = getSingleProviderModeActivationStatus(professionalCount);

            if (!activationStatus.allowed) {
                await connection.rollback();
                return res.status(409).json({ error: activationStatus.reason });
            }
        }
        
        await connection.execute(
            'UPDATE EMPRESA SET bot_config = ? WHERE id_empresa = ?',
            [JSON.stringify(config), req.user.id_empresa]
        );
        if (config.cuenta_prestador_unico) {
            await ensureSingleProviderSetup({
                companyId: req.user.id_empresa,
                executor: connection,
            });
        }

        await connection.commit();
        res.json(config);
    } catch (err) {
        try {
            await connection.rollback();
        } catch (_) {
            // noop
        }
        console.error("Error al actualizar config bot:", err);
        res.status(500).json({ error: 'Error interno al actualizar la config del bot' });
    } finally {
        connection.release();
    }
});

module.exports = router;
