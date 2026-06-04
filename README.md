# Galería de Arte con Votación

Proyecto completo para una galería de arte con votación y panel administrativo.

## Arquitectura

- `server.js`: servidor Express principal.
- `db.js`: configuración de MongoDB con Mongoose.
- `models/`: esquemas de datos para obras, votos y verificaciones.
- `routes/`: API REST para obras, votos, envíos y administración.
- `utils/`: integraciones con Cloudinary y SMTP.
- `public/`: front-end en HTML/CSS/JavaScript puro.
- `.env.example`: variables de entorno.

## Tecnologías

- Node.js + Express
- MongoDB + Mongoose
- Cloudinary para almacenamiento de imágenes
- Vanilla JavaScript para el frontend

## Instalación

1. Copia `.env.example` a `.env` y configura los valores.
2. Ejecuta:
   ```bash
   npm install
   ```
3. Si no tienes SMTP disponible, configura `NO_EMAIL_MODE=true` en `.env`.
   - En ese modo, el servidor generará el código y lo devolverá directamente en la respuesta de la solicitud.
4. Inicia el servidor:
   ```bash
   npm install
   npm run dev
   ```
5. Abre `http://localhost:4000` para la galería.
6. Abre `http://localhost:4000/embed-demo.html` para ver un demo del widget embebido.
7. Abre `http://localhost:4000/admin.html` para el panel administrativo.
   - Ingresa tu token administrativo en el campo y usa el formulario de carga para subir obras con nombre, apellido, categoría, descripción y foto.
8. Si no hay obras disponibles, ejecuta el seed para datos de prueba:
   ```bash
   node scripts/seed-artworks.js
   ```

> Si despliegas en Vercel, ahora hay un `vercel.json` y un `api/index.js` para que el backend Express funcione como función de servidor. Asegúrate de configurar las variables de entorno: `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_TOKEN`, y `NO_EMAIL_MODE=true` si no usas SMTP.

## Widget embebido

Puedes embeber la galería en otra página con este código:

```html
<div id="art-gallery-embed"></div>
<script src="https://tu-dominio.com/embed.js" data-api-base="https://tu-dominio.com" data-container="art-gallery-embed"></script>
```

- `data-api-base`: la URL base de tu servidor Express.
- `data-container`: el `id` del elemento donde se mostrará el widget.

Si prefieres usar un `iframe`, crea un HTML de iframe en tu app y carga esa página desde tu otra web:

```html
<iframe src="https://tu-dominio.com/iframe.html" width="100%" height="900" frameborder="0" scrolling="no"></iframe>
```

Esto es útil cuando el editor de la otra web no permite scripts directos.

## Endpoints principales

- `GET /api/artworks`
- `POST /api/votes`
- `POST /api/submissions/request-code`
- `POST /api/submissions/verify-code`
- `POST /api/submissions/upload`
- `GET /api/admin/pending`
- `POST /api/admin/approve`
- `POST /api/admin/reject`
- `GET /api/admin/ranking`
