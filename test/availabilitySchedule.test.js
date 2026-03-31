const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hasOwnAvailability,
  isNullishAvailability,
  normalizeActiveFlag,
  normalizeAvailabilityItems,
  resolveEffectiveAvailability,
} = require("../src/utils/availabilitySchedule");

test("normalizeActiveFlag handles boolean, numeric and string values safely", () => {
  assert.equal(normalizeActiveFlag(true), true);
  assert.equal(normalizeActiveFlag(false), false);
  assert.equal(normalizeActiveFlag(1), true);
  assert.equal(normalizeActiveFlag(0), false);
  assert.equal(normalizeActiveFlag("1"), true);
  assert.equal(normalizeActiveFlag("0"), false);
  assert.equal(normalizeActiveFlag("true"), true);
  assert.equal(normalizeActiveFlag("false"), false);
});

test("normalizeAvailabilityItems ignores days marked inactive even if activo comes as string", () => {
  const items = normalizeAvailabilityItems({
    config: [
      {
        dia_semana: 1,
        hora_desde: "09:00",
        hora_hasta: "17:00",
        activo: "0",
      },
      {
        dia_semana: 2,
        hora_desde: "10:00",
        hora_hasta: "14:00",
        activo: "1",
      },
    ],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].dia_semana, 2);
  assert.equal(items[0].hora_desde, "10:00");
  assert.equal(items[0].hora_hasta, "14:00");
});

test("fallback to company availability only happens when provider availability is nullish", () => {
  assert.equal(isNullishAvailability(null), true);
  assert.equal(isNullishAvailability("null"), true);
  assert.equal(isNullishAvailability(""), true);
  assert.equal(hasOwnAvailability({ config: [] }), true);

  const ownSchedule = resolveEffectiveAvailability({
    ownConfig: { config: [] },
    companyConfig: {
      config: [
        { dia_semana: 2, hora_desde: "09:00", hora_hasta: "17:00", activo: true },
      ],
    },
  });

  const fallbackSchedule = resolveEffectiveAvailability({
    ownConfig: null,
    companyConfig: {
      config: [
        { dia_semana: 2, hora_desde: "09:00", hora_hasta: "17:00", activo: true },
      ],
    },
  });

  assert.equal(ownSchedule.source, "own");
  assert.deepEqual(ownSchedule.config, { config: [] });
  assert.equal(fallbackSchedule.source, "fallback_empresa");
  assert.deepEqual(fallbackSchedule.config.config, [
    { dia_semana: 2, hora_desde: "09:00", hora_hasta: "17:00", activo: 1 },
  ]);
});
