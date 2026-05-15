const FALLBACK_TIMEZONE = "America/Argentina/Buenos_Aires";

const getRuntimeTimeZone = () => {
  const configured = String(
    process.env.APP_TIMEZONE ||
      process.env.TZ ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "",
  ).trim();

  return configured || FALLBACK_TIMEZONE;
};

module.exports = {
  FALLBACK_TIMEZONE,
  getRuntimeTimeZone,
};
