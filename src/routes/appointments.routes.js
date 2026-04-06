const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const { hasClienteEmailColumn } = require('../services/clientSchema.service');
const { hasTurnoOrigenColumn, inferAppointmentOrigin } = require('../services/turnoSchema.service');

const formatDateLocal = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTimeLocal = (value) => {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const includeClientEmail = await hasClienteEmailColumn();
        const includeOrigin = await hasTurnoOrigenColumn();
        const query = `
            SELECT t.*, c.nombre_wa, c.whatsapp_id,
                   ${includeClientEmail ? 'c.email AS cliente_email,' : 'NULL AS cliente_email,'}
                   ${includeOrigin ? 't.origen AS turno_origen,' : "NULL AS turno_origen,"}
                   u.nombre as prestador_nombre, u.apellido as prestador_apellido,
                   s.nombre as servicio_nombre
            FROM TURNO t
            JOIN CLIENTE c ON t.id_cliente = c.id_cliente
            JOIN PRESTADOR p ON t.id_prestador = p.id_prestador
            JOIN USUARIO u ON p.id_usuario = u.id_usuario
            JOIN SERVICIO s ON t.id_servicio = s.id_servicio
            WHERE c.id_empresa = ?
            ORDER BY t.fecha_hora ASC
        `;
        const [rows] = await pool.execute(query, [req.user.id_empresa]);

        const formatted = rows.map(appt => ({
            id: appt.id_turno,
            fecha: formatDateLocal(appt.fecha_hora),
            hora_inicio: formatTimeLocal(appt.fecha_hora),
            estado: appt.estado,
            origen: inferAppointmentOrigin({ origen: appt.turno_origen, estado: appt.estado }),
            cliente_nombre: appt.nombre_wa || 'Sin nombre',
            cliente_whatsapp: appt.whatsapp_id,
            cliente_email: appt.cliente_email || '',
            prestador_nombre: appt.prestador_nombre,
            prestador_apellido: appt.prestador_apellido,
            servicio_nombre: appt.servicio_nombre
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
});

router.post('/', async (req, res) => {
    const { cliente_nombre, cliente_telefono, servicio_id, prestador_id, fecha, hora_inicio } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const empresaId = req.user.id_empresa;

        // Upsert CLIENTE
        const [checkRows] = await connection.execute(
            'SELECT id_cliente FROM CLIENTE WHERE id_empresa = ? AND whatsapp_id = ?',
            [empresaId, cliente_telefono]
        );

        let clienteId;
        if (checkRows.length > 0) {
            clienteId = checkRows[0].id_cliente;
            await connection.execute('UPDATE CLIENTE SET nombre_wa = ? WHERE id_cliente = ?', [cliente_nombre, clienteId]);
        } else {
            const [insertRes] = await connection.execute(
                'INSERT INTO CLIENTE (id_empresa, whatsapp_id, nombre_wa) VALUES (?, ?, ?)',
                [empresaId, cliente_telefono, cliente_nombre]
            );
            clienteId = insertRes.insertId;
        }

        const fullDate = `${fecha} ${hora_inicio}:00`;
        const includeOrigin = await hasTurnoOrigenColumn(connection);
        const turnoQuery = includeOrigin
            ? 'INSERT INTO TURNO (id_cliente, id_prestador, id_servicio, fecha_hora, estado, origen) VALUES (?, ?, ?, ?, ?, ?)'
            : 'INSERT INTO TURNO (id_cliente, id_prestador, id_servicio, fecha_hora, estado) VALUES (?, ?, ?, ?, ?)';
        const turnoParams = includeOrigin
            ? [clienteId, prestador_id, servicio_id, fullDate, 'confirmado', 'manual']
            : [clienteId, prestador_id, servicio_id, fullDate, 'confirmado'];
        const [turnoRes] = await connection.execute(turnoQuery, turnoParams);

        await connection.commit();
        res.status(201).json({ id_turno: turnoRes.insertId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al crear turno' });
    } finally {
        connection.release();
    }
});

router.put('/:id', async (req, res) => {
    const { estado } = req.body;
    try {
        await pool.execute('UPDATE TURNO SET estado = ? WHERE id_turno = ?', [estado, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar turno' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM TURNO WHERE id_turno = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al borrar turno' });
    }
});

module.exports = router;
