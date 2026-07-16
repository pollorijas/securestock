# Guion de demostración para el examen (10 minutos)

Según las instrucciones del examen, la demostración debe centrarse en las
funcionalidades relevantes y corresponder fielmente a la documentación entregada.
Este guion recorre los tres perfiles y las reglas de negocio clave del sistema.

## Antes de empezar (el día del examen, 30 minutos antes)

1. Verificar que el sistema responde:
   ```
   BASE_URL=https://TU-APP.onrender.com npm run verificar
   ```
   Deben aparecer todas las verificaciones con ✔.
2. Tener abiertas en pestañas: la aplicación en Render y MongoDB Atlas (colecciones).
3. Tener a mano las credenciales de los tres usuarios (operario, supervisor, administrador).
4. Nota: en el plan gratuito de Render el servidor "se duerme" tras 15 minutos sin
   uso y la primera visita tarda ~1 minuto en despertar. Abrir la aplicación
   ANTES de que comience la presentación para que ya esté despierta.

## Demostración sugerida (en orden)

**1. Login y seguridad (2 min) — como Operario**
- Iniciar sesión con credenciales incorrectas → mensaje de error (sin revelar detalles).
- Iniciar sesión como operario → observar que la barra de navegación solo muestra
  Panel e Ingresos/Salidas (control de acceso por rol, RF: perfiles diferenciados).

**2. Registro de movimientos (3 min) — como Operario**
- Registrar un ingreso: elegir proveedor, agregar 2 productos con cantidades, guardar.
- Registrar una salida: elegir destino, intentar una cantidad MAYOR al stock →
  el sistema la rechaza (RF09, validación de stock). Repetir con cantidad válida → éxito.
- Mostrar que el historial propio se actualizó con ambos movimientos (RF10:
  usuario responsable registrado automáticamente).

**3. Supervisión (2 min) — como Supervisor**
- Cerrar sesión e ingresar como supervisor.
- Panel: mostrar los gráficos (movimientos por día, top 5 productos) y la alerta
  de stock crítico (RF11).
- Historial completo con filtros por tipo y fecha (RF07) y exportar a CSV (RF12),
  abrir el archivo descargado.

**4. Administración (2 min) — como Administrador**
- Crear un producto nuevo (RF08) y mostrarlo en el inventario.
- Mostrar la gestión de usuarios (RF01: crear cuenta con rol).
- Opcional si hay tiempo: mostrar la recuperación de contraseña (RF03).

**5. Evidencia técnica (1 min)**
- Mostrar en MongoDB Atlas la colección `logs` con la auditoría de todo lo que se
  acaba de hacer en la demo (quién, qué y cuándo — RNF05).

## Consejos

- Ensayar la demo completa con cronómetro al menos dos veces.
- Si algo falla en vivo, explicar con calma qué debería ocurrir y continuar con el
  siguiente punto: la fluidez y el dominio del sistema también se evalúan.
- Los datos que se muestran son datos de prueba generados con `npm run seed:datos`.
