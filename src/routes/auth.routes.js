const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-citax';

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.execute('SELECT * FROM USUARIO WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch && password !== user.password_hash) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Get associated company
        const [empresaRows] = await pool.execute('SELECT * FROM EMPRESA WHERE id_usuario = ?', [user.id_usuario]);
        const empresa = empresaRows[0];
        
        const token = jwt.sign({
            id_usuario: user.id_usuario,
            email: user.email,
            id_empresa: empresa?.id_empresa,
            rol: user.rol
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id_usuario,
                email: user.email,
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol,
                empresa_id: empresa?.id_empresa,
                nombre_comercial: empresa?.nombre_comercial
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

router.post('/register', async (req, res) => {
    const { email, password, nombre, apellido, nombre_comercial } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [userResult] = await connection.execute(
            'INSERT INTO USUARIO (email, password_hash, nombre, apellido, rol) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, nombre, apellido, 'admin_empresa']
        );
        const userId = userResult.insertId;

        const [empresaResult] = await connection.execute(
            'INSERT INTO EMPRESA (id_usuario, nombre_comercial, config_recordatorios, horarios_disponibilidad) VALUES (?, ?, ?, ?)',
            [userId, nombre_comercial, 
                JSON.stringify({
                    recordatorio_activo: false,
                    recordatorio_offsets_minutos: [1440],
                    recordatorio_mensaje: "Hola {{cliente_nombre}}, te recordamos tu turno para {{fecha}} a las {{hora}}."
                }),
                JSON.stringify({ config: [] })
            ]
        );

        await connection.commit();
        res.status(201).json({ id_usuario: userId, id_empresa: empresaResult.insertId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al registrar' });
    } finally {
        connection.release();
    }
});

module.exports = router;
