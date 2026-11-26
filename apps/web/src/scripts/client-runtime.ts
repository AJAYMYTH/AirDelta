import { animate, stagger } from "animejs";
import { getTranslation, SUPPORTED_LANGUAGES } from "@airdelta/i18n";
import { wireTransitionsDropdown, initAutoDropdowns, refreshAllDropdownLabels, setTransitionDropdownValue } from "./dropdown.ts";

declare global {
  interface Window {
    AirDeltaRuntime: {
      applyLanguage: (lang: string) => void;
      getCurrentLanguage: () => string;
      animateButton: (el: HTMLElement) => void;
      wireTransitionsDropdown: typeof wireTransitionsDropdown;
      setTransitionDropdownValue: typeof setTransitionDropdownValue;
      t: (key: string) => string;
    };
  }
}

/**
 * Apply language dynamically across all DOM elements marked with data-i18n
 */
export function applyLanguage(lang: string) {
  const safeLang = SUPPORTED_LANGUAGES[lang] ? lang : "en";
  localStorage.setItem("airdelta_lang", safeLang);
  document.documentElement.lang = safeLang;
  document.documentElement.dir = SUPPORTED_LANGUAGES[safeLang]?.direction || "ltr";

  // Update text nodes using full merged dictionary (core UI_TRANSLATIONS + PAGE_TRANSLATIONS)
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = getTranslation(key, safeLang);
    }
  });

  // Update HTML nodes
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) {
      el.innerHTML = getTranslation(key, safeLang);
    }
  });

  // Refresh selected display text inside all <TransitionDropdown> triggers
  refreshAllDropdownLabels();

  // Update Language dropdown display label
  const labelEl = document.getElementById("lang-display-name");
  if (labelEl) {
    const meta = SUPPORTED_LANGUAGES[safeLang];
    labelEl.innerText = meta ? meta.nativeName : "English";
  }

  // Update active status in language menu dropdown
  document.querySelectorAll<HTMLElement>(".lang-menu-item").forEach((item) => {
    const code = item.getAttribute("data-lang-code");
    const checkEl = item.querySelector(".lang-check");
    item.setAttribute("aria-checked", String(code === safeLang));
    if (code === safeLang) {
      item.classList.add("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      item.classList.remove("text-[#525252]", "hover:bg-[#f7f9fa]");
      if (checkEl) checkEl.classList.remove("opacity-0");
    } else {
      item.classList.remove("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      item.classList.add("text-[#525252]", "hover:bg-[#f7f9fa]");
      if (checkEl) checkEl.classList.add("opacity-0");
    }
  });

  // Update active status on Settings page cards
  document.querySelectorAll<HTMLElement>(".btn-lang-choice").forEach((btn) => {
    const code = btn.getAttribute("data-lang");
    if (code === safeLang) {
      btn.classList.add("border-2", "border-[#ea580c]", "bg-[#fff7ed]", "shadow-xs");
      btn.classList.remove("border-[#e8e8e8]", "bg-[#f7f9fa]");
    } else {
      btn.classList.remove("border-2", "border-[#ea580c]", "bg-[#fff7ed]", "shadow-xs");
      btn.classList.add("border-[#e8e8e8]", "bg-[#f7f9fa]");
    }
  });

  // Update URL without full reload
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("lang") !== safeLang) {
      url.searchParams.set("lang", safeLang);
      window.history.replaceState({}, "", url.toString());
    }
  } catch {
    // Ignore URL rewrite failures in restricted environments
  }

  // Emit custom event for page-specific component reactions
  window.dispatchEvent(
    new CustomEvent("airdelta:langchange", {
      detail: { lang: safeLang }
    })
  );
}

export function getCurrentLanguage(): string {
  try {
    const urlParam = new URLSearchParams(window.location.search).get("lang");
    if (urlParam && SUPPORTED_LANGUAGES[urlParam]) {
      return urlParam;
    }
    const stored = localStorage.getItem("airdelta_lang");
    if (stored && SUPPORTED_LANGUAGES[stored]) {
      return stored;
    }
  } catch (e) {
    // fallback
  }
  return "en";
}

export function animateButton(el: HTMLElement) {
  try {
    animate(el, {
      scale: [1, 0.94, 1],
      duration: 180,
      ease: "outQuad"
    });
  } catch (e) {
    // fallback
  }
}

// Attach to window object for global script access
if (typeof window !== "undefined") {
  window.AirDeltaRuntime = {
    applyLanguage,
    getCurrentLanguage,
    animateButton,
    wireTransitionsDropdown,
    setTransitionDropdownValue,
    t: (key: string) => getTranslation(key, getCurrentLanguage())
  };
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // 1. Auto-wire all <TransitionDropdown> instances site-wide
  initAutoDropdowns(animateButton);

  // 2. Setup Transitions.dev Menu Dropdown (Language Switcher)
  wireTransitionsDropdown({
    trigger: document.getElementById("btn-lang-dropdown"),
    menu: document.getElementById("lang-dropdown-menu"),
    chevron: document.getElementById("lang-chevron"),
    itemSelector: ".lang-menu-item",
    align: "end",
    animateTrigger: animateButton,
    onSelect: (item) => {
      const code = item.getAttribute("data-lang-code");
      if (code) applyLanguage(code);
    }
  });

  // 3. Initial Language Application (after dropdown wiring so labels translate cleanly)
  const initialLang = getCurrentLanguage();
  applyLanguage(initialLang);

  // 4. Tactile Feedback on all buttons with anime.js
  document.querySelectorAll<HTMLElement>("button, a.btn-action").forEach((btn) => {
    btn.addEventListener("mousedown", () => {
      animateButton(btn);
    });
  });

  // 5. Staggered card entrance animation — clear transform afterwards to avoid trapping fixed/popover contexts
  const staggerCards = document.querySelectorAll<HTMLElement>(".stagger-card");
  if (staggerCards.length > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    try {
      animate(staggerCards, {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: stagger(35),
        duration: 280,
        ease: "outQuad",
        onComplete: () => {
          staggerCards.forEach((el) => {
            el.style.transform = "";
          });
        }
      });
    } catch {}
  }

  // 5. Sync global top alert banner from session cache or live OpenAQ API on secondary pages
  const globalAlertText = document.getElementById("global-alert-text");
  const globalAlertTitle = document.getElementById("global-alert-title");
  if (globalAlertText && !document.getElementById("city-select")) {
    try {
      const cached = sessionStorage.getItem("airdelta_last_snapshot");
      if (cached) {
        const { snapshot, cityLabel } = JSON.parse(cached);
        if (globalAlertTitle) globalAlertTitle.textContent = `${cityLabel} (${String(snapshot.source).toUpperCase()}):`;
        globalAlertText.textContent = `AQI ${snapshot.indexValue ?? "--"} (${snapshot.category ?? "Moderate"}) · Fine Dust ${snapshot.pm25 ?? "--"} µg/m³`;
      } else {
        const apiBase = ((import.meta as any).env?.PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
        fetch(`${apiBase}/v1/air?lat=28.6139&lng=77.2090`, { signal: AbortSignal.timeout(5000) })
          .then((r) => (r.ok ? r.json() : null))
          .then((snapshot) => {
            if (snapshot && globalAlertText) {
              if (globalAlertTitle) globalAlertTitle.textContent = `Delhi-NCR (${String(snapshot.source).toUpperCase()}):`;
              globalAlertText.textContent = `AQI ${snapshot.indexValue ?? "--"} (${snapshot.category ?? "Moderate"}) · Fine Dust ${snapshot.pm25 ?? "--"} µg/m³`;
            }
          })
          .catch(() => {
            if (globalAlertText) globalAlertText.textContent = "Offline Demo Mode Ready";
          });
      }
    } catch {}
  }
});
