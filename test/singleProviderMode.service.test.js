const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getSingleProviderModeActivationStatus,
  isSingleProviderModeEnabledForConfig,
  parseBotConfig,
  sanitizeBotConfig,
} = require("../src/services/singleProviderMode.service");

test("parseBotConfig returns empty object for invalid payloads", () => {
  assert.deepEqual(parseBotConfig(null), {});
  assert.deepEqual(parseBotConfig("no-json"), {});
  assert.deepEqual(parseBotConfig([]), {});
});

test("sanitizeBotConfig forces first person when single provider mode is enabled", () => {
  const config = sanitizeBotConfig({
    rubro: "Peluqueria",
    primera_persona: false,
    cuenta_prestador_unico: true,
  });

  assert.equal(config.rubro, "Peluqueria");
  assert.equal(config.cuenta_prestador_unico, true);
  assert.equal(config.primera_persona, true);
});

test("isSingleProviderModeEnabledForConfig reads the bot config flag", () => {
  assert.equal(isSingleProviderModeEnabledForConfig({ cuenta_prestador_unico: true }), true);
  assert.equal(isSingleProviderModeEnabledForConfig({ cuenta_prestador_unico: false }), false);
});

test("getSingleProviderModeActivationStatus allows activation with zero or one provider", () => {
  assert.equal(getSingleProviderModeActivationStatus(0).allowed, true);
  assert.equal(getSingleProviderModeActivationStatus(1).allowed, true);
});

test("getSingleProviderModeActivationStatus blocks activation with multiple providers", () => {
  const status = getSingleProviderModeActivationStatus(2);
  assert.equal(status.allowed, false);
  assert.match(status.reason, /más de un prestador/i);
});
