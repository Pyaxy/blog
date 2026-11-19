(() => {
  const INITIAL_DELAY_MS = 180;
  const CHAR_FADE_MS = 75;
  const CJK_STEP_MS = 50;
  const LATIN_STEP_MS = 36;
  const MIN_TOTAL_MS = 300;
  const MAX_TOTAL_MS = 1800;
  const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

  function clearFallback() {
    if (typeof window.__homeTypingFallback === "number") {
      window.clearTimeout(window.__homeTypingFallback);
      delete window.__homeTypingFallback;
    }
  }

  function segmentGraphemes(text, lang) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(lang || undefined, {
        granularity: "grapheme",
      });
      return Array.from(segmenter.segment(text), (part) => part.segment);
    }
    return Array.from(text);
  }

  function buildCharNodes(sourceNode, lang, chars) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      const graphemes = segmentGraphemes(sourceNode.textContent || "", lang);
      let whitespaceBuffer = "";

      for (const ch of graphemes) {
        if (/^\s+$/.test(ch)) {
          whitespaceBuffer += ch;
          continue;
        }
        if (whitespaceBuffer) {
          frag.appendChild(document.createTextNode(whitespaceBuffer));
          whitespaceBuffer = "";
        }
        const span = document.createElement("span");
        span.className = "home-typing-char";
        span.textContent = ch;
        frag.appendChild(span);
        chars.push(span);
      }

      if (whitespaceBuffer) {
        frag.appendChild(document.createTextNode(whitespaceBuffer));
      }
      return frag;
    }

    if (sourceNode.nodeType === Node.ELEMENT_NODE) {
      const clone = sourceNode.cloneNode(false);
      for (const child of sourceNode.childNodes) {
        clone.appendChild(buildCharNodes(child, lang, chars));
      }
      return clone;
    }

    return sourceNode.cloneNode(true);
  }

  function computeStepMs(plainText, charCount) {
    const baseStep = CJK_PATTERN.test(plainText) ? CJK_STEP_MS : LATIN_STEP_MS;
    if (charCount <= 1) return baseStep;
    const rawTotal = baseStep * charCount;
    const clampedTotal = Math.min(MAX_TOTAL_MS, Math.max(MIN_TOTAL_MS, rawTotal));
    return clampedTotal / charCount;
  }

  function init() {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    clearFallback();

    const target = document.querySelector(".home-info .entry-content p:last-child");
    if (!target || reducedMotion.matches) {
      root.classList.remove("js-home-typing");
      return;
    }

    const plainText = (target.textContent || "").trim();
    if (!plainText) {
      root.classList.remove("js-home-typing");
      return;
    }

    const lang = document.documentElement.lang || "";
    const originalNodes = Array.from(target.childNodes).map((node) =>
      node.cloneNode(true)
    );
    const hadAriaLabel = target.hasAttribute("aria-label");

    const chars = [];
    const visual = document.createElement("span");
    visual.className = "home-typing-visual";
    visual.setAttribute("aria-hidden", "true");
    for (const node of originalNodes) {
      visual.appendChild(buildCharNodes(node, lang, chars));
    }

    if (chars.length === 0) {
      root.classList.remove("js-home-typing");
      return;
    }

    const probeCaret = document.createElement("span");
    probeCaret.className =
      "home-typing-caret home-typing-caret--inline home-typing-caret--probe";
    probeCaret.setAttribute("aria-hidden", "true");

    const activeCaret = document.createElement("span");
    activeCaret.className = "home-typing-caret home-typing-caret--active";
    activeCaret.setAttribute("aria-hidden", "true");

    target.classList.add("home-typing-target", "is-home-typing");
    if (!hadAriaLabel) {
      target.setAttribute("aria-label", plainText);
    }
    target.replaceChildren(visual, probeCaret, activeCaret);

    let revealedCount = 0;
    let rafId = 0;
    let finished = false;
    const stepMs = computeStepMs(plainText, chars.length);

    function positionCaret() {
      if (finished) return;
      const pRect = target.getBoundingClientRect();
      const probeRect = probeCaret.getBoundingClientRect();
      const lastRect = chars[chars.length - 1].getBoundingClientRect();
      const computedProbe = window.getComputedStyle(probeCaret);
      const caretGap =
        parseFloat(computedProbe.marginInlineStart) ||
        parseFloat(window.getComputedStyle(target).fontSize) * 0.3;
      const caretHeight =
        probeRect.height || parseFloat(window.getComputedStyle(target).fontSize);

      const sameLineAsLast =
        Math.abs(probeRect.top - lastRect.top) <
        Math.max(lastRect.height, caretHeight) * 0.6;
      const caretOffsetY = sameLineAsLast
        ? probeRect.top - lastRect.top
        : (lastRect.height - caretHeight) * 0.5 + caretHeight * 0.12;

      let x;
      let y;
      if (revealedCount <= 0) {
        const firstRect = chars[0].getBoundingClientRect();
        x = firstRect.left - pRect.left;
        y = firstRect.top - pRect.top + caretOffsetY;
      } else if (revealedCount >= chars.length) {
        x = probeRect.left - pRect.left;
        y = probeRect.top - pRect.top;
      } else {
        const currentRect = chars[revealedCount - 1].getBoundingClientRect();
        x = currentRect.right - pRect.left + caretGap;
        y = currentRect.top - pRect.top + caretOffsetY;
      }

      activeCaret.style.setProperty("--caret-x", `${x.toFixed(2)}px`);
      activeCaret.style.setProperty("--caret-y", `${y.toFixed(2)}px`);
    }

    function finish(skipSettle) {
      if (finished) return;
      finished = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener("resize", positionCaret);
      reducedMotion.removeEventListener("change", onReducedMotionChange);

      const finalCaret = document.createElement("span");
      finalCaret.className = skipSettle
        ? "home-typing-caret home-typing-caret--inline"
        : "home-typing-caret home-typing-caret--inline is-settling";
      finalCaret.setAttribute("aria-hidden", "true");

      const restored = document.createDocumentFragment();
      for (const node of originalNodes) {
        restored.appendChild(node.cloneNode(true));
      }
      restored.appendChild(finalCaret);

      target.replaceChildren(restored);
      target.classList.remove("is-home-typing");
      target.classList.add("has-home-caret");
      if (!hadAriaLabel) {
        target.removeAttribute("aria-label");
      }
      root.classList.remove("js-home-typing");
    }

    function onReducedMotionChange(event) {
      if (event.matches) {
        finish(true);
      }
    }

    positionCaret();
    target.dataset.typingReady = "true";
    root.classList.remove("js-home-typing");

    window.addEventListener("resize", positionCaret, { passive: true });
    reducedMotion.addEventListener("change", onReducedMotionChange);
    if (document.fonts?.ready) {
      document.fonts.ready.then(positionCaret);
    }

    const startTime = performance.now();
    let finishAt = 0;

    function tick(now) {
      if (finished) return;
      const elapsed = now - startTime - INITIAL_DELAY_MS;
      if (elapsed >= 0) {
        const nextCount = Math.min(
          chars.length,
          Math.floor(elapsed / stepMs) + 1
        );
        if (nextCount > revealedCount) {
          for (let i = revealedCount; i < nextCount; i++) {
            chars[i].classList.add("is-revealed");
          }
          revealedCount = nextCount;
          positionCaret();
          if (revealedCount >= chars.length && finishAt === 0) {
            finishAt = now + CHAR_FADE_MS;
          }
        }
        if (finishAt > 0 && now >= finishAt) {
          finish(false);
          return;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
