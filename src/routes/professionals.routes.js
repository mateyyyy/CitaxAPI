const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT p.*, u.nombre, u.apellido 
            FROM PRESTADOR p
            JOIN USUARIO u ON p.id_usuario = u.id_usuario
            WHERE p.id_empresa = ? AND p.activo = 1
        `;
        const [rows] = await pool.execute(query, [req.user.id_empresa]);

        const formatted = rows.map(p => ({
            id: p.id_prestador,
            nombre: p.nombre,
            apellido: p.apellido
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener profesionales' });
    }
});

module.exports = router;
