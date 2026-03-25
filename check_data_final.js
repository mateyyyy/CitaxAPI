const pool = require('./src/config/db');

async function check() {
  try {
    const [users] = await pool.execute('SELECT * FROM USUARIO WHERE email = "admin@citax.com"');
    console.log('User:', JSON.stringify(users[0], null, 2));
    
    if (users[0]) {
      const [companies] = await pool.execute('SELECT * FROM EMPRESA WHERE id_usuario = ?', [users[0].id_usuario]);
      console.log('Company:', JSON.stringify(companies[0], null, 2));
    }

    const [services] = await pool.execute('SELECT * FROM SERVICIO');
    console.log('Total services:', services.length);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
