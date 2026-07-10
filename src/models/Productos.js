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
  stockMinimo: {
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor'
  }
}, {
  timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Producto', productoSchema);