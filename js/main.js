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
  var ledImage = demo ? demo.parentElement.querySelector("[data-led-image]") : null;
  var currentImage = "img/buro-producto-calido.webp";

  function setGlow(level) {
    STAGES.forEach(function (stage) {
      stage.style.setProperty("--led-glow", level);
      stage.style.setProperty("--led-brightness", String(0.78 + Number(level) * 0.22));
      stage.classList.add("is-lit");
    });
  }

  function setLedImage(src) {
    if (!ledImage || !src || src === currentImage) return;
    ledImage.classList.add("is-changing");
    window.setTimeout(function () {
      ledImage.src = src;
      currentImage = src;
      ledImage.classList.remove("is-changing");
    }, reduce ? 0 : 160);
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
        setLedImage(btn.getAttribute("data-led-image"));
        demo.querySelectorAll("[data-led-color]").forEach(function (b) { b.classList.remove("is-active"); });
        demo.querySelectorAll("[data-led-color]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      });
    });
    demo.querySelectorAll("[data-led-level]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setGlow(btn.getAttribute("data-led-level"));
        demo.querySelectorAll("[data-led-level]").forEach(function (b) { b.classList.remove("is-active"); });
        demo.querySelectorAll("[data-led-level]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      });
    });
  }

  /* --------------------------------------------------------- visor de imágenes */
  var dialog = document.querySelector("[data-lightbox-dialog]");
  if (dialog) {
    var dialogImage = dialog.querySelector("[data-lightbox-image]");
    var dialogCaption = dialog.querySelector("[data-lightbox-caption]");
    var closeDialog = function () { if (dialog.open) dialog.close(); };
    document.querySelectorAll("[data-lightbox]").forEach(function (image) {
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.setAttribute("aria-label", "Abrir imagen ampliada");
      var open = function () {
        var source = image.getAttribute("data-lightbox-src") || image.currentSrc || image.src;
        dialogImage.src = source;
        dialogImage.alt = image.getAttribute("data-lightbox-alt") || image.alt || "Vista ampliada del buró Lumina";
        dialogCaption.textContent = dialogImage.alt;
        if (typeof dialog.showModal === "function") dialog.showModal();
      };
      image.addEventListener("click", open);
      image.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      });
    });
    dialog.querySelector("[data-lightbox-close]").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (event) { if (event.target === dialog) closeDialog(); });
    dialog.addEventListener("close", function () { dialogImage.src = "img/buro-general.webp"; });
  }

  /* ------------------------------------------------- datos de contacto */
  /* Llena estos datos y todos los links del pie se activan solos:
     mapa, teléfono (tel:), sucursal y correo (mailto:). */
  var CONTACTO = {
    domicilio: "",            /* p. ej. "Av. Reforma 222, Ciudad de México" */
    mapsQuery: "Lumina Buró, México",  /* se usa mientras no haya domicilio */
    telefono: "",             /* p. ej. "+52 55 1234 5678" */
    sucursal: "",             /* p. ej. "Sucursal Polanco, CDMX" */
    email: "",                /* p. ej. "hola@luminaburo.mx" */
    whatsapp: "",             /* solo números, p. ej. "5215512345678" */
    instagram: ""             /* p. ej. "https://instagram.com/luminaburo" */
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

  /* ---------------------------------------------------- accesos de venta */
  (function wireSalesLinks() {
    var message = "Hola, quiero cotizar un buró Lumina.";
    var whatsappHref = CONTACTO.whatsapp
      ? "https://wa.me/" + CONTACTO.whatsapp.replace(/[^\d]/g, "") + "?text=" + encodeURIComponent(message)
      : "#contacto";
    var instagramHref = CONTACTO.instagram || "#contacto";

    document.querySelectorAll(".js-whatsapp").forEach(function (link) {
      link.href = whatsappHref;
      if (CONTACTO.whatsapp) { link.target = "_blank"; link.rel = "noopener"; }
      else link.setAttribute("aria-label", link.textContent.trim() + ". Agrega el número de WhatsApp en js/main.js.");
    });
    document.querySelectorAll(".js-instagram").forEach(function (link) {
      link.href = instagramHref;
      if (CONTACTO.instagram) { link.target = "_blank"; link.rel = "noopener"; }
      else link.setAttribute("aria-label", link.textContent.trim() + ". Agrega el enlace de Instagram en js/main.js.");
    });
  })();

  /* ---------------------------------------------------------------- año */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
