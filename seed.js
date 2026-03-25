require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
    console.log("🌱 Seeding database using MySQL2...");

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 4000,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        const passwordHash = await bcrypt.hash('admin123', 10);

        // 1. Create User
        const [userRows] = await pool.execute('SELECT id_usuario FROM USUARIO WHERE email = ?', ['admin@citax.com']);
        let userId;
        if (userRows.length > 0) {
            userId = userRows[0].id_usuario;
            console.log("User already exists.");
        } else {
            const [res] = await pool.execute(
                'INSERT INTO USUARIO (email, password_hash, nombre, apellido, rol) VALUES (?, ?, ?, ?, ?)',
                ['admin@citax.com', passwordHash, 'Admin', 'Citax', 'admin_empresa']
            );
            userId = res.insertId;
            console.log("User created.");
        }

        // 2. Create Empresa
        const [empRows] = await pool.execute('SELECT id_empresa FROM EMPRESA WHERE id_usuario = ?', [userId]);
        let empresaId;
        const configRecordatorios = JSON.stringify({
            recordatorio_activo: true,
            recordatorio_offsets_minutos: [1440, 60],
            recordatorio_mensaje: "Hola {{cliente_nombre}}, te recordamos tu turno para {{fecha}} a las {{hora}} en {{empresa_nombre}}."
        });
        const availability = JSON.stringify({
            config: [
                { dia_semana: 1, hora_desde: "09:00", hora_hasta: "18:00", activo: 1 },
                { dia_semana: 2, hora_desde: "09:00", hora_hasta: "18:00", activo: 1 },
                { dia_semana: 3, hora_desde: "09:00", hora_hasta: "18:00", activo: 1 },
                { dia_semana: 4, hora_desde: "09:00", hora_hasta: "18:00", activo: 1 },
                { dia_semana: 5, hora_desde: "09:00", hora_hasta: "18:00", activo: 1 },
                { dia_semana: 6, hora_desde: "09:00", hora_hasta: "13:00", activo: 1 }
            ]
        });

        if (empRows.length > 0) {
            empresaId = empRows[0].id_empresa;
            console.log("Empresa already exists.");
        } else {
            const [res] = await pool.execute(
                'INSERT INTO EMPRESA (id_usuario, nombre_comercial, direccion, config_recordatorios, horarios_disponibilidad) VALUES (?, ?, ?, ?, ?)',
                [userId, 'Barberia Citax', 'Calle Falsa 123', configRecordatorios, availability]
            );
            empresaId = res.insertId;
            console.log("Empresa created.");
        }

        // 3. Services
        await pool.execute('INSERT IGNORE INTO SERVICIO (id_empresa, nombre, duracion_minutos, precio) VALUES (?, ?, ?, ?)', 
            [empresaId, 'Corte de Cabello', 30, 5000]);
        await pool.execute('INSERT IGNORE INTO SERVICIO (id_empresa, nombre, duracion_minutos, precio) VALUES (?, ?, ?, ?)', 
            [empresaId, 'Corte + Barba', 60, 8500]);
        console.log("Services seeded.");

        // 4. Prestador
        const [pRows] = await pool.execute('SELECT id_prestador FROM PRESTADOR WHERE id_usuario = ?', [userId]);
        if (pRows.length === 0) {
            await pool.execute('INSERT INTO PRESTADOR (id_usuario, id_empresa, activo) VALUES (?, ?, ?)', [userId, empresaId, 1]);
            console.log("Prestador created.");
        }

        console.log("✅ Database seeded successfully!");
        console.log("User: admin@citax.com | Pass: admin123");
    } catch (err) {
        console.error("❌ Seeding error:", err.message);
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
