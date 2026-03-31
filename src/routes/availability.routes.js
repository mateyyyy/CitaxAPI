const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middlewares/auth.middleware');
const {
    resolveEffectiveAvailability,
    toAvailabilityPayload,
} = require('../utils/availabilitySchedule');
const { isSingleProviderModeEnabled } = require('../services/singleProviderMode.service');
const { listAvailableSlots } = require('../services/ai/companyContextService');

router.use(authMiddleware);

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
};

router.get('/config', async (req, res) => {
    try {
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
    }
});

router.put('/config', async (req, res) => {
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
            'UPDATE EMPRESA SET horarios_disponibilidad = ? WHERE id_empresa = ?',
            [payload, companyId]
        );

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
    }
});

router.get('/', async (req, res) => {
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
                .map((slot) => slot.time),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error calculando disponibilidad' });
    }
});

module.exports = router;

