const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['ingreso','salida'],
    required: [true, 'El tipo de ingreso es obligatorio']
  },
  destino: {
    type: String
  },
  fechahora: {
    type: Date,
    required: [true, 'La fecha y la hora es obligatoria es obligatorio'],
    default: Date.now
  },
  categoria: {
    type: String,
    default: 'sin-categoria'
  },
  observaciones: {
    type: String
  },
  lote: {
    type: String
  },
  factura: {
    type: String
  },
  proveedorId: {
    type: Schema.Types.ObjectId,
    ref: 'Proveedor'
  },
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true,
    index: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  resetToken: String,
  expiraToken: Date
}, {
  timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Movimiento', movimientoSchema);