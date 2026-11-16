(() => {
  function init() {
    const article = document.querySelector(".post-single:not(.friends-page)");
    const content = article?.querySelector(".post-content");
    if (!article || !content) return;

    const isZh = document.documentElement.lang?.toLowerCase().startsWith("zh");

    let headings = Array.from(content.querySelectorAll("h1[id], h2[id], h3[id], h4[id]"));
    let distinctTags = Array.from(
      new Set(headings.map((h) => Number(h.tagName.slice(1))))
    ).sort((a, b) => a - b);
    if (headings.length > 28 && distinctTags.length > 2) {
      const deepestTag = distinctTags[distinctTags.length - 1];
      headings = headings.filter((h) => Number(h.tagName.slice(1)) !== deepestTag);
      distinctTags = Array.from(
        new Set(headings.map((h) => Number(h.tagName.slice(1))))
      ).sort((a, b) => a - b);
    }

    const isHeadingMode = headings.length >= 2;
    let items = [];

    if (isHeadingMode) {
      // Mode A: Heading mode (TOC)
      items = headings.map((heading) => {
        const clone = heading.cloneNode(true);
        clone.querySelectorAll(".anchor").forEach((a) => a.remove());
        const cleanText = (clone.textContent || "").replace(/\s+/g, " ").trim();
        const isTruncated = cleanText.length > 38;
        const label = isTruncated
          ? cleanText.slice(0, 37) + "…"
          : cleanText || heading.id || "Section";
        const tagNumber = Number(heading.tagName.slice(1));
        const depth = Math.min(2, Math.max(0, distinctTags.indexOf(tagNumber)));
        const baseWidth = depth === 0 ? 14 : depth === 1 ? 10 : 7;

        return {
          el: heading,
          id: heading.id,
          level: tagNumber,
          depth,
          baseWidth,
          label,
          fullText: isTruncated ? cleanText : "",
          isGeneratedId: false,
        };
      });
    } else {
      // Mode B: Paragraph-group fallback
      const blocks = Array.from(content.children).filter(
        (el) => !el.matches("script, style, .toc")
      );
      if (blocks.length < 3) {
        return;
      }

      const blockLengths = blocks.map((el) =>
        Math.max(20, (el.textContent || "").trim().length)
      );
      const totalChars = blockLengths.reduce((sum, n) => sum + n, 0);
      if (totalChars < 600) {
        return;
      }

      const targetGroups =
        blocks.length < 6
          ? blocks.length
          : Math.min(14, Math.max(6, Math.round(blocks.length / 2.5)));

      const chunk = totalChars / targetGroups;

      const groups = [];
      let currentGroupBlocks = [];
      let currentGroupChars = 0;

      for (let i = 0; i < blocks.length; i++) {
        currentGroupBlocks.push(blocks[i]);
        currentGroupChars += blockLengths[i];

        const remainingBlocks = blocks.length - 1 - i;
        const groupsRemainingToForm = targetGroups - groups.length - 1;

        if (
          groupsRemainingToForm > 0 &&
          (currentGroupChars >= chunk * 0.85 || remainingBlocks <= groupsRemainingToForm)
        ) {
          groups.push({
            blocks: currentGroupBlocks,
            chars: currentGroupChars,
          });
          currentGroupBlocks = [];
          currentGroupChars = 0;
        }
      }
      if (currentGroupBlocks.length > 0) {
        groups.push({
          blocks: currentGroupBlocks,
          chars: currentGroupChars,
        });
      }

      const minChars = Math.min(...groups.map((g) => g.chars));
      const maxChars = Math.max(...groups.map((g) => g.chars));

      items = groups.map((g, idx) => {
        const el = g.blocks[0];
        let isGeneratedId = false;
        let id = el.id;
        if (!id) {
          id = "rail-sec-" + (idx + 1);
          el.id = id;
          isGeneratedId = true;
        }

        const level = 2;
        const depth = 0;
        const baseWidth =
          minChars === maxChars
            ? 11
            : Math.round(
                (8 + ((g.chars - minChars) / (maxChars - minChars)) * (14 - 8)) * 10
              ) / 10;

        let raw = "";
        for (const b of g.blocks) {
          const text = (b.textContent || "").replace(/\s+/g, " ").trim();
          if (text) {
            raw = text;
            break;
          }
        }
        const isCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(raw);
        const limit = isCJK ? 14 : 22;
        const label =
          raw.length > limit ? raw.slice(0, limit) + "…" : (raw || `Section ${idx + 1}`);

        return {
          el,
          id,
          level,
          depth,
          chars: g.chars,
          baseWidth,
          label,
          fullText: "",
          isGeneratedId,
        };
      });
    }

    if (items.length === 0) return;

    // DOM construction
    const nav = document.createElement("nav");
    nav.className = "reading-rail";
    nav.dataset.mode = isHeadingMode ? "toc" : "essay";
    nav.setAttribute("aria-label", isZh ? "阅读进度" : "Reading progress");

    const ol = document.createElement("ol");
    ol.className = "reading-rail-list";
    nav.appendChild(ol);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const li = document.createElement("li");
      li.className = "reading-rail-item";
      li.dataset.level = String(item.level);
      li.dataset.depth = String(item.depth ?? 0);

      const a = document.createElement("a");
      a.className = "reading-rail-link";
      a.href = `#${encodeURIComponent(item.id)}`;
      a.setAttribute("aria-label", item.label);
      if (item.fullText) {
        a.title = item.fullText;
      }
      a.style.setProperty("--rail-base", `${item.baseWidth}px`);
      a.style.setProperty("--rail-p", "0");

      const labelSpan = document.createElement("span");
      labelSpan.className = "reading-rail-label";
      labelSpan.setAttribute("aria-hidden", "true");
      labelSpan.textContent = item.label;

      const tickSpan = document.createElement("span");
      tickSpan.className = "reading-rail-tick";
      tickSpan.setAttribute("aria-hidden", "true");

      a.appendChild(labelSpan);
      a.appendChild(tickSpan);

      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const headerEl = document.querySelector("body > .header");
        const offset =
          headerEl && headerEl.dataset.state === "pinned"
            ? (headerEl.offsetHeight || 60) + 20
            : 36;
        const top = item.el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduced ? "auto" : "smooth",
        });
        if (item.el.tabIndex < 0 && !item.el.hasAttribute("tabindex")) {
          item.el.setAttribute("tabindex", "-1");
        }
        item.el.focus({ preventScroll: true });
        if (!item.isGeneratedId && history.replaceState) {
          history.replaceState(null, "", "#" + item.id);
        }
      });

      li.appendChild(a);
      ol.appendChild(li);

      item.li = li;
      item.link = a;
    }

    document.body.appendChild(nav);

    let offsets = [];
    let contentTop = 0;
    let contentBottom = 0;
    let titleBottom = 0;

    function measure() {
      const scrollY = window.scrollY;
      const postHeader = article.querySelector(".post-header");
      titleBottom = postHeader
        ? postHeader.getBoundingClientRect().bottom + scrollY
        : content.getBoundingClientRect().top + scrollY;
      const cRect = content.getBoundingClientRect();
      contentTop = cRect.top + scrollY;
      contentBottom = cRect.bottom + scrollY;
      offsets = items.map((it) => it.el.getBoundingClientRect().top + scrollY);
    }

    function update() {
      const scrollY = Math.max(0, window.scrollY);
      const vh = window.innerHeight;
      const longEnough = isHeadingMode || contentBottom - contentTop >= vh * 1.35;
      const visible =
        longEnough &&
        (scrollY < contentBottom - vh * 0.2 || nav.matches(":focus-within"));
      nav.classList.toggle("is-visible", visible);

      const anchor = scrollY + vh * 0.32;
      const isAtBottom =
        window.innerHeight + scrollY >= document.documentElement.scrollHeight - 8;

      let activeIdx = -1;
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (offsets[i] <= anchor) {
          activeIdx = i;
          break;
        }
      }

      if (activeIdx === -1 && items.length > 0) {
        activeIdx = 0;
      }

      if (isAtBottom && items.length > 0) {
        activeIdx = items.length - 1;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const start = offsets[i];
        const end = i + 1 < offsets.length ? offsets[i + 1] : contentBottom;
        const span = Math.max(1, end - start);

        if (i < activeIdx || (isAtBottom && i < items.length - 1)) {
          item.li.dataset.state = "past";
          item.link.style.setProperty("--rail-p", "1");
          item.link.removeAttribute("aria-current");
        } else if (i === activeIdx) {
          item.li.dataset.state = "active";
          let p = Math.min(1, Math.max(0, (anchor - start) / span));
          if (isAtBottom && i === items.length - 1) {
            p = 1;
          }
          item.link.style.setProperty("--rail-p", p.toFixed(3));
          item.link.setAttribute("aria-current", "location");
        } else {
          item.li.dataset.state = "upcoming";
          item.link.style.setProperty("--rail-p", "0");
          item.link.removeAttribute("aria-current");
        }
      }
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        measure();
        update();
      },
      { passive: true }
    );

    nav.addEventListener("focusin", update);
    nav.addEventListener("focusout", (e) => {
      if (!nav.contains(e.relatedTarget)) {
        update();
      }
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        measure();
        update();
      });
      ro.observe(content);
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measure();
        update();
      });
    }

    window.addEventListener(
      "load",
      () => {
        measure();
        update();
      },
      { once: true }
    );

    measure();
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
