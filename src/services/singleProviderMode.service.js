const pool = require("../config/db");

const toTrimmedString = (value, maxLength) =>
  String(value || "")
    .slice(0, maxLength)
    .trim();

const OWN_PHRASE_LIMITS = {
  general: 500,
  saludos: 300,
  confirmaciones: 300,
  cierres: 300,
};

const INITIAL_SURVEY_ACTIONS = Object.freeze([
  "book",
  "cancel",
  "reschedule",
  "appointment_info",
  "none",
]);

const DEFAULT_INITIAL_SURVEY_QUESTION =
  "Hola, ¿Cómo te puedo ayudar con tus turnos?";

const INITIAL_SURVEY_MAX_QUESTION_LENGTH = 140;
const INITIAL_SURVEY_MAX_LABEL_LENGTH = 120;

const DEFAULT_INITIAL_SURVEY_OPTIONS = Object.freeze([
  Object.freeze({
    action: "book",
    label: "Quiero sacar un turno",
    enabled: true,
    order: 0,
  }),
  Object.freeze({
    action: "cancel",
    label: "Necesito cancelar un turno",
    enabled: true,
    order: 1,
  }),
  Object.freeze({
    action: "reschedule",
    label: "Quiero cambiar el horario",
    enabled: true,
    order: 2,
  }),
  Object.freeze({
    action: "appointment_info",
    label: "Informacion sobre mi turno",
    enabled: false,
    order: 3,
  }),
  Object.freeze({
    action: "none",
    label: "Ninguna de estas opciones",
    enabled: true,
    order: 4,
  }),
]);

const getDefaultInitialSurveyConfig = () => ({
  personalizada: false,
  question: DEFAULT_INITIAL_SURVEY_QUESTION,
  options: DEFAULT_INITIAL_SURVEY_OPTIONS.map((option) => ({ ...option })),
});

const createConfigValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const sortSurveyOptions = (options = []) =>
  [...options].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return (
      INITIAL_SURVEY_ACTIONS.indexOf(left.action) -
      INITIAL_SURVEY_ACTIONS.indexOf(right.action)
    );
  });

const normalizeStoredInitialSurveyConfig = (value) => {
  try {
    return sanitizeInitialSurveyConfig(value);
  } catch (_) {
    return getDefaultInitialSurveyConfig();
  }
};

function sanitizeInitialSurveyConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return getDefaultInitialSurveyConfig();
  }

  const personalizada = value.personalizada === true;
  if (!personalizada) {
    return getDefaultInitialSurveyConfig();
  }

  const question = toTrimmedString(
    value.question,
    INITIAL_SURVEY_MAX_QUESTION_LENGTH,
  );
  if (!question) {
    throw createConfigValidationError(
      "La pregunta de la encuesta inicial es obligatoria.",
    );
  }

  if (!Array.isArray(value.options)) {
    throw createConfigValidationError(
      "Las opciones de la encuesta inicial deben ser un array completo.",
    );
  }

  if (value.options.length !== INITIAL_SURVEY_ACTIONS.length) {
    throw createConfigValidationError(
      "La encuesta inicial debe incluir todas las acciones disponibles.",
    );
  }

  const options = value.options.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw createConfigValidationError(
        "Cada opcion de la encuesta inicial debe ser un objeto valido.",
      );
    }

    const action = toTrimmedString(entry.action, 50);
    if (!INITIAL_SURVEY_ACTIONS.includes(action)) {
      throw createConfigValidationError(
        `La accion de encuesta '${action || "desconocida"}' no es valida.`,
      );
    }

    const order = Number(entry.order);
    if (!Number.isInteger(order) || order < 0) {
      throw createConfigValidationError(
        `La opcion '${action}' debe tener un orden entero valido.`,
      );
    }

    const enabled = entry.enabled === true;
    const label = toTrimmedString(entry.label, INITIAL_SURVEY_MAX_LABEL_LENGTH);
    if (enabled && !label) {
      throw createConfigValidationError(
        `La opcion '${action}' debe tener un texto visible cuando esta activa.`,
      );
    }

    return {
      action,
      label,
      enabled,
      order,
    };
  });

  const uniqueActions = new Set(options.map((option) => option.action));
  if (uniqueActions.size !== INITIAL_SURVEY_ACTIONS.length) {
    throw createConfigValidationError(
      "Cada accion de encuesta inicial debe aparecer exactamente una vez.",
    );
  }

  for (const action of INITIAL_SURVEY_ACTIONS) {
    if (!uniqueActions.has(action)) {
      throw createConfigValidationError(
        `Falta la accion '${action}' en la encuesta inicial.`,
      );
    }
  }

  const uniqueOrders = new Set(options.map((option) => option.order));
  if (uniqueOrders.size !== options.length) {
    throw createConfigValidationError(
      "Cada opcion de la encuesta inicial debe tener un orden unico.",
    );
  }

  const hasAtLeastOneActionableOption = options.some(
    (option) => option.enabled && option.action !== "none",
  );
  if (!hasAtLeastOneActionableOption) {
    throw createConfigValidationError(
      "La encuesta inicial debe tener al menos una accion activa para el cliente.",
    );
  }

  return {
    personalizada: true,
    question,
    options: sortSurveyOptions(options),
  };
}

const getEffectiveInitialSurvey = (config = {}) => {
  const parsed = parseBotConfig(config);
  const storedSurvey = normalizeStoredInitialSurveyConfig(parsed.encuesta_inicial);
  const effectiveSurvey = storedSurvey.personalizada
    ? storedSurvey
    : getDefaultInitialSurveyConfig();

  return {
    personalizada: storedSurvey.personalizada === true,
    question: effectiveSurvey.question,
    options: sortSurveyOptions(effectiveSurvey.options).filter(
      (option) => option.enabled,
    ),
  };
};

const sanitizeOwnPhraseSection = (value, key) =>
  toTrimmedString(value, OWN_PHRASE_LIMITS[key] || 300);

const normalizeOwnPhrasesConfig = (value) => {
  if (typeof value === "string") {
    return {
      general: sanitizeOwnPhraseSection(value, "general"),
      saludos: "",
      confirmaciones: "",
      cierres: "",
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      general: "",
      saludos: "",
      confirmaciones: "",
      cierres: "",
    };
  }

  return {
    general: sanitizeOwnPhraseSection(value.general, "general"),
    saludos: sanitizeOwnPhraseSection(value.saludos, "saludos"),
    confirmaciones: sanitizeOwnPhraseSection(
      value.confirmaciones,
      "confirmaciones",
    ),
    cierres: sanitizeOwnPhraseSection(value.cierres, "cierres"),
  };
};

const sanitizeOwnPhrasesPayload = (payload = {}, currentValue = {}) => {
  const current = normalizeOwnPhrasesConfig(currentValue);
  const incoming = normalizeOwnPhrasesConfig(payload.palabras_propias);

  return {
    general: sanitizeOwnPhraseSection(
      payload.palabras_propias_general ?? incoming.general ?? current.general,
      "general",
    ),
    saludos: sanitizeOwnPhraseSection(
      payload.palabras_propias_saludos ?? incoming.saludos ?? current.saludos,
      "saludos",
    ),
    confirmaciones: sanitizeOwnPhraseSection(
      payload.palabras_propias_confirmaciones ??
        incoming.confirmaciones ??
        current.confirmaciones,
      "confirmaciones",
    ),
    cierres: sanitizeOwnPhraseSection(
      payload.palabras_propias_cierres ?? incoming.cierres ?? current.cierres,
      "cierres",
    ),
  };
};

const sanitizeIgnoredPhones = (value) => {
  const rawItems = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\r?\n|,|;/)
        .map((item) => item.trim());

  return [...new Set(
    rawItems
      .map((item) => String(item || "").replace(/[^\d]/g, "").trim())
      .filter(Boolean)
      .slice(0, 200)
  )];
};

const parseBotConfig = (raw) => {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return {
        ...parsed,
        palabras_propias: normalizeOwnPhrasesConfig(parsed.palabras_propias),
        encuesta_inicial: normalizeStoredInitialSurveyConfig(
          parsed.encuesta_inicial,
        ),
      };
    } catch (_) {
      return {};
    }
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return {
    ...raw,
    palabras_propias: normalizeOwnPhrasesConfig(raw.palabras_propias),
    encuesta_inicial: normalizeStoredInitialSurveyConfig(raw.encuesta_inicial),
  };
};

const isSingleProviderModeEnabledForConfig = (config) =>
  parseBotConfig(config).cuenta_prestador_unico === true;

const getSingleProviderModeActivationStatus = (professionalCount) => {
  const total = Number(professionalCount) || 0;

  if (total > 1) {
    return {
      allowed: false,
      reason:
        "No podés activar la cuenta de prestador único mientras haya más de un prestador registrado. Dejá solo uno primero.",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
};

const sanitizeBotConfig = (payload = {}, currentConfig = {}) => {
  const base = parseBotConfig(currentConfig);
  const singleProviderMode = payload.cuenta_prestador_unico === true;
  const nextSurvey = Object.prototype.hasOwnProperty.call(
    payload,
    "encuesta_inicial",
  )
    ? sanitizeInitialSurveyConfig(payload.encuesta_inicial)
    : normalizeStoredInitialSurveyConfig(base.encuesta_inicial);

  return {
    ...base,
    tono: toTrimmedString(payload.tono, 100),
    rubro: toTrimmedString(payload.rubro, 100),
    mensaje_bienvenida: toTrimmedString(payload.mensaje_bienvenida, 200),
    palabras_propias: sanitizeOwnPhrasesPayload(payload, base.palabras_propias),
    telefonos_ignorados: sanitizeIgnoredPhones(payload.telefonos_ignorados ?? base.telefonos_ignorados),
    primera_persona: singleProviderMode || payload.primera_persona === true,
    cuenta_prestador_unico: singleProviderMode,
    encuesta_inicial: nextSurvey,
  };
};

const getCompanyBotConfig = async (companyId, executor = pool) => {
  const [rows] = await executor.execute(
    "SELECT bot_config FROM EMPRESA WHERE id_empresa = ?",
    [companyId]
  );

  if (!rows.length) return null;
  return parseBotConfig(rows[0].bot_config);
};

const isSingleProviderModeEnabled = async (companyId, executor = pool) => {
  const config = await getCompanyBotConfig(companyId, executor);
  return isSingleProviderModeEnabledForConfig(config);
};

const countCompanyProfessionals = async (companyId, executor = pool) => {
  const [rows] = await executor.execute(
    "SELECT COUNT(*) AS total FROM PRESTADOR WHERE id_empresa = ?",
    [companyId]
  );

  return Number(rows[0]?.total || 0);
};

const ensureSingleProviderSetup = async ({ companyId, executor = pool }) => {
  const [companyRows] = await executor.execute(
    `SELECT e.id_usuario, u.nombre, u.apellido, u.email
     FROM EMPRESA e
     JOIN USUARIO u ON u.id_usuario = e.id_usuario
     WHERE e.id_empresa = ?`,
    [companyId]
  );

  if (!companyRows.length) {
    throw new Error("Empresa no encontrada para configurar prestador único.");
  }

  const owner = companyRows[0];

  const [prestadorRows] = await executor.execute(
    `SELECT p.id_prestador, p.id_usuario, u.nombre, u.apellido, u.email
     FROM PRESTADOR p
     JOIN USUARIO u ON u.id_usuario = p.id_usuario
     WHERE p.id_empresa = ?
     ORDER BY p.id_prestador ASC`,
    [companyId]
  );

  const activationStatus = getSingleProviderModeActivationStatus(prestadorRows.length);
  if (!activationStatus.allowed) {
    throw new Error(activationStatus.reason);
  }

  let ownerPrestador = prestadorRows[0] || null;

  if (!ownerPrestador) {
    const [insertResult] = await executor.execute(
      "INSERT INTO PRESTADOR (id_usuario, id_empresa, activo, horarios_disponibilidad) VALUES (?, ?, ?, ?)",
      [owner.id_usuario, companyId, 1, null]
    );

    ownerPrestador = {
      id_prestador: insertResult.insertId,
      id_usuario: owner.id_usuario,
      nombre: owner.nombre,
      apellido: owner.apellido,
      email: owner.email,
    };
  }

  await executor.execute(
    "UPDATE PRESTADOR SET activo = 1, horarios_disponibilidad = NULL WHERE id_prestador = ? AND id_empresa = ?",
    [ownerPrestador.id_prestador, companyId]
  );

  await executor.execute(
    "UPDATE PRESTADOR SET activo = 0 WHERE id_empresa = ? AND id_prestador <> ?",
    [companyId, ownerPrestador.id_prestador]
  );

  await executor.execute(
    `INSERT IGNORE INTO PRESTADOR_SERVICIO (id_prestador, id_servicio)
     SELECT ?, s.id_servicio
     FROM SERVICIO s
     WHERE s.id_empresa = ?`,
    [ownerPrestador.id_prestador, companyId]
  );

  return {
    professionalId: ownerPrestador.id_prestador,
    userId: ownerPrestador.id_usuario,
    name: `${ownerPrestador.nombre || ""} ${ownerPrestador.apellido || ""}`.trim(),
    email: ownerPrestador.email || "",
  };
};

module.exports = {
  countCompanyProfessionals,
  ensureSingleProviderSetup,
  getDefaultInitialSurveyConfig,
  getEffectiveInitialSurvey,
  getCompanyBotConfig,
  getSingleProviderModeActivationStatus,
  INITIAL_SURVEY_ACTIONS,
  isSingleProviderModeEnabled,
  isSingleProviderModeEnabledForConfig,
  normalizeOwnPhrasesConfig,
  parseBotConfig,
  sanitizeBotConfig,
  sanitizeInitialSurveyConfig,
};
