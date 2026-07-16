# SecureStock

Sistema web para el control de inventario, análisis de movimientos y seguridad por perfiles de la bodega de LogiSecure S.A. (empresa ficticia).

## Tecnologías

- Node.js + Express (API REST)
- MongoDB Atlas + Mongoose
- JWT para autenticación, bcrypt para contraseñas
- helmet, cors, express-validator (seguridad y validación)
- nodemailer (recuperación de contraseña por correo)
- Frontend en HTML, CSS puro (responsive) y JavaScript vanilla

## Roles

- **Operario**: registra ingresos/salidas, consulta el catálogo de productos con su stock y su propio historial.
- **Supervisor**: además de lo anterior, ve el historial completo y el dashboard, exporta reportes, y crea/edita productos.
- **Administrador**: acceso total; además gestiona proveedores y cuentas de usuario, y es el único que puede eliminar productos.

## Puesta en marcha

1. Instalar dependencias:
   ```
   npm install
   ```
2. Copiar `.env.example` a `.env` y completar los valores (conexión a MongoDB, `JWT_SECRET`, datos del administrador inicial, etc.).
3. Crear el primer usuario administrador:
   ```
   npm run seed
   ```
4. Levantar el servidor:
   ```
   npm run dev
   ```
5. Abrir `http://localhost:3000` en el navegador e iniciar sesión con el administrador creado.

## Endpoints principales

| Método | Endpoint                       | Descripción                                  | Roles                          |
|--------|---------------------------------|-----------------------------------------------|---------------------------------|
| POST   | /api/auth/registro              | Crear un nuevo usuario                         | Administrador                   |
| POST   | /api/auth/login                 | Iniciar sesión (devuelve token JWT)            | Público                         |
| GET    | /api/auth/me                    | Verificar sesión / rol actual                  | Autenticado                     |
| POST   | /api/auth/recuperar             | Solicitar enlace de recuperación de contraseña | Público                         |
| POST   | /api/auth/resetear              | Cambiar contraseña con token de recuperación   | Público                         |
| GET    | /api/productos                  | Listado de productos con stock                | Operario, Supervisor, Administrador |
| GET    | /api/productos/basico           | Listado reducido (para formularios)            | Autenticado                     |
| POST   | /api/productos                  | Crear producto                                 | Supervisor, Administrador       |
| PUT    | /api/productos/:id              | Actualizar producto                            | Supervisor, Administrador       |
| DELETE | /api/productos/:id              | Eliminar producto                              | Administrador                   |
| GET    | /api/proveedores                | Listado de proveedores                         | Autenticado                     |
| POST   | /api/proveedores                | Crear proveedor                                | Administrador                   |
| PUT    | /api/proveedores/:id            | Actualizar proveedor                           | Administrador                   |
| DELETE | /api/proveedores/:id            | Eliminar proveedor                             | Administrador                   |
| POST   | /api/movimientos/ingreso        | Registrar ingreso de productos                 | Operario, Administrador         |
| POST   | /api/movimientos/salida         | Registrar salida de productos                  | Operario, Administrador         |
| GET    | /api/movimientos                | Historial con filtros (tipo, producto, fechas) | Operario (propio), Supervisor, Administrador |
| GET    | /api/movimientos/inventario     | Stock actual de todos los productos            | Operario, Supervisor, Administrador |
| GET    | /api/movimientos/dashboard      | Indicadores para el panel principal            | Supervisor, Administrador       |
| GET    | /api/movimientos/export         | Exporta el historial (CSV o JSON)              | Supervisor, Administrador       |
| GET    | /api/logs                       | Consulta la auditoría del sistema              | Administrador                   |

## Seguridad implementada

- Contraseñas cifradas con bcrypt.
- Autenticación con JWT (expiración de 8 horas) y autorización por rol en cada ruta.
- Validación y sanitización de entradas con express-validator.
- Cabeceras de seguridad HTTP con helmet.
- Registro de auditoría (colección `logs`) para acciones críticas: login, registro de usuarios, ingresos/salidas, cambios en productos/proveedores, recuperación de contraseña.
- Recuperación de contraseña mediante token temporal (1 hora de validez) enviado por correo.
