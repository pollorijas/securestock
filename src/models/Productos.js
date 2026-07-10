const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del Producto es obligatorio'],
    unique: true
  },
  stockActual: {
    type: Number,
    required: [true, 'El stock es obligatorio'],
    default: 0
  },
  stockActual: {
    type: Number,
    required: [true, 'El stock minimo es obligatorio']
  },
  unidad: {
    type: String,
    required: [true, 'El tipo de unidad es obligatorio'],
  },
  categoria: {
    type: String,
    default: 'sin-categoria'
  },
  proveedorId: {
    type: Schema.Types.ObjectId,
    ref: 'Proveedor'
  },
  resetToken: String,
  expiraToken: Date
}, {
  timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Producto', productoSchema);