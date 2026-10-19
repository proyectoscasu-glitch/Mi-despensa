# Mi Despensa — Smart Home Pantry Manager

Aplicación web progresiva (PWA) moderna para el inventario doméstico colaborativo de parejas y familias. Diseñada bajo el sistema visual **Serene Hearth** (verde bosque profundo, toques de menta, crema cálido y tipografía *Plus Jakarta Sans*).

## ✨ Novedades del Rediseño

- **Bento Grid de Métricas:** Contadores en tiempo real de artículos totales, alimentos por vencer (≤ 3 días) y productos por reponer.
- **Iniciativa Cero Desperdicio:** Banner inteligente que sugiere recetas diarias según los ingredientes con caducidad más próxima.
- **Organización por Ubicaciones:** Acordeones desplegables táctiles divididos en:
  - 🥫 **Despensa:** Alimentos secos, legumbres, pastas y conservas.
  - 🥛 **Nevera:** Lácteos, salsas y productos refrigerados.
  - ❄️ **Congelador:** Carnes y verduras congeladas.
  - 🧼 **Limpieza / Hogar:** Detergentes y útiles de aseo.
- **Centro de Alertas de Hogar:** Pestañas dedicadas a:
  - *Fechas de Caducidad:* Semáforo de urgencia con botones de 1-clic para **Marcar consumido** y sugerir **Receta hoy**.
  - *Stock Mínimo:* Identificación de faltantes con botón para sumar a la **Lista de Compras**.
- **Acciones Rápidas de Existencias:** Botones táctiles `＋ Ingresar` y `− Descontar` en cada tarjeta con animación de respuesta y alertas por color.
- **Formulario con Previsualización en Vivo:** Al crear o editar productos ves la tarjeta resultante en tiempo real, con selector táctil de ubicación, umbrales de stock y alertas de vencimiento anticipadas (1 día, 3 días, 1 semana, 2 semanas).
- **Escáner de Código de Barras:** Lector por cámara web/móvil mediante ZXing o ingreso manual.
- **Modo Local 100% Autónomo:** Funciona sin internet ni cuentas externas usando `localStorage`.

---

## 🚀 Cómo probar en Modo Local

1. Haz doble clic en el archivo **`iniciar_local.bat`** (o ejecuta `python iniciar_local.py`).
2. Se abrirá automáticamente tu navegador en `http://localhost:8000/index.html`.
3. Haz clic en **⚡ Modo Local / Probar Demo**.
4. ¡Listo! La app cargará con datos de ejemplo (arroz, atún, leche, yogurt, verduras congeladas y lavavajillas) listos para interactuar.

---

## 📱 Cómo usarla en el iPhone

La app es una **PWA**, así que se usa desde Safari y se puede "instalar" en la
pantalla de inicio **sin pasar por la App Store**.

### Opción A — Publicar gratis (recomendada, HTTPS)
1. Entra en https://app.netlify.com/drop desde el PC.
2. Arrastra la carpeta `Mi_Despensa_primera_version` completa. Obtendrás una URL `https://...`.
3. Abre esa URL en **Safari** del iPhone.
4. Toca **Compartir** (↑) → **Añadir a pantalla de inicio**.

### Opción B — Probar por WiFi (misma red, sin publicar)
1. Ejecuta `iniciar_local.bat`.
2. En la consola verás una línea `Teléfono: http://TU-IP:8000/index.html`.
3. Conecta el iPhone a la **misma red WiFi** y abre esa dirección en Safari.
   *Funciona como web, pero "Añadir a pantalla de inicio" requiere HTTPS.*

### Íconos
Los íconos PNG (necesarios para iOS/Android) ya están generados. Si cambias el
diseño de `icon.svg`, vuelve a generarlos con:
```bash
py generar_iconos.py
```

---

## ☁️ Publicación en GitHub, Render y Supabase

Cuando estés listo para llevar la aplicación a la web y usarla desde teléfonos móviles:

1. **GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: rediseño Smart Home Pantry Manager con Serene Hearth y modo local"
   git remote add origin https://github.com/TU_USUARIO/mi-despensa.git
   git push -u origin main
   ```
2. **Render:**
   - En [Render.com](https://render.com), crea un nuevo servicio **Static Site**.
   - Conéctalo a tu repositorio de GitHub.
   - En *Publish directory*, déjalo en `./` o raíz.
   - Obtendrás una URL con HTTPS público (ej. `https://mi-despensa.onrender.com`).
3. **Supabase (Para sincronización multiusuario en la nube):**
   - Crea un proyecto en [Supabase](https://supabase.com).
   - En el **SQL Editor**, ejecuta el script `supabase.sql`.
   - Copia la `URL del proyecto` y la `clave anónima pública` en `config.js`.
   - La aplicación detectará automáticamente las claves y pasará del modo local al modo en la nube sincronizado en tiempo real.
