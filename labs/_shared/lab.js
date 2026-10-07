/*
 * Shared behaviour for every *.adelia.cc experiment:
 * - theme: ?theme=dark|light, then the stored choice, then the OS (same keys as adelia.cc)
 * - the top bar: back link to the Lab, title, theme toggle
 * - window.lab helpers: reducedMotion, isTouch, onThemeChange
 *
 * Include it as a classic script in <head> (before paint) with data-title="Experiment name":
 *   <script src="./_shared/lab.js" data-title="Bloom"></script>
 */
(function () {
  var root = document.documentElement;
  var script = document.currentScript;
  var params = new URLSearchParams(location.search);
  var stored = null;
  try {
    stored = localStorage.getItem("theme");
  } catch (e) {}
  var theme = params.get("theme") || stored;
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.setAttribute("data-theme", theme);

  var listeners = [];
  var reduced = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  window.lab = {
    get theme() {
      return root.getAttribute("data-theme");
    },
    get reducedMotion() {
      return reduced.matches;
    },
    isTouch: window.matchMedia ? matchMedia("(pointer: coarse)").matches : false,
    onThemeChange: function (fn) {
      listeners.push(fn);
    },
    /** Reads a CSS custom property from the tokens, e.g. lab.token("--accent"). */
    token: function (name) {
      return getComputedStyle(root).getPropertyValue(name).trim();
    },
    setTheme: function (next) {
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      listeners.forEach(function (fn) {
        fn(next);
      });
    },
  };

  var title = (script && script.getAttribute("data-title")) || document.title;
  var onMain = /(^|\.)adelia\.cc$/.test(location.hostname) && location.hostname !== "adelia.cc" && location.hostname !== "www.adelia.cc";
  var backHref = onMain ? "https://adelia.cc/lab" : "/lab";

  function mountBar() {
    if (document.querySelector(".lab-bar")) return;
    var bar = document.createElement("header");
    bar.className = "lab-bar";
    bar.innerHTML =
      '<a class="lab-bar__back" href="' +
      backHref +
      '"><span class="lab-bar__mark" aria-hidden="true">a</span><span>Lab</span><span class="sr-only"> — back to adelia.cc</span></a>' +
      '<span class="lab-bar__title"></span>' +
      '<button type="button" class="lab-btn lab-btn--icon lab-btn--theme" data-variant="ghost" aria-label="Dark theme" aria-pressed="false">' +
      '<svg class="lab-theme-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>' +
      '<svg class="lab-theme-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>' +
      "</button>";
    bar.querySelector(".lab-bar__title").textContent = title;
    var toggle = bar.querySelector(".lab-bar__theme, .lab-btn--theme");
    function sync() {
      toggle.setAttribute("aria-pressed", String(window.lab.theme === "dark"));
    }
    toggle.addEventListener("click", function () {
      window.lab.setTheme(window.lab.theme === "dark" ? "light" : "dark");
      sync();
    });
    sync();
    document.body.prepend(bar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBar);
  else mountBar();
})();
