require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    console.log("Conectando a la base de datos para agregar bot_config...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 4000,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    try {
        console.log("Agregando columna bot_config a EMPRESA...");
        await connection.query(`
            ALTER TABLE EMPRESA 
            ADD COLUMN bot_config JSON;
        `);
        console.log("✅ Columna bot_config agregada correctamente.");
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log("⚠️ La columna bot_config ya existe.");
        } else {
            console.error("❌ Error al actualizar la tabla:", err.message);
        }
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
