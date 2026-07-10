const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    unique: true
  },
  rut: {
    type: String,
    required: [true, 'El tur es obligatorio'],
    unique: true,
    lowercase: true
  },
  direccion: {
    type: String,
    required: [true, 'La direccion es obligatoria']
  },
  telefono: {
    type: String,
    required: [true, 'El teleefonon es obligatoria']
  },
  email: {
    type: String,
    unique: true,
    lowercase: true
  },
  contacto: {
    type: String
  },
  resetToken: String,
  expiraToken: Date
}, {
  timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Proveedor', proveedorSchema);