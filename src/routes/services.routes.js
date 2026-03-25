const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM SERVICIO WHERE id_empresa = ?', [req.user.id_empresa]);
        
        const formatted = rows.map(s => ({
            id: s.id_servicio,
            nombre: s.nombre,
            duracion_estimada_minutos: s.duracion_minutos,
            precio_base: Number(s.precio)
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

module.exports = router;
