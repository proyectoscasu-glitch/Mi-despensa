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

## ☁️ Modo compartido (nube) — para pareja o familia

La app ya está publicada y conectada a Supabase:

- **App:** https://proyectoscasu-glitch.github.io/Mi-despensa/
- **Migrar datos locales → nube:** https://proyectoscasu-glitch.github.io/Mi-despensa/migrar.html
- El proyecto de Supabase ya tiene las tablas, la seguridad (RLS) y las funciones necesarias.

### Poner en marcha (una sola vez)

1. Abre la app y pulsa **Registrarse**. Si Supabase pide confirmar el correo, revisa tu bandeja y haz clic en el enlace.
2. Inicia sesión: la app crea automáticamente tu despensa en la nube.
3. *(Opcional)* Si tenías datos en Modo Local **en ese mismo teléfono o navegador**, abre `migrar.html` en el mismo dispositivo, inicia sesión y pulsa **Migrar a la nube**. No se borra nada local; además puedes descargar una copia de seguridad en JSON.

### Invitar a tu pareja

1. En la app (cuenta dueña) ve a la pestaña **Pareja** y copia el **Código de invitación** (8 caracteres, ej. `CASA88`).
2. En el teléfono de tu pareja: crea su cuenta e inicia sesión.
3. En su app, pestaña **Pareja → Unirse a otra despensa**, escribe el código.
4. Desde ahí ambos ven y editan el **mismo inventario**, sincronizado en tiempo real.

> El código es único por despensa y dura 7 días. Puedes generar uno nuevo desde la misma pantalla.

### Archivos de la nube

- `config.js`: URL y clave pública (`anon`) del proyecto Supabase.
- `supabase.sql`: esquema completo (tablas, RLS, funciones). Úsalo si algún día creas otro proyecto.
- `migrar.html`: copia los datos del Modo Local de un dispositivo a la nube.

### Publicar cambios

```bash
git add -A
git commit -m "descripción del cambio"
git push
```

GitHub Pages se actualiza solo en ~1 minuto. Si cambias archivos que quedan en caché (`config.js`, `styles.css`, `index.html`), sube el número de versión en `sw.js` (`mi-despensa-shell-vN`) para que los teléfonos tomen la versión nueva.
