export interface DropdownControllerOptions {
  trigger: HTMLElement | null;
  menu: HTMLElement | null;
  chevron?: HTMLElement | null;
  itemSelector: string;
  align?: "start" | "end";
  animateTrigger?: (el: HTMLElement) => void;
  onSelect?: (item: HTMLElement) => void;
}

export interface DropdownController {
  open: (focusFirst?: boolean) => void;
  close: (restoreFocus?: boolean) => void;
  toggle: (focusFirst?: boolean) => void;
}

const activeControllers: Array<{ id: string; syncDisplay: () => void; close: (restoreFocus?: boolean) => void }> = [];

function supportsPopover(el: HTMLElement): boolean {
  return typeof (el as any).showPopover === "function" && typeof (el as any).hidePopover === "function";
}

/**
 * Transitions.dev (.is-open / .is-closing) dropdown controller rendered in the browser Top Layer
 * with viewport-aware positioning so no parent container or transform ever clips the menu.
 */
export function wireTransitionsDropdown({
  trigger,
  menu,
  chevron = null,
  itemSelector,
  align,
  animateTrigger,
  onSelect
}: DropdownControllerOptions): DropdownController {
  let isOpen = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let originalParent: Node | null = null;
  let originalNextSibling: ChildNode | null = null;

  const preferredAlign = align || (menu?.getAttribute("data-align") === "end" ? "end" : "start");

  const getCloseDuration = () => {
    const raw = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
    );
    return Number.isFinite(raw) ? raw : 150;
  };

  const getItems = () => Array.from(menu?.querySelectorAll<HTMLElement>(itemSelector) || []);

  const positionMenu = () => {
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Close automatically if trigger scrolled completely out of view
    if (rect.bottom < 0 || rect.top > vh) {
      close(false);
      return;
    }

    const minW = Math.max(rect.width, Number(menu.getAttribute("data-min-width")) || 210);
    menu.style.minWidth = `${Math.round(minW)}px`;

    const measuredW = Math.min(vw - 16, Math.max(menu.offsetWidth || minW, minW));
    const measuredH = Math.min(menu.scrollHeight || 260, Math.min(336, vh - 16));

    let left = preferredAlign === "end" ? rect.right - measuredW : rect.left;
    left = Math.max(8, Math.min(vw - measuredW - 8, left));

    const spaceBelow = vh - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(measuredH, 220) && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.max(8, rect.top - measuredH - gap)
      : Math.min(vh - Math.min(measuredH, 220) - 8, rect.bottom + gap);

    const hOrigin = preferredAlign === "end" ? "right" : "left";
    const vOrigin = openUp ? "bottom" : "top";
    menu.setAttribute("data-origin", `${vOrigin}-${hOrigin}`);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  };

  const onViewportChange = () => {
    if (isOpen) positionMenu();
  };

  const showLayer = () => {
    if (!menu) return;
    if (supportsPopover(menu)) {
      if (!menu.hasAttribute("popover")) menu.setAttribute("popover", "manual");
      try {
        (menu as any).showPopover();
      } catch {
        // already open in top layer
      }
    } else {
      if (!originalParent && menu.parentNode) {
        originalParent = menu.parentNode;
        originalNextSibling = menu.nextSibling;
      }
      if (menu.parentNode !== document.body) {
        document.body.appendChild(menu);
      }
      menu.style.display = "block";
    }
  };

  const hideLayer = () => {
    if (!menu) return;
    if (supportsPopover(menu)) {
      try {
        (menu as any).hidePopover();
      } catch {
        // ignore if already hidden
      }
    } else {
      menu.style.display = "none";
      if (originalParent && menu.parentNode === document.body) {
        originalParent.insertBefore(menu, originalNextSibling);
      }
    }
  };

  const open = (focusFirst = false) => {
    if (!menu || isOpen) return;
    // Dismiss any other open top-layer dropdown first
    activeControllers.forEach((c) => {
      if (menu.id && c.id !== menu.id) c.close(false);
    });

    if (closeTimer) clearTimeout(closeTimer);
    isOpen = true;
    menu.inert = false;
    menu.classList.remove("is-closing", "is-open");
    showLayer();
    positionMenu();
    requestAnimationFrame(() => {
      if (isOpen) menu.classList.add("is-open");
    });

    trigger?.setAttribute("aria-expanded", "true");
    if (chevron) chevron.style.transform = "rotate(180deg)";
    window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });
    window.addEventListener("resize", onViewportChange, { passive: true });

    if (focusFirst) {
      requestAnimationFrame(() => {
        const items = getItems();
        items[0]?.focus({ preventScroll: true });
      });
    }
  };

  const close = (restoreFocus = false) => {
    if (!menu || !isOpen) return;
    isOpen = false;
    trigger?.setAttribute("aria-expanded", "false");
    if (chevron) chevron.style.transform = "rotate(0deg)";
    menu.classList.remove("is-open");
    menu.classList.add("is-closing");
    menu.inert = true;

    window.removeEventListener("scroll", onViewportChange, { capture: true });
    window.removeEventListener("resize", onViewportChange);

    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      menu.classList.remove("is-closing");
      if (!isOpen) hideLayer();
    }, getCloseDuration());

    if (restoreFocus) trigger?.focus({ preventScroll: true });
  };

  const toggle = (focusFirst = false) => {
    if (isOpen) close(false);
    else open(focusFirst);
  };

  trigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    animateTrigger?.(trigger);
    toggle(e.detail === 0);
  });

  trigger?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (isOpen) getItems()[0]?.focus({ preventScroll: true });
      else open(true);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close(true);
    }
  });

  menu?.addEventListener("keydown", (e) => {
    const items = getItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1 + items.length) % items.length]?.focus({ preventScroll: true });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus({ preventScroll: true });
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus({ preventScroll: true });
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus({ preventScroll: true });
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });

  getItems().forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect?.(item);
      close(e.detail === 0);
    });
  });

  document.addEventListener("click", (e) => {
    if (isOpen && menu && !menu.contains(e.target as Node) && !trigger?.contains(e.target as Node)) {
      close(false);
    }
  });

  document.addEventListener("focusin", (e) => {
    if (isOpen && menu && !menu.contains(e.target as Node) && !trigger?.contains(e.target as Node)) {
      close(false);
    }
  });

  if (menu?.id) {
    activeControllers.push({ id: menu.id, syncDisplay: () => {}, close });
  }

  return { open, close, toggle };
}

/**
 * Sync visual label + active checkmark for a <TransitionDropdown> hidden input ID.
 */
export function setTransitionDropdownValue(id: string, value: string, emitChange = false): void {
  const input = document.getElementById(id) as HTMLInputElement | null;
  const triggerLabel = document.getElementById(`${id}-label`);
  const menu = document.getElementById(`${id}-menu`);
  if (!input || !menu) return;

  const items = Array.from(menu.querySelectorAll<HTMLElement>(".td-item"));
  const matched = items.find((el) => el.getAttribute("data-value") === value) || items[0];
  if (!matched) return;

  const finalVal = matched.getAttribute("data-value") || value;
  const changed = input.value !== finalVal;
  input.value = finalVal;

  const labelEl = matched.querySelector<HTMLElement>(".td-item-label");
  if (triggerLabel && labelEl) {
    triggerLabel.textContent = labelEl.textContent?.trim() || finalVal;
  }

  items.forEach((el) => {
    const isSelected = el === matched;
    const check = el.querySelector<HTMLElement>(".td-check");
    el.setAttribute("aria-checked", String(isSelected));
    if (isSelected) {
      el.classList.add("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      el.classList.remove("text-[#525252]");
      check?.classList.remove("opacity-0");
    } else {
      el.classList.remove("bg-[#fff7ed]", "text-[#ea580c]", "font-bold");
      el.classList.add("text-[#525252]");
      check?.classList.add("opacity-0");
    }
  });

  if (emitChange && changed) {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function refreshAllDropdownLabels(): void {
  document.querySelectorAll<HTMLElement>("[data-tdropdown]").forEach((root) => {
    const id = root.getAttribute("data-tdropdown");
    const input = id ? (document.getElementById(id) as HTMLInputElement | null) : null;
    if (id && input) {
      setTransitionDropdownValue(id, input.value, false);
    }
  });
}

export function initAutoDropdowns(animateTrigger?: (el: HTMLElement) => void): void {
  document.querySelectorAll<HTMLElement>("[data-tdropdown]").forEach((root) => {
    const id = root.getAttribute("data-tdropdown");
    if (!id || root.dataset.wired === "true") return;
    root.dataset.wired = "true";

    const trigger = document.getElementById(`${id}-trigger`);
    const menu = document.getElementById(`${id}-menu`);
    const chevron = document.getElementById(`${id}-chevron`);
    const input = document.getElementById(id) as HTMLInputElement | null;

    if (input) {
      setTransitionDropdownValue(id, input.value, false);
    }

    wireTransitionsDropdown({
      trigger,
      menu,
      chevron,
      itemSelector: ".td-item",
      animateTrigger,
      onSelect: (item) => {
        const val = item.getAttribute("data-value");
        if (val !== null) {
          setTransitionDropdownValue(id, val, true);
        }
      }
    });
  });
}
