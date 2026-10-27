import { mount } from "./vendor/ascii-pond/pond.js";

const root = document.documentElement;
const canvas = document.getElementById("pond-canvas");
const button = document.getElementById("theme-toggle");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const forcedColors = matchMedia("(forced-colors: active)");
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
let pond = null;
let switching = false;

// Match the reading palette in custom.css; the canvas itself stays transparent.
const palette = {
  light: {
    page: [250, 249, 245],
    bg: [250, 249, 245],
    fg: [20, 20, 19],
    water: [20, 20, 19],
  },
  dark: {
    page: [31, 30, 29],
    bg: [31, 30, 29],
    fg: [240, 238, 230],
    water: [240, 238, 230],
  },
};

const avoid = [
  ".header-nav",
  ".home-info .entry-header",
  ".home-info .entry-content",
  ".post-entry .entry-header",
  ".post-entry .entry-content",
  ".post-header",
  ".post-content",
  ".post-footer",
  ".page-header",
  ".terms-tags",
  ".toc",
  "#searchbox",
  "#searchResults",
  ".footer",
].join(",");

if (canvas && !forcedColors.matches) {
  try {
    pond = mount(canvas, {
      theme: root.dataset.theme === "dark" ? "dark" : "light",
      palette,
      avoid,
    });
    canvas.dataset.ready = "true";
  } catch (error) {
    canvas.hidden = true;
    console.warn("The decorative pond could not start.", error);
  }
}

function storedTheme() {
  try {
    return localStorage.getItem("pref-theme");
  } catch {
    return null;
  }
}

function syncPond() {
  const isLight = root.dataset.theme !== "dark";
  pond?.setTheme(isLight);
  // Draw the new palette before the browser captures a transition snapshot.
  if (pond) pond.renderer.render(pond.pond);
  const color = getComputedStyle(root).getPropertyValue("--theme").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

function applyTheme(theme, remember = true) {
  root.dataset.theme = theme;
  if (remember) {
    try {
      localStorage.setItem("pref-theme", theme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }
  syncPond();
}

async function switchTheme() {
  if (switching) return;
  const next = root.dataset.theme === "dark" ? "light" : "dark";

  if (!document.startViewTransition || reducedMotion.matches || forcedColors.matches) {
    applyTheme(next);
    return;
  }

  switching = true;
  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  root.style.setProperty("--theme-reveal-x", `${x}px`);
  root.style.setProperty("--theme-reveal-y", `${y}px`);
  root.style.setProperty("--theme-reveal-radius", `${Math.ceil(radius)}px`);
  root.setAttribute("data-theme-reveal", "");

  try {
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.catch(() => {});
    await transition.finished;
  } catch {
    // Background documents and older implementations can skip a transition.
    applyTheme(next);
  } finally {
    root.removeAttribute("data-theme-reveal");
    switching = false;
  }
}

if (button) {
  // Capture the click before PaperMod's default instant-switch handler.
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void switchTheme();
  }, { capture: true });
}

new MutationObserver(syncPond).observe(root, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

prefersDark.addEventListener("change", (event) => {
  if (!storedTheme() && !switching) applyTheme(event.matches ? "dark" : "light", false);
});

addEventListener("storage", (event) => {
  if (event.key === "pref-theme" && !switching) {
    const theme = event.newValue === "dark" || event.newValue === "light"
      ? event.newValue
      : prefersDark.matches ? "dark" : "light";
    applyTheme(theme, false);
  }
});

syncPond();
