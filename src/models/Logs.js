const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  accion: {
    type: String,
    required: true
  },
  fechaHora: {
    type: Date,
    required: true,
    default: Date.now
  },
  ip: {
    type: String
  },
  detalles: {
    type: Object
  }
}, { timestamps: true });

module.exports = mongoose.model("Log", logSchema);