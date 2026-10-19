// local-db.js - Adaptador de almacenamiento local para emular Supabase sin conexión
// Compatible al 100% con el nuevo rediseño "Smart Home Pantry Manager"

const STORAGE_KEY_PRODUCTS = "mi_despensa_products";
const STORAGE_KEY_BARCODES = "mi_despensa_barcodes";
const STORAGE_KEY_MOVEMENTS = "mi_despensa_movements";
const STORAGE_KEY_PANTRIES = "mi_despensa_pantries";
const STORAGE_KEY_MEMBERS = "mi_despensa_members";
const STORAGE_KEY_SESSION = "mi_despensa_session";
const STORAGE_KEY_USERS = "mi_despensa_users";

const DEFAULT_PANTRY_ID = "pantry-local-01";
const DEFAULT_USER_ID = "user-local-01";

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Error al guardar en localStorage:", err);
  }
}

// Calcular fecha relativa para demos (ej: dentro de N días)
function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Inicializar datos demo enriquecidos con ubicaciones, alertas y fechas de caducidad
export function initDemoData(force = false) {
  if (force || !localStorage.getItem(STORAGE_KEY_USERS)) {
    const defaultUsers = [
      {
        id: DEFAULT_USER_ID,
        email: "ejemplo@hogar.com",
        password: "123",
        name: "Cristian",
        partner_name: "Sofía",
        pantry_id: DEFAULT_PANTRY_ID,
        invite_code: "CASA88",
        created_at: new Date().toISOString()
      }
    ];
    saveStorage(STORAGE_KEY_USERS, defaultUsers);
  }

  if (force || !localStorage.getItem(STORAGE_KEY_PRODUCTS)) {
    const defaultPantry = [
      { id: DEFAULT_PANTRY_ID, name: "Mi Despensa (Hogar)", owner_id: DEFAULT_USER_ID, invite_code: "CASA88", created_at: new Date().toISOString() }
    ];
    const defaultMembers = [
      { pantry_id: DEFAULT_PANTRY_ID, user_id: DEFAULT_USER_ID, role: "owner", joined_at: new Date().toISOString() }
    ];

    const defaultProducts = [
      // 1. DESPENSA SECA
      {
        id: "prod-1",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Arroz Grano Largo",
        brand: "Tucapel",
        format: "Bolsa 1 kg",
        quantity: 3,
        unit: "paquetes",
        min_quantity: 2,
        location: "Despensa",
        expiry_date: getFutureDate(7),
        expiry_alert: true,
        expiry_days_before: 3,
        batches: [
          { id: "batch-1", quantity: 1, expiry_date: getFutureDate(7) },
          { id: "batch-2", quantity: 2, expiry_date: getFutureDate(180) }
        ],
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCRb5k7SF4GZZVA-0TtUSlXrseulVsxPg75R8y6CAZt2DOZ6bDiTdMarCIDos35sYF3q_geZIHMnUzr0xmEA1EQDYKDQ4JF_jn6n_qkRNnFfg5dH1b41WWdlxl6m9huOEydwahOeVwN7YNZhJXwLdVXrJ9qEp_lVSMJHt-EZKi8nMmfStQNZ4OIbVtvO8pj-AZDtVHhmp_92g2bbWMQ22bQMuexGiLd8fNOvj-Wl-mr4k_UsVAgl5cLig",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "prod-2",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Atún al Agua",
        brand: "San José",
        format: "Lata 160 g",
        quantity: 5,
        unit: "unidades",
        min_quantity: 2,
        location: "Despensa",
        expiry_date: getFutureDate(320),
        expiry_alert: true,
        expiry_days_before: 7,
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCLJ4W3eOZk-IQoSCLV00bH2SZK8gSG5GS-zH1Ilzy8qBHqXJGqdurmt5ODnNYO2oe8Uong13H4eia7kNkdUOT_ZBwawreuRPyApnYfEk6I8LB_r3y1lJmtYe8X8-fV9UxJhBbxz9pIMaso6SLMQlw-e2PsRObLd72drSNRXbXBnuAxuAk-4IT3AkhPoyVuMalBgH0nhvHuI487fztgI4krXZttZSn7MeffKbuGtsaBNp4p_M62Pj3JQA",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "prod-3",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Fideos Espagueti N°5",
        brand: "Carozzi",
        format: "Paquete 400 g",
        quantity: 6,
        unit: "paquetes",
        min_quantity: 2,
        location: "Despensa",
        expiry_date: getFutureDate(240),
        expiry_alert: true,
        expiry_days_before: 7,
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjuxuScFH6K8jEGT1vHqvYAyN10Cs1J1vt9NIR0OqcRIrYjt46wOsNu058KOrw4ZWPFfiRCZVsyl0fUUaIbsCa2u3cKgZGXLYDQgqpO-Sqe74PXrtrf917NMU7XBg2N1ZOrESdn60QtCLcD0oAlZ6M-f4_d9JAm3rqR103FeLlagqCAhnYvW5BPtYzy2G1TzPrar0YmyM_ApVOX1fEz4R1mh4ApeusGY67ek1dJHcBHX09OH3bS85ChHW42hC--n7GulY",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "prod-4",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Salsa de Tomate Italiana",
        brand: "Pomarola",
        format: "Sachet 200 g",
        quantity: 0,
        unit: "unidades",
        min_quantity: 3,
        location: "Despensa",
        expiry_date: getFutureDate(90),
        expiry_alert: true,
        expiry_days_before: 3,
        in_shopping_cart: true,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOEUW4qLEd0VuwBqGOmUFGRwTvWA2_yAm6xKLZxpT9G7kIpr_Vr2TBCDNtYY8OIJBRi2mvQ7_sFK-mKSFEMoPTRokLPM1Iys15CJ-kGTKwja_jOkMeC430erDCDjXrXn_Lk9ZQYixc6qUo70T10snHj1KyeWuW1rg8M1nr6tZTu6bHT5mJqA-6y3rZHA7X3WWDYYM1e4RkLcSkum_gPX6ZOSC1C2RnBCowRIpURvJEiV_C8j4c73E_1w",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // 2. NEVERA
      {
        id: "prod-5",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Yogurt Griego Natural",
        brand: "Danone",
        format: "Pote 120 g",
        quantity: 1,
        unit: "unidades",
        min_quantity: 3,
        location: "Nevera",
        expiry_date: getFutureDate(1), // Vence mañana!
        expiry_alert: true,
        expiry_days_before: 1,
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-i8mjWOcW7O4AkCD6Tbkb5nnq9I0B3CDAihI3JP7wzZJki1C0UWVT535rTM5jqggItA1DFkDFFN3gefMjj3RpS0gxxxP3_gxSidQ6VBSpEbco6useWnbUNgKaWRiBfCrLJY1ABUyXCRabVXZAkGv4MJ02vPRPqII_c1RDn6NHGf-8Knx4cN7wnzmYp0b1DfrV63OfDWTnwf083zuOTE0-zRuLNwlGqrnSR3jc7F-pAi61p1wFZu2sXA",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "prod-6",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Leche Entera",
        brand: "Colun",
        format: "Tetra 1 Litro",
        quantity: 3,
        unit: "unidades",
        min_quantity: 2,
        location: "Nevera",
        expiry_date: getFutureDate(3), // Vence en 3 días
        expiry_alert: true,
        expiry_days_before: 3,
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA86smj9f0HBIOqCFVuiByryEtnVcRRDE-d4e_2vxB81FgjbQGNtqwFo60_hVjzOK0BiI-Xvaf5C4UKqnEUNJ-qfg8hlJxRBJrQoziS6Z0lj7uCiPjGWJoSZ5XMmtjbyJMCkWORKszpUm7EydcHCFjFd-mABdLqmwTe4mnxaBGK3inrXINAnD3ep75V4m9UizNgoEtPVo4yr_8OQsEt_GDe7xsmFbgXRJsd5sMFDWXi6IaVRleBItcQog",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "prod-7",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Queso Crema",
        brand: "Philadelphia",
        format: "Pote 200 g",
        quantity: 2,
        unit: "unidades",
        min_quantity: 1,
        location: "Nevera",
        expiry_date: getFutureDate(6), // Vence en 6 días
        expiry_alert: true,
        expiry_days_before: 3,
        in_shopping_cart: false,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcwZztb6p0Vr2dn8lK_LcqiaLw7KjaycnS8Rpe44DYVw3AtZZ-DYS88ypvkbRyWX6tydxSr19yqDesbBky2TDLuo4Hry5-V_KkqEtpF2b-T_0NclTIkKqYT5JbhzB_5F6Y2x8Nn2o1vfsFH9HPkF3nB_pbNv79xDAs0IBxoFYYSaNOyp8v78AlmhN2fw79crvGAEhDrSPKIqhq31QKY9VeKdQiEo5x3oNi1im-vdJ5b5CusPWnSMbN2A",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // 3. CONGELADOR
      {
        id: "prod-8",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Verduras Mixtas Congeladas",
        brand: "Minuto Verde",
        format: "Bolsa 500 g",
        quantity: 2,
        unit: "bolsas",
        min_quantity: 1,
        location: "Congelador",
        expiry_date: getFutureDate(210),
        expiry_alert: true,
        expiry_days_before: 14,
        in_shopping_cart: false,
        photo_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // 4. LIMPIEZA / HOGAR
      {
        id: "prod-9",
        pantry_id: DEFAULT_PANTRY_ID,
        name: "Lavavajillas Concentrado",
        brand: "Quix",
        format: "Botella 750 ml",
        quantity: 2,
        unit: "botellas",
        min_quantity: 1,
        location: "Limpieza",
        expiry_date: "",
        expiry_alert: false,
        expiry_days_before: 0,
        in_shopping_cart: false,
        photo_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const defaultBarcodes = [
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-1", barcode: "7809876543210" },
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-2", barcode: "7803344556677" },
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-3", barcode: "7801122334455" },
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-4", barcode: "7805566778899" },
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-5", barcode: "7804455667788" },
      { pantry_id: DEFAULT_PANTRY_ID, product_id: "prod-6", barcode: "7801234567890" }
    ];

    const defaultMovements = [
      {
        id: "mov-init-1",
        pantry_id: DEFAULT_PANTRY_ID,
        product_id: "prod-1",
        user_id: DEFAULT_USER_ID,
        user_name: "Sofía",
        movement_type: "in",
        quantity: 1,
        delta: 1,
        note: "Ajuste de inventario",
        created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString()
      }
    ];

    saveStorage(STORAGE_KEY_PANTRIES, defaultPantry);
    saveStorage(STORAGE_KEY_MEMBERS, defaultMembers);
    saveStorage(STORAGE_KEY_PRODUCTS, defaultProducts);
    saveStorage(STORAGE_KEY_BARCODES, defaultBarcodes);
    saveStorage(STORAGE_KEY_MOVEMENTS, defaultMovements);
  }
}

export function createLocalClient() {
  initDemoData();

  const authSubscribers = [];
  const realtimeSubscribers = [];

  function notifyRealtime() {
    realtimeSubscribers.forEach(cb => {
      try { cb(); } catch(e) { console.error(e); }
    });
  }

  function getSession() {
    return loadStorage(STORAGE_KEY_SESSION, null);
  }

  return {
    isLocal: true,

    auth: {
      async getSession() {
        return { data: { session: getSession() }, error: null };
      },

      onAuthStateChange(callback) {
        authSubscribers.push(callback);
        const s = getSession();
        if (s) {
          setTimeout(() => callback("SIGNED_IN", s), 10);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authSubscribers.indexOf(callback);
                if (idx >= 0) authSubscribers.splice(idx, 1);
              }
            }
          }
        };
      },

      async signInWithPassword({ email, password }) {
        let users = loadStorage(STORAGE_KEY_USERS, []);
        const cleanEmail = (email || "").trim().toLowerCase();
        let user = users.find(u => u.email.toLowerCase() === cleanEmail);

        if (!user) {
          // Si el usuario no existe en local, se crea automáticamente para facilitar la experiencia
          const newId = `user-${Date.now()}`;
          const newPantryId = `pantry-${Date.now()}`;
          const inviteCode = "CASA88";
          user = {
            id: newId,
            email: cleanEmail || "ejemplo@hogar.com",
            password: password || "123456",
            name: cleanEmail.split("@")[0] || "Cristian",
            partner_name: "Sofía",
            pantry_id: newPantryId,
            invite_code: inviteCode,
            created_at: new Date().toISOString()
          };
          users.push(user);
          saveStorage(STORAGE_KEY_USERS, users);

          // Crear despensa
          const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
          pantries.push({
            id: newPantryId,
            name: "Mi Despensa",
            owner_id: newId,
            invite_code: inviteCode,
            created_at: new Date().toISOString()
          });
          saveStorage(STORAGE_KEY_PANTRIES, pantries);

          // Crear miembro
          const members = loadStorage(STORAGE_KEY_MEMBERS, []);
          members.push({
            pantry_id: newPantryId,
            user_id: newId,
            role: "owner",
            joined_at: new Date().toISOString()
          });
          saveStorage(STORAGE_KEY_MEMBERS, members);
        } else {
          // Si existe, verificar contraseña
          if (password && user.password && user.password !== password) {
            return { data: { user: null, session: null }, error: { message: "Contraseña incorrecta." } };
          }
          if (password && !user.password) {
            user.password = password;
            saveStorage(STORAGE_KEY_USERS, users);
          }
        }

        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              name: user.name || "Mi Hogar",
              partner_name: user.partner_name || "Sofía",
              invite_code: user.invite_code || "CASA88",
              pantry_id: user.pantry_id
            }
          }
        };
        saveStorage(STORAGE_KEY_SESSION, session);
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },

      async signUp({ email, password, name, pantry_name }) {
        const cleanEmail = (email || "").trim().toLowerCase();
        let users = loadStorage(STORAGE_KEY_USERS, []);
        let user = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (user) {
          return this.signInWithPassword({ email: cleanEmail, password });
        }

        const newId = `user-${Date.now()}`;
        const newPantryId = `pantry-${Date.now()}`;
        const inviteCode = "CASA" + Math.floor(10 + Math.random() * 90);
        user = {
          id: newId,
          email: cleanEmail,
          password: password || "123456",
          name: name || cleanEmail.split("@")[0] || "Mi Hogar",
          partner_name: "Sofía",
          pantry_id: newPantryId,
          invite_code: inviteCode,
          created_at: new Date().toISOString()
        };
        users.push(user);
        saveStorage(STORAGE_KEY_USERS, users);

        const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
        pantries.push({
          id: newPantryId,
          name: pantry_name || "Mi Despensa",
          owner_id: newId,
          invite_code: inviteCode,
          created_at: new Date().toISOString()
        });
        saveStorage(STORAGE_KEY_PANTRIES, pantries);

        const members = loadStorage(STORAGE_KEY_MEMBERS, []);
        members.push({
          pantry_id: newPantryId,
          user_id: newId,
          role: "owner",
          joined_at: new Date().toISOString()
        });
        saveStorage(STORAGE_KEY_MEMBERS, members);

        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              name: user.name,
              partner_name: user.partner_name,
              invite_code: user.invite_code,
              pantry_id: user.pantry_id
            }
          }
        };
        saveStorage(STORAGE_KEY_SESSION, session);
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },

      async signInWithGoogle({ email, name } = {}) {
        const googleEmail = (email || "cristian@gmail.com").trim().toLowerCase();
        let users = loadStorage(STORAGE_KEY_USERS, []);
        let user = users.find(u => u.email.toLowerCase() === googleEmail);

        if (!user) {
          const newId = `user-google-${Date.now()}`;
          const newPantryId = `pantry-${Date.now()}`;
          user = {
            id: newId,
            email: googleEmail,
            name: name || "Cristian (Google)",
            partner_name: "Sofía",
            pantry_id: newPantryId,
            invite_code: "CASA88",
            provider: "google",
            created_at: new Date().toISOString()
          };
          users.push(user);
          saveStorage(STORAGE_KEY_USERS, users);

          const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
          pantries.push({
            id: newPantryId,
            name: "Mi Despensa",
            owner_id: newId,
            invite_code: "CASA88",
            created_at: new Date().toISOString()
          });
          saveStorage(STORAGE_KEY_PANTRIES, pantries);

          const members = loadStorage(STORAGE_KEY_MEMBERS, []);
          members.push({
            pantry_id: newPantryId,
            user_id: newId,
            role: "owner",
            joined_at: new Date().toISOString()
          });
          saveStorage(STORAGE_KEY_MEMBERS, members);
        }

        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              name: user.name,
              partner_name: user.partner_name || "Sofía",
              invite_code: user.invite_code || "CASA88",
              pantry_id: user.pantry_id,
              provider: "google"
            }
          }
        };
        saveStorage(STORAGE_KEY_SESSION, session);
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },

      async joinWithInvite({ code, email }) {
        const cleanCode = (code || "").trim().toUpperCase();
        const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
        let targetPantry = pantries.find(p => (p.invite_code || "").toUpperCase() === cleanCode);
        if (!targetPantry) {
          targetPantry = pantries[0] || { id: DEFAULT_PANTRY_ID, name: "Mi Despensa (Hogar)", invite_code: "CASA88" };
        }

        const cleanEmail = (email || `pareja-${Date.now()}@despensa.local`).trim().toLowerCase();
        let users = loadStorage(STORAGE_KEY_USERS, []);
        let user = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (!user) {
          user = {
            id: `user-partner-${Date.now()}`,
            email: cleanEmail,
            name: "Pareja Conectada",
            partner_name: "Tú",
            pantry_id: targetPantry.id,
            invite_code: cleanCode,
            created_at: new Date().toISOString()
          };
          users.push(user);
          saveStorage(STORAGE_KEY_USERS, users);
        } else {
          user.pantry_id = targetPantry.id;
          saveStorage(STORAGE_KEY_USERS, users);
        }

        const members = loadStorage(STORAGE_KEY_MEMBERS, []);
        if (!members.some(m => m.pantry_id === targetPantry.id && m.user_id === user.id)) {
          members.push({
            pantry_id: targetPantry.id,
            user_id: user.id,
            role: "member",
            joined_at: new Date().toISOString()
          });
          saveStorage(STORAGE_KEY_MEMBERS, members);
        }

        const session = {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              name: user.name,
              partner_name: "Compañero/a",
              invite_code: cleanCode,
              pantry_id: targetPantry.id
            }
          }
        };
        saveStorage(STORAGE_KEY_SESSION, session);
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        return { data: { user: session.user, session, pantry: targetPantry }, error: null };
      },

      getLocalUsers() {
        return loadStorage(STORAGE_KEY_USERS, []);
      },

      resetPassword(email, newPassword) {
        const users = loadStorage(STORAGE_KEY_USERS, []);
        const clean = (email || "").trim().toLowerCase();
        const user = users.find(u => u.email.toLowerCase() === clean);
        if (user) {
          user.password = newPassword;
          saveStorage(STORAGE_KEY_USERS, users);
          return { success: true, user };
        }
        return { success: false, message: "Correo no registrado localmente." };
      },

      async signOut() {
        saveStorage(STORAGE_KEY_SESSION, null);
        try { localStorage.removeItem(STORAGE_KEY_SESSION); } catch {}
        authSubscribers.forEach(cb => cb("SIGNED_OUT", null));
        return { error: null };
      }
    },

    from(table) {
      return {
        select(columns = "*") {
          let filterPantryId = null;
          let filterUserId = null;
          let orderCol = null;

          const query = {
            eq(col, val) {
              if (col === "pantry_id") filterPantryId = val;
              if (col === "user_id") filterUserId = val;
              if (col === "id") query._id = val;
              return query;
            },
            order(col) {
              orderCol = col;
              return query;
            },
            async single() {
              const res = await query._execute();
              return { data: res.data?.[0] || null, error: res.error };
            },
            async then(resolve) {
              resolve(await query._execute());
            },
            async _execute() {
              if (table === "pantry_members") {
                const members = loadStorage(STORAGE_KEY_MEMBERS, []);
                const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
                const filtered = filterUserId ? members.filter(m => m.user_id === filterUserId) : members;
                const result = filtered.map(m => {
                  const p = pantries.find(item => item.id === m.pantry_id) || { id: m.pantry_id, name: "Mi Despensa", owner_id: m.user_id };
                  return { ...m, pantries: p };
                });
                return { data: result, error: null };
              }

              if (table === "pantries") {
                const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
                const found = query._id ? pantries.filter(p => p.id === query._id) : pantries;
                return { data: found, error: null };
              }

              if (table === "products") {
                let products = loadStorage(STORAGE_KEY_PRODUCTS, []);
                const barcodes = loadStorage(STORAGE_KEY_BARCODES, []);
                if (filterPantryId) {
                  products = products.filter(p => p.pantry_id === filterPantryId);
                }
                const withBarcodes = products.map(p => {
                  const pCodes = barcodes.filter(b => b.product_id === p.id).map(b => ({ barcode: b.barcode }));
                  return { ...p, product_barcodes: pCodes };
                });
                if (orderCol === "name") {
                  withBarcodes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                }
                return { data: withBarcodes, error: null };
              }

              if (table === "stock_movements") {
                const movs = loadStorage(STORAGE_KEY_MOVEMENTS, []);
                const filtered = filterPantryId ? movs.filter(m => m.pantry_id === filterPantryId) : movs;
                return { data: filtered, error: null };
              }

              return { data: [], error: null };
            }
          };

          return query;
        },

        insert(records) {
          const arr = Array.isArray(records) ? records : [records];
          const query = {
            select() { return query; },
            async single() {
              const res = await query._execute();
              return { data: res.data?.[0] || null, error: res.error };
            },
            async then(resolve) { resolve(await query._execute()); },
            async _execute() {
              if (table === "pantries") {
                const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
                const inserted = arr.map(p => ({
                  id: p.id || `pantry-${Date.now()}`,
                  name: p.name || "Mi Despensa",
                  owner_id: p.owner_id || DEFAULT_USER_ID,
                  created_at: new Date().toISOString()
                }));
                pantries.push(...inserted);
                saveStorage(STORAGE_KEY_PANTRIES, pantries);
                notifyRealtime();
                return { data: inserted, error: null };
              }

              if (table === "pantry_members") {
                const members = loadStorage(STORAGE_KEY_MEMBERS, []);
                members.push(...arr);
                saveStorage(STORAGE_KEY_MEMBERS, members);
                return { data: arr, error: null };
              }

              if (table === "products") {
                const products = loadStorage(STORAGE_KEY_PRODUCTS, []);
                const inserted = arr.map(p => ({
                  ...p,
                  id: p.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  location: p.location || "Despensa",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }));
                products.push(...inserted);
                saveStorage(STORAGE_KEY_PRODUCTS, products);
                notifyRealtime();
                return { data: inserted, error: null };
              }

              if (table === "product_barcodes") {
                const barcodes = loadStorage(STORAGE_KEY_BARCODES, []);
                const inserted = arr.map(b => ({
                  id: `code-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  ...b,
                  created_at: new Date().toISOString()
                }));
                barcodes.push(...inserted);
                saveStorage(STORAGE_KEY_BARCODES, barcodes);
                notifyRealtime();
                return { data: inserted, error: null };
              }

              if (table === "stock_movements") {
                const movs = loadStorage(STORAGE_KEY_MOVEMENTS, []);
                const inserted = arr.map(m => ({
                  id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  ...m,
                  created_at: new Date().toISOString()
                }));
                movs.push(...inserted);
                saveStorage(STORAGE_KEY_MOVEMENTS, movs);
                notifyRealtime();
                return { data: inserted, error: null };
              }

              return { data: arr, error: null };
            }
          };
          return query;
        },

        update(payload) {
          let targetId = null;
          const query = {
            eq(col, val) {
              if (col === "id") targetId = val;
              return query;
            },
            select() { return query; },
            async single() {
              const res = await query._execute();
              return { data: res.data?.[0] || null, error: res.error };
            },
            async then(resolve) { resolve(await query._execute()); },
            async _execute() {
              if (table === "products" && targetId) {
                const products = loadStorage(STORAGE_KEY_PRODUCTS, []);
                const idx = products.findIndex(p => p.id === targetId);
                if (idx >= 0) {
                  products[idx] = { ...products[idx], ...payload, updated_at: new Date().toISOString() };
                  saveStorage(STORAGE_KEY_PRODUCTS, products);
                  notifyRealtime();
                  return { data: [products[idx]], error: null };
                }
              }
              return { data: [], error: null };
            }
          };
          return query;
        },

        delete() {
          let filterProdId = null;
          return {
            eq(col, val) {
              if (col === "product_id") filterProdId = val;
              return this;
            },
            async then(resolve) {
              if (table === "product_barcodes" && filterProdId) {
                const barcodes = loadStorage(STORAGE_KEY_BARCODES, []);
                const filtered = barcodes.filter(b => b.product_id !== filterProdId);
                saveStorage(STORAGE_KEY_BARCODES, filtered);
                notifyRealtime();
              }
              resolve({ error: null });
            }
          };
        }
      };
    },

    async rpc(fn, args) {
      if (fn === "apply_stock_movement") {
        const { p_product_id, p_movement_type, p_quantity, p_note, p_expiry_date } = args;
        const products = loadStorage(STORAGE_KEY_PRODUCTS, []);
        const prod = products.find(p => p.id === p_product_id);
        if (!prod) return { data: null, error: { message: "Producto no encontrado." } };

        if (!Array.isArray(prod.batches)) {
          prod.batches = (prod.expiry_date && Number(prod.quantity) > 0)
            ? [{ id: `b-${prod.id}-init`, quantity: Number(prod.quantity), expiry_date: prod.expiry_date }]
            : [];
        }

        let delta = 0;
        let batchInfoNote = "";

        if (p_movement_type === "in") {
          delta = Number(p_quantity);
          const targetExpiry = p_expiry_date || prod.expiry_date || null;
          if (targetExpiry) {
            const existingBatch = prod.batches.find(b => b.expiry_date === targetExpiry);
            if (existingBatch) {
              existingBatch.quantity = Number(existingBatch.quantity) + Number(p_quantity);
            } else {
              prod.batches.push({
                id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                quantity: Number(p_quantity),
                expiry_date: targetExpiry
              });
            }
          } else if (prod.batches.length > 0) {
            prod.batches[prod.batches.length - 1].quantity = Number(prod.batches[prod.batches.length - 1].quantity) + Number(p_quantity);
          }
        } else if (p_movement_type === "out") {
          delta = -Number(p_quantity);
          // FEFO: Descontar primero del lote que vence más pronto
          let toDeduct = Number(p_quantity);
          prod.batches.sort((a, b) => {
            if (!a.expiry_date) return 1;
            if (!b.expiry_date) return -1;
            return new Date(a.expiry_date) - new Date(b.expiry_date);
          });

          for (const b of prod.batches) {
            if (toDeduct <= 0) break;
            const bQty = Number(b.quantity);
            if (bQty > 0) {
              const take = Math.min(bQty, toDeduct);
              b.quantity = bQty - take;
              toDeduct -= take;
              if (b.expiry_date) {
                batchInfoNote = ` (Lote que vencía: ${b.expiry_date})`;
              }
            }
          }
          // Limpiar lotes vacíos
          prod.batches = prod.batches.filter(b => Number(b.quantity) > 0.0001);
        } else if (p_movement_type === "adjustment") {
          delta = Number(p_quantity) - Number(prod.quantity);
          if (prod.batches.length === 1) {
            prod.batches[0].quantity = Number(p_quantity);
          }
        }

        const newQty = Number(prod.quantity) + delta;
        if (newQty < -0.00001) {
          return { data: null, error: { message: "No hay suficiente stock para descontar esa cantidad." } };
        }

        prod.quantity = Math.max(0, newQty);

        // Actualizar la fecha de caducidad principal con la del lote más próximo con stock
        if (prod.batches.length > 0) {
          const withDate = prod.batches.filter(b => b.expiry_date && Number(b.quantity) > 0);
          if (withDate.length > 0) {
            withDate.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
            prod.expiry_date = withDate[0].expiry_date;
            prod.expiry_alert = true;
          } else {
            prod.expiry_date = null;
          }
        }

        prod.updated_at = new Date().toISOString();
        saveStorage(STORAGE_KEY_PRODUCTS, products);

        // Guardar movimiento
        const movs = loadStorage(STORAGE_KEY_MOVEMENTS, []);
        movs.push({
          id: `mov-${Date.now()}`,
          pantry_id: prod.pantry_id,
          product_id: prod.id,
          user_id: DEFAULT_USER_ID,
          user_name: "Tú",
          movement_type: p_movement_type,
          quantity: p_quantity,
          delta,
          note: (p_note || "Movimiento") + batchInfoNote,
          created_at: new Date().toISOString()
        });
        saveStorage(STORAGE_KEY_MOVEMENTS, movs);

        notifyRealtime();
        return { data: { quantity: prod.quantity, batches: prod.batches, expiry_date: prod.expiry_date }, error: null };
      }

      if (fn === "toggle_shopping_cart") {
        const { p_product_id } = args;
        const products = loadStorage(STORAGE_KEY_PRODUCTS, []);
        const prod = products.find(p => p.id === p_product_id);
        if (prod) {
          prod.in_shopping_cart = !prod.in_shopping_cart;
          saveStorage(STORAGE_KEY_PRODUCTS, products);
          notifyRealtime();
          return { data: prod.in_shopping_cart, error: null };
        }
        return { data: false, error: null };
      }

      if (fn === "create_pantry_invite") {
        const { p_pantry_id } = args || {};
        const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
        const p = pantries.find(item => item.id === p_pantry_id);
        const code = p?.invite_code || "CASA88";
        return { data: code, error: null };
      }

      if (fn === "accept_pantry_invite") {
        const { p_code } = args || {};
        const cleanCode = (p_code || "").trim().toUpperCase();
        const pantries = loadStorage(STORAGE_KEY_PANTRIES, []);
        let found = pantries.find(p => (p.invite_code || "").toUpperCase() === cleanCode);
        if (!found) {
          found = pantries[0] || { id: DEFAULT_PANTRY_ID, name: "Mi Despensa (Hogar)", invite_code: "CASA88" };
        }
        return { data: found.id, error: null };
      }

      return { data: null, error: null };
    },

    channel(channelName) {
      const ch = {
        on(event, filter, callback) {
          realtimeSubscribers.push(callback);
          return ch;
        },
        subscribe() {
          return ch;
        }
      };
      return ch;
    },

    removeChannel() {
      // no-op para local
    }
  };
}
