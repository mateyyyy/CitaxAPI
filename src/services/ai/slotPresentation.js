const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

const normalizeDateOnly = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 10);
};

const daysBetween = (leftDate, rightDate) => {
  if (!leftDate || !rightDate) return null;
  const left = new Date(`${leftDate}T12:00:00Z`);
  const right = new Date(`${rightDate}T12:00:00Z`);
  return Math.round((left.getTime() - right.getTime()) / 86400000);
};

const formatWeekday = (dateStr, timezone = DEFAULT_TIMEZONE) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: timezone,
  }).format(new Date(`${dateStr}T12:00:00Z`));

const formatDayOfMonth = (dateStr, timezone = DEFAULT_TIMEZONE) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${dateStr}T12:00:00Z`));

const formatNaturalDate = ({
  date,
  referenceDate,
  timezone = DEFAULT_TIMEZONE,
}) => {
  const normalizedDate = normalizeDateOnly(date);
  const normalizedReference = normalizeDateOnly(referenceDate);
  const weekday = formatWeekday(normalizedDate, timezone);
  const day = formatDayOfMonth(normalizedDate, timezone);
  const diff = daysBetween(normalizedDate, normalizedReference);

  if (diff === 0) return `hoy ${weekday} ${day}`;
  if (diff === 1) return `mañana ${weekday} ${day}`;
  return `${weekday} ${day}`;
};

const compactTime = (time) => {
  const raw = String(time || "").trim();
  if (!raw) return "";
  return raw.endsWith(":00") ? String(Number(raw.slice(0, 2))) : raw;
};

const buildTimeDisplay = (times) => {
  if (!Array.isArray(times) || !times.length) {
    return { mode: "empty", text: "" };
  }

  if (times.length <= 4) {
    return {
      mode: "list",
      text: times.join(", "),
    };
  }

  return {
    mode: "range",
    text: `de ${compactTime(times[0])} a ${compactTime(times[times.length - 1])}`,
  };
};

const prioritizeOwnScheduleSlots = (slots) => {
  const normalizedSlots = Array.isArray(slots) ? slots : [];
  const hasOwnSlots = normalizedSlots.some(
    (slot) => String(slot?.scheduleSource || "").trim() === "own"
  );

  if (!hasOwnSlots) {
    return normalizedSlots;
  }

  return normalizedSlots.filter(
    (slot) => String(slot?.scheduleSource || "").trim() === "own"
  );
};

const summarizeAvailableSlotsForAssistant = ({
  slots,
  referenceDate,
  timezone = DEFAULT_TIMEZONE,
}) => {
  const visibleSlots = prioritizeOwnScheduleSlots(slots);
  const groups = new Map();

  for (const slot of visibleSlots) {
    const professionalId = Number(slot.professionalId || 0);
    const date = normalizeDateOnly(slot.date);
    const key = `${professionalId}:${date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        professionalId,
        professionalName: slot.professionalName,
        date,
        humanDate: formatNaturalDate({ date, referenceDate, timezone }),
        scheduleSource: slot.scheduleSource || "unknown",
        times: [],
      });
    }

    groups.get(key).times.push(String(slot.time || "").slice(0, 5));
  }

  return [...groups.values()]
    .map((group) => {
      const times = [...new Set(group.times)].sort();
      const display = buildTimeDisplay(times);

      return {
        ...group,
        times,
        slotCount: times.length,
        displayMode: display.mode,
        displayText: display.text,
        firstTime: times[0] || "",
        lastTime: times[times.length - 1] || "",
      };
    })
    .sort((left, right) => {
      if (left.date !== right.date) return left.date.localeCompare(right.date);
      return left.professionalName.localeCompare(right.professionalName);
    });
};

module.exports = {
  compactTime,
  formatNaturalDate,
  prioritizeOwnScheduleSlots,
  summarizeAvailableSlotsForAssistant,
};
