const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['ingreso', 'salida'],
    required: [true, 'El tipo de movimiento es obligatorio']
  },
  proveedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor'
  },
  destino: {
    type: String
  },
  fechaHora: {
    type: Date,
    required: true,
    default: Date.now
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  observaciones: {
    type: String
  },
  lote: {
    type: String
  },
  factura: {
    type: String
  }
}, {
  timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Movimiento', movimientoSchema);
