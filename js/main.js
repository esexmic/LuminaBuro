/* Lumina Buró — interacciones. Sin listeners de scroll; solo IntersectionObserver. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------ estado del nav */
  var nav = document.querySelector("[data-nav]");
  if (nav) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;height:1px;width:1px;";
    document.body.appendChild(sentinel);
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ---------------------------------------------------------- menú móvil */
  var toggle = document.querySelector("[data-menu-toggle]");
  var panel = document.querySelector("[data-menu-panel]");
  if (toggle && panel) {
    var close = function () {
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    };
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ------------------------------------------------------ revelar al ver */
  var revealables = document.querySelectorAll("[data-reveal]");
  if (reduce) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.setProperty("--reveal-delay", (el.getAttribute("data-reveal-delay") || "0") + "ms");
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (el) { ro.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------- demo de luz (LED) */
  var STAGES = document.querySelectorAll("[data-led-stage]");
  var demo = document.querySelector("[data-led-demo]");

  function setLed(color) {
    document.documentElement.style.setProperty("--led", color);
  }
  function setGlow(level) {
    STAGES.forEach(function (stage) {
      stage.style.setProperty("--led-glow", level);
      stage.classList.add("is-lit");
    });
  }

  // Encendido inicial (tono cálido, intensidad media)
  if (demo) {
    setLed("#e6913f");
    setGlow(0.72);
  }

  if (demo) {
    demo.querySelectorAll("[data-led-color]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLed(btn.getAttribute("data-led-value"));
        demo.querySelectorAll("[data-led-color]").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
      });
    });
    demo.querySelectorAll("[data-led-level]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setGlow(btn.getAttribute("data-led-level"));
        demo.querySelectorAll("[data-led-level]").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
      });
    });
  }

  /* ------------------------------------------------- datos de contacto */
  /* Llena estos datos y todos los links del pie se activan solos:
     mapa, teléfono (tel:), sucursal y correo (mailto:). */
  var CONTACTO = {
    domicilio: "",            /* p. ej. "Av. Reforma 222, Ciudad de México" */
    mapsQuery: "Lumina Buró, México",  /* se usa mientras no haya domicilio */
    telefono: "",             /* p. ej. "+52 55 1234 5678" */
    sucursal: "",             /* p. ej. "Sucursal Polanco, CDMX" */
    email: ""                 /* p. ej. "hola@luminaburo.mx" */
  };

  (function wireContact() {
    var maps = function (q) {
      return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    };
    var data = {
      maps: function () {
        return CONTACTO.domicilio
          ? { href: maps(CONTACTO.domicilio), text: CONTACTO.domicilio, external: true }
          : { href: maps(CONTACTO.mapsQuery), text: "Ver en el mapa", external: true };
      },
      telefono: function () {
        if (!CONTACTO.telefono) return null;
        return { href: "tel:" + CONTACTO.telefono.replace(/[^\d+]/g, ""), text: CONTACTO.telefono };
      },
      sucursal: function () {
        if (!CONTACTO.sucursal) return null;
        return { href: maps(CONTACTO.sucursal), text: CONTACTO.sucursal, external: true };
      },
      email: function () {
        if (!CONTACTO.email) return null;
        return { href: "mailto:" + CONTACTO.email, text: CONTACTO.email };
      }
    };

    document.querySelectorAll("[data-contact]").forEach(function (el) {
      var kind = el.getAttribute("data-contact");
      var build = data[kind];
      if (!build) return;
      var info = build();

      if (!info) {
        /* Sin dato todavía: se muestra inactivo, sin link. */
        el.classList.add("is-disabled");
        el.removeAttribute("href");
        return;
      }

      el.href = info.href;
      el.querySelector("[data-value]").textContent = info.text;
      if (info.external) {
        el.target = "_blank";
        el.rel = "noopener";
        el.classList.add("pending--external");
      }
      if (kind === "email") el.hidden = false;
    });
  })();

  /* ---------------------------------------------------------------- año */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
