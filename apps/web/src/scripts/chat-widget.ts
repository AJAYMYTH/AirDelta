import {
  apiFetchJson,
  fetchResilientAir,
  getSelectedCity
} from "./api-client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
  refusalReason?: string;
  source?: string;
  impactHighlights?: string[];
}

interface LifestylePrefs {
  budgetBand?: "none" | "low" | "medium" | "high";
  ageBand?: "child" | "teen" | "adult" | "senior";
  commuteMode?: "walk" | "two_wheeler" | "auto" | "bus" | "car" | "metro";
  cautionMode?: boolean;
  hasExhaust?: boolean;
}

const CLIENT_INJECTION_RE =
  /(?:ignore\s+(?:all\s+|any\s+|your\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts?|rules?)|disregard\s+(?:previous|above|your)?\s*(?:instructions|rules)|(?:reveal|show|print|dump)\s+(?:your\s+)?(?:system\s+prompt|hidden\s+instructions|secret|api\s*key)|(?:act\s+as|pretend\s+to\s+be|you\s+are\s+now)\s+(?:unrestricted|dan|developer\s+mode|jailbreak)|<system>|\[inst\])/i;

const CLIENT_CODING_RE =
  /(?:write|generate|create|debug|fix|convert|solve)\s+(?:a\s+|an\s+|some\s+)?(?:[\w+#.]+\s+){0,3}(?:python|javascript|typescript|java|c\+\+|sql|bash|html|css|react|code|script|program|function|regex|algorithm|snippet)|```|\b(?:def\s+\w+\s*\(|import\s+(?:numpy|pandas|os|sys)|console\.log|select\s+\*\s+from)\b/i;

const CLIENT_AIR_DOMAIN_RE =
  /\b(?:aqi|pm2\.?5|pm10|smog|air|pollution|pollutant|breathe|breathing|lung|asthma|cough|mask|n95|purifier|hepa|cadr|ventilation|window|exhaust|cook|cooking|stove|incense|agarbatti|dust|indoor|outdoor|walk|jog|commute|metro|bus|car|scooter|bike|two.?wheeler|emission|carbon|co2|sustainable|routine|plan|grap|cpcb|weather|inversion|location|city|family|child|senior|morning|afternoon|hack|save|impact|dose|forecast|clean|fresh|hi|hello|hey|namaste|help|thanks)\b/i;

function readLifestylePrefs(): LifestylePrefs {
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

function getPreferredLang(): string {
  try {
    return localStorage.getItem("airdelta_lang") || "en";
  } catch {
    return "en";
  }
}

function evaluateOfflineClientGuard(message: string): { refused: boolean; reason?: string; reply?: string } {
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
  if (!CLIENT_AIR_DOMAIN_RE.test(message)) {
    return {
      refused: true,
      reason: "off_topic",
      reply:
        "That topic falls outside my clean-air scope. Ask me about today's AQI, low-emission commutes, indoor smoke hacks, masks, or health protection for your family."
    };
  }
  return { refused: false };
}

export function initAirChatWidget() {
  const launcher = document.getElementById("btn-open-airchat") as HTMLButtonElement | null;
  const panel = document.getElementById("airchat-window") as HTMLElement | null;
  const closeBtn = document.getElementById("btn-close-airchat") as HTMLButtonElement | null;
  const form = document.getElementById("airchat-form") as HTMLFormElement | null;
  const input = document.getElementById("airchat-input") as HTMLInputElement | null;
  const sendBtn = document.getElementById("airchat-send") as HTMLButtonElement | null;
  const messagesBox = document.getElementById("airchat-messages") as HTMLElement | null;
  const contextPill = document.getElementById("airchat-context-pill") as HTMLElement | null;
  const chipsContainer = document.getElementById("airchat-quick-chips") as HTMLElement | null;

  if (!launcher || !panel || !form || !input || !sendBtn || !messagesBox) return;

  const history: ChatMessage[] = [];
  let isSending = false;

  function updateContextBadge(aqiValue?: number | null) {
    if (!contextPill) return;
    const city = getSelectedCity();
    const prefs = readLifestylePrefs();
    const commuteLabel = String(prefs.commuteMode || "two_wheeler").replace("_", " ");
    const budgetLabel = prefs.budgetBand || "low";
    const aqiPart = typeof aqiValue === "number" ? ` · AQI ${aqiValue}` : "";
    contextPill.textContent = `${city.label}${aqiPart} · ${commuteLabel} · ${budgetLabel} budget`;
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
        "max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-[#ea580c] text-white text-xs leading-relaxed font-medium shadow-2xs whitespace-pre-wrap break-words";
    } else if (msg.refused) {
      bubble.className =
        "max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs leading-relaxed whitespace-pre-wrap break-words";
    } else {
      bubble.className =
        "max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#f7f9fa] border border-[#e5e5e5] text-[#171717] text-xs leading-relaxed whitespace-pre-wrap break-words";
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

    const textNode = document.createElement("div");
    textNode.textContent = msg.content;
    bubble.appendChild(textNode);
    wrapper.appendChild(bubble);

    if (msg.role === "assistant" && !msg.refused && msg.impactHighlights?.length) {
      const metaRow = document.createElement("div");
      metaRow.className = "flex flex-wrap gap-1.5 max-w-[92%]";
      for (const chipText of msg.impactHighlights.slice(0, 3)) {
        const chip = document.createElement("span");
        chip.className =
          "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]";
        chip.textContent = chipText;
        metaRow.appendChild(chip);
      }
      if (msg.source) {
        const src = document.createElement("span");
        src.className =
          "text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#737373] border border-[#e5e5e5]";
        src.textContent = msg.source === "gemini" ? "Gemini AI" : "Grounded Guide";
        metaRow.appendChild(src);
      }
      wrapper.appendChild(metaRow);
    }

    messagesBox!.appendChild(wrapper);
    messagesBox!.scrollTop = messagesBox!.scrollHeight;
  }

  function showTypingIndicator(): HTMLElement {
    const row = document.createElement("div");
    row.className = "flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#f7f9fa] border border-[#e5e5e5] w-fit text-[11px] font-mono text-[#737373]";
    row.textContent = "Checking live AQI & grounding answer...";
    messagesBox!.appendChild(row);
    messagesBox!.scrollTop = messagesBox!.scrollHeight;
    return row;
  }

  async function sendMessage(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    isSending = true;
    sendBtn!.disabled = true;
    input!.value = "";

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    appendMessageBubble(userMsg);
    const typingEl = showTypingIndicator();

    const city = getSelectedCity();
    const prefs = readLifestylePrefs();
    const lang = getPreferredLang();

    try {
      const payload = {
        message: trimmed,
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

      const res = await apiFetchJson<any>(
        "/v1/chat",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        9000
      );

      typingEl.remove();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.reply,
        refused: Boolean(res.refused),
        refusalReason: res.refusalReason,
        source: res.source,
        impactHighlights: res.impactHighlights
      };

      if (!assistantMsg.refused) {
        history.push(userMsg, assistantMsg);
      }
      if (typeof res.airSummary?.aqi === "number") {
        updateContextBadge(res.airSummary.aqi);
      }
      appendMessageBubble(assistantMsg);
    } catch {
      typingEl.remove();
      const offlineGuard = evaluateOfflineClientGuard(trimmed);
      if (offlineGuard.refused) {
        appendMessageBubble({
          role: "assistant",
          content: offlineGuard.reply!,
          refused: true,
          refusalReason: offlineGuard.reason,
          source: "guard"
        });
      } else {
        const liveAir = await fetchResilientAir(city.lat, city.lng);
        const snap = liveAir.snapshot;
        updateContextBadge(snap?.indexValue);
        const fallbackMsg: ChatMessage = {
          role: "assistant",
          content: `Live for ${city.label}: AQI ${snap?.indexValue ?? "--"} (${snap?.category ?? "Moderate"}), PM2.5 ${snap?.pm25 ?? "--"} µg/m³. For ${prefs.commuteMode || "two_wheeler"} commutes and ${prefs.budgetBand || "low"} budget: shift walks to 13:00–15:30, run kitchen exhaust while cooking (-75% indoor smoke), and switch to Metro/carpool + N95 to cut daily inhaled PM2.5 by ~40% while reducing carbon emissions.`,
          source: "fallback",
          impactHighlights: [`AQI ${snap?.indexValue ?? "--"}`, "Shift Walk 13:00–15:30", "~40% PM2.5 Reduction"]
        };
        history.push(userMsg, fallbackMsg);
        appendMessageBubble(fallbackMsg);
      }
    } finally {
      isSending = false;
      sendBtn!.disabled = false;
      input!.focus();
    }
  }

  function openPanel() {
    panel!.classList.remove("hidden");
    launcher!.setAttribute("aria-expanded", "true");
    updateContextBadge();
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  chipsContainer?.querySelectorAll<HTMLButtonElement>("[data-chat-prompt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.getAttribute("data-chat-prompt") || "";
      if (prompt) sendMessage(prompt);
    });
  });

  window.addEventListener("airdelta:citychange", () => updateContextBadge());
  window.addEventListener("airdelta:prefschange", () => updateContextBadge());
  updateContextBadge();
}
