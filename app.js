import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BrowserMultiFormatReader } from "https://esm.sh/@zxing/browser@0.1.5";
import { createLocalClient, initDemoData } from "./local-db.js";

const cfg = window.MI_DESPENSA_CONFIG || {};
const isConfigured = cfg.SUPABASE_URL?.startsWith("https://") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("PEGA_AQUI");

// Recuerda en este dispositivo cuál es la despensa activa (útil al pertenecer a varias)
const ACTIVE_PANTRY_KEY = "mi_despensa_active_pantry";

const $ = (id) => document.getElementById(id);
const show = (id, yes = true) => $(id)?.classList.toggle("hidden", !yes);
const msg = (id, text = "", isError = false) => {
  const el = $(id);
  if (el) {
    el.textContent = text;
    el.classList.toggle("text-error", isError);
    el.classList.toggle("text-primary", !isError);
  }
};

let supabase = null;
let currentUser = null;
let currentPantry = null;
let products = [];
let scannerControls = null;
let realtimeChannel = null;
let currentMemberRole = "owner";

// Filtros de navegación
let currentFilter = "all";
let currentAlertTab = "all";
let currentMainTab = "tabInventory";

// Inicialización del cliente (Supabase o Local)
if (isConfigured) {
  supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  initApp();
} else {
  supabase = createLocalClient();
  initApp();
}

async function initApp() {
  bindEvents();

  // Escuchar estado de sesión
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await enterPantry();
  } else {
    showAuthView();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      await enterPantry();
    } else {
      showAuthView();
    }
  });
}

function bindEvents() {
  // Auth Form & Modales de Login
  $("authForm")?.addEventListener("submit", handleLogin);
  $("loginBtn")?.addEventListener("click", handleLogin);
  $("quickLocalBtn")?.addEventListener("click", handleQuickDemoLogin);
  $("signOutBtn")?.addEventListener("click", handleSignOut);
  $("headerResetDemoBtn")?.addEventListener("click", resetDemoPrompt);
  $("resetDemoBtn")?.addEventListener("click", resetDemoPrompt);
  $("togglePasswordBtn")?.addEventListener("click", togglePasswordVisibility);

  // Registro Local Modal
  $("openSignupBtn")?.addEventListener("click", () => show("signupModal", true));
  $("signupBtn")?.addEventListener("click", () => show("signupModal", true));
  $("closeSignupModalBtn")?.addEventListener("click", () => show("signupModal", false));
  $("signupForm")?.addEventListener("submit", handleCustomSignup);

  // Olvidé mi Contraseña Modal
  $("forgotPasswordBtn")?.addEventListener("click", openForgotPasswordModal);
  $("closeForgotModalBtn")?.addEventListener("click", () => show("forgotPasswordModal", false));
  $("lookupPasswordBtn")?.addEventListener("click", handleLookupPassword);
  $("updatePasswordBtn")?.addEventListener("click", handleUpdatePassword);

  // Google Login Modal
  $("googleLoginBtn")?.addEventListener("click", openGoogleModal);
  $("closeGoogleModalBtn")?.addEventListener("click", () => show("googleLoginModal", false));
  $("googleSuggestedAccountBtn")?.addEventListener("click", () => handleGoogleLogin("cristian@gmail.com", "Cristian"));
  $("googleCustomLoginBtn")?.addEventListener("click", () => handleCustomGoogleLogin());

  // Navegación Bottom Bar
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchMainTab(btn.dataset.target));
  });

  // Acciones Rápidas
  $("bottomAddBtn")?.addEventListener("click", () => openProductModal());
  $("quickAddBtn")?.addEventListener("click", () => openProductModal());
  $("quickScanBtn")?.addEventListener("click", openScanner);
  $("inviteParejaBtn")?.addEventListener("click", () => switchMainTab("tabPartner"));

  // Filtros de Inventario
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      currentFilter = chip.dataset.filter;
      updateFilterChipStyles();
      renderProducts();
    });
  });

  // Filtros de Alertas
  document.querySelectorAll(".alert-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentAlertTab = btn.dataset.tab;
      updateAlertTabStyles();
      renderAlerts();
    });
  });

  // Buscador
  $("searchInput")?.addEventListener("input", renderProducts);
  $("clearSearchBtn")?.addEventListener("click", () => {
    $("searchInput").value = "";
    renderProducts();
  });
  $("refreshBtn")?.addEventListener("click", loadProducts);

  // Modal Producto (Agregar / Editar)
  $("closeProductFormBtn")?.addEventListener("click", closeProductModal);
  $("cancelProductBtn")?.addEventListener("click", closeProductModal);
  $("productForm")?.addEventListener("submit", saveProduct);

  // Chips de ubicación en modal
  document.querySelectorAll(".loc-chip").forEach(chip => {
    chip.addEventListener("click", () => selectProductLocation(chip.dataset.loc));
  });

  // Chips de anticipación de vencimiento
  document.querySelectorAll(".exp-chip").forEach(chip => {
    chip.addEventListener("click", () => selectExpiryDays(chip.dataset.days));
  });

  // Reactividad en vista previa del formulario
  $("productName")?.addEventListener("input", updateProductPreview);
  $("productUnit")?.addEventListener("change", updateProductPreview);
  $("productQuantity")?.addEventListener("input", updateProductPreview);
  $("incQtyBtn")?.addEventListener("click", () => adjustFormQuantity(1));
  $("decQtyBtn")?.addEventListener("click", () => adjustFormQuantity(-1));
  $("scanFromFormBtn")?.addEventListener("click", openScanner);

  // Modal Movimiento Rápido
  $("closeMovementBtn")?.addEventListener("click", () => show("movementModal", false));
  $("movementForm")?.addEventListener("submit", saveMovement);
  $("movementType")?.addEventListener("change", updateMovementLabel);

  // Modal Escáner
  $("closeScannerBtn")?.addEventListener("click", stopScanner);
  $("startCameraBtn")?.addEventListener("click", startScanner);
  $("stopCameraBtn")?.addEventListener("click", stopScanner);
  $("lookupBtn")?.addEventListener("click", lookupBarcode);
  $("barcodeLookup")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupBarcode();
    }
  });

  // Lotes & Ingreso Rápido
  $("addBatchBtn")?.addEventListener("click", () => handleAddBatchRow());
  $("closeQuickIngressBtn")?.addEventListener("click", () => show("quickIngressModal", false));
  $("ingressDecBtn")?.addEventListener("click", () => adjustIngressQty(-1));
  $("ingressIncBtn")?.addEventListener("click", () => adjustIngressQty(1));
  $("confirmIngressBtn")?.addEventListener("click", handleConfirmQuickIngress);

  // Invitaciones y Pareja
  $("copyInviteBtn")?.addEventListener("click", copyInviteCode);
  $("acceptInviteForm")?.addEventListener("submit", acceptInvite);
  $("joinPantryForm")?.addEventListener("submit", joinPantrySubmit);
  $("importBtn")?.addEventListener("click", importCsv);
}

// ==========================================
// AUTENTICACIÓN & VISTAS
// ==========================================
function showAuthView() {
  show("authView", true);
  show("appView", false);
  if (realtimeChannel && supabase?.removeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  msg("authMessage", "Iniciando sesión…");
  const email = $("email")?.value.trim() || "ejemplo@hogar.com";
  const password = $("password")?.value || "123";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    msg("authMessage", error.message, true);
  } else {
    msg("authMessage", "¡Bienvenido a Mi Despensa!");
    showToast("¡Sesión iniciada con éxito!", "login");
  }
}

async function handleQuickDemoLogin() {
  msg("authMessage", "Accediendo en Modo Local Demo…");
  initDemoData(false);
  const { error } = await supabase.auth.signInWithPassword({ email: "ejemplo@hogar.com", password: "123" });
  if (error) {
    msg("authMessage", error.message, true);
  } else {
    showToast("Acceso demo local listo", "storefront");
  }
}

function openGoogleModal() {
  const currentEmail = $("email")?.value.trim();
  if (currentEmail && currentEmail.includes("@")) {
    const suggested = $("googleSuggestedEmail");
    if (suggested) suggested.textContent = currentEmail;
  }
  show("googleLoginModal", true);
}

async function handleGoogleLogin(email, name) {
  show("googleLoginModal", false);
  msg("authMessage", "Iniciando sesión con Google…");
  if (supabase.isLocal) {
    await supabase.auth.signInWithGoogle({ email, name });
    showToast(`Sesión iniciada con Google (${name})`, "account_circle");
  } else {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }
}

async function handleCustomGoogleLogin() {
  const email = $("customGoogleEmail")?.value.trim();
  if (!email) return alert("Por favor ingresa un correo de Google");
  const name = email.split("@")[0] || "Usuario";
  await handleGoogleLogin(email, name);
}

function openForgotPasswordModal() {
  const currentEmail = $("email")?.value.trim();
  if (currentEmail) {
    const fEmail = $("forgotEmail");
    if (fEmail) fEmail.value = currentEmail;
  }
  const resultBox = $("forgotResultBox");
  if (resultBox) resultBox.classList.add("hidden");
  show("forgotPasswordModal", true);
}

function handleLookupPassword() {
  const email = $("forgotEmail")?.value.trim();
  if (!email) return alert("Ingresa un correo para buscar.");
  if (supabase.isLocal && supabase.auth.getLocalUsers) {
    const users = supabase.auth.getLocalUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const box = $("forgotResultBox");
    const text = $("forgotResultText");
    if (box) box.classList.remove("hidden");
    if (user) {
      if (text) text.textContent = `Usuario encontrado: "${user.name}". Tu contraseña guardada es: "${user.password || '123'}". Puedes cambiarla si lo deseas:`;
      const passInp = $("newPasswordInput");
      if (passInp) passInp.value = user.password || "123";
    } else {
      if (text) text.textContent = `No se encontró una cuenta previa para ${email}. Escribe una contraseña abajo para asignársela:`;
    }
  } else {
    showToast("Revisa tu correo para recuperar contraseña.", "mail");
  }
}

function handleUpdatePassword() {
  const email = $("forgotEmail")?.value.trim();
  const newPass = $("newPasswordInput")?.value.trim();
  if (!email || !newPass) return alert("Ingresa correo y nueva contraseña.");
  if (supabase.isLocal && supabase.auth.resetPassword) {
    supabase.auth.resetPassword(email, newPass);
    showToast("Contraseña actualizada con éxito", "check_circle");
    if ($("password")) $("password").value = newPass;
    if ($("email")) $("email").value = email;
    show("forgotPasswordModal", false);
  }
}

async function handleCustomSignup(e) {
  e.preventDefault();
  const name = $("signupName")?.value.trim();
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value.trim();
  const pantryName = $("signupPantryName")?.value.trim() || "Mi Despensa";

  if (!email || !password) return alert("Por favor ingresa correo y contraseña.");
  
  show("signupModal", false);
  msg("authMessage", "Creando cuenta y despensa local…");
  const { data, error } = await supabase.auth.signUp({ email, password, name, pantry_name: pantryName });
  if (error) {
    msg("authMessage", error.message, true);
  } else {
    showToast(`¡Cuenta creada! Código familiar: ${data?.user?.user_metadata?.invite_code || 'CASA88'}`, "celebration");
  }
}

async function handleSignOut() {
  await stopScanner();
  await supabase.auth.signOut();
  currentUser = null;
  currentPantry = null;
  if ($("password")) $("password").value = "";
  showAuthView();
  showToast("Sesión cerrada correctamente", "logout");
}

function togglePasswordVisibility() {
  const input = $("password");
  const icon = $("passwordEyeIcon");
  if (!input || !icon) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  icon.textContent = isPass ? "visibility_off" : "visibility";
}

async function enterPantry(preferredPantryId = null) {
  show("authView", false);
  show("appView", true);

  try {
    const { data: members, error } = await supabase
      .from("pantry_members")
      .select("pantry_id,role,pantries(id,name,owner_id)")
      .eq("user_id", currentUser.id);

    if (error) throw error;

    if (!members?.length) {
      // Crear despensa si no existe
      const { data: pantry, error: createError } = await supabase
        .from("pantries")
        .insert({ name: "Mi Despensa (Hogar)", owner_id: currentUser.id })
        .select()
        .single();
      if (createError) throw createError;

      await supabase.from("pantry_members").insert({
        pantry_id: pantry.id,
        user_id: currentUser.id,
        role: "owner"
      });
      currentPantry = pantry;
      currentMemberRole = "owner";
    } else {
      // Preferimos la despensa indicada o la última usada en este dispositivo,
      // para no caer en una despensa vacía propia si te uniste a la de tu pareja.
      let saved = preferredPantryId;
      if (!saved) { try { saved = localStorage.getItem(ACTIVE_PANTRY_KEY); } catch {} }
      const chosen = members.find(m => m.pantry_id === saved) || members[0];
      currentPantry = chosen.pantries;
      currentMemberRole = chosen.role;
    }

    try { localStorage.setItem(ACTIVE_PANTRY_KEY, currentPantry.id); } catch {}

    $("pantryName").textContent = currentPantry.name || "Mi Despensa";
    const partnerName = currentUser.user_metadata?.partner_name || "Sofía";
    $("partnerNameDisplay").textContent = partnerName;
    $("memberStatus").textContent = supabase.isLocal ? "Modo Local • Conectado" : "En línea • Sincronizado";

    await loadProducts();
    subscribeRealtime();
    createOrFetchInvite();
  } catch (err) {
    showToast(friendlyError(err), "error");
  }
}

// ==========================================
// CARGA Y RENDERIZADO DE PRODUCTOS
// ==========================================
async function loadProducts() {
  if (!currentPantry) return;
  const { data, error } = await supabase
    .from("products")
    .select("id,pantry_id,name,brand,format,quantity,unit,min_quantity,location,expiry_date,expiry_alert,expiry_days_before,in_shopping_cart,photo_url,product_barcodes(barcode)")
    .eq("pantry_id", currentPantry.id)
    .order("name");

  if (error) {
    showToast(friendlyError(error), "error");
    return;
  }

  products = data || [];
  updateMetrics();
  renderProducts();
  renderAlerts();
  updateCeroDesperdicio();
}

function updateMetrics() {
  const total = products.length;
  const now = new Date();

  const expiring = products.filter(p => {
    if (!p.expiry_date) return false;
    const diff = (new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff >= -30;
  }).length;

  const lowStock = products.filter(p => Number(p.quantity) <= Number(p.min_quantity)).length;

  $("metricTotal").textContent = total;
  $("metricExpiring").textContent = expiring;
  $("metricLowStock").textContent = lowStock;

  // Actualizar conteos en chips
  $("countAll").textContent = total;
  $("countExpiring").textContent = expiring;
  $("countLowStock").textContent = lowStock;
  $("countDespensa").textContent = products.filter(p => (p.location || "Despensa") === "Despensa").length;
  $("countNevera").textContent = products.filter(p => p.location === "Nevera").length;
  $("countCongelador").textContent = products.filter(p => p.location === "Congelador").length;
  $("countLimpieza").textContent = products.filter(p => p.location === "Limpieza").length;

  // Badge en navbar
  const pendingAlerts = expiring + lowStock;
  $("alertsPendingCount").textContent = `${pendingAlerts} pendientes`;
  $("navAlertsBadge").classList.toggle("hidden", pendingAlerts === 0);
  $("alertsCountAll").textContent = pendingAlerts;
  $("alertsCountExpiry").textContent = expiring;
  $("alertsCountStock").textContent = lowStock;
}

function updateCeroDesperdicio() {
  const now = new Date();
  const urgent = products.find(p => {
    if (!p.expiry_date) return false;
    const diff = (new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff >= 0 && Number(p.quantity) > 0;
  });

  const banner = $("zeroWasteBanner");
  if (!banner) return;

  if (urgent) {
    $("zeroWasteTitle").textContent = `Cocinen con lo que vence hoy: ${urgent.name}`;
    $("zeroWasteDesc").textContent = `Quedan ${fmt(urgent.quantity)} ${urgent.unit} en ${urgent.location || "la despensa"}. Úsenlo antes de su fecha límite.`;
  } else {
    $("zeroWasteTitle").textContent = "Despensa en orden y fresca";
    $("zeroWasteDesc").textContent = "No hay productos en riesgo de vencer próximamente. ¡Excelente gestión doméstica!";
  }
}

function renderProducts() {
  const container = $("inventoryContainer");
  if (!container) return;

  const query = $("searchInput")?.value.trim().toLowerCase() || "";
  const now = new Date();

  // Filtrado de productos
  const filtered = products.filter(p => {
    const textMatch = [p.name, p.brand, p.format, ...(p.product_barcodes || []).map(b => b.barcode)]
      .join(" ")
      .toLowerCase()
      .includes(query);

    if (!textMatch) return false;

    if (currentFilter === "expiring") {
      if (!p.expiry_date) return false;
      const diff = (new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24);
      return diff <= 3 && diff >= -30;
    }
    if (currentFilter === "low-stock") {
      return Number(p.quantity) <= Number(p.min_quantity);
    }
    if (currentFilter.startsWith("loc-")) {
      const targetLoc = currentFilter.replace("loc-", "");
      return (p.location || "Despensa") === targetLoc;
    }
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="bg-surface-container-lowest rounded-2xl p-8 shadow-xs border border-surface-container-high text-center flex flex-col items-center justify-center gap-2">
        <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-1">
          <span class="material-symbols-outlined text-2xl">search_off</span>
        </div>
        <h4 class="font-bold text-primary text-base">No hay coincidencias</h4>
        <p class="text-xs text-on-surface-variant max-w-xs">
          ${products.length ? "No encontramos productos con ese filtro o búsqueda." : "Tu despensa está vacía. Agrega tu primer producto."}
        </p>
        <button type="button" onclick="document.getElementById('bottomAddBtn').click()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs active:scale-95 transition-transform">
          ＋ Agregar Producto
        </button>
      </div>
    `;
    return;
  }

  // Agrupar por Ubicaciones: Despensa, Nevera, Congelador, Limpieza
  const locations = [
    { key: "Despensa", name: "Despensa", icon: "shelves", color: "bg-primary-container text-on-primary" },
    { key: "Nevera", name: "Nevera", icon: "kitchen", color: "bg-secondary-container text-on-secondary-fixed" },
    { key: "Congelador", name: "Congelador", icon: "ac_unit", color: "bg-secondary-container text-primary" },
    { key: "Limpieza", name: "Limpieza / Hogar", icon: "sanitizer", color: "bg-surface-container text-secondary" }
  ];

  container.innerHTML = "";

  locations.forEach(loc => {
    const groupItems = filtered.filter(p => (p.location || "Despensa") === loc.key);
    if (!groupItems.length) return;

    const details = document.createElement("details");
    details.open = true;
    details.className = "group bg-surface-container-low rounded-2xl overflow-hidden shadow-xs border border-surface-container-high transition-all";

    // Summary del acordeón
    const summary = document.createElement("summary");
    summary.className = "cursor-pointer p-3.5 flex items-center justify-between select-none hover:bg-surface-container transition-colors";
    summary.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl ${loc.color} flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-lg">${loc.icon}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm text-primary">${loc.name}</span>
          <span class="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-bold text-[11px]">
            ${groupItems.length}
          </span>
        </div>
      </div>
      <span class="material-symbols-outlined text-secondary chevron-icon text-lg transition-transform duration-200">
        expand_more
      </span>
    `;

    // Contenedor de tarjetas
    const listWrapper = document.createElement("div");
    listWrapper.className = "p-3 pt-0 flex flex-col gap-2.5 border-t border-surface-container-high/60";

    groupItems.forEach(p => {
      listWrapper.appendChild(createProductCard(p, now));
    });

    details.appendChild(summary);
    details.appendChild(listWrapper);
    container.appendChild(details);
  });
}

function createProductCard(p, now) {
  const card = document.createElement("article");
  card.className = "bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container-high flex flex-col gap-2 mt-2 hover:border-primary/30 transition-colors";

  const isLowStock = Number(p.quantity) <= Number(p.min_quantity);

  // Normalizar y ordenar lotes activos
  const activeBatches = Array.isArray(p.batches) && p.batches.length > 0
    ? p.batches.filter(b => Number(b.quantity) > 0)
    : (p.expiry_date && Number(p.quantity) > 0 ? [{ id: 'b1', quantity: Number(p.quantity), expiry_date: p.expiry_date }] : []);

  activeBatches.sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date) - new Date(b.expiry_date);
  });

  // Cálculo de caducidad
  let expiryBadge = "";
  if (p.expiry_date) {
    const diffDays = Math.ceil((new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      expiryBadge = `<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">Vencido</span>`;
    } else if (diffDays === 0) {
      expiryBadge = `<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">Vence hoy</span>`;
    } else if (diffDays === 1) {
      expiryBadge = `<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold animate-pulse">Vence mañana</span>`;
    } else if (diffDays <= 3) {
      expiryBadge = `<span class="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold">Caduca en ${diffDays}d</span>`;
    } else {
      expiryBadge = `<span class="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-[10px]">Vence: ${formatShortDate(p.expiry_date)}</span>`;
    }
  }

  const batchesBadge = activeBatches.length > 1
    ? `<span class="px-2 py-0.5 rounded-full bg-primary-fixed/80 text-primary text-[10px] font-bold flex items-center gap-1">🏷️ ${activeBatches.length} lotes</span>`
    : "";

  const lowStockBadge = isLowStock
    ? `<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold flex items-center gap-1">
         <span class="w-1.5 h-1.5 rounded-full bg-error"></span>Min: ${p.min_quantity}
       </span>`
    : "";

  const qtyColor = Number(p.quantity) <= 0 
    ? "text-error" 
    : isLowStock 
    ? "text-tertiary-container" 
    : "text-primary";

  // Desglose de lotes cuando hay 2 o más con distintas fechas
  let batchesBreakdownHtml = "";
  if (activeBatches.length > 1) {
    batchesBreakdownHtml = `
      <div class="mt-2 p-2 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1 text-xs">
        <div class="flex items-center justify-between text-[10px] font-bold text-secondary">
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">date_range</span> Lotes con distinta caducidad:</span>
          <span class="text-[9px] font-extrabold text-primary bg-primary-fixed/50 px-1.5 py-0.5 rounded-full">Salida FEFO</span>
        </div>
        ${activeBatches.map((b, idx) => `
          <div class="flex items-center justify-between py-0.5 text-xs">
            <span class="font-bold text-on-surface flex items-center gap-1.5">
              <span>${fmt(b.quantity)} ${p.unit || 'unids'}</span>
              ${idx === 0 ? '<span class="text-[9px] font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded-full">★ Se descuenta 1º</span>' : ''}
            </span>
            <span class="font-semibold text-secondary text-[11px]">${b.expiry_date ? `Vence: ${formatShortDate(b.expiry_date)}` : 'Sin fecha'}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="flex items-start justify-between gap-2.5">
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <div class="w-11 h-11 rounded-xl bg-surface-container-low shrink-0 overflow-hidden flex items-center justify-center text-primary font-bold">
          ${p.photo_url 
            ? `<img src="${p.photo_url}" alt="${p.name}" class="w-full h-full object-cover">`
            : `<span class="material-symbols-outlined text-xl">inventory_2</span>`}
        </div>
        <div class="flex flex-col min-w-0 flex-1">
          <h4 class="font-bold text-sm text-primary truncate leading-tight">${p.name}</h4>
          <p class="text-xs text-on-surface-variant truncate mt-0.5">
            ${[p.brand, p.format, (p.product_barcodes || []).map(b => b.barcode).join(", ")].filter(Boolean).join(" • ") || "Sin marca"}
          </p>
          <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
            ${expiryBadge}
            ${batchesBadge}
            ${lowStockBadge}
          </div>
        </div>
      </div>

      <div class="text-right shrink-0">
        <div class="text-xl font-extrabold ${qtyColor} leading-none" id="qtyDisplay-${p.id}">${fmt(p.quantity)}</div>
        <span class="text-[11px] text-on-surface-variant font-medium">${p.unit || "unids"}</span>
      </div>
    </div>

    ${batchesBreakdownHtml}

    <div class="flex items-center justify-between pt-2 border-t border-surface-container/80">
      <div class="flex items-center gap-1.5">
        <button type="button" class="btn-quick-in px-2.5 py-1.5 rounded-xl bg-surface-container text-primary font-bold text-xs flex items-center gap-1 hover:bg-surface-variant active:scale-95 transition-all">
          <span class="material-symbols-outlined text-sm">add</span>
          <span>Ingresar</span>
        </button>
        <button type="button" class="btn-quick-out px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs flex items-center gap-1 hover:bg-surface-variant active:scale-95 transition-all" title="Descuenta primero el lote que vence antes">
          <span class="material-symbols-outlined text-sm">remove</span>
          <span>Descontar</span>
        </button>
      </div>

      <div class="flex items-center gap-1">
        <button type="button" class="btn-quick-edit p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-container text-xs font-bold flex items-center gap-0.5 transition-colors">
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
      </div>
    </div>
  `;

  // Asignar listeners táctiles
  card.querySelector(".btn-quick-in").addEventListener("click", () => openQuickIngressModal(p));
  card.querySelector(".btn-quick-out").addEventListener("click", () => quickStockAdjust(p, -1));
  card.querySelector(".btn-quick-edit").addEventListener("click", () => openProductModal(p));

  return card;
}

// ==========================================
// RENDERIZADO DEL CENTRO DE ALERTAS
// ==========================================
function renderAlerts() {
  const container = $("alertsListContainer");
  if (!container) return;

  const now = new Date();

  // Filtrar artículos por caducidad (≤ 3 días)
  const expiringItems = products.filter(p => {
    if (!p.expiry_date) return false;
    const diff = (new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff >= -30;
  });

  // Filtrar artículos por stock mínimo
  const lowStockItems = products.filter(p => Number(p.quantity) <= Number(p.min_quantity));

  let html = "";

  // Sección Caducidades
  if (currentAlertTab === "all" || currentAlertTab === "expiry") {
    html += `
      <div class="flex items-center justify-between pt-1">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-tertiary-container text-lg" style="font-variation-settings: 'FILL' 1;">timer</span>
          <h3 class="font-bold text-sm text-primary">Caducidades Próximas</h3>
        </div>
        <span class="text-xs text-secondary font-semibold">${expiringItems.length} artículos</span>
      </div>
    `;

    if (!expiringItems.length) {
      html += `<div class="p-4 rounded-xl bg-surface-container-low text-xs text-secondary text-center">No hay productos próximos a vencer.</div>`;
    } else {
      expiringItems.forEach(p => {
        const diffDays = Math.ceil((new Date(p.expiry_date) - now) / (1000 * 60 * 60 * 24));
        const isUrgent = diffDays <= 1;

        html += `
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col gap-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl ${isUrgent ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-tertiary-container'} flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-xl">${isUrgent ? 'alarm' : 'timer'}</span>
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-sm text-on-surface truncate">${p.name}</h4>
                  <p class="text-xs text-secondary truncate">${p.location || "Despensa"} • Quedan: <strong>${fmt(p.quantity)} ${p.unit}</strong></p>
                </div>
              </div>
              <span class="${isUrgent ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'} text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                ${diffDays <= 0 ? 'Vence hoy' : diffDays === 1 ? 'Mañana' : `En ${diffDays} días`}
              </span>
            </div>

            <div class="flex items-center gap-2 pt-1 border-t border-surface-container/60">
              <button type="button" onclick="window.markProductConsumed('${p.id}')" class="flex-1 h-9 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-transform">
                <span class="material-symbols-outlined text-sm">check_circle</span>
                <span>Marcar Consumido</span>
              </button>
              <button type="button" onclick="window.shareRecipeIdea('${p.name}')" class="h-9 px-3 rounded-xl bg-surface-container text-primary font-bold text-xs flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors">
                <span class="material-symbols-outlined text-sm">restaurant</span>
                <span>Receta</span>
              </button>
            </div>
          </div>
        `;
      });
    }
  }

  // Sección Stock Bajo
  if (currentAlertTab === "all" || currentAlertTab === "stock") {
    html += `
      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-error text-lg">shopping_basket</span>
          <h3 class="font-bold text-sm text-primary">Nivel Crítico de Stock</h3>
        </div>
        <span class="text-xs text-secondary font-semibold">${lowStockItems.length} por reponer</span>
      </div>
    `;

    if (!lowStockItems.length) {
      html += `<div class="p-4 rounded-xl bg-surface-container-low text-xs text-secondary text-center">Todo el inventario cuenta con stock suficiente.</div>`;
    } else {
      lowStockItems.forEach(p => {
        const inCart = p.in_shopping_cart;
        html += `
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col gap-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span class="material-symbols-outlined text-xl">grain</span>
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-sm text-on-surface truncate">${p.name}</h4>
                  <p class="text-xs text-secondary truncate">${p.location || "Despensa"} • Min configurado: ${p.min_quantity}</p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-base font-extrabold text-error block leading-none">${fmt(p.quantity)}</span>
                <span class="text-[10px] text-secondary font-semibold">${p.unit}</span>
              </div>
            </div>

            <div class="pt-1 border-t border-surface-container/60">
              <button type="button" onclick="window.toggleCartItem('${p.id}')" class="w-full h-9 rounded-xl ${inCart ? 'bg-secondary-container text-primary' : 'bg-surface-container text-primary hover:bg-secondary-container'} font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-sm">${inCart ? 'check' : 'add_shopping_cart'}</span>
                <span>${inCart ? 'En Lista de Compras' : 'Añadir a Compras'}</span>
              </button>
            </div>
          </div>
        `;
      });
    }
  }

  container.innerHTML = html;
}

// Helpers globales para botones de alerta
window.markProductConsumed = async function(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const current = Number(p.quantity);
  const next = Math.max(0, current - 1);
  await supabase.rpc("apply_stock_movement", {
    p_product_id: p.id,
    p_movement_type: "out",
    p_quantity: 1,
    p_note: "Consumo de alimento próximo a vencer"
  });
  showToast(`Consumido 1 ${p.unit} de ${p.name}`, "check_circle");
  await loadProducts();
};

window.shareRecipeIdea = function(name) {
  alert(`💡 Sugerencia Cero Desperdicio para hoy:\n\nPrueba preparar una comida rápida utilizando "${name}" como ingrediente principal para aprovecharlo al máximo.`);
};

window.toggleCartItem = async function(productId) {
  const { data } = await supabase.rpc("toggle_shopping_cart", { p_product_id: productId });
  showToast(data ? "Agregado a la lista de compras" : "Quitado de la lista", "shopping_cart");
  await loadProducts();
};

// ==========================================
// AJUSTE RÁPIDO DE STOCK (FEFO & 1-TOQUE)
// ==========================================
async function quickStockAdjust(p, delta) {
  const current = Number(p.quantity);
  if (delta < 0 && current <= 0) {
    showToast("No hay existencias para descontar", "warning");
    return;
  }

  const type = delta > 0 ? "in" : "out";
  const qty = 1;

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: p.id,
    p_movement_type: type,
    p_quantity: qty,
    p_note: delta > 0 ? "Ingreso rápido" : "Descuento rápido FEFO"
  });

  if (error) {
    showToast(friendlyError(error), "error");
    return;
  }

  showToast(`${delta > 0 ? '+1' : '-1'} ${p.unit} (${p.name})${delta < 0 ? ' • Descontado lote más próximo' : ''}`, delta > 0 ? "add" : "remove");
  await loadProducts();
}

// ==========================================
// FORMULARIO PRODUCTO (NUEVO / EDITAR & LOTES)
// ==========================================
function openProductModal(p = null) {
  $("productForm").reset();
  $("productId").value = p?.id || "";
  $("productName").value = p?.name || "";
  $("productBrand").value = p?.brand || "";
  $("productFormat").value = p?.format || "";
  $("productQuantity").value = p?.quantity ?? 1;
  $("productUnit").value = p?.unit || "unidades";
  $("productMinimum").value = p?.min_quantity ?? 2;
  $("productBarcodes").value = (p?.product_barcodes || []).map(b => b.barcode).join("\n");

  selectProductLocation(p?.location || "Despensa");
  selectExpiryDays(String(p?.expiry_days_before || 3));

  // Inicializar lotes dinámicos
  const batches = Array.isArray(p?.batches) && p.batches.length > 0
    ? p.batches.filter(b => Number(b.quantity) > 0)
    : (p?.expiry_date ? [{ id: 'b-1', quantity: p.quantity || 1, expiry_date: p.expiry_date }] : [{ id: 'b-1', quantity: p?.quantity || 1, expiry_date: "" }]);

  renderBatchRows(batches);

  $("productFormTitle").textContent = p ? "Editar Producto" : "Nuevo Producto";
  msg("productFormMessage", "");
  updateProductPreview();

  show("productFormModal", true);
}

function closeProductModal() {
  show("productFormModal", false);
}

function renderBatchRows(batches = []) {
  const container = $("batchesListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!batches.length) {
    batches = [{ id: 'b-' + Date.now(), quantity: 1, expiry_date: "" }];
  }

  batches.forEach((b, idx) => {
    const row = document.createElement("div");
    row.className = "batch-row flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container";
    row.innerHTML = `
      <div class="flex-1 flex items-center gap-2">
        <div class="w-20">
          <label class="text-[10px] font-bold text-secondary block">Cantidad</label>
          <input type="number" min="0.5" step="0.5" value="${b.quantity || 1}" required 
            class="batch-qty w-full h-9 px-2 text-center font-bold text-xs rounded-lg bg-surface-container-lowest text-primary border border-outline-variant/50 focus:outline-none">
        </div>
        <div class="flex-1">
          <label class="text-[10px] font-bold text-secondary block">
            Fecha de caducidad ${idx === 0 ? '<span class="text-primary font-bold">(Lote Principal)</span>' : `(Lote #${idx + 1})`}
          </label>
          <input type="date" value="${b.expiry_date || ""}" 
            class="batch-date w-full h-9 px-2 text-xs rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/50 focus:outline-none">
        </div>
      </div>
      <button type="button" class="btn-del-batch w-8 h-8 mt-3.5 rounded-lg text-secondary hover:text-error hover:bg-error-container flex items-center justify-center transition-colors" title="Eliminar este lote">
        <span class="material-symbols-outlined text-base">delete</span>
      </button>
    `;

    row.querySelector(".batch-qty").addEventListener("input", syncBatchesToTotalQuantity);
    row.querySelector(".btn-del-batch").addEventListener("click", () => {
      if (document.querySelectorAll(".batch-row").length > 1) {
        row.remove();
        syncBatchesToTotalQuantity();
      } else {
        row.querySelector(".batch-date").value = "";
      }
    });

    container.appendChild(row);
  });

  syncBatchesToTotalQuantity();
}

function handleAddBatchRow() {
  const container = $("batchesListContainer");
  if (!container) return;
  const count = container.querySelectorAll(".batch-row").length;
  const row = document.createElement("div");
  row.className = "batch-row flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container";
  row.innerHTML = `
    <div class="flex-1 flex items-center gap-2">
      <div class="w-20">
        <label class="text-[10px] font-bold text-secondary block">Cantidad</label>
        <input type="number" min="0.5" step="0.5" value="1" required 
          class="batch-qty w-full h-9 px-2 text-center font-bold text-xs rounded-lg bg-surface-container-lowest text-primary border border-outline-variant/50 focus:outline-none">
      </div>
      <div class="flex-1">
        <label class="text-[10px] font-bold text-secondary block">Fecha de caducidad (Lote #${count + 1})</label>
        <input type="date" value="" 
          class="batch-date w-full h-9 px-2 text-xs rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/50 focus:outline-none">
      </div>
    </div>
    <button type="button" class="btn-del-batch w-8 h-8 mt-3.5 rounded-lg text-secondary hover:text-error hover:bg-error-container flex items-center justify-center transition-colors" title="Eliminar este lote">
      <span class="material-symbols-outlined text-base">delete</span>
    </button>
  `;

  row.querySelector(".batch-qty").addEventListener("input", syncBatchesToTotalQuantity);
  row.querySelector(".btn-del-batch").addEventListener("click", () => {
    if (document.querySelectorAll(".batch-row").length > 1) {
      row.remove();
      syncBatchesToTotalQuantity();
    }
  });

  container.appendChild(row);
  syncBatchesToTotalQuantity();
}

function syncBatchesToTotalQuantity() {
  let total = 0;
  document.querySelectorAll(".batch-qty").forEach(inp => {
    total += Number(inp.value) || 0;
  });
  if ($("productQuantity") && total > 0) {
    $("productQuantity").value = total;
  }
  updateProductPreview();
}

function selectProductLocation(loc) {
  $("productLocation").value = loc;
  document.querySelectorAll(".loc-chip").forEach(chip => {
    const isTarget = chip.dataset.loc === loc;
    chip.classList.toggle("active", isTarget);
    chip.classList.toggle("bg-primary-container", isTarget);
    chip.classList.toggle("text-on-primary", isTarget);
    chip.classList.toggle("bg-surface-container-low", !isTarget);
    chip.classList.toggle("text-on-surface", !isTarget);
  });

  const icons = { Despensa: "shelves", Nevera: "kitchen", Congelador: "ac_unit", Limpieza: "sanitizer" };
  const iconEl = $("previewLocationIcon");
  if (iconEl) iconEl.textContent = icons[loc] || "shelves";

  updateProductPreview();
}

function selectExpiryDays(days) {
  $("productExpiryDays").value = days;
  document.querySelectorAll(".exp-chip").forEach(chip => {
    const isTarget = chip.dataset.days === days;
    chip.classList.toggle("active", isTarget);
    chip.classList.toggle("bg-primary-container", isTarget);
    chip.classList.toggle("text-on-primary", isTarget);
    chip.classList.toggle("font-bold", isTarget);
    chip.classList.toggle("bg-surface-container-low", !isTarget);
    chip.classList.toggle("text-on-surface", !isTarget);
  });
}

function adjustFormQuantity(delta) {
  const input = $("productQuantity");
  let val = Math.max(0, (Number(input.value) || 0) + delta);
  input.value = val;
  updateProductPreview();
}

function updateProductPreview() {
  const name = $("productName")?.value.trim() || "Nuevo Producto";
  const qty = $("productQuantity")?.value || 0;
  const unit = $("productUnit")?.value || "unidades";
  const loc = $("productLocation")?.value || "Despensa";

  $("previewTitle").textContent = name;
  $("previewSubtitle").textContent = `${qty} ${unit} • En ${loc}`;
}

async function saveProduct(e) {
  e.preventDefault();
  if (!currentPantry) return;

  const id = $("productId").value;
  const name = $("productName").value.trim();
  if (!name) return;

  // Extraer todos los lotes configurados en el formulario
  const batchRows = document.querySelectorAll(".batch-row");
  const batches = [];
  batchRows.forEach((row, idx) => {
    const qty = Number(row.querySelector(".batch-qty")?.value) || 0;
    const date = row.querySelector(".batch-date")?.value || null;
    if (qty > 0) {
      batches.push({
        id: `batch-${Date.now()}-${idx}`,
        quantity: qty,
        expiry_date: date
      });
    }
  });

  // Calcular la fecha más próxima con stock
  const withDate = batches.filter(b => b.expiry_date);
  withDate.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  const earliestDate = withDate.length > 0 ? withDate[0].expiry_date : null;

  const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0) || Number($("productQuantity").value) || 1;

  const payload = {
    pantry_id: currentPantry.id,
    name,
    brand: $("productBrand").value.trim() || null,
    format: $("productFormat").value.trim() || null,
    quantity: totalQty,
    unit: $("productUnit").value,
    min_quantity: Number($("productMinimum").value || 0),
    location: $("productLocation").value,
    expiry_date: earliestDate,
    expiry_alert: !!earliestDate,
    expiry_days_before: Number($("productExpiryDays").value || 3),
    batches: batches
  };

  msg("productFormMessage", "Guardando…");

  let result;
  if (id) {
    result = await supabase.from("products").update(payload).eq("id", id).select().single();
  } else {
    result = await supabase.from("products").insert(payload).select().single();
  }

  if (result.error) {
    return msg("productFormMessage", friendlyError(result.error), true);
  }

  const prod = result.data;
  const codes = [...new Set($("productBarcodes").value.split(/[\n,;]/).map(s => s.trim()).filter(Boolean))];

  await supabase.from("product_barcodes").delete().eq("product_id", prod.id);
  if (codes.length) {
    await supabase.from("product_barcodes").insert(codes.map(barcode => ({
      pantry_id: currentPantry.id,
      product_id: prod.id,
      barcode
    })));
  }

  // Stock inicial en historial
  if (!id && payload.quantity > 0) {
    await supabase.from("stock_movements").insert({
      pantry_id: currentPantry.id,
      product_id: prod.id,
      user_id: currentUser.id,
      user_name: "Tú",
      movement_type: "in",
      quantity: payload.quantity,
      delta: payload.quantity,
      note: "Stock inicial con lotes registrado"
    });
  }

  showToast(id ? "Producto y lotes actualizados" : "Producto guardado con éxito", "check_circle");
  closeProductModal();
  await loadProducts();
}

// ==========================================
// MODAL: INGRESO RÁPIDO CON OPCIÓN DE LOTE
// ==========================================
let currentIngressProduct = null;

function openQuickIngressModal(product) {
  currentIngressProduct = product;
  $("ingressProductId").value = product.id;
  $("ingressProductTitle").textContent = `Ingresar: ${product.name}`;
  $("ingressQuantity").value = 1;

  const hasDate = !!product.expiry_date;
  const label = $("ingressSameLabel");
  if (label) {
    label.textContent = hasDate ? `Misma fecha del lote actual (${formatShortDate(product.expiry_date)})` : "Sin fecha de caducidad específica";
  }

  const sameRadio = document.querySelector('input[name="ingressExpiryOption"][value="same"]');
  if (sameRadio) sameRadio.checked = true;

  const dateInput = $("ingressNewDate");
  if (dateInput) dateInput.value = "";

  show("quickIngressModal", true);
}

function adjustIngressQty(delta) {
  const inp = $("ingressQuantity");
  if (!inp) return;
  const val = Math.max(1, (Number(inp.value) || 1) + delta);
  inp.value = val;
}

async function handleConfirmQuickIngress() {
  if (!currentIngressProduct) return;
  const qty = Number($("ingressQuantity")?.value) || 1;
  const option = document.querySelector('input[name="ingressExpiryOption"]:checked')?.value || "same";
  const newDate = $("ingressNewDate")?.value || null;

  let chosenExpiry = null;
  if (option === "new" && newDate) {
    chosenExpiry = newDate;
  } else if (option === "same") {
    chosenExpiry = currentIngressProduct.expiry_date || null;
  }

  show("quickIngressModal", false);

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: currentIngressProduct.id,
    p_movement_type: "in",
    p_quantity: qty,
    p_expiry_date: chosenExpiry,
    p_note: option === "new" && chosenExpiry ? `Nuevo lote ingresado (Vence: ${chosenExpiry})` : "Ingreso rápido de stock"
  });

  if (error) {
    showToast(friendlyError(error), "error");
    return;
  }

  showToast(`+${qty} ${currentIngressProduct.unit} ingresado (${currentIngressProduct.name})${option === 'new' && chosenExpiry ? ' • Nuevo lote' : ''}`, "add");
  await loadProducts();
}

// ==========================================
// MODAL MOVIMIENTO MANUAL
// ==========================================
function updateMovementLabel() {
  const type = $("movementType").value;
  $("movementQuantityLabel").textContent = type === "adjustment" ? "Cantidad total deseada" : "Cantidad";
}

async function saveMovement(e) {
  e.preventDefault();
  const prodId = $("movementProductId").value;
  const p = products.find(x => x.id === prodId);
  if (!p) return;

  const type = $("movementType").value;
  const qty = Number($("movementQuantity").value);
  if (!Number.isFinite(qty) || qty < 0 || (type !== "adjustment" && qty <= 0)) {
    return msg("movementMessage", "Ingresa una cantidad válida.", true);
  }

  msg("movementMessage", "Guardando movimiento…");
  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: p.id,
    p_movement_type: type,
    p_quantity: qty,
    p_note: $("movementNote").value.trim() || null
  });

  if (error) {
    return msg("movementMessage", friendlyError(error), true);
  }

  showToast("Existencias actualizadas", "sync");
  show("movementModal", false);
  await loadProducts();
}

// ==========================================
// ESCÁNER DE CÓDIGOS DE BARRA
// ==========================================
function openScanner() {
  show("scannerModal", true);
  $("barcodeLookup")?.focus();
}

async function startScanner() {
  try {
    await stopScanner();
    const reader = new BrowserMultiFormatReader();
    scannerControls = await reader.decodeFromVideoDevice(undefined, $("scannerVideo"), (result, _err, controls) => {
      if (result) {
        $("barcodeLookup").value = result.getText();
        controls.stop();
        scannerControls = null;
        lookupBarcode();
      }
    });
    msg("scannerMessage", "Cámara activa. Apunta al código de barras.");
  } catch (err) {
    msg("scannerMessage", "No se pudo iniciar la cámara. Usa HTTPS o localhost. " + (err.message || ""), true);
  }
}

async function stopScanner() {
  if (scannerControls) {
    scannerControls.stop();
    scannerControls.null = null;
  }
  const video = $("scannerVideo");
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  show("scannerModal", false);
}

async function lookupBarcode() {
  const code = $("barcodeLookup").value.trim();
  if (!code) return msg("scannerMessage", "Escribe o escanea un código.", true);

  const found = products.find(p => (p.product_barcodes || []).some(b => b.barcode === code));
  stopScanner();

  if (found) {
    // Abrir ajuste rápido para descontar
    $("movementProductId").value = found.id;
    $("movementProductName").textContent = `${found.name} • Stock actual: ${fmt(found.quantity)} ${found.unit}`;
    $("movementType").value = "out";
    $("movementQuantity").value = 1;
    $("movementNote").value = "Escaneo de código de barras";
    show("movementModal", true);
  } else {
    // Código nuevo: abrir formulario prellenado
    openProductModal();
    $("productBarcodes").value = code;
    showToast("Código nuevo detectado: completa los datos para registrarlo", "info");
  }
}

// ==========================================
// PAREJA, INVITACIONES & CSV
// ==========================================
async function createOrFetchInvite() {
  if (currentMemberRole !== "owner") return;
  const { data } = await supabase.rpc("create_pantry_invite", { p_pantry_id: currentPantry.id });
  if (data && $("inviteCode")) $("inviteCode").value = data;
}

async function copyInviteCode() {
  const code = $("inviteCode")?.value;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    showToast("Código de invitación copiado", "content_copy");
  } catch {
    msg("inviteMessage", "Selecciona y copia el código manualmente.");
  }
}

async function acceptInvite(e) {
  e.preventDefault();
  const code = $("acceptInviteCode")?.value.trim().toUpperCase();
  if (!code) return;

  if (supabase.isLocal && !currentUser) {
    msg("authMessage", "Conectando a la despensa compartida…");
    const { error } = await supabase.auth.joinWithInvite({ code });
    if (error) {
      msg("authMessage", error.message, true);
    } else {
      showToast("¡Te has unido a la despensa compartida!", "celebration");
      $("acceptInviteCode").value = "";
    }
    return;
  }

  const { data: pantryId, error } = await supabase.rpc("accept_pantry_invite", { p_code: code });
  if (error) {
    showToast(friendlyError(error), "error");
    return;
  }

  showToast("¡Te has unido a la despensa compartida!", "celebration");
  $("acceptInviteCode").value = "";
  await enterPantry(pantryId);
}

async function joinPantrySubmit(e) {
  e.preventDefault();
  const code = $("joinPantryCode")?.value.trim().toUpperCase();
  if (!code) return;

  msg("joinPantryMessage", "Uniéndote a la despensa…");
  const { data: pantryId, error } = await supabase.rpc("accept_pantry_invite", { p_code: code });
  if (error) {
    return msg("joinPantryMessage", friendlyError(error), true);
  }

  msg("joinPantryMessage", "¡Listo! Ya comparten la misma despensa.");
  $("joinPantryCode").value = "";
  showToast("¡Te has unido a la despensa compartida!", "celebration");
  await enterPantry(pantryId);
  switchMainTab("tabInventory");
}

async function importCsv() {
  const file = $("csvFile").files[0];
  if (!file) return msg("importMessage", "Selecciona un archivo CSV.", true);

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return msg("importMessage", "El archivo no contiene filas válidas.", true);

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names) => headers.findIndex(h => names.includes(h));
  const ix = {
    name: col("nombre", "name"),
    brand: col("marca", "brand"),
    format: col("formato", "format"),
    quantity: col("cantidad", "quantity"),
    unit: col("unidad", "unit"),
    minimum: col("stock_minimo", "stock mínimo", "min_quantity"),
    location: col("ubicacion", "ubicación", "location"),
    barcodes: col("codigos_barras", "códigos_barras", "barcodes")
  };

  if (ix.name < 0 || ix.quantity < 0) {
    return msg("importMessage", "La plantilla debe tener al menos 'Nombre' y 'Cantidad'.", true);
  }

  let added = 0;
  msg("importMessage", "Importando productos…");

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.some(x => x.trim())) continue;
    const name = (r[ix.name] || "").trim();
    const qty = Number((r[ix.quantity] || "0").replace(",", "."));
    if (!name || isNaN(qty) || qty < 0) continue;

    const loc = ix.location >= 0 ? (r[ix.location] || "Despensa").trim() : "Despensa";
    const payload = {
      pantry_id: currentPantry.id,
      name,
      brand: ix.brand >= 0 ? (r[ix.brand] || "").trim() || null : null,
      format: ix.format >= 0 ? (r[ix.format] || "").trim() || null : null,
      quantity: qty,
      unit: ix.unit >= 0 ? (r[ix.unit] || "unidades").trim() || "unidades" : "unidades",
      min_quantity: ix.minimum >= 0 ? Number((r[ix.minimum] || "1").replace(",", ".")) || 1 : 1,
      location: loc
    };

    const { data: newProd, error } = await supabase.from("products").insert(payload).select().single();
    if (error) continue;

    const barcodes = ix.barcodes >= 0 ? (r[ix.barcodes] || "").split(/[;|]/).map(x => x.trim()).filter(Boolean) : [];
    if (barcodes.length) {
      await supabase.from("product_barcodes").insert(barcodes.map(barcode => ({
        pantry_id: currentPantry.id,
        product_id: newProd.id,
        barcode
      })));
    }
    added++;
  }

  showToast(`Importación completa: ${added} productos agregados`, "check_circle");
  msg("importMessage", `Se agregaron ${added} productos con éxito.`);
  await loadProducts();
}

function parseCsv(str) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i], next = str[i + 1];
    if (c === '"' && quoted && next === '"') { field += '"'; i++; }
    else if (c === '"') { quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ""; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && next === '\n') i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ==========================================
// TABS & INTERACCIÓN
// ==========================================
function switchMainTab(targetId) {
  currentMainTab = targetId;
  ["tabInventory", "tabAlerts", "tabPartner"].forEach(id => {
    show(id, id === targetId);
  });

  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    const isActive = btn.dataset.target === targetId;
    btn.classList.toggle("text-primary", isActive);
    btn.classList.toggle("font-bold", isActive);
    btn.classList.toggle("text-on-surface-variant", !isActive);
  });
}

function updateFilterChipStyles() {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    const isActive = chip.dataset.filter === currentFilter;
    chip.classList.toggle("bg-primary", isActive);
    chip.classList.toggle("text-on-primary", isActive);
    chip.classList.toggle("shadow-xs", isActive);
    chip.classList.toggle("bg-surface-container", !isActive);
    chip.classList.toggle("text-on-secondary-container", !isActive);
  });
}

function updateAlertTabStyles() {
  document.querySelectorAll(".alert-tab-btn").forEach(btn => {
    const isActive = btn.dataset.tab === currentAlertTab;
    btn.classList.toggle("bg-primary", isActive);
    btn.classList.toggle("text-on-primary", isActive);
    btn.classList.toggle("shadow-xs", isActive);
    btn.classList.toggle("bg-surface-container", !isActive);
    btn.classList.toggle("text-on-surface-variant", !isActive);
  });
}

function resetDemoPrompt() {
  if (confirm("¿Deseas restablecer los productos y movimientos demo iniciales?")) {
    initDemoData(true);
    loadProducts();
    showToast("Datos demo restablecidos con éxito", "restart_alt");
  }
}

function subscribeRealtime() {
  if (!supabase || supabase.isLocal) return;
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase.channel("pantry-" + currentPantry.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `pantry_id=eq.${currentPantry.id}` }, loadProducts)
    .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements", filter: `pantry_id=eq.${currentPantry.id}` }, loadProducts)
    .subscribe();
}

// Toast Flotante
let toastTimer = null;
function showToast(text, icon = "check_circle") {
  const el = $("toastNotification");
  const textEl = $("toastText");
  const iconEl = $("toastIcon");
  if (!el || !textEl) return;

  textEl.textContent = text;
  if (iconEl) iconEl.textContent = icon;

  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2800);
}

// Utilidades
function fmt(n) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(Number(n) || 0);
}

function formatShortDate(dStr) {
  if (!dStr) return "";
  try {
    const d = new Date(dStr + "T00:00:00");
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  } catch {
    return dStr;
  }
}

function friendlyError(err) {
  const m = err?.message || String(err);
  if (/duplicate key|already exists/i.test(m)) return "Ese código de barras ya está asociado a otro producto.";
  if (/row-level security|permission denied/i.test(m)) return "No tienes permiso para realizar esta acción.";
  return m;
}
