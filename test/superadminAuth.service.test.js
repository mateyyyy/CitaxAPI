const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SUPERADMIN_EMAIL,
  DEFAULT_SUPERADMIN_PASSWORD,
  getSuperadminCredentials,
  normalizeCredentialValue,
  normalizeEmail,
} = require("../src/services/superadminAuth.service");

test("getSuperadminCredentials uses defaults when env vars are missing", () => {
  const credentials = getSuperadminCredentials({});

  assert.equal(credentials.email, DEFAULT_SUPERADMIN_EMAIL);
  assert.equal(credentials.password, DEFAULT_SUPERADMIN_PASSWORD);
  assert.equal(credentials.usingDefaults, true);
});

test("getSuperadminCredentials trims and normalizes configured credentials", () => {
  const credentials = getSuperadminCredentials({
    SUPERADMIN_EMAIL: "  ADMIN@CITAX.COM.AR  ",
    SUPERADMIN_PASSWORD: "  seCreta123  ",
    SUPERADMIN_JWT_SECRET: "  jwt-secret  ",
    SUPPORT_WHATSAPP_INSTANCE: "  citax-support-whatsapp  ",
  });

  assert.equal(credentials.email, "admin@citax.com.ar");
  assert.equal(credentials.password, "seCreta123");
  assert.equal(credentials.secret, "jwt-secret");
  assert.equal(credentials.supportInstance, "citax-support-whatsapp");
  assert.equal(credentials.usingDefaults, false);
});

test("getSuperadminCredentials supports legacy production env aliases", () => {
  const credentials = getSuperadminCredentials({
    SUPERADMIN_USER: "  superadmin@citax.com  ",
    SUPERADMIN_PASS: "  Citax.Super2025!  ",
    SUPERADMIN_SECRET: "  superadmin-secret-citax-2025  ",
    SUPERADMIN_WA_INSTANCE: "  citax-support-whatsapp  ",
  });

  assert.equal(credentials.email, "superadmin@citax.com");
  assert.equal(credentials.password, "Citax.Super2025!");
  assert.equal(credentials.secret, "superadmin-secret-citax-2025");
  assert.equal(credentials.supportInstance, "citax-support-whatsapp");
  assert.equal(credentials.usingDefaults, false);
});

test("normalize helpers sanitize raw login values", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeCredentialValue("  clave123  "), "clave123");
});
