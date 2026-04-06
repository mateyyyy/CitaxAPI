const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
<<<<<<< HEAD
=======
const {
    resolveEffectiveAvailability,
    toAvailabilityPayload,
} = require('../utils/availabilitySchedule');
const { isSingleProviderModeEnabled } = require('../services/singleProviderMode.service');
>>>>>>> master
const { listAvailableSlots } = require('../services/ai/companyContextService');

router.use(authMiddleware);

<<<<<<< HEAD
const EMPTY_CONFIG = { config: [] };

const parseAvailabilityConfig = (value) => {
    if (!value) return EMPTY_CONFIG;

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parseAvailabilityConfig(parsed);
        } catch (_) {
            return EMPTY_CONFIG;
        }
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
        return EMPTY_CONFIG;
    }

    return {
        config: Array.isArray(value.config) ? value.config : [],
    };
};

const hasOwnAvailabilityConfig = (value) => parseAvailabilityConfig(value).config.length > 0;

const getCompanyAvailabilityRow = async (companyId, executor = pool) => {
    const [rows] = await executor.execute(
        'SELECT horarios_disponibilidad FROM EMPRESA WHERE id_empresa = ? LIMIT 1',
        [companyId]
    );

    return rows[0] || null;
};

const getProfessionalAvailabilityRow = async (companyId, prestadorId, executor = pool) => {
    const [rows] = await executor.execute(
        'SELECT id_prestador, horarios_disponibilidad FROM PRESTADOR WHERE id_empresa = ? AND id_prestador = ? LIMIT 1',
        [companyId, prestadorId]
    );

    return rows[0] || null;
};

const getRequestedPrestadorId = (req) => {
    if (req.user.rol === 'prestador') {
        return Number(req.user.id_prestador || 0) || null;
    }

    const rawValue = req.query.prestador_id ?? req.body?.prestador_id ?? null;
    const parsed = Number(rawValue);
    return parsed || null;
=======
const getCompanyAvailability = async (companyId) => {
    const [rows] = await pool.execute(
        'SELECT horarios_disponibilidad FROM EMPRESA WHERE id_empresa = ?',
        [companyId]
    );

    if (rows.length === 0) return null;
    return rows[0].horarios_disponibilidad;
};

const getPrestadorAvailability = async (companyId, prestadorId) => {
    const [rows] = await pool.execute(
        'SELECT horarios_disponibilidad FROM PRESTADOR WHERE id_prestador = ? AND id_empresa = ?',
        [prestadorId, companyId]
    );

    if (rows.length === 0) {
        return { exists: false, config: null };
    }

    return {
        exists: true,
        config: rows[0].horarios_disponibilidad,
    };
};

const getPrestadorScope = async (req, prestadorIdFromQuery = null) => {
    const companyId = req.user.id_empresa;
    const companyConfig = await getCompanyAvailability(companyId);

    if (companyConfig === null) {
        return { error: { status: 404, message: 'Empresa no encontrada' } };
    }

    if (req.user.rol === 'prestador') {
        const ownPrestadorId = Number(req.user.id_prestador);
        if (!ownPrestadorId) {
            return { error: { status: 403, message: 'No tenÃ©s un prestador asociado' } };
        }

        if (prestadorIdFromQuery && Number(prestadorIdFromQuery) !== ownPrestadorId) {
            return { error: { status: 403, message: 'No podÃ©s consultar el horario de otro prestador' } };
        }

        const ownResult = await getPrestadorAvailability(companyId, ownPrestadorId);
        if (!ownResult.exists) {
            return { error: { status: 404, message: 'Prestador no encontrado' } };
        }

        return {
            companyConfig,
            prestadorId: ownPrestadorId,
            effective: resolveEffectiveAvailability({ ownConfig: ownResult.config, companyConfig }),
        };
    }

    if (!prestadorIdFromQuery) {
        return {
            companyConfig,
            prestadorId: null,
            effective: {
                scope: 'empresa',
                source: 'own',
                config: toAvailabilityPayload(companyConfig),
            },
        };
    }

    const prestadorId = Number(prestadorIdFromQuery);
    if (!prestadorId) {
        return { error: { status: 400, message: 'prestador_id invÃ¡lido' } };
    }

    const ownResult = await getPrestadorAvailability(companyId, prestadorId);
    if (!ownResult.exists) {
        return { error: { status: 404, message: 'Prestador no encontrado' } };
    }

    return {
        companyConfig,
        prestadorId,
        effective: resolveEffectiveAvailability({ ownConfig: ownResult.config, companyConfig }),
    };
};

const buildStoredAvailabilityValue = ({ items, useFallbackOnEmpty = false }) => {
    if (useFallbackOnEmpty && items.length === 0) {
        return null;
    }

    return JSON.stringify({ config: items });
>>>>>>> master
};

router.get('/config', async (req, res) => {
    try {
<<<<<<< HEAD
        const companyId = req.user.id_empresa;
        const requestedPrestadorId = getRequestedPrestadorId(req);
        const companyRow = await getCompanyAvailabilityRow(companyId);

        if (!companyRow) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const companyConfig = parseAvailabilityConfig(companyRow.horarios_disponibilidad);

        if (!requestedPrestadorId) {
            return res.json({
                scope: 'empresa',
                source: 'empresa',
                prestador_id: null,
                config: companyConfig.config,
            });
        }

        const professionalRow = await getProfessionalAvailabilityRow(companyId, requestedPrestadorId);
        if (!professionalRow) {
            return res.status(404).json({ error: 'Prestador no encontrado' });
        }

        const professionalConfig = parseAvailabilityConfig(professionalRow.horarios_disponibilidad);
        const source = hasOwnAvailabilityConfig(professionalRow.horarios_disponibilidad)
            ? 'propio'
            : 'fallback_empresa';

        return res.json({
            scope: 'prestador',
            source,
            prestador_id: requestedPrestadorId,
            config: (source === 'propio' ? professionalConfig : companyConfig).config,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al obtener disponibilidad' });
=======
        const prestadorIdFromQuery = req.query.prestador_id || null;
        const singleProviderMode = await isSingleProviderModeEnabled(req.user.id_empresa);

        if (singleProviderMode) {
            const companyConfig = await getCompanyAvailability(req.user.id_empresa);

            if (companyConfig === null) {
                return res.status(404).json({ error: 'Empresa no encontrada' });
            }

            return res.json({
                scope: 'empresa',
                source: 'own',
                prestador_id: null,
                config: toAvailabilityPayload(companyConfig),
            });
        }

        const scope = await getPrestadorScope(req, prestadorIdFromQuery);

        if (scope.error) {
            return res.status(scope.error.status).json({ error: scope.error.message });
        }

        res.json({
            scope: scope.effective.scope,
            source: scope.effective.source,
            prestador_id: scope.prestadorId,
            config: scope.effective.config,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener disponibilidad' });
>>>>>>> master
    }
});

router.put('/config', async (req, res) => {
<<<<<<< HEAD
    const connection = await pool.getConnection();

    try {
        const companyId = req.user.id_empresa;
        const requestedPrestadorId = getRequestedPrestadorId(req);
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        const payload = JSON.stringify({ config: items });

        await connection.beginTransaction();

        if (requestedPrestadorId) {
            const professionalRow = await getProfessionalAvailabilityRow(companyId, requestedPrestadorId, connection);
            if (!professionalRow) {
                await connection.rollback();
                return res.status(404).json({ error: 'Prestador no encontrado' });
            }

            await connection.execute(
                'UPDATE PRESTADOR SET horarios_disponibilidad = ? WHERE id_prestador = ? AND id_empresa = ?',
                [payload, requestedPrestadorId, companyId]
            );

            const companyRow = await getCompanyAvailabilityRow(companyId, connection);
            await connection.commit();

            return res.json({
                scope: 'prestador',
                source: items.length ? 'propio' : 'fallback_empresa',
                prestador_id: requestedPrestadorId,
                config: items.length ? items : parseAvailabilityConfig(companyRow?.horarios_disponibilidad).config,
            });
        }

        await connection.execute(
=======
    const { items, prestador_id: prestadorIdFromBody } = req.body;
    const prestadorIdFromQuery = req.query.prestador_id || null;
    const prestadorIdInput = prestadorIdFromBody || prestadorIdFromQuery;

    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items debe ser un array' });
    }

    try {
        const companyId = req.user.id_empresa;
        const companyConfig = await getCompanyAvailability(companyId);
        const singleProviderMode = await isSingleProviderModeEnabled(companyId);

        if (companyConfig === null) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        if (singleProviderMode && (req.user.rol === 'prestador' || prestadorIdInput)) {
            return res.status(409).json({ error: 'La cuenta estÃ¡ en modo prestador Ãºnico y solo permite configurar el horario general de la empresa.' });
        }

        if (req.user.rol === 'prestador') {
            const ownPrestadorId = Number(req.user.id_prestador);
            if (!ownPrestadorId) {
                return res.status(403).json({ error: 'No tenÃ©s un prestador asociado' });
            }

            if (prestadorIdInput && Number(prestadorIdInput) !== ownPrestadorId) {
                return res.status(403).json({ error: 'No podÃ©s modificar el horario de otro prestador' });
            }

            const payload = buildStoredAvailabilityValue({
                items,
                useFallbackOnEmpty: true,
            });

            const [result] = await pool.execute(
                'UPDATE PRESTADOR SET horarios_disponibilidad = ? WHERE id_prestador = ? AND id_empresa = ?',
                [payload, ownPrestadorId, companyId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Prestador no encontrado' });
            }

            return res.json({
                scope: 'prestador',
                source: payload === null ? 'fallback_empresa' : 'own',
                prestador_id: ownPrestadorId,
                config: payload === null ? toAvailabilityPayload(companyConfig) : { config: items },
            });
        }

        if (prestadorIdInput) {
            const prestadorId = Number(prestadorIdInput);
            if (!prestadorId) {
                return res.status(400).json({ error: 'prestador_id invÃ¡lido' });
            }

            const payload = buildStoredAvailabilityValue({
                items,
                useFallbackOnEmpty: true,
            });

            const [result] = await pool.execute(
                'UPDATE PRESTADOR SET horarios_disponibilidad = ? WHERE id_prestador = ? AND id_empresa = ?',
                [payload, prestadorId, companyId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Prestador no encontrado' });
            }

            return res.json({
                scope: 'prestador',
                source: payload === null ? 'fallback_empresa' : 'own',
                prestador_id: prestadorId,
                config: payload === null ? toAvailabilityPayload(companyConfig) : { config: items },
            });
        }

        const payload = buildStoredAvailabilityValue({
            items,
            useFallbackOnEmpty: false,
        });

        const [result] = await pool.execute(
>>>>>>> master
            'UPDATE EMPRESA SET horarios_disponibilidad = ? WHERE id_empresa = ?',
            [payload, companyId]
        );

<<<<<<< HEAD
        await connection.commit();

        return res.json({
            scope: 'empresa',
            source: 'empresa',
            prestador_id: null,
            config: items,
        });
    } catch (err) {
        try {
            await connection.rollback();
        } catch (_) {
            // noop
        }
        console.error(err);
        return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
    } finally {
        connection.release();
=======
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        res.json({
            scope: 'empresa',
            source: 'own',
            prestador_id: null,
            config: { config: items },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar disponibilidad' });
>>>>>>> master
    }
});

router.get('/', async (req, res) => {
<<<<<<< HEAD
    const professionalId = Number(req.query.prestador_id);
    const serviceId = Number(req.query.servicio_id);
    const date = String(req.query.fecha || '').trim();

    if (!professionalId || !date) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }

    try {
        const slots = await listAvailableSlots({
            companyId: req.user.id_empresa,
            professionalId,
            serviceId: serviceId || null,
            startDate: date,
            endDate: date,
            referenceDate: date,
            limit: 120,
        });

        return res.json({
            slots: slots
                .filter((slot) => Number(slot.professionalId) === professionalId && slot.date === date)
=======
    const prestadorIdFromQuery = req.query.prestador_id || null;
    const { fecha, servicio_id } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: 'Falta el parametro fecha' });
    }

    try {
        const scope = await getPrestadorScope(req, prestadorIdFromQuery);
        if (scope.error) {
            return res.status(scope.error.status).json({ error: scope.error.message });
        }

        if (!scope.prestadorId) {
            return res.status(400).json({ error: 'Falta el parametro prestador_id' });
        }

        const slots = await listAvailableSlots({
            companyId: req.user.id_empresa,
            professionalId: scope.prestadorId,
            serviceId: servicio_id ? Number(servicio_id) : null,
            startDate: fecha,
            endDate: fecha,
            referenceDate: fecha,
            limit: 200,
        });

        res.json({
            slots: slots
                .filter((slot) =>
                    Number(slot.professionalId) === Number(scope.prestadorId) &&
                    slot.date === fecha
                )
>>>>>>> master
                .map((slot) => slot.time),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error calculando disponibilidad' });
    }
});

module.exports = router;

