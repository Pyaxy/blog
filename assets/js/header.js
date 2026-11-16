(() => {
  function init() {
    const root = document.documentElement;
    const header = document.querySelector("body > .header");
    if (!header) return;

    root.classList.add("js-smart-header");
    header.dataset.state = "top";

    let lastY = Math.max(0, window.scrollY);
    let accumDelta = 0;
    let lastDir = 0; // -1 up, 1 down
    let ticking = false;
    let hasFocus = false;
    let suppressUntil = 0;

    function update() {
      const y = Math.max(0, window.scrollY);
      const headerHeight = header.offsetHeight || 60;
      const dy = y - lastY;
      lastY = y;

      if (y <= headerHeight * 0.6) {
        accumDelta = 0;
        lastDir = 0;
        header.dataset.state = "top";
        return;
      }

      if (hasFocus) {
        accumDelta = 0;
        header.dataset.state = "pinned";
        return;
      }

      if (performance.now() < suppressUntil) {
        accumDelta = 0;
        return;
      }

      const dir = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      if (dir !== 0) {
        if (dir !== lastDir) {
          accumDelta = dy;
          lastDir = dir;
        } else {
          accumDelta += dy;
        }
      }

      if (accumDelta > 8 && y > headerHeight * 1.2) {
        header.dataset.state = "hidden";
      } else if (accumDelta < -8) {
        header.dataset.state = "pinned";
      }
    }

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

    header.addEventListener("focusin", () => {
      hasFocus = true;
      if (window.scrollY > (header.offsetHeight || 60) * 0.6) {
        header.dataset.state = "pinned";
      }
    });

    header.addEventListener("focusout", (e) => {
      if (!header.contains(e.relatedTarget)) {
        hasFocus = false;
      }
    });

    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (a) {
          suppressUntil = performance.now() + 700;
        }
      },
      { capture: true }
    );

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
