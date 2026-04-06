const test = require("node:test");
const assert = require("node:assert/strict");

const { isSlotStillBookable } = require("../src/services/ai/companyContextService");

test("isSlotStillBookable keeps the opening slot available while it has not ended", () => {
  const slotEnd = new Date("2026-03-31T10:00:00Z");
  const now = new Date("2026-03-31T09:15:00Z");

  assert.equal(isSlotStillBookable({ slotEnd, now }), true);
});

test("isSlotStillBookable rejects slots that already ended", () => {
  const slotEnd = new Date("2026-03-31T10:00:00Z");
  const now = new Date("2026-03-31T10:00:00Z");

  assert.equal(isSlotStillBookable({ slotEnd, now }), false);
});
