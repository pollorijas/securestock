const mongoose = require("mongoose");

const movimientoDetSchema = new mongoose.Schema({
  movimientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movimiento',
    required: true,
    index: true
  },
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number
  },
  subtotal: {
    type: Number
  }
}, { timestamps: true });

// Calcula subtotal automáticamente si ambos valores existen
movimientoDetSchema.pre('save', function() {
  if (this.precioUnitario && this.cantidad) {
    this.subtotal = this.cantidad * this.precioUnitario;
  }
});

module.exports = mongoose.model('MovimientoDet', movimientoDetSchema);
