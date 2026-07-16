// Punto de entrada alternativo para plataformas de hosting (como Render) que
// por defecto intentan ejecutar "node index.js". El servidor real vive en
// server.js; este archivo solo lo reexporta para que ambos comandos funcionen.
require('./server.js');
