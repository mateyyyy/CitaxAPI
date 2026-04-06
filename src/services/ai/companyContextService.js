const prisma = require("../../config/prisma");
const {
  buildAvailabilityMap,
  isNullishAvailability,
  resolveEffectiveAvailability,
} = require("../../utils/availabilitySchedule");
const {
  getCompanyBotConfig,
  isSingleProviderModeEnabledForConfig,
  normalizeOwnPhrasesConfig,
} = require("../singleProviderMode.service");
<<<<<<< HEAD
const { hasTurnoOrigenColumn } = require("../turnoSchema.service");
=======
>>>>>>> master

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

const getCurrentDateInTimeZone = (timezone = DEFAULT_TIMEZONE) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getCurrentDayNameInSpanish = (timezone = DEFAULT_TIMEZONE) => {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    weekday: "long",
  }).format(new Date()).toLowerCase();
};

const getCurrentTimeInTimeZone = (timezone = DEFAULT_TIMEZONE) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
};

const getNowInTimezone = (timezone = DEFAULT_TIMEZONE) => {
  const parts = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
<<<<<<< HEAD
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .forEach((part) => {
      parts[part.type] = part.value;
    });

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
  );
};

const isSlotStillBookable = ({ slotEnd, now = getNowInTimezone() }) => {
  if (!(slotEnd instanceof Date) || Number.isNaN(slotEnd.getTime())) return false;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return false;
  return slotEnd > now;
};

const pad = (value) => String(value).padStart(2, "0");
const formatTime = (value) => String(value || "").slice(0, 5);
const normalizePhone = (value) =>
  String(value || "").replace(/@.*/, "").replace(/[^\d]/g, "").trim();
const normalizeClientName = (value) => String(value || "").trim();
=======
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
};

const isSlotStillBookable = ({ slotEnd, now = getNowInTimezone() }) => {
  if (!(slotEnd instanceof Date) || Number.isNaN(slotEnd.getTime())) return false;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return false;
  return slotEnd > now;
};

const pad = (v) => String(v).padStart(2, "0");
const formatTime = (v) => String(v || "").slice(0, 5);
const normalizePhone = (v) => String(v || "").replace(/@.*/, "").replace(/[^\d]/g, "").trim();
const normalizeClientName = (v) => String(v || "").trim();
>>>>>>> master

const normalizeDate = (value, referenceDate = new Date()) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const getReference = () =>
    typeof referenceDate === "string"
      ? new Date(`${referenceDate}T12:00:00`)
      : new Date(referenceDate);

  if (lower === "hoy") return normalizeDate(getReference());
  if (lower === "ma�ana" || lower === "manana") {
    const date = getReference();
    date.setDate(date.getDate() + 1);
    return normalizeDate(date);
  }
  if (lower === "pasado ma�ana" || lower === "pasado manana") {
    const date = getReference();
    date.setDate(date.getDate() + 2);
    return normalizeDate(date);
  }

<<<<<<< HEAD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
=======
  if (lower === "hoy") return normalizeDate(getRef());
  if (lower === "maÃ±ana" || lower === "manana") { const d = getRef(); d.setDate(d.getDate() + 1); return normalizeDate(d); }
  if (lower === "pasado maÃ±ana" || lower === "pasado manana") { const d = getRef(); d.setDate(d.getDate() + 2); return normalizeDate(d); }
>>>>>>> master

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
};

<<<<<<< HEAD
const addDays = (dateStr, days) => {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const toWeekdayNumber = (dateStr) => {
  const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const combineDateTime = (dateStr, timeStr) =>
  new Date(`${dateStr}T${timeStr}:00Z`);

const overlaps = (startA, endA, startB, endB) =>
  startA < endB && startB < endA;

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getCompanyContextByInstanceName = async (
  instanceName,
  customerPhone = null
) => {
=======
const addDays = (dateStr, days) => { const d = new Date(`${dateStr}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const toWeekdayNumber = (dateStr) => { const d = new Date(`${dateStr}T12:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };
const combineDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00Z`);
const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

// â”€â”€â”€ Get company context by instance name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getCompanyContextByInstanceName = async (instanceName, customerPhone = null) => {
>>>>>>> master
  const config = await prisma.cONFIG_WHATSAPP.findFirst({
    where: { instance_name: instanceName },
    include: {
      EMPRESA: {
        include: {
          PRESTADOR: {
            where: { activo: true },
            include: {
              USUARIO: true,
              SERVICIOS: { include: { SERVICIO: true } },
            },
          },
          SERVICIO: true,
        },
      },
    },
  });

  if (!config || !config.EMPRESA) return null;

  const empresa = config.EMPRESA;
  const horarios = empresa.horarios_disponibilidad || {};

  const professionals = empresa.PRESTADOR.map((prestador) => ({
    id: prestador.id_prestador,
    name: `${prestador.USUARIO.nombre} ${prestador.USUARIO.apellido}`,
    services: prestador.SERVICIOS.map((prestadorServicio) => ({
      id: prestadorServicio.SERVICIO.id_servicio,
      name: prestadorServicio.SERVICIO.nombre,
      duration: prestadorServicio.SERVICIO.duracion_minutos,
      price: Number(prestadorServicio.SERVICIO.precio),
    })),
<<<<<<< HEAD
    horarios_disponibilidad: prestador.horarios_disponibilidad || null,
    availability: resolveEffectiveAvailability({
      ownConfig: prestador.horarios_disponibilidad,
      companyConfig: empresa.horarios_disponibilidad,
    }),
    usesFallbackAvailability: isNullishAvailability(
      prestador.horarios_disponibilidad
    ),
=======
    horarios_disponibilidad: p.horarios_disponibilidad || null,
    availability: resolveEffectiveAvailability({
      ownConfig: p.horarios_disponibilidad,
      companyConfig: empresa.horarios_disponibilidad,
    }),
    usesFallbackAvailability: isNullishAvailability(p.horarios_disponibilidad),
>>>>>>> master
  }));

  const services = empresa.SERVICIO.map((service) => ({
    id: service.id_servicio,
    name: service.nombre,
    description: service.descripcion,
    duration: service.duracion_minutos,
    price: Number(service.precio),
  }));

  let customerPendingAppointments = [];
  if (customerPhone) {
    const normalizedPhone = normalizePhone(customerPhone);
    const client = await prisma.cLIENTE.findFirst({
      where: {
        id_empresa: empresa.id_empresa,
        whatsapp_id: { contains: normalizedPhone.slice(-8) },
      },
    });

    if (client) {
      const now = new Date();
      const pendingAppointments = await prisma.tURNO.findMany({
        where: {
          id_cliente: client.id_cliente,
          estado: "pendiente",
          fecha_hora: { gte: now },
        },
        include: {
          SERVICIO: true,
          PRESTADOR: { include: { USUARIO: true } },
        },
        orderBy: { fecha_hora: "asc" },
      });

<<<<<<< HEAD
      customerPendingAppointments = pendingAppointments.map((appointment) => ({
        id: appointment.id_turno,
        date: appointment.fecha_hora.toISOString().slice(0, 10),
        time: formatTime(
          `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
            appointment.fecha_hora.getUTCMinutes()
          )}`
        ),
        service: appointment.SERVICIO.nombre,
        professional: `${appointment.PRESTADOR.USUARIO.nombre} ${appointment.PRESTADOR.USUARIO.apellido}`,
=======
      customerPendingAppointments = pending.map((t) => ({
        id: t.id_turno,
        date: t.fecha_hora.toISOString().slice(0, 10),
        time: formatTime(`${pad(t.fecha_hora.getUTCHours())}:${pad(t.fecha_hora.getUTCMinutes())}`),
        service: t.SERVICIO.nombre,
        professional: `${t.PRESTADOR.USUARIO.nombre} ${t.PRESTADOR.USUARIO.apellido}`,
>>>>>>> master
      }));
    }
  }

<<<<<<< HEAD
  const botConfig = await getCompanyBotConfig(empresa.id_empresa).catch(
    () => ({})
  );
  const singleProviderMode =
    isSingleProviderModeEnabledForConfig(botConfig);

  const primerPersonaActiva =
    professionals.length === 1 &&
    (singleProviderMode || botConfig.primera_persona === true);

=======
  // Leer bot_config para determinar el modo primera persona
  const botConfig = await getCompanyBotConfig(empresa.id_empresa).catch(() => ({}));
  const singleProviderMode = isSingleProviderModeEnabledForConfig(botConfig);

  // Primera persona: solo aplica si estÃ¡ habilitado Y hay exactamente 1 prestador activo
  const primerPersonaActiva = professionals.length === 1 && (
    singleProviderMode ||
    botConfig.primera_persona === true
  );
>>>>>>> master
  const personaName = primerPersonaActiva
    ? professionals[0].name
    : professionals[0]?.name || empresa.nombre_comercial;

  return {
    companyId: empresa.id_empresa,
    companyName: empresa.nombre_comercial,
    companySlug: empresa.slug,
    timezone: DEFAULT_TIMEZONE,
    currentDate: getCurrentDateInTimeZone(),
    currentDayName: getCurrentDayNameInSpanish(),
    currentTime: getCurrentTimeInTimeZone(),
    instanceName,
    whatsappNumber: config.whatsapp_number,
    professionals,
    services,
    horarios,
    customerPendingAppointments,
    assistantPersonaName: personaName,
    welcomeMessage: String(botConfig?.mensaje_bienvenida || "").trim(),
    ownPhrases: normalizeOwnPhrasesConfig(botConfig?.palabras_propias),
    singleProviderMode,
    primerPersonaActiva,
  };
};

const getCompanyContextByCompanyId = async (companyId, customerPhone = null) => {
  const config = await prisma.cONFIG_WHATSAPP.findFirst({
    where: { id_empresa: Number(companyId) },
  });

  if (!config?.instance_name) return null;
  return getCompanyContextByInstanceName(config.instance_name, customerPhone);
};

<<<<<<< HEAD
=======
// â”€â”€â”€ List available slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> master
const listAvailableSlots = async ({
  companyId,
  professionalId = null,
  professionalName,
  serviceId = null,
  startDate,
  endDate,
  referenceDate,
  limit = 30,
}) => {
  const normalizedStart =
    normalizeDate(startDate, referenceDate) ||
    normalizeDate(referenceDate) ||
    getCurrentDateInTimeZone();
<<<<<<< HEAD
  const normalizedEnd =
    normalizeDate(endDate, referenceDate) || addDays(normalizedStart, 14);
=======
  const normalizedEnd = normalizeDate(endDate, referenceDate) || addDays(normalizedStart, 14);
>>>>>>> master

  const empresa = await prisma.eMPRESA.findUnique({
    where: { id_empresa: companyId },
    include: {
      PRESTADOR: {
        where: { activo: true },
        include: {
          USUARIO: true,
          SERVICIOS: { include: { SERVICIO: true } },
        },
      },
    },
  });

  if (!empresa) return [];

  const companyConfig = empresa.horarios_disponibilidad;
<<<<<<< HEAD
  let prestadores = empresa.PRESTADOR;

  if (professionalId) {
    prestadores = prestadores.filter(
      (prestador) => Number(prestador.id_prestador) === Number(professionalId)
    );
  }

=======

  let prestadores = empresa.PRESTADOR;
  if (professionalId) {
    prestadores = prestadores.filter((p) => Number(p.id_prestador) === Number(professionalId));
  }

>>>>>>> master
  if (professionalName) {
    const normalizedSearch = normalizeSearchText(professionalName);
    prestadores = prestadores.filter((prestador) => {
      const fullName = normalizeSearchText(
        `${prestador.USUARIO.nombre} ${prestador.USUARIO.apellido}`
      );
      return fullName.includes(normalizedSearch);
    });
  }

  if (serviceId) {
<<<<<<< HEAD
    prestadores = prestadores.filter((prestador) =>
      prestador.SERVICIOS.some(
        (prestadorServicio) =>
          Number(prestadorServicio.SERVICIO.id_servicio) === Number(serviceId)
      )
=======
    prestadores = prestadores.filter((p) =>
      p.SERVICIOS.some((ps) => Number(ps.SERVICIO.id_servicio) === Number(serviceId))
>>>>>>> master
    );
  }

  if (!prestadores.length) return [];

  const existingTurnos = await prisma.tURNO.findMany({
    where: {
      id_prestador: { in: prestadores.map((prestador) => prestador.id_prestador) },
      estado: { in: ["pendiente", "confirmado"] },
      fecha_hora: {
        gte: new Date(`${normalizedStart}T00:00:00Z`),
        lte: new Date(`${normalizedEnd}T23:59:59Z`),
      },
    },
    include: { SERVICIO: true },
  });

  const prestadoresConAgenda = prestadores.map((prestador) => {
    const availability = resolveEffectiveAvailability({
      ownConfig: prestador.horarios_disponibilidad,
      companyConfig,
    });

    return {
      ...prestador,
      availability,
      availabilityMap: buildAvailabilityMap(availability.config),
    };
  });

  const slots = [];
  const defaultDuration = 30;
  const prestadoresConAgenda = prestadores.map((prestador) => {
    const availability = resolveEffectiveAvailability({
      ownConfig: prestador.horarios_disponibilidad,
      companyConfig,
    });

    return {
      ...prestador,
      availability,
      availabilityMap: buildAvailabilityMap(availability.config),
    };
  });

  for (
    let cursor = normalizedStart;
    cursor <= normalizedEnd;
    cursor = addDays(cursor, 1)
  ) {
    const weekday = toWeekdayNumber(cursor);

    for (const prestador of prestadoresConAgenda) {
      const selectedService = serviceId
<<<<<<< HEAD
        ? prestador.SERVICIOS.find(
            (prestadorServicio) =>
              Number(prestadorServicio.SERVICIO.id_servicio) === Number(serviceId)
          )?.SERVICIO
        : prestador.SERVICIOS[0]?.SERVICIO;
      const duration = selectedService?.duracion_minutos || defaultDuration;
      const daySchedules = prestador.availabilityMap[weekday];

=======
        ? prestador.SERVICIOS.find((ps) => Number(ps.SERVICIO.id_servicio) === Number(serviceId))?.SERVICIO
        : prestador.SERVICIOS[0]?.SERVICIO;
      const duration = selectedService?.duracion_minutos || defaultDuration;
      const daySchedules = prestador.availabilityMap[weekday];
>>>>>>> master
      if (!daySchedules || !daySchedules.length) continue;

      for (const daySchedule of daySchedules) {
        let slotStart = combineDateTime(cursor, daySchedule.start);
        const dayEnd = combineDateTime(cursor, daySchedule.end);

        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          if (slotEnd > dayEnd) break;

          const isBusy = existingTurnos.some((turno) => {
            if (turno.id_prestador !== prestador.id_prestador) return false;

            const turnoStart = new Date(turno.fecha_hora);
            const turnoEnd = new Date(
              turnoStart.getTime() +
                (turno.SERVICIO?.duracion_minutos || 30) * 60000
            );

            return overlaps(slotStart, slotEnd, turnoStart, turnoEnd);
          });

          if (!isBusy && isSlotStillBookable({ slotEnd })) {
            slots.push({
              professionalId: prestador.id_prestador,
              professionalName: `${prestador.USUARIO.nombre} ${prestador.USUARIO.apellido}`,
              date: cursor,
<<<<<<< HEAD
              time: `${pad(slotStart.getUTCHours())}:${pad(
                slotStart.getUTCMinutes()
              )}`,
              endTime: `${pad(slotEnd.getUTCHours())}:${pad(
                slotEnd.getUTCMinutes()
              )}`,
=======
              time: `${pad(slotStart.getUTCHours())}:${pad(slotStart.getUTCMinutes())}`,
              endTime: `${pad(slotEnd.getUTCHours())}:${pad(slotEnd.getUTCMinutes())}`,
>>>>>>> master
              duration,
              scheduleSource: prestador.availability.source,
            });
          }

          slotStart = new Date(slotStart.getTime() + duration * 60000);
          if (slots.length >= limit) return slots;
        }
      }
    }
  }

  return slots;
};

<<<<<<< HEAD
=======
// â”€â”€â”€ Find or create client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> master
const findOrCreateClient = async ({ companyId, clientName, clientPhone }) => {
  const normalizedPhone = normalizePhone(clientPhone);
  const normalizedName = normalizeClientName(clientName);

  if (!normalizedPhone) {
    if (!normalizedName) {
      throw new Error("Falta el nombre del cliente para crear el turno.");
    }

    const existingByName = await prisma.cLIENTE.findFirst({
      where: {
        id_empresa: companyId,
        nombre_wa: normalizedName,
      },
      orderBy: { id_cliente: "asc" },
    });

    if (existingByName) return existingByName;

<<<<<<< HEAD
    return prisma.cLIENTE.create({
=======
    return await prisma.cLIENTE.create({
>>>>>>> master
      data: {
        id_empresa: companyId,
        whatsapp_id: `manual-${companyId}-${Date.now()}`,
        nombre_wa: normalizedName,
      },
    });
  }

  const existing = await prisma.cLIENTE.findFirst({
    where: {
      id_empresa: companyId,
      whatsapp_id: { contains: normalizedPhone.slice(-8) },
    },
  });

  if (existing) return existing;

  return prisma.cLIENTE.create({
    data: {
      id_empresa: companyId,
      whatsapp_id: normalizedPhone,
      nombre_wa: normalizedName || "Cliente WhatsApp",
    },
  });
};

<<<<<<< HEAD
const createAppointmentFromAssistant = async ({
  companyId,
  professionalId,
  clientName,
  clientPhone,
  serviceId,
  date,
  time,
  referenceDate,
}) => {
  const normalizedDate = normalizeDate(date, referenceDate);
  const normalizedTime = formatTime(time);

  if (!normalizedDate || !normalizedTime) {
    throw new Error("Fecha u hora invalidas");
  }
=======
// â”€â”€â”€ Create appointment from assistant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const createAppointmentFromAssistant = async ({ companyId, professionalId, clientName, clientPhone, serviceId, date, time, referenceDate }) => {
  const normalizedDate = normalizeDate(date, referenceDate);
  const normalizedTime = formatTime(time);

  if (!normalizedDate || !normalizedTime) throw new Error("Fecha u hora invalidas");
>>>>>>> master

  const prestador = await prisma.pRESTADOR.findUnique({
    where: { id_prestador: professionalId },
    include: { USUARIO: true },
  });
  if (!prestador) throw new Error("Prestador no encontrado");

  let resolvedServiceId = serviceId;
  if (!resolvedServiceId) {
    const defaultService = await prisma.pRESTADOR_SERVICIO.findFirst({
      where: { id_prestador: professionalId },
    });

    if (defaultService) {
      resolvedServiceId = defaultService.id_servicio;
    } else {
      const anyService = await prisma.sERVICIO.findFirst({
        where: { id_empresa: companyId },
      });
      if (anyService) {
        resolvedServiceId = anyService.id_servicio;
      } else {
        throw new Error("No hay servicios configurados");
      }
    }
  }

<<<<<<< HEAD
=======
  // VALIDACION ESTRICTA: El horario DEBE existir en la disponibilidad teorica calculada por el sistema.
>>>>>>> master
  const validSlotsInfo = await listAvailableSlots({
    companyId,
    professionalId,
    serviceId: resolvedServiceId,
    startDate: normalizedDate,
    endDate: normalizedDate,
    referenceDate,
    limit: 150,
  });

<<<<<<< HEAD
  const slotIsValid = validSlotsInfo.some(
    (slot) =>
      Number(slot.professionalId) === Number(professionalId) &&
      slot.date === normalizedDate &&
      slot.time === normalizedTime
  );

  if (!slotIsValid) {
    throw new Error(
      `El horario solicitado (${normalizedDate} a las ${normalizedTime}) no forma parte de la jornada laboral o ya caduco. Usa la herramienta find_available_slots para ver que horarios si estan disponibles y ofrecerlos.`
    );
  }

  const servicio = await prisma.sERVICIO.findUnique({
    where: { id_servicio: resolvedServiceId },
  });
  if (!servicio) throw new Error("Servicio no encontrado");

  const duration = servicio.duracion_minutos || 30;
  const fechaHora = new Date(`${normalizedDate}T${normalizedTime}:00Z`);
=======
  const slotIsValid = validSlotsInfo.some(s => 
    Number(s.professionalId) === Number(professionalId) && 
    s.date === normalizedDate && 
    s.time === normalizedTime
  );

  if (!slotIsValid) {
    throw new Error(`El horario solicitado (${normalizedDate} a las ${normalizedTime}) NO forma parte de la jornada laboral o ya caduco. Usa la herramienta find_available_slots para ver que horarios si estan disponibles y ofrecerlos.`);
  }

  const servicio = await prisma.sERVICIO.findUnique({ where: { id_servicio: resolvedServiceId } });
  if (!servicio) throw new Error("Servicio no encontrado");

  const duration = servicio.duracion_minutos || 30;
  // Agregamos la "Z" al final para que JS lo tome como UTC puro
  // y Prisma guarde 14:30 tal cual, sin sumarle las 3 horas de offset.
  const fechaHora = new Date(`${normalizedDate}T${normalizedTime}:00Z`);

>>>>>>> master
  const endTime = new Date(fechaHora.getTime() + duration * 60000);

  const existing = await prisma.tURNO.findFirst({
    where: {
      id_prestador: professionalId,
      estado: { in: ["pendiente", "confirmado"] },
      fecha_hora: {
        gte: fechaHora,
        lt: endTime,
      },
    },
  });

<<<<<<< HEAD
  if (existing) {
    throw new Error("Ese horario ya no esta disponible. Proba con otro.");
  }
=======
  if (existing) throw new Error("Ese horario ya no estÃ¡ disponible. ProbÃ¡ con otro.");
>>>>>>> master

  const client = await findOrCreateClient({
    companyId,
    clientName,
    clientPhone,
  });

  const turnoData = {
    id_cliente: client.id_cliente,
    id_prestador: professionalId,
    id_servicio: resolvedServiceId,
    fecha_hora: fechaHora,
    estado: "confirmado",
  };

  if (await hasTurnoOrigenColumn()) {
    turnoData.origen = "whatsapp";
  }

  const turno = await prisma.tURNO.create({
    data: turnoData,
  });

  return {
    appointmentId: turno.id_turno,
    professionalName: `${prestador.USUARIO.nombre} ${prestador.USUARIO.apellido}`,
    serviceName: servicio.nombre,
    clientName: client.nombre_wa || clientName,
    date: normalizedDate,
    time: normalizedTime,
    endTime: `${pad(endTime.getUTCHours())}:${pad(endTime.getUTCMinutes())}`,
    companyId,
    professionalId,
    serviceId: resolvedServiceId,
  };
};

<<<<<<< HEAD
const cancelAppointmentFromAssistant = async ({
  companyId,
  clientPhone,
  date,
  time,
  referenceDate,
}) => {
=======
// â”€â”€â”€ Cancel appointment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cancelAppointmentFromAssistant = async ({ companyId, clientPhone, date, time, referenceDate }) => {
>>>>>>> master
  const normalizedPhone = normalizePhone(clientPhone);
  const normalizedDate = date ? normalizeDate(date, referenceDate) : null;
  const normalizedTime = time ? formatTime(time) : null;

  const client = await prisma.cLIENTE.findFirst({
    where: {
      id_empresa: companyId,
      whatsapp_id: { contains: normalizedPhone.slice(-8) },
    },
  });

<<<<<<< HEAD
  if (!client) throw new Error("No encontre tu registro de cliente.");
=======
  if (!client) throw new Error("No encontrÃ© tu registro de cliente.");
>>>>>>> master

  const where = {
    id_cliente: client.id_cliente,
    estado: { in: ["pendiente", "confirmado"] },
    fecha_hora: { gte: getNowInTimezone() },
  };

  const appointments = await prisma.tURNO.findMany({
    where,
    orderBy: { fecha_hora: "asc" },
  });

  let filtered = appointments;
  if (normalizedDate) {
    filtered = filtered.filter(
      (appointment) =>
        appointment.fecha_hora.toISOString().slice(0, 10) === normalizedDate
    );
  }
  if (normalizedTime) {
<<<<<<< HEAD
    filtered = filtered.filter((appointment) => {
      const slotTime = `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
        appointment.fecha_hora.getUTCMinutes()
      )}`;
      return slotTime === normalizedTime;
    });
  }

  if (!filtered.length) {
    throw new Error("No encontre ningun turno pendiente para cancelar.");
  }
=======
    filtered = filtered.filter((a) => {
      const t = `${pad(a.fecha_hora.getUTCHours())}:${pad(a.fecha_hora.getUTCMinutes())}`;
      return t === normalizedTime;
    });
  }

  if (!filtered.length) throw new Error("No encontrÃ© ningÃºn turno pendiente para cancelar.");
>>>>>>> master

  if (filtered.length > 1 && (!normalizedDate || !normalizedTime)) {
    return {
      status: "multiple_found",
<<<<<<< HEAD
      appointments: filtered.map((appointment) => ({
        id: appointment.id_turno,
        date: appointment.fecha_hora.toISOString().slice(0, 10),
        time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
          appointment.fecha_hora.getUTCMinutes()
        )}`,
=======
      appointments: filtered.map((a) => ({
        id: a.id_turno,
        date: a.fecha_hora.toISOString().slice(0, 10),
        time: `${pad(a.fecha_hora.getUTCHours())}:${pad(a.fecha_hora.getUTCMinutes())}`,
>>>>>>> master
      })),
    };
  }

  const appointment = filtered[0];
  await prisma.tURNO.update({
    where: { id_turno: appointment.id_turno },
    data: { estado: "cancelado" },
  });

  return {
    status: "cancelled",
    appointmentId: appointment.id_turno,
    date: appointment.fecha_hora.toISOString().slice(0, 10),
<<<<<<< HEAD
    time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
      appointment.fecha_hora.getUTCMinutes()
    )}`,
  };
};

=======
    time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(appointment.fecha_hora.getUTCMinutes())}`,
  };
};

// â”€â”€â”€ List appointments by day â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> master
const listAppointmentsByDay = async ({ companyId, date, referenceDate }) => {
  const normalizedDate =
    normalizeDate(date, referenceDate) || normalizeDate(referenceDate);
  if (!normalizedDate) return [];

  const dayStart = new Date(`${normalizedDate}T00:00:00Z`);
  const dayEnd = new Date(`${normalizedDate}T23:59:59Z`);

  const turnos = await prisma.tURNO.findMany({
    where: {
      estado: { in: ["pendiente", "confirmado"] },
      fecha_hora: { gte: dayStart, lte: dayEnd },
      PRESTADOR: { id_empresa: companyId },
    },
    include: {
      SERVICIO: true,
      PRESTADOR: { include: { USUARIO: true } },
      CLIENTE: true,
    },
    orderBy: { fecha_hora: "asc" },
  });

<<<<<<< HEAD
  return turnos.map((turno) => ({
    appointmentId: turno.id_turno,
    date: turno.fecha_hora.toISOString().slice(0, 10),
    time: formatTime(
      `${pad(turno.fecha_hora.getUTCHours())}:${pad(
        turno.fecha_hora.getUTCMinutes()
      )}`
    ),
    status: turno.estado,
    serviceName: turno.SERVICIO?.nombre || "Turno",
    professionalName: `${turno.PRESTADOR.USUARIO.nombre} ${turno.PRESTADOR.USUARIO.apellido}`,
    clientName: turno.CLIENTE?.nombre_wa || "Sin nombre",
  }));
};

=======
  return turnos.map((t) => ({
    appointmentId: t.id_turno,
    date: t.fecha_hora.toISOString().slice(0, 10),
    time: formatTime(`${pad(t.fecha_hora.getUTCHours())}:${pad(t.fecha_hora.getUTCMinutes())}`),
    status: t.estado,
    serviceName: t.SERVICIO?.nombre || "Turno",
    professionalName: `${t.PRESTADOR.USUARIO.nombre} ${t.PRESTADOR.USUARIO.apellido}`,
    clientName: t.CLIENTE?.nombre_wa || "Sin nombre",
  }));
};

// â”€â”€â”€ Cancel appointment by company slot (support bot) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> master
const cancelAppointmentByCompanyFromAssistant = async ({
  companyId,
  date,
  time,
  referenceDate,
  professionalName,
  clientName,
}) => {
  const normalizedDate = date ? normalizeDate(date, referenceDate) : null;
  const normalizedTime = time ? formatTime(time) : null;

  const where = {
    estado: { in: ["pendiente", "confirmado"] },
    PRESTADOR: { id_empresa: companyId },
  };

  if (normalizedDate) {
    where.fecha_hora = {
      gte: new Date(`${normalizedDate}T00:00:00Z`),
      lte: new Date(`${normalizedDate}T23:59:59Z`),
    };
  } else {
    where.fecha_hora = { gte: getNowInTimezone() };
  }

  const appointments = await prisma.tURNO.findMany({
    where,
    include: {
      SERVICIO: true,
      PRESTADOR: { include: { USUARIO: true } },
      CLIENTE: true,
    },
    orderBy: { fecha_hora: "asc" },
  });

  let filtered = appointments;
<<<<<<< HEAD

  if (normalizedTime) {
    filtered = filtered.filter((appointment) => {
      const slotTime = `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
        appointment.fecha_hora.getUTCMinutes()
      )}`;
      return slotTime === normalizedTime;
=======
  if (normalizedTime) {
    filtered = filtered.filter((a) => {
      const t = `${pad(a.fecha_hora.getUTCHours())}:${pad(a.fecha_hora.getUTCMinutes())}`;
      return t === normalizedTime;
>>>>>>> master
    });
  }

  if (professionalName) {
<<<<<<< HEAD
    const needle = normalizeSearchText(professionalName);
    filtered = filtered.filter((appointment) => {
      const fullName = normalizeSearchText(
        `${appointment.PRESTADOR?.USUARIO?.nombre || ""} ${
          appointment.PRESTADOR?.USUARIO?.apellido || ""
        }`
      );
=======
    const needle = String(professionalName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    filtered = filtered.filter((a) => {
      const fullName = `${a.PRESTADOR?.USUARIO?.nombre || ""} ${a.PRESTADOR?.USUARIO?.apellido || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
>>>>>>> master
      return fullName.includes(needle);
    });
  }

  if (clientName) {
<<<<<<< HEAD
    const needle = normalizeSearchText(clientName);
    filtered = filtered.filter((appointment) =>
      normalizeSearchText(appointment.CLIENTE?.nombre_wa || "").includes(needle)
    );
  }

  if (!filtered.length) {
    throw new Error(
      "No encontre ningun turno activo con esos datos para cancelar."
    );
=======
    const needle = String(clientName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    filtered = filtered.filter((a) => {
      const fullName = String(a.CLIENTE?.nombre_wa || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return fullName.includes(needle);
    });
  }

  if (!filtered.length) {
    throw new Error("No encontrÃ© ningÃºn turno activo con esos datos para cancelar.");
>>>>>>> master
  }

  if (filtered.length > 1 && (!normalizedDate || !normalizedTime)) {
    return {
      status: "multiple_found",
<<<<<<< HEAD
      appointments: filtered.slice(0, 8).map((appointment) => ({
        id: appointment.id_turno,
        date: appointment.fecha_hora.toISOString().slice(0, 10),
        time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
          appointment.fecha_hora.getUTCMinutes()
        )}`,
        professional: `${appointment.PRESTADOR?.USUARIO?.nombre || ""} ${
          appointment.PRESTADOR?.USUARIO?.apellido || ""
        }`.trim(),
        client: appointment.CLIENTE?.nombre_wa || "Sin nombre",
=======
      appointments: filtered.slice(0, 8).map((a) => ({
        id: a.id_turno,
        date: a.fecha_hora.toISOString().slice(0, 10),
        time: `${pad(a.fecha_hora.getUTCHours())}:${pad(a.fecha_hora.getUTCMinutes())}`,
        professional: `${a.PRESTADOR?.USUARIO?.nombre || ""} ${a.PRESTADOR?.USUARIO?.apellido || ""}`.trim(),
        client: a.CLIENTE?.nombre_wa || "Sin nombre",
>>>>>>> master
      })),
    };
  }

  const appointment = filtered[0];
  await prisma.tURNO.update({
    where: { id_turno: appointment.id_turno },
    data: { estado: "cancelado" },
  });

  return {
    status: "cancelled",
    appointmentId: appointment.id_turno,
    date: appointment.fecha_hora.toISOString().slice(0, 10),
<<<<<<< HEAD
    time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(
      appointment.fecha_hora.getUTCMinutes()
    )}`,
    professional: `${appointment.PRESTADOR?.USUARIO?.nombre || ""} ${
      appointment.PRESTADOR?.USUARIO?.apellido || ""
    }`.trim(),
=======
    time: `${pad(appointment.fecha_hora.getUTCHours())}:${pad(appointment.fecha_hora.getUTCMinutes())}`,
    professional: `${appointment.PRESTADOR?.USUARIO?.nombre || ""} ${appointment.PRESTADOR?.USUARIO?.apellido || ""}`.trim(),
>>>>>>> master
    client: appointment.CLIENTE?.nombre_wa || "Sin nombre",
    clientPhone: normalizePhone(appointment.CLIENTE?.whatsapp_id || ""),
    service: appointment.SERVICIO?.nombre || "Turno",
    askNotifyMati: true,
  };
};

module.exports = {
  cancelAppointmentFromAssistant,
  cancelAppointmentByCompanyFromAssistant,
  createAppointmentFromAssistant,
  getCompanyContextByCompanyId,
  getCompanyContextByInstanceName,
  isSlotStillBookable,
  listAvailableSlots,
  listAppointmentsByDay,
  normalizeDate,
};

