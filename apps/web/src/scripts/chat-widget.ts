import {
  apiFetchJson,
  fetchResilientAir,
  getSelectedCity
} from "./api-client";
import { renderSafeMarkdown } from "./markdown";
import { stripExifViaCanvas } from "./image-utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  refused?: boolean;
  refusalReason?: string;
  impactHighlights?: string[];
}

export interface LifestylePrefs {
  budgetBand?: "none" | "low" | "medium" | "high";
  ageBand?: "child" | "teen" | "adult" | "senior";
  commuteMode?: "walk" | "two_wheeler" | "auto" | "bus" | "car" | "metro";
  cautionMode?: boolean;
  hasExhaust?: boolean;
}

export interface AirChatElements {
  form: HTMLFormElement;
  input: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  messagesBox: HTMLElement;
  contextPill?: HTMLElement | null;
  chipsContainer?: HTMLElement | null;
  fileInput?: HTMLInputElement | null;
  attachBtn?: HTMLButtonElement | null;
  previewWrap?: HTMLElement | null;
  previewThumb?: HTMLImageElement | null;
  removeImgBtn?: HTMLButtonElement | null;
  onAirUpdated?: (aqi: number | null | undefined, cleanestWindow?: string) => void;
}

const CLIENT_INJECTION_RE =
  /(?:ignore\s+(?:all\s+|any\s+|your\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts?|rules?)|disregard\s+(?:previous|above|your)?\s*(?:instructions|rules)|(?:reveal|show|print|dump)\s+(?:your\s+)?(?:system\s+prompt|hidden\s+instructions|secret|api\s*key)|(?:act\s+as|pretend\s+to\s+be|you\s+are\s+now)\s+(?:unrestricted|dan|developer\s+mode|jailbreak)|<system>|\[inst\])/i;

const CLIENT_CODING_RE =
  /(?:write|generate|create|debug|fix|convert|solve)\s+(?:a\s+|an\s+|some\s+)?(?:[\w+#.]+\s+){0,3}(?:python|javascript|typescript|java|c\+\+|sql|bash|html|css|react|code|script|program|function|regex|algorithm|snippet)|```|\b(?:def\s+\w+\s*\(|import\s+(?:numpy|pandas|os|sys)|console\.log|select\s+\*\s+from)\b/i;

const CLIENT_AIR_DOMAIN_RE =
  /\b(?:aqi|pm2\.?5|pm10|smog|air|pollution|pollutant|breathe|breathing|lung|asthma|cough|mask|n95|purifier|hepa|cadr|ventilation|window|exhaust|cook|cooking|stove|incense|agarbatti|dust|indoor|outdoor|walk|jog|commute|metro|bus|car|scooter|bike|two.?wheeler|emission|carbon|co2|sustainable|routine|plan|grap|cpcb|weather|inversion|location|city|family|child|teen|senior|morning|afternoon|hack|save|impact|dose|forecast|clean|fresh|photo|image|room|kitchen|analyze|analyse|hi|hello|hey|namaste|help|thanks)\b/i;

export function readLifestylePrefs(): LifestylePrefs {
  try {
    const raw = localStorage.getItem("airdelta_plan_prefs");
    if (raw) return JSON.parse(raw) as LifestylePrefs;
  } catch {
    // ignore storage parse failure
  }
  return {
    budgetBand: "low",
    ageBand: "adult",
    commuteMode: "two_wheeler",
    cautionMode: false,
    hasExhaust: false
  };
}

export function writeLifestylePrefs(prefs: LifestylePrefs): void {
  try {
    localStorage.setItem("airdelta_plan_prefs", JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("airdelta:prefschange"));
  } catch {
    // ignore storage write errors
  }
}

function getPreferredLang(): string {
  try {
    return localStorage.getItem("airdelta_lang") || "en";
  } catch {
    return "en";
  }
}

export function evaluateOfflineClientGuard(
  message: string,
  hasImage = false
): { refused: boolean; reason?: string; reply?: string } {
  if (CLIENT_INJECTION_RE.test(message)) {
    return {
      refused: true,
      reason: "prompt_injection",
      reply:
        "Request blocked by AirDelta Guard: I cannot override instructions, reveal prompts, or switch roles. Ask me about smog protection, low-emission routines, or indoor air hacks."
    };
  }
  if (CLIENT_CODING_RE.test(message)) {
    return {
      refused: true,
      reason: "coding_request",
      reply:
        "I am the AirDelta Clean Air Assistant, strictly focused on winter smog, indoor air quality, and sustainable routines. I cannot write code, scripts, or answer programming requests."
    };
  }
  if (!hasImage && !CLIENT_AIR_DOMAIN_RE.test(message)) {
    return {
      refused: true,
      reason: "off_topic",
      reply:
        "That topic falls outside my clean-air scope. Ask me about today's AQI, low-emission commutes, indoor smoke hacks, masks, or upload a room photo for analysis."
    };
  }
  return { refused: false };
}

/**
 * Reusable controller powering both the floating quick-drawer and the dedicated /assistant page.
 */
export function createAirChatController(els: AirChatElements) {
  const history: ChatMessage[] = [];
  let isSending = false;
  let pendingImageBase64: string | null = null;

  function updateContextBadge(aqiValue?: number | null) {
    if (!els.contextPill) return;
    const city = getSelectedCity();
    const prefs = readLifestylePrefs();
    const commuteLabel = String(prefs.commuteMode || "two_wheeler").replace("_", " ");
    const ageLabel = prefs.ageBand || "adult";
    const budgetLabel = prefs.budgetBand || "low";
    const aqiPart = typeof aqiValue === "number" ? ` · AQI ${aqiValue}` : "";
    els.contextPill.textContent = `${city.label}${aqiPart} · ${ageLabel} · ${commuteLabel} · ${budgetLabel} budget`;
  }

  function clearAttachedImage() {
    pendingImageBase64 = null;
    if (els.fileInput) els.fileInput.value = "";
    if (els.previewThumb) els.previewThumb.src = "";
    els.previewWrap?.classList.add("hidden");
  }

  async function handleImageFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const strippedDataUrl = await stripExifViaCanvas(file, 768);
      pendingImageBase64 = strippedDataUrl;
      if (els.previewThumb) els.previewThumb.src = strippedDataUrl;
      els.previewWrap?.classList.remove("hidden");
    } catch {
      clearAttachedImage();
    }
  }

  function appendMessageBubble(msg: ChatMessage) {
    const wrapper = document.createElement("div");
    wrapper.className =
      msg.role === "user"
        ? "flex flex-col items-end gap-1"
        : "flex flex-col items-start gap-1.5";

    const bubble = document.createElement("div");
    if (msg.role === "user") {
      bubble.className =
        "max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-[#ea580c] text-white text-xs leading-relaxed font-medium shadow-2xs break-words space-y-2";
    } else if (msg.refused) {
      bubble.className =
        "max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs leading-relaxed break-words";
    } else {
      bubble.className =
        "max-w-[92%] px-4 py-3 rounded-2xl rounded-bl-sm bg-[#f7f9fa] border border-[#e5e5e5] text-[#171717] text-xs leading-relaxed break-words";
    }

    if (msg.role === "user" && msg.imagePreview) {
      const img = document.createElement("img");
      img.src = msg.imagePreview;
      img.alt = "Uploaded environment photo";
      img.className = "max-h-44 w-auto rounded-xl border border-white/25 object-cover";
      bubble.appendChild(img);
    }

    if (msg.role === "assistant" && msg.refused) {
      const badge = document.createElement("div");
      badge.className =
        "inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#b91c1c] bg-white border border-[#fecaca] px-2 py-0.5 rounded-full mb-1.5";
      badge.textContent =
        msg.refusalReason === "prompt_injection"
          ? "Guard: Prompt Injection Blocked"
          : msg.refusalReason === "coding_request"
          ? "Guard: Coding Request Blocked"
          : "Guard: Off-Topic Blocked";
      bubble.appendChild(badge);
    }

    const contentNode = document.createElement("div");
    if (msg.role === "assistant") {
      renderSafeMarkdown(contentNode, msg.content);
    } else {
      contentNode.className = "whitespace-pre-wrap";
      contentNode.textContent = msg.content;
    }
    bubble.appendChild(contentNode);
    wrapper.appendChild(bubble);

    if (msg.role === "assistant" && !msg.refused && msg.impactHighlights?.length) {
      const metaRow = document.createElement("div");
      metaRow.className = "flex flex-wrap gap-1.5 max-w-[92%]";
      for (const chipText of msg.impactHighlights.slice(0, 4)) {
        const chip = document.createElement("span");
        chip.className =
          "text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]";
        chip.textContent = chipText;
        metaRow.appendChild(chip);
      }
      wrapper.appendChild(metaRow);
    }

    els.messagesBox.appendChild(wrapper);
    els.messagesBox.scrollTop = els.messagesBox.scrollHeight;
  }

  function showTypingIndicator(hasImage: boolean): HTMLElement {
    const row = document.createElement("div");
    row.className =
      "flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#f7f9fa] border border-[#e5e5e5] w-fit text-[11px] font-mono text-[#737373]";
    row.textContent = hasImage
      ? "Analyzing photo, live AQI & calculating indoor impact..."
      : "Checking live AQI & grounding answer...";
    els.messagesBox.appendChild(row);
    els.messagesBox.scrollTop = els.messagesBox.scrollHeight;
    return row;
  }

  async function sendMessage(rawText: string) {
    const trimmed = rawText.trim();
    const attachedImage = pendingImageBase64;
    if ((!trimmed && !attachedImage) || isSending) return;

    const displayText = trimmed || "Analyze this photo for air pollution sources and clean-air fixes.";

    isSending = true;
    els.sendBtn.disabled = true;
    els.input.value = "";
    clearAttachedImage();

    const userMsg: ChatMessage = {
      role: "user",
      content: displayText,
      imagePreview: attachedImage || undefined
    };
    appendMessageBubble(userMsg);
    const typingEl = showTypingIndicator(Boolean(attachedImage));

    const city = getSelectedCity();
    const prefs = readLifestylePrefs();
    const lang = getPreferredLang();

    try {
      const payload: Record<string, unknown> = {
        message: displayText,
        history: history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        context: {
          cityCode: city.code,
          lat: city.lat,
          lng: city.lng,
          locationLabel: city.label,
          ageBand: prefs.ageBand || "adult",
          commuteMode: prefs.commuteMode || "two_wheeler",
          budgetBand: prefs.budgetBand || "low",
          cautionMode: Boolean(prefs.cautionMode),
          hasExhaust: Boolean(prefs.hasExhaust),
          lang
        }
      };

      if (attachedImage) {
        payload.imageBase64 = attachedImage;
        payload.mimeType = "image/jpeg";
      }

      const res = await apiFetchJson<any>(
        "/v1/chat",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        attachedImage ? 15000 : 9500
      );

      typingEl.remove();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.reply,
        refused: Boolean(res.refused),
        refusalReason: res.refusalReason,
        impactHighlights: res.impactHighlights
      };

      if (!assistantMsg.refused) {
        history.push(userMsg, assistantMsg);
      }
      if (typeof res.airSummary?.aqi === "number") {
        updateContextBadge(res.airSummary.aqi);
        els.onAirUpdated?.(res.airSummary.aqi, res.airSummary.cleanestWindow);
      }
      appendMessageBubble(assistantMsg);
    } catch {
      typingEl.remove();
      const offlineGuard = evaluateOfflineClientGuard(displayText, Boolean(attachedImage));
      if (offlineGuard.refused) {
        appendMessageBubble({
          role: "assistant",
          content: offlineGuard.reply!,
          refused: true,
          refusalReason: offlineGuard.reason
        });
      } else {
        const liveAir = await fetchResilientAir(city.lat, city.lng);
        const snap = liveAir.snapshot;
        updateContextBadge(snap?.indexValue);
        els.onAirUpdated?.(snap?.indexValue);
        const fallbackText = attachedImage
          ? [
              `### Offline Photo & Air Check (${city.label})`,
              `Ambient air is **AQI ${snap?.indexValue ?? "--"} (${snap?.category ?? "Moderate"})** with **${snap?.pm25 ?? "--"} µg/m³** PM2.5.`,
              `- Check for unvented cooking smoke, incense/dhoop, and unsealed balcony/window gaps.`,
              `- Run kitchen exhaust while cooking (-75% indoor smoke) and vent briefly during the cleanest afternoon window.`
            ].join("\n")
          : `**${city.label} Live Update:** AQI **${snap?.indexValue ?? "--"}** (${snap?.category ?? "Moderate"}), PM2.5 **${snap?.pm25 ?? "--"} µg/m³**.\n- Shift outdoor walks to **13:00–15:30**.\n- Run kitchen exhaust while cooking (~**75%** less indoor smoke).\n- Switch **${prefs.commuteMode || "two_wheeler"}** commute to Metro + N95 (~**40%** lower inhaled PM2.5).`;
        const fallbackMsg: ChatMessage = {
          role: "assistant",
          content: fallbackText,
          impactHighlights: [`AQI ${snap?.indexValue ?? "--"}`, "Shift Walk 13:00–15:30", "~40% PM2.5 Reduction"]
        };
        history.push(userMsg, fallbackMsg);
        appendMessageBubble(fallbackMsg);
      }
    } finally {
      isSending = false;
      els.sendBtn.disabled = false;
      els.input.focus();
    }
  }

  els.attachBtn?.addEventListener("click", () => els.fileInput?.click());
  els.fileInput?.addEventListener("change", () => handleImageFile(els.fileInput?.files?.[0]));
  els.removeImgBtn?.addEventListener("click", clearAttachedImage);

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(els.input.value);
  });

  els.chipsContainer?.querySelectorAll<HTMLButtonElement>("[data-chat-prompt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.getAttribute("data-chat-prompt") || "";
      if (prompt) sendMessage(prompt);
    });
  });

  window.addEventListener("airdelta:citychange", () => updateContextBadge());
  window.addEventListener("airdelta:prefschange", () => updateContextBadge());
  updateContextBadge();

  return { sendMessage, updateContextBadge, handleImageFile };
}

export function initAirChatWidget() {
  const launcher = document.getElementById("btn-open-airchat") as HTMLButtonElement | null;
  const panel = document.getElementById("airchat-window") as HTMLElement | null;
  const closeBtn = document.getElementById("btn-close-airchat") as HTMLButtonElement | null;
  const form = document.getElementById("airchat-form") as HTMLFormElement | null;
  const input = document.getElementById("airchat-input") as HTMLInputElement | null;
  const sendBtn = document.getElementById("airchat-send") as HTMLButtonElement | null;
  const messagesBox = document.getElementById("airchat-messages") as HTMLElement | null;

  if (!launcher || !panel || !form || !input || !sendBtn || !messagesBox) return;

  // Hide the redundant floating launcher when already on the dedicated /assistant page
  if (window.location.pathname.startsWith("/assistant")) {
    launcher.classList.add("hidden");
    panel.classList.add("hidden");
    return;
  }

  const controller = createAirChatController({
    form,
    input,
    sendBtn,
    messagesBox,
    contextPill: document.getElementById("airchat-context-pill"),
    chipsContainer: document.getElementById("airchat-quick-chips"),
    fileInput: document.getElementById("airchat-file") as HTMLInputElement | null,
    attachBtn: document.getElementById("airchat-attach") as HTMLButtonElement | null,
    previewWrap: document.getElementById("airchat-image-preview"),
    previewThumb: document.getElementById("airchat-image-thumb") as HTMLImageElement | null,
    removeImgBtn: document.getElementById("airchat-image-remove") as HTMLButtonElement | null
  });

  function openPanel() {
    panel!.classList.remove("hidden");
    launcher!.setAttribute("aria-expanded", "true");
    controller.updateContextBadge();
    setTimeout(() => input!.focus(), 50);
  }

  function closePanel() {
    panel!.classList.add("hidden");
    launcher!.setAttribute("aria-expanded", "false");
    launcher!.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) openPanel();
    else closePanel();
  });

  closeBtn?.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.classList.contains("hidden")) {
      closePanel();
    }
  });
}
