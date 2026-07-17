require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

async function crearAdmin() {
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Debes definir ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env antes de ejecutar este script');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existente = await Usuario.findOne({ email });
  if (existente) {
    console.log(`Ya existe un usuario con el correo ${email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Usuario.create({ nombre, email, passwordHash, rol: 'administrador' });

  console.log(`Administrador creado correctamente: ${email}`);
  await mongoose.disconnect();
}

crearAdmin().catch((error) => {
  console.error('Error al crear el administrador:', error);
  process.exit(1);
});
