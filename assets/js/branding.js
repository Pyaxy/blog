(() => {
  const icons = {{ . | jsonify | safeJS }};
  const root = document.documentElement;

  const syncIcons = () => {
    const theme = root.dataset.theme === "dark" ? "dark" : "light";
    const variant = icons[theme];
    document.querySelectorAll('link[rel="icon"]').forEach((link) => {
      const size = link.getAttribute("sizes");
      const key = size === "16x16" ? "png16" : size === "32x32" ? "png32" : "svg";
      link.href = variant[key];
      if (key === "svg") link.type = "image/svg+xml";
    });
  };

  syncIcons();
  new MutationObserver(syncIcons).observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
})();
