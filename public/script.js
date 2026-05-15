const orderUrl = "https://cosmopolitan.orderin.it/";
const productImgBase = "https://cosmopolitan.orderin.it/data/026101/images/products/";
const productFallbackImage = "/assets/logo-big.jpeg";

const featuredItems = [
  {
    name: "SUSHI TUBE 8PZ",
    desc: "Il format piu virale: sushi in tubo, da scegliere in variante.",
    price: 9,
    image: "SPE01C026101jfif"
  },
  {
    name: "TACO CAMARONES",
    desc: "Taco di mais croccante, gambero impanato, insalata, avocado e mayo lime.",
    price: 6,
    image: "SAN54026101.jpeg"
  },
  {
    name: "BURRITO OLD STYLE",
    desc: "Tortilla large con chili con carne, guacamole, mexican rice, fagioli e cheddar.",
    price: 9,
    image: "SAN50026101.jpeg"
  },
  {
    name: "HOT SUSHI BURRITO",
    desc: "Burrito fritto con alga nori, riso, surimi, gambero, salmone, avocado e spicy mayo.",
    price: 10,
    image: "SUSHI25026101.jpg"
  },
  {
    name: "POKE BLACK SALMON",
    desc: "Riso venere, salmone crudo, avocado, mango, arachidi e teriyaki.",
    price: 13,
    image: "POKE08026101.jpg"
  },
  {
    name: "BOX MESSICANA",
    desc: "Burrito, tacos, nachos, papas, flautas e birre per condividere.",
    price: 30,
    image: "TOR3026101.jpg"
  }
];

const menu = document.querySelector("#featuredMenu");
let imageManifest = {};

function productFileImage(file, date) {
  if (!file || !imageManifest[file]) return productFallbackImage;
  const cacheKey = date ? `?date=${encodeURIComponent(date)}` : "";
  return `${productImgBase}${encodeURIComponent(file)}${cacheKey}`;
}

function renderFeaturedMenu() {
  if (!menu) return;
  menu.innerHTML = featuredItems
    .map((item) => `
      <article class="special-card">
        <img src="${productFileImage(item.image)}" alt="${item.name}" loading="lazy" onerror="this.src='${productFallbackImage}'">
        <div class="special-body">
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
          <span class="price">${item.price.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
        </div>
      </article>
    `)
    .join("");
}

const categoryStrip = document.querySelector("#categoryStrip");
const menuList = document.querySelector("#menuList");
const menuSearch = document.querySelector("#menuSearch");
let allProducts = [];
let allCategories = [];
let activeCategory = "all";

function categoryName(code) {
  return allCategories.find((category) => category.tabe_cod === code)?.tabe_des || "Menu";
}

function productImage(item) {
  return productFileImage(item.art_altern, item.art_altern_update);
}

function renderCategoryStrip() {
  if (!categoryStrip) return;
  const buttons = [
    { code: "all", label: "Tutto" },
    ...allCategories.map((category) => ({
      code: category.tabe_cod,
      label: `${category.tabe_des} (${category.articoli || 0})`
    }))
  ];

  categoryStrip.innerHTML = buttons
    .map((category) => `
      <button type="button" class="${category.code === activeCategory ? "is-active" : ""}" data-category="${category.code}">
        ${category.label}
      </button>
    `)
    .join("");
}

function renderFullMenu() {
  if (!menuList) return;
  const query = (menuSearch?.value || "").trim().toLowerCase();
  const filtered = allProducts
    .filter((item) => activeCategory === "all" || item.art_tipo === activeCategory)
    .filter((item) => {
      const text = `${item.art_descrizione1 || ""} ${item.art_componenti || ""} ${categoryName(item.art_tipo)}`.toLowerCase();
      return !query || text.includes(query);
    });

  if (!filtered.length) {
    menuList.innerHTML = '<p class="menu-loading">Nessun prodotto trovato.</p>';
    return;
  }

  menuList.innerHTML = filtered
    .map((item) => `
      <article class="menu-item">
        <img class="menu-item-image" src="${productImage(item)}" alt="${item.art_descrizione1 || "Prodotto"}" decoding="async" onerror="this.src='${productFallbackImage}'">
        <div class="menu-item-content">
          <div>
            <span class="menu-category">${categoryName(item.art_tipo)}</span>
            <strong>${item.art_descrizione1 || "Prodotto"}</strong>
            <p>${item.art_componenti || categoryName(item.art_tipo)}</p>
          </div>
          <span class="price">${Number(item.price || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
        </div>
      </article>
    `)
    .join("");
}

async function loadFullMenu() {
  if (!menuList) return;
  try {
    const [menuResponse, imagesResponse] = await Promise.all([
      fetch("/data/menu-cache.json"),
      fetch("/data/product-images.json")
    ]);
    const data = await menuResponse.json();
    imageManifest = imagesResponse.ok ? await imagesResponse.json() : {};
    if (!menuResponse.ok) throw new Error("Menu non disponibile");
    allProducts = data.articoli || [];
    allCategories = data.tipi || [];
    renderFeaturedMenu();
    renderCategoryStrip();
    renderFullMenu();
  } catch (error) {
    menuList.innerHTML = `<p class="menu-loading">${error.message}. Puoi comunque aprire il menu completo da OrderIn.</p>`;
  }
}

categoryStrip?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategoryStrip();
  renderFullMenu();
});

menuSearch?.addEventListener("input", renderFullMenu);
loadFullMenu();

const dateInput = document.querySelector('input[name="date"]');
if (dateInput) {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateInput.min = today.toISOString().slice(0, 10);
  dateInput.value = today.toISOString().slice(0, 10);
}

const form = document.querySelector("#bookingForm");
const statusEl = document.querySelector("#formStatus");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `form-status ${type}`;
}

function bookingSummary(reservation) {
  return `${reservation.name}, prenotazione per ${reservation.people} persone il ${reservation.date} alle ${reservation.time}.`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Invio prenotazione in corso...");

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.people = Number(payload.people);

  try {
    const saved = {
      ...payload,
      createdAt: new Date().toISOString()
    };
    const isLocalPreview = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);

    if (isLocalPreview) {
      const localReservations = JSON.parse(localStorage.getItem("cosmoPreviewReservations") || "[]");
      localReservations.unshift(saved);
      localStorage.setItem("cosmoPreviewReservations", JSON.stringify(localReservations.slice(0, 20)));
      localStorage.setItem("lastCosmoReservation", JSON.stringify(saved));
      setStatus(`Anteprima ok. ${bookingSummary(saved)} Su Netlify verra salvata in Forms > prenotazioni.`, "ok");
      form.reset();
      if (dateInput) {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        dateInput.value = today.toISOString().slice(0, 10);
      }
      return;
    }

    const encodedPayload = new URLSearchParams({
      "form-name": form.getAttribute("name") || "prenotazioni",
      ...payload,
      people: String(payload.people)
    });

    const response = await fetch("/", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: encodedPayload.toString()
    });

    if (!response.ok) throw new Error("Non sono riuscito a registrare la prenotazione.");

    localStorage.setItem("lastCosmoReservation", JSON.stringify(saved));
    setStatus(`Richiesta inviata. ${bookingSummary(saved)} Ti ricontatteremo per conferma.`, "ok");
    form.reset();
    if (dateInput) {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      dateInput.value = today.toISOString().slice(0, 10);
    }
  } catch (error) {
    setStatus(error.message || "Non sono riuscito a registrare la prenotazione.", "error");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
