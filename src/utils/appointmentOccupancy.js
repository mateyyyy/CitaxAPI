const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
const OCCUPYING_APPOINTMENT_STATUSES = Object.freeze([
  "pendiente",
  "pendiente_confirmacion",
  "confirmado",
]);

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + Number(minutes || 0) * 60000);

const rangesOverlap = (startA, endA, startB, endB) =>
  startA < endB && startB < endA;

const isOccupyingAppointmentStatus = (status) =>
  OCCUPYING_APPOINTMENT_STATUSES.includes(
    String(status || "").trim().toLowerCase(),
  );

module.exports = {
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  OCCUPYING_APPOINTMENT_STATUSES,
  addMinutes,
  isOccupyingAppointmentStatus,
  rangesOverlap,
};
