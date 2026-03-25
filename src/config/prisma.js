require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 4000;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

// Build DATABASE_URL from individual vars if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?sslaccept=strict`;
}

const prisma = new PrismaClient();

module.exports = prisma;
