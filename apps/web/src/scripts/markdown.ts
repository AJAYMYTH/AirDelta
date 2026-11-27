/**
 * XSS-safe DOM Markdown renderer for AI assistant responses.
 * Builds structured DOM elements directly (no raw HTML injection via innerHTML).
 */

function appendInlineMarkdown(parent: HTMLElement, text: string): void {
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parent.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
    }
    const token = match[0];
    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      const strong = document.createElement("strong");
      strong.className = "font-bold text-[#171717]";
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.className = "font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-[#e5e5e5] text-[#c2410c]";
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const em = document.createElement("em");
      em.className = "italic";
      em.textContent = token.slice(1, -1);
      parent.appendChild(em);
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIdx)));
  }
}

export function renderSafeMarkdown(container: HTMLElement, markdownText: string): void {
  container.replaceChildren();
  container.classList.add("space-y-2");

  const lines = (markdownText || "").replace(/\r\n/g, "\n").split("\n");
  let activeList: HTMLUListElement | HTMLOListElement | null = null;
  let activeListType: "ul" | "ol" | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const p = document.createElement("p");
    p.className = "leading-relaxed";
    paragraphLines.forEach((line, idx) => {
      if (idx > 0) p.appendChild(document.createElement("br"));
      appendInlineMarkdown(p, line);
    });
    container.appendChild(p);
    paragraphLines = [];
  };

  const flushList = () => {
    if (activeList) {
      container.appendChild(activeList);
      activeList = null;
      activeListType = null;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const heading = document.createElement("div");
      heading.className =
        level === 1
          ? "text-sm font-extrabold text-[#171717] pt-1"
          : "text-xs font-extrabold text-[#ea580c] pt-1";
      appendInlineMarkdown(heading, headingMatch[2]);
      container.appendChild(heading);
      continue;
    }

    const ulMatch = trimmed.match(/^(?:[-*•])\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (activeListType !== "ul") {
        flushList();
        activeList = document.createElement("ul");
        activeList.className = "list-disc pl-4 space-y-1";
        activeListType = "ul";
      }
      const li = document.createElement("li");
      li.className = "leading-relaxed";
      appendInlineMarkdown(li, ulMatch[1]);
      activeList!.appendChild(li);
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (activeListType !== "ol") {
        flushList();
        activeList = document.createElement("ol");
        activeList.className = "list-decimal pl-4 space-y-1";
        activeListType = "ol";
      }
      const li = document.createElement("li");
      li.className = "leading-relaxed";
      appendInlineMarkdown(li, olMatch[1]);
      activeList!.appendChild(li);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
}
