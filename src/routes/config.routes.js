const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

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

module.exports = router;
