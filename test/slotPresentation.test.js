const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compactTime,
  formatNaturalDate,
  prioritizeOwnScheduleSlots,
  summarizeAvailableSlotsForAssistant,
} = require("../src/services/ai/slotPresentation");

test("formatNaturalDate uses relative labels for today and tomorrow", () => {
  assert.equal(
    formatNaturalDate({
      date: "2026-03-31",
      referenceDate: "2026-03-31",
    }),
    "hoy martes 31"
  );

  assert.equal(
    formatNaturalDate({
      date: "2026-04-01",
      referenceDate: "2026-03-31",
    }),
    "mañana miércoles 1"
  );
});

test("compactTime removes minutes when exact hour", () => {
  assert.equal(compactTime("13:00"), "13");
  assert.equal(compactTime("13:30"), "13:30");
});

test("summarizeAvailableSlotsForAssistant groups and compresses long slot lists", () => {
  const grouped = summarizeAvailableSlotsForAssistant({
    referenceDate: "2026-03-31",
    slots: [
      { professionalId: 1, professionalName: "Carlos Garcia", date: "2026-03-31", time: "13:00", scheduleSource: "own" },
      { professionalId: 1, professionalName: "Carlos Garcia", date: "2026-03-31", time: "13:30", scheduleSource: "own" },
      { professionalId: 1, professionalName: "Carlos Garcia", date: "2026-03-31", time: "14:00", scheduleSource: "own" },
      { professionalId: 1, professionalName: "Carlos Garcia", date: "2026-03-31", time: "14:30", scheduleSource: "own" },
      { professionalId: 1, professionalName: "Carlos Garcia", date: "2026-03-31", time: "15:00", scheduleSource: "own" },
      { professionalId: 2, professionalName: "Nicolas Triberti", date: "2026-03-31", time: "13:00", scheduleSource: "own" },
      { professionalId: 2, professionalName: "Nicolas Triberti", date: "2026-03-31", time: "13:30", scheduleSource: "own" },
    ],
  });

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].professionalName, "Carlos Garcia");
  assert.equal(grouped[0].displayMode, "range");
  assert.equal(grouped[0].displayText, "de 13 a 15");
  assert.equal(grouped[0].humanDate, "hoy martes 31");
  assert.equal(grouped[1].displayMode, "list");
  assert.equal(grouped[1].displayText, "13:00, 13:30");
});

test("prioritizeOwnScheduleSlots drops fallback slots when own slots exist", () => {
  const visible = prioritizeOwnScheduleSlots([
    {
      professionalId: 1,
      professionalName: "Carlos Garcia",
      date: "2026-04-01",
      time: "09:00",
      scheduleSource: "fallback_empresa",
    },
    {
      professionalId: 2,
      professionalName: "Nicolas Triberti",
      date: "2026-04-01",
      time: "10:00",
      scheduleSource: "own",
    },
  ]);

  assert.equal(visible.length, 1);
  assert.equal(visible[0].professionalName, "Nicolas Triberti");
  assert.equal(visible[0].scheduleSource, "own");
});
