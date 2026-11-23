import { animate, stagger } from "animejs";
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from "@airdelta/i18n";

declare global {
  interface Window {
    AirDeltaRuntime: {
      applyLanguage: (lang: string) => void;
      getCurrentLanguage: () => string;
      animateButton: (el: HTMLElement) => void;
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

  const dict = UI_TRANSLATIONS[safeLang] || UI_TRANSLATIONS.en;
  const fallback = UI_TRANSLATIONS.en;

  // Update text nodes
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as keyof typeof dict;
    if (key) {
      const val = (dict && dict[key]) || (fallback && fallback[key]);
      if (val) {
        el.innerText = val;
      }
    }
  });

  // Update HTML nodes
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html") as keyof typeof dict;
    if (key) {
      const val = (dict && dict[key]) || (fallback && fallback[key]);
      if (val) {
        el.innerHTML = val;
      }
    }
  });

  // Update Language dropdown display label
  const labelEl = document.getElementById("lang-display-name");
  if (labelEl) {
    const meta = SUPPORTED_LANGUAGES[safeLang];
    labelEl.innerText = meta ? meta.nativeName : "English";
  }

  // Update active status in custom dropdown
  document.querySelectorAll<HTMLElement>(".lang-menu-item").forEach((item) => {
    const code = item.getAttribute("data-lang-code");
    const checkEl = item.querySelector(".lang-check");
    if (code === safeLang) {
      item.classList.add("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      item.classList.remove("text-[#595959]", "hover:bg-[#f7f9fa]");
      if (checkEl) checkEl.classList.remove("opacity-0");
    } else {
      item.classList.remove("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      item.classList.add("text-[#595959]", "hover:bg-[#f7f9fa]");
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
  } catch (e) {
    // Ignore URL rewrite failures in restricted environments
  }

  // Emit custom event for page-specific component reactions
  window.dispatchEvent(
    new CustomEvent("airdelta:langchange", {
      detail: { lang: safeLang, translations: dict }
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
    animateButton
  };
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Language Application
  const initialLang = getCurrentLanguage();
  applyLanguage(initialLang);

  // 2. Setup Transitions.dev-style Dropdown Menu
  const triggerBtn = document.getElementById("btn-lang-dropdown");
  const dropdownMenu = document.getElementById("lang-dropdown-menu");
  const chevron = document.getElementById("lang-chevron");

  let isDropdownOpen = false;

  function toggleDropdown(forceClose = false) {
    if (!dropdownMenu) return;
    if (isDropdownOpen || forceClose) {
      // Close dropdown
      isDropdownOpen = false;
      if (chevron) {
        chevron.style.transform = "rotate(0deg)";
      }
      try {
        animate(dropdownMenu, {
          opacity: [1, 0],
          translateY: [0, -8],
          scale: [1, 0.95],
          duration: 150,
          ease: "inQuad"
        });
      } catch (e) {}
      setTimeout(() => {
        dropdownMenu.classList.add("hidden");
      }, 150);
    } else {
      // Open dropdown
      isDropdownOpen = true;
      dropdownMenu.classList.remove("hidden");
      if (chevron) {
        chevron.style.transform = "rotate(180deg)";
      }
      try {
        animate(dropdownMenu, {
          opacity: [0, 1],
          translateY: [-8, 0],
          scale: [0.95, 1],
          duration: 220,
          ease: "outCubic"
        });
      } catch (e) {}
    }
  }

  if (triggerBtn) {
    triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      animateButton(triggerBtn);
      toggleDropdown();
    });
  }

  // Language options click inside dropdown
  document.querySelectorAll<HTMLElement>(".lang-menu-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = item.getAttribute("data-lang-code");
      if (code) {
        applyLanguage(code);
        toggleDropdown(true);
      }
    });
  });

  // Close dropdown on outside click or escape
  document.addEventListener("click", (e) => {
    if (isDropdownOpen && dropdownMenu && !dropdownMenu.contains(e.target as Node)) {
      toggleDropdown(true);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isDropdownOpen) {
      toggleDropdown(true);
    }
  });

  // 3. Tactile Feedback on all buttons with anime.js
  document.querySelectorAll<HTMLElement>("button, a.btn-action").forEach((btn) => {
    btn.addEventListener("mousedown", () => {
      animateButton(btn);
    });
  });

  // 4. Staggered card entrance animation
  const staggerCards = document.querySelectorAll(".stagger-card");
  if (staggerCards.length > 0) {
    try {
      animate(staggerCards, {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: stagger(40),
        duration: 350,
        ease: "outQuad"
      });
    } catch (e) {}
  }
});
