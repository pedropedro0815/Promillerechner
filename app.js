const STORAGE_KEY = "pfadfinder-promille-rechner-state";
const PREFERENCES_STORAGE_KEY = "pfadfinder-promille-rechner-preferences";
const ETHANOL_DENSITY = 0.789;
const ELIMINATION_PER_HOUR = 0.15;

const drinkCatalog = {
  bier: {
    label: "Bier",
    sizeOptions: [
      { value: 0.33, label: "0,33 l" },
      { value: 0.5, label: "0,5 l" }
    ],
    drinks: {
      alt: { label: "Alt", abv: 4.8 },
      pils: { label: "Pils", abv: 4.9 },
      radler: { label: "Radler", abv: 2.5 }
    }
  },
  schnaps: {
    label: "Schnaps",
    sizeOptions: [
      { value: 0.02, label: "2 cl" },
      { value: 0.04, label: "4 cl" }
    ],
    drinks: {
      wodka: { label: "Wodka", abv: 37.5 },
      rum: { label: "Rum", abv: 40 },
      korn: { label: "Korn", abv: 32 }
    }
  },
  likoer: {
    label: "Likör",
    sizeOptions: [
      { value: 0.02, label: "2 cl" },
      { value: 0.04, label: "4 cl" }
    ],
    drinks: {
      kraeuter: { label: "Kräuterlikör", abv: 30 },
      frucht: { label: "Fruchtlikör", abv: 18 },
      sahne: { label: "Sahnelikör", abv: 17 },
      bitter: { label: "Bitterlikör", abv: 25 },
      nuss: { label: "Nusslikör", abv: 22 }
    }
  }
};

const state = createInitialState();
const preferences = createInitialPreferences();

const genderSelectEl = document.querySelector("#genderSelect");
const heightInputEl = document.querySelector("#heightInput");
const weightInputEl = document.querySelector("#weightInput");
const ageInputEl = document.querySelector("#ageInput");
const startTimeInputEl = document.querySelector("#startTimeInput");
const lastDrinkTimeInputEl = document.querySelector("#lastDrinkTimeInput");
const categorySelectEl = document.querySelector("#categorySelect");
const drinkSelectEl = document.querySelector("#drinkSelect");
const sizeSelectEl = document.querySelector("#sizeSelect");
const addDrinkButtonEl = document.querySelector("#addDrinkButton");
const drinkListEl = document.querySelector("#drinkList");
const resultOutputEl = document.querySelector("#resultOutput");
const statusMessageEl = document.querySelector("#statusMessage");
const copyButtonEl = document.querySelector("#copyButton");
const resetButtonEl = document.querySelector("#resetButton");
const themeModeButtonEls = Array.from(document.querySelectorAll('[data-action="theme"]'));
const contrastButtonEls = Array.from(document.querySelectorAll('[data-action="contrast"]'));
const themeColorMetaEl = document.querySelector('meta[name="theme-color"]');
const prefersDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

init();

function init() {
  restorePreferences();
  applyPreferences();

  hydrateCategorySelect();
  restoreState();
  hydrateProfileInputs();
  hydrateDrinkDependentSelects();
  renderDrinkList();
  renderResult();

  categorySelectEl.addEventListener("change", () => {
    state.builder.category = categorySelectEl.value;
    hydrateDrinkDependentSelects();
    persistState();
  });

  drinkSelectEl.addEventListener("change", () => {
    state.builder.drink = drinkSelectEl.value;
    persistState();
  });

  sizeSelectEl.addEventListener("change", () => {
    state.builder.sizeLiters = Number(sizeSelectEl.value);
    persistState();
  });

  addDrinkButtonEl.addEventListener("click", addSelectedDrink);
  copyButtonEl.addEventListener("click", copyResult);
  resetButtonEl.addEventListener("click", resetAll);

  themeModeButtonEls.forEach((button) => {
    button.addEventListener("click", cycleThemeMode);
  });
  contrastButtonEls.forEach((button) => {
    button.addEventListener("click", toggleContrastMode);
  });

  const profileInputs = [
    genderSelectEl,
    heightInputEl,
    weightInputEl,
    ageInputEl,
    startTimeInputEl,
    lastDrinkTimeInputEl
  ];

  profileInputs.forEach((input) => {
    input.addEventListener("input", updateProfileFromForm);
    input.addEventListener("change", updateProfileFromForm);
  });

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();

  prefersDarkQuery.addEventListener("change", () => {
    if (preferences.themeMode === "system") {
      applyPreferences();
    }
  });
}

function createInitialState() {
  return {
    profile: {
      gender: "male",
      heightCm: 180,
      weightKg: 80,
      age: 30,
      startTime: "20:00",
      lastDrinkTime: "23:00"
    },
    builder: {
      category: "bier",
      drink: "alt",
      sizeLiters: 0.33
    },
    drinks: []
  };
}

function createInitialPreferences() {
  return {
    themeMode: "system",
    contrastMode: "normal"
  };
}

function hydrateCategorySelect() {
  categorySelectEl.innerHTML = "";

  for (const [categoryId, category] of Object.entries(drinkCatalog)) {
    const option = document.createElement("option");
    option.value = categoryId;
    option.textContent = category.label;
    categorySelectEl.append(option);
  }
}

function hydrateDrinkDependentSelects() {
  const categoryId = state.builder.category;
  const category = drinkCatalog[categoryId];

  if (!category) {
    return;
  }

  drinkSelectEl.innerHTML = "";

  for (const [drinkId, drink] of Object.entries(category.drinks)) {
    const option = document.createElement("option");
    option.value = drinkId;
    option.textContent = `${drink.label} (${formatPercent(drink.abv)})`;
    drinkSelectEl.append(option);
  }

  const availableDrinkIds = Object.keys(category.drinks);
  state.builder.drink = availableDrinkIds.includes(state.builder.drink)
    ? state.builder.drink
    : availableDrinkIds[0];
  drinkSelectEl.value = state.builder.drink;

  sizeSelectEl.innerHTML = "";
  for (const sizeOption of category.sizeOptions) {
    const option = document.createElement("option");
    option.value = String(sizeOption.value);
    option.textContent = sizeOption.label;
    sizeSelectEl.append(option);
  }

  const availableSizes = category.sizeOptions.map((option) => option.value);
  state.builder.sizeLiters = availableSizes.includes(state.builder.sizeLiters)
    ? state.builder.sizeLiters
    : availableSizes[0];
  sizeSelectEl.value = String(state.builder.sizeLiters);

  categorySelectEl.value = categoryId;
}

function updateProfileFromForm() {
  state.profile.gender = genderSelectEl.value;
  state.profile.heightCm = toNumber(heightInputEl.value, 180);
  state.profile.weightKg = toNumber(weightInputEl.value, 80);
  state.profile.age = toNumber(ageInputEl.value, 30);
  state.profile.startTime = startTimeInputEl.value || "20:00";
  state.profile.lastDrinkTime = lastDrinkTimeInputEl.value || "23:00";

  persistState();
  renderResult();
}

function hydrateProfileInputs() {
  genderSelectEl.value = state.profile.gender;
  heightInputEl.value = String(state.profile.heightCm);
  weightInputEl.value = String(state.profile.weightKg);
  ageInputEl.value = String(state.profile.age);
  startTimeInputEl.value = state.profile.startTime;
  lastDrinkTimeInputEl.value = state.profile.lastDrinkTime;
  categorySelectEl.value = state.builder.category;
}

function addSelectedDrink() {
  const { category, drink, sizeLiters } = state.builder;
  const categoryMeta = drinkCatalog[category];

  if (!categoryMeta || !categoryMeta.drinks[drink]) {
    showStatus("Getränk konnte nicht hinzugefügt werden.");
    return;
  }

  const existing = state.drinks.find((entry) => {
    return entry.category === category
      && entry.drink === drink
      && Math.abs(entry.sizeLiters - sizeLiters) < 0.0001;
  });

  if (existing) {
    existing.count += 1;
  } else {
    state.drinks.push({
      id: crypto.randomUUID(),
      category,
      drink,
      sizeLiters,
      count: 1
    });
  }

  persistState();
  renderDrinkList();
  renderResult();
}

function renderDrinkList() {
  drinkListEl.innerHTML = "";

  if (state.drinks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "Noch keine Getränke hinzugefügt. Mit dem großen Plus kannst du den ersten Eintrag anlegen.";
    drinkListEl.append(emptyState);
    return;
  }

  for (const entry of state.drinks) {
    const category = drinkCatalog[entry.category];
    const drink = category.drinks[entry.drink];
    const card = document.createElement("article");
    card.className = "drink-item";

    const head = document.createElement("div");
    head.className = "drink-item__head";

    const title = document.createElement("h3");
    title.textContent = `${drink.label} (${category.label})`;

    const meta = document.createElement("p");
    meta.className = "drink-item__meta";
    meta.textContent = `${formatLiters(entry.sizeLiters)} pro Getränk • ${formatPercent(drink.abv)}`;

    head.append(title, meta);

    const counter = document.createElement("div");
    counter.className = "counter";

    const minusButton = document.createElement("button");
    minusButton.className = "counter__button";
    minusButton.type = "button";
    minusButton.textContent = "−";
    minusButton.setAttribute("aria-label", `${drink.label} reduzieren`);
    minusButton.addEventListener("click", () => updateDrinkCount(entry.id, -1));

    const value = document.createElement("div");
    value.className = "counter__value";
    value.textContent = String(entry.count);

    const plusButton = document.createElement("button");
    plusButton.className = "counter__button";
    plusButton.type = "button";
    plusButton.textContent = "+";
    plusButton.setAttribute("aria-label", `${drink.label} erhöhen`);
    plusButton.addEventListener("click", () => updateDrinkCount(entry.id, 1));

    counter.append(minusButton, value, plusButton);

    card.append(head, counter);
    drinkListEl.append(card);
  }
}

function updateDrinkCount(entryId, delta) {
  const entry = state.drinks.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  entry.count += delta;

  if (entry.count <= 0) {
    state.drinks = state.drinks.filter((item) => item.id !== entryId);
  }

  persistState();
  renderDrinkList();
  renderResult();
}

function renderResult() {
  resultOutputEl.innerHTML = "";

  const calculation = calculatePromille();
  const warning = getWarningLevel(calculation.promille);

  const resultCard = document.createElement("div");
  resultCard.className = "result-card";

  const promilleValue = document.createElement("p");
  promilleValue.className = "result-promille";
  promilleValue.textContent = `${formatPromille(calculation.promille)} ‰`;

  const warningPill = document.createElement("span");
  warningPill.className = `warning-pill ${warning.className}`;
  warningPill.textContent = warning.label;

  const resultNote = document.createElement("p");
  resultNote.className = "result-note";
  resultNote.textContent = "Schätzung zum gewählten Berechnungszeitpunkt. Werte können je nach Stoffwechsel und Situation deutlich abweichen.";

  resultCard.append(promilleValue, warningPill, resultNote);

  const breakdownCard = document.createElement("div");
  breakdownCard.className = "result-card";
  breakdownCard.innerHTML = `
    <h3>Berechnungsdetails</h3>
    <ul class="breakdown-list">
      <li>Reiner Alkohol gesamt: ${formatNumber(calculation.totalAlcoholGrams, 1)} g</li>
      <li>Personalisierter Verteilungsfaktor (r): ${formatNumber(calculation.rFactor, 3)}</li>
      <li>Trinkdauer: ${formatNumber(calculation.drinkDurationHours, 2)} h</li>
      <li>Abbauzeit seit letztem Drink: ${formatNumber(calculation.eliminationHours, 2)} h</li>
      <li>Abzug durch Abbau: ${formatNumber(calculation.eliminationPromille, 2)} ‰</li>
      <li>Alkohol vollständig abgebaut um: ${calculation.clearanceTime}</li>
    </ul>
  `;

  const drinksCard = document.createElement("div");
  drinksCard.className = "result-card";

  const summaryTitle = document.createElement("h3");
  summaryTitle.textContent = "Getrunkene Getränke";

  const summaryList = document.createElement("ul");
  summaryList.className = "drink-summary";

  if (calculation.drinkSummary.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Noch keine Getränke erfasst.";
    summaryList.append(emptyItem);
  } else {
    for (const line of calculation.drinkSummary) {
      const item = document.createElement("li");
      item.textContent = line;
      summaryList.append(item);
    }
  }

  drinksCard.append(summaryTitle, summaryList);
  resultOutputEl.append(resultCard, breakdownCard, drinksCard);
}

function calculatePromille() {
  // Automatically use lastDrinkTime as the calculation endpoint
  const normalizedTimeline = normalizeTimeline(
    state.profile.startTime,
    state.profile.lastDrinkTime,
    state.profile.lastDrinkTime
  );

  const drinkSummary = [];
  let totalAlcoholGrams = 0;

  for (const entry of state.drinks) {
    const category = drinkCatalog[entry.category];
    const drinkMeta = category.drinks[entry.drink];
    const pureAlcohol = getPureAlcoholGrams(entry.sizeLiters, drinkMeta.abv, entry.count);

    totalAlcoholGrams += pureAlcohol;
    drinkSummary.push(
      `${entry.count}x ${drinkMeta.label} (${formatLiters(entry.sizeLiters)}, ${formatPercent(drinkMeta.abv)})`
    );
  }

  const rFactor = getPersonalizedRFactor(
    state.profile.gender,
    state.profile.age,
    state.profile.heightCm,
    state.profile.weightKg
  );

  const rawPromille = totalAlcoholGrams / (state.profile.weightKg * rFactor);
  const eliminationHours = Math.max(0, normalizedTimeline.endMin - normalizedTimeline.lastMin) / 60;
  const eliminationPromille = eliminationHours * ELIMINATION_PER_HOUR;
  const promille = Math.max(0, rawPromille - eliminationPromille);

  const clearanceTime = calculateAlcoholClearanceTime(state.profile.lastDrinkTime, promille);

  return {
    promille,
    rFactor,
    totalAlcoholGrams,
    eliminationHours,
    eliminationPromille,
    drinkDurationHours: (normalizedTimeline.endMin - normalizedTimeline.startMin) / 60,
    drinkSummary,
    clearanceTime
  };
}

function calculateAlcoholClearanceTime(lastDrinkTimeStr, promille) {
  const hoursUntilClear = promille / ELIMINATION_PER_HOUR;
  const lastDrinkMin = toMinutes(lastDrinkTimeStr, 23 * 60);
  const clearanceMin = lastDrinkMin + hoursUntilClear * 60;
  const minutesPerDay = 1440;
  const normalizedMin = clearanceMin % minutesPerDay;
  const hours = Math.floor(normalizedMin / 60);
  const minutes = Math.round(normalizedMin % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeTimeline(startTime, lastDrinkTime, endTime) {
  const minutesPerDay = 1440;
  const startMin = toMinutes(startTime, 20 * 60);
  let endMin = toMinutes(endTime, 60);

  if (endMin < startMin) {
    endMin += minutesPerDay;
  }

  let lastMin = toMinutes(lastDrinkTime, 23 * 60);
  while (lastMin < startMin) {
    lastMin += minutesPerDay;
  }

  if (lastMin > endMin) {
    lastMin = endMin;
  }

  return { startMin, lastMin, endMin };
}

function getPersonalizedRFactor(gender, age, heightCm, weightKg) {
  let totalBodyWater;

  if (gender === "female") {
    totalBodyWater = -2.097 + (0.1069 * heightCm) + (0.2466 * weightKg);
  } else {
    totalBodyWater = 2.447 - (0.09516 * age) + (0.1074 * heightCm) + (0.3362 * weightKg);
  }

  const ratio = totalBodyWater / weightKg;
  return clamp(ratio, 0.4, 0.78);
}

function getPureAlcoholGrams(sizeLiters, abvPercent, count) {
  const volumeMl = sizeLiters * 1000;
  return volumeMl * (abvPercent / 100) * ETHANOL_DENSITY * count;
}

function getWarningLevel(promille) {
  if (promille >= 1.1) {
    return {
      label: "Kritisch (ab 1,1 ‰)",
      className: "warning-pill--danger"
    };
  }

  if (promille >= 0.5) {
    return {
      label: "Deutlich erhöht (ab 0,5 ‰)",
      className: "warning-pill--caution"
    };
  }

  return {
    label: "Niedriger Bereich (< 0,5 ‰)",
    className: "warning-pill--safe"
  };
}

async function copyResult() {
  const calculation = calculatePromille();
  const lines = [
    "Promille-Rechner (Schätzung)",
    `Ergebnis: ${formatPromille(calculation.promille)} ‰`,
    `Reiner Alkohol gesamt: ${formatNumber(calculation.totalAlcoholGrams, 1)} g`,
    `Verteilungsfaktor (r): ${formatNumber(calculation.rFactor, 3)}`,
    `Abbauzeit seit letztem Drink: ${formatNumber(calculation.eliminationHours, 2)} h`,
    "Getränke:",
    ...calculation.drinkSummary.map((line) => `- ${line}`),
    "Hinweis: Nur unverbindliche Schätzung."
  ];

  const text = lines.join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Ergebnis wurde kopiert.");
  } catch (error) {
    const copied = copyTextFallback(text);
    if (copied) {
      showStatus("Ergebnis wurde kopiert (Fallback).");
      return;
    }

    showStatus("Kopieren nicht möglich. Bitte manuell markieren.");
    console.warn("Kopieren fehlgeschlagen.", error);
  }
}

function copyTextFallback(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";

    document.body.append(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand("copy");
    textarea.remove();

    return successful;
  } catch (error) {
    console.warn("Fallback-Kopieren fehlgeschlagen.", error);
    return false;
  }
}

function resetAll() {
  const freshState = createInitialState();
  state.profile = freshState.profile;
  state.builder = freshState.builder;
  state.drinks = freshState.drinks;

  hydrateProfileInputs();
  hydrateDrinkDependentSelects();
  renderDrinkList();
  renderResult();
  persistState();
  showStatus("Alle Eingaben wurden zurückgesetzt.");
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved || typeof saved !== "object") {
      return;
    }

    if (saved.profile && typeof saved.profile === "object") {
      state.profile.gender = saved.profile.gender === "female" ? "female" : "male";
      state.profile.heightCm = toNumber(saved.profile.heightCm, state.profile.heightCm);
      state.profile.weightKg = toNumber(saved.profile.weightKg, state.profile.weightKg);
      state.profile.age = toNumber(saved.profile.age, state.profile.age);
      state.profile.startTime = sanitizeTime(saved.profile.startTime, state.profile.startTime);
      state.profile.lastDrinkTime = sanitizeTime(saved.profile.lastDrinkTime, state.profile.lastDrinkTime);
      state.profile.endTime = sanitizeTime(saved.profile.endTime, state.profile.endTime);
    }

    if (saved.builder && typeof saved.builder === "object") {
      state.builder.category = drinkCatalog[saved.builder.category] ? saved.builder.category : "bier";
      state.builder.drink = typeof saved.builder.drink === "string" ? saved.builder.drink : "alt";
      state.builder.sizeLiters = toNumber(saved.builder.sizeLiters, 0.33);
    }

    if (Array.isArray(saved.drinks)) {
      state.drinks = saved.drinks
        .map((entry) => sanitizeDrinkEntry(entry))
        .filter(Boolean);
    }
  } catch (error) {
    console.warn("Gespeicherter Zustand konnte nicht geladen werden.", error);
  }
}

function sanitizeDrinkEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const category = drinkCatalog[entry.category];

  if (!category || !category.drinks[entry.drink]) {
    return null;
  }

  const sizeLiters = toNumber(entry.sizeLiters, category.sizeOptions[0].value);
  const count = Math.max(1, Math.floor(toNumber(entry.count, 1)));

  return {
    id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
    category: entry.category,
    drink: entry.drink,
    sizeLiters,
    count
  };
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Zustand konnte nicht gespeichert werden.", error);
  }
}

function restorePreferences() {
  try {
    const savedPreferences = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY));

    if (!savedPreferences || typeof savedPreferences !== "object") {
      return;
    }

    const allowedThemeModes = ["system", "light", "dark"];
    const allowedContrastModes = ["normal", "high"];

    preferences.themeMode = allowedThemeModes.includes(savedPreferences.themeMode)
      ? savedPreferences.themeMode
      : "system";
    preferences.contrastMode = allowedContrastModes.includes(savedPreferences.contrastMode)
      ? savedPreferences.contrastMode
      : "normal";
  } catch (error) {
    console.warn("Einstellungen konnten nicht geladen werden.", error);
  }
}

function persistPreferences() {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Einstellungen konnten nicht gespeichert werden.", error);
  }
}

function getResolvedTheme() {
  if (preferences.themeMode === "system") {
    return prefersDarkQuery.matches ? "dark" : "light";
  }

  return preferences.themeMode;
}

function updatePreferenceButtons() {
  const modeLabels = {
    system: "System",
    light: "Hell",
    dark: "Dunkel"
  };

  const modeIcons = {
    system: "⚙",
    light: "☀",
    dark: "☾"
  };

  themeModeButtonEls.forEach((button) => {
    button.textContent = `Design: ${modeLabels[preferences.themeMode]}`;
    button.setAttribute("aria-pressed", String(preferences.themeMode !== "system"));
    button.setAttribute("data-icon", modeIcons[preferences.themeMode]);
    button.setAttribute("aria-label", `Designmodus wechseln (aktuell: ${modeLabels[preferences.themeMode]})`);
    button.title = `Design: ${modeLabels[preferences.themeMode]}`;
  });

  const isHighContrast = preferences.contrastMode === "high";
  contrastButtonEls.forEach((button) => {
    button.textContent = isHighContrast ? "Kontrast: Hoch" : "Kontrast: Normal";
    button.setAttribute("aria-pressed", String(isHighContrast));
    button.setAttribute("data-icon", isHighContrast ? "◑" : "◐");
    button.setAttribute("aria-label", isHighContrast ? "Kontrast umschalten (aktuell: hoch)" : "Kontrast umschalten (aktuell: normal)");
    button.title = isHighContrast ? "Kontrast: Hoch" : "Kontrast: Normal";
  });
}

function applyPreferences() {
  const resolvedTheme = getResolvedTheme();
  document.documentElement.setAttribute("data-theme", resolvedTheme);
  document.documentElement.setAttribute("data-contrast", preferences.contrastMode);

  if (themeColorMetaEl) {
    themeColorMetaEl.content = resolvedTheme === "dark" ? "#0f1714" : "#1f4d40";
  }

  updatePreferenceButtons();
}

function cycleThemeMode() {
  const modes = ["system", "light", "dark"];
  const currentIndex = modes.indexOf(preferences.themeMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  preferences.themeMode = modes[nextIndex];
  persistPreferences();
  applyPreferences();
}

function toggleContrastMode() {
  preferences.contrastMode = preferences.contrastMode === "high" ? "normal" : "high";
  persistPreferences();
  applyPreferences();
}

function updateScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  if (maxScroll <= 0) {
    document.documentElement.style.setProperty("--scroll-progress", "0");
    return;
  }

  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
}

function showStatus(message) {
  statusMessageEl.textContent = message;

  if (!message) {
    return;
  }

  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    statusMessageEl.textContent = "";
  }, 2500);
}

function toMinutes(timeValue, fallbackMinutes) {
  if (typeof timeValue !== "string" || !timeValue.includes(":")) {
    return fallbackMinutes;
  }

  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return fallbackMinutes;
  }

  return clamp(hours, 0, 23) * 60 + clamp(minutes, 0, 59);
}

function sanitizeTime(timeValue, fallback) {
  if (typeof timeValue !== "string") {
    return fallback;
  }

  return /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatLiters(value) {
  return `${formatNumber(value, 2).replace(".", ",")} l`;
}

function formatPercent(value) {
  return `${formatNumber(value, 1).replace(".", ",")} %`;
}

function formatPromille(value) {
  return formatNumber(value, 2).replace(".", ",");
}

function formatNumber(value, digits) {
  return Number(value).toFixed(digits);
}
