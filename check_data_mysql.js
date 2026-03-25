const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [users] = await connection.execute('SELECT * FROM USUARIO WHERE email = "admin@citax.com"');
    console.log('User:', JSON.stringify(users[0], null, 2));
    
    if (users[0]) {
      const [companies] = await connection.execute('SELECT * FROM EMPRESA WHERE id_usuario = ?', [users[0].id_usuario]);
      console.log('Company:', JSON.stringify(companies[0], null, 2));
    }

    const [services] = await connection.execute('SELECT * FROM SERVICIO');
    console.log('Total services:', services.length);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
