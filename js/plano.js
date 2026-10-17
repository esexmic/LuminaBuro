/* Lumina Buró — plano isométrico del buró y visor de armado paso a paso.
   Dibuja la caja partiendo de un modelo de piezas (cuboides en cm), las ordena
   con un algoritmo del pintor por capas y las va montando según el paso activo. */
(function () {
  "use strict";

  var svg = document.querySelector("[data-plano]");
  if (!svg) return;

  var NS = "http://www.w3.org/2000/svg";
  var K = Math.cos(Math.PI / 6); /* 0.866 — factor isométrico */

  /* ------------------------------------------------------- modelo (en cm) */
  var W = 40, D = 40, H = 52;      /* ancho, fondo, alto */
  var T = 1.5;                     /* espesor de panel (madera) */
  var MIR = 0.8;                   /* espesor del espejo */
  var GL = 0.8;                    /* espesor del cristal */

  /* Piezas: capa = orden de dibujo (mayor = más cerca de la cámara).
     cube = [x0, y0, z0, x1, y1, z1]. */
  var PARTS = [
    { id: "bottom",    layer: 1, color: "#7c5a38", cube: [0, 0, 0, W, D, T] },
    { id: "wallFarX",  layer: 2, color: "#6d4f2f", cube: [0, 0, 0, T, D, H] },
    { id: "wallFarY",  layer: 2, color: "#6d4f2f", cube: [0, 0, 0, W, T, H] },
    { id: "mirror",    layer: 3, color: "#8fa8b6", kind: "mirror", cube: [T, T, T, T + MIR, D - T, H - T] },
    { id: "led",       layer: 3, color: "#e0a458", kind: "led",    cube: [4, D - 4, H - 1.6, W - 4, D - 1.5, H - 0.4] },
    { id: "wallNearX", layer: 4, color: "#6d4f2f", cube: [W - T, 0, 0, W, D, H] },
    { id: "wallNearY", layer: 4, color: "#6d4f2f", cube: [0, D - T, 0, W, D, H] },
    { id: "glass",     layer: 5, color: "#c8e2ec", kind: "glass",  cube: [0, 0, H, W, D, H + GL] }
  ];

  /* ------------------------------------------------------- proyección 2D */
  var XL = -D * K, XR = W * K, YT = -H, YB = 0.5 * (W + D);
  var ML = 18, MR = 14, MT = 12, MB = 22;
  var ox = -XL + ML;
  var oy = -YT + MT;
  var vbW = (XR - XL) + ML + MR;
  var vbH = (YB - YT) + MT + MB;

  svg.setAttribute("viewBox", "0 0 " + vbW.toFixed(2) + " " + vbH.toFixed(2));

  function P(x, y, z) {
    return [(x - y) * K + ox, 0.5 * (x + y) - z + oy];
  }
  function points(list) {
    return list.map(function (p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ");
  }
  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }
  function shade(hex, amt) {
    var c = hex.replace("#", "");
    var r = parseInt(c.substr(0, 2), 16);
    var g = parseInt(c.substr(2, 2), 16);
    var b = parseInt(c.substr(4, 2), 16);
    var f = amt < 0 ? 0 : 255;
    var p = Math.abs(amt);
    r = Math.round(r + (f - r) * p);
    g = Math.round(g + (f - g) * p);
    b = Math.round(b + (f - b) * p);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  /* Las tres caras visibles de un cuboide (+x, +y, +z). */
  function facesOf(c) {
    var x0 = c[0], y0 = c[1], z0 = c[2], x1 = c[3], y1 = c[4], z1 = c[5];
    return {
      z: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      x: [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)],
      y: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)]
    };
  }

  /* ------------------------------------------------------------- defs */
  var defs = el("defs");
  var mirrorGrad = el("linearGradient", { id: "pMirror", x1: "0", y1: "0", x2: "0.55", y2: "1" });
  mirrorGrad.appendChild(el("stop", { offset: "0", "stop-color": "#c2d6e0" }));
  mirrorGrad.appendChild(el("stop", { offset: "0.55", "stop-color": "#93acba" }));
  mirrorGrad.appendChild(el("stop", { offset: "1", "stop-color": "#6f8794" }));
  defs.appendChild(mirrorGrad);

  var groundGrad = el("radialGradient", { id: "pGround", cx: "0.5", cy: "0.5", r: "0.5" });
  groundGrad.appendChild(el("stop", { offset: "0", "stop-color": "rgba(0,0,0,0.55)" }));
  groundGrad.appendChild(el("stop", { offset: "1", "stop-color": "rgba(0,0,0,0)" }));
  defs.appendChild(groundGrad);

  svg.appendChild(defs);

  /* --------------------------------------------------- sombra (siempre al fondo) */
  (function shadow() {
    var p = P(W / 2, D / 2, 0);
    svg.appendChild(el("ellipse", {
      cx: p[0].toFixed(2), cy: (p[1] + 3).toFixed(2),
      rx: (K * W + 3).toFixed(2), ry: (K * W * 0.5).toFixed(2),
      fill: "url(#pGround)"
    }));
  })();

  /* --------------------------------------------------------- grupos de piezas */
  var partNodes = {};
  var groups = [];

  PARTS.forEach(function (part) {
    var g = el("g", { "class": "pt pt--" + part.id, "data-part": part.id });
    var center = 0;

    if (part.kind === "mirror") {
      g.setAttribute("fill", "url(#pMirror)");
    }

    if (part.cube) {
      var f = facesOf(part.cube);
      center = (part.cube[0] + part.cube[3]) / 2 + (part.cube[1] + part.cube[4]) / 2 + (part.cube[2] + part.cube[5]) / 2;

      [["z", 0.22], ["x", 0.04], ["y", -0.18]].forEach(function (spec) {
        var key = spec[0];
        var poly = el("polygon", { points: points(f[key]) });

        if (part.kind === "mirror") {
          poly.setAttribute("fill", "url(#pMirror)");
          if (key === "z") poly.setAttribute("opacity", "0.85");
          poly.setAttribute("stroke", "rgba(10,8,5,0.35)");
          poly.setAttribute("stroke-width", "0.18");
        } else if (part.kind === "glass") {
          poly.setAttribute("fill", "rgba(200,226,236,0.10)");
          poly.setAttribute("stroke", "rgba(200,226,236,0.55)");
          poly.setAttribute("stroke-width", "0.26");
          if (key === "z") {
            poly.setAttribute("fill", "rgba(200,226,236,0.14)");
          }
        } else if (part.kind === "led") {
          poly.setAttribute("fill", shade(part.color, key === "z" ? 0.2 : key === "x" ? 0 : -0.15));
          poly.setAttribute("stroke", shade(part.color, -0.3));
          poly.setAttribute("stroke-width", "0.16");
        } else {
          poly.setAttribute("fill", shade(part.color, spec[1]));
          poly.setAttribute("stroke", shade(part.color, -0.42));
          poly.setAttribute("stroke-width", "0.22");
          poly.setAttribute("stroke-linejoin", "round");
        }
        g.appendChild(poly);
      });
    }

    if (part.id === "cable") {
      var a = P(W - 3, D - 6, 3);
      var b = P(W + 3, D - 11, 0);
      var c = P(W + 10, D - 19, -6);
      var cable = el("path", {
        d: "M" + a[0].toFixed(2) + " " + a[1].toFixed(2) +
           " L" + b[0].toFixed(2) + " " + b[1].toFixed(2) +
           " Q" + (b[0] + 3).toFixed(2) + " " + (b[1] + 3).toFixed(2) + " " + c[0].toFixed(2) + " " + c[1].toFixed(2),
        fill: "none",
        stroke: "#3d372e",
        "stroke-width": "1.1",
        "stroke-linecap": "round"
      });
      g.appendChild(cable);
      g.appendChild(el("circle", { cx: c[0].toFixed(2), cy: c[1].toFixed(2), r: "1.1", fill: "#3d372e" }));
      center = 999;
    }

    partNodes[part.id] = g;
    groups.push({ node: g, layer: part.layer, center: center });
  });

  groups.sort(function (a, b) {
    return a.layer - b.layer || a.center - b.center;
  });
  groups.forEach(function (item) { svg.appendChild(item.node); });

  /* ------------------------------------------------------ cotas / medidas */
  var dims = el("g", { "class": "pl-dim", "aria-hidden": "true" });
  (function buildDims() {
    function line(a, b, vertical) {
      dims.appendChild(el("line", {
        x1: a[0].toFixed(2), y1: a[1].toFixed(2), x2: b[0].toFixed(2), y2: b[1].toFixed(2)
      }));
      var t = vertical ? 2.6 : 0.9;
      dims.appendChild(el("line", { x1: (a[0] - (vertical ? 0 : t)).toFixed(2), y1: (a[1] - (vertical ? t : 0)).toFixed(2), x2: (a[0] + (vertical ? 0 : t)).toFixed(2), y2: (a[1] + (vertical ? t : 0)).toFixed(2) }));
      dims.appendChild(el("line", { x1: (b[0] - (vertical ? 0 : t)).toFixed(2), y1: (b[1] - (vertical ? t : 0)).toFixed(2), x2: (b[0] + (vertical ? 0 : t)).toFixed(2), y2: (b[1] + (vertical ? t : 0)).toFixed(2) }));
    }
    function label(p, txt, anchor) {
      var t = el("text", { x: p[0].toFixed(2), y: p[1].toFixed(2), "class": "pl-dim__t", "text-anchor": anchor || "middle" });
      t.textContent = txt;
      dims.appendChild(t);
    }

    /* ancho: borde inferior frontal-izquierdo, separado hacia abajo-izquierda */
    var a = P(0, D, 0), b = P(W, D, 0);
    var da = [a[0] - 6, a[1] + 11], db = [b[0] - 6, b[1] + 11];
    line(da, db, false);
    label([(da[0] + db[0]) / 2, (da[1] + db[1]) / 2 + 4.6], "40 cm");

    /* fondo: borde inferior frontal-derecho, separado hacia abajo-derecha */
    var c = P(W, D, 0), d = P(W, 0, 0);
    var dc = [c[0] + 6, c[1] + 11], dd = [d[0] + 6, d[1] + 11];
    line(dc, dd, false);
    label([(dc[0] + dd[0]) / 2, (dc[1] + dd[1]) / 2 + 4.6], "40 cm");

    /* alto: arista vertical trasera-izquierda, separada hacia la izquierda */
    var e = P(0, D, 0), f = P(0, D, H);
    var de = [e[0] - 12, e[1]], df = [f[0] - 12, f[1]];
    line(de, df, true);
    label([de[0] - 2.4, (de[1] + df[1]) / 2], "52 cm", "end");
  })();
  svg.appendChild(dims);

  /* ------------------------------------------------ visor paso a paso */
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var dotsWrap = document.querySelector("[data-plano-dots]");
  var prevBtn = document.querySelector("[data-plano-prev]");
  var nextBtn = document.querySelector("[data-plano-next]");
  if (!steps.length) return;

  var current = 0;
  var dots = [];

  function partsUpTo(index) {
    var set = {};
    for (var i = 0; i <= index; i++) {
      (steps[i].getAttribute("data-parts") || "").split(",").forEach(function (id) {
        id = id.trim();
        if (id) set[id] = true;
      });
    }
    return set;
  }

  function renderDots() {
    if (!dotsWrap) return;
    steps.forEach(function (step, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "plano__dot";
      dot.setAttribute("aria-label", "Paso " + (i + 1) + ": " + (steps[i].querySelector(".step__title") ? steps[i].querySelector(".step__title").textContent : ""));
      dot.addEventListener("click", function () { go(i); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });
  }

  function go(index) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    var visible = partsUpTo(current);

    for (var id in partNodes) {
      if (Object.prototype.hasOwnProperty.call(partNodes, id)) {
        partNodes[id].classList.toggle("is-on", !!visible[id]);
      }
    }

    steps.forEach(function (step, i) { step.classList.toggle("is-active", i === current); });
    dots.forEach(function (dot, i) {
      var active = i === current;
      dot.classList.toggle("is-active", active);
      if (active) { dot.setAttribute("aria-current", "step"); } else { dot.removeAttribute("aria-current"); }
    });

    svg.classList.toggle("is-final", current >= steps.length - 2);

    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === steps.length - 1;
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { go(current - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(current + 1); });

  svg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { go(current + 1); }
    if (e.key === "ArrowLeft") { go(current - 1); }
  });

  renderDots();

  /* Enlace directo a un paso: construccion.html#paso-6 */
  var start = 0;
  var hash = /paso-(\d+)/.exec(window.location.hash || "");
  if (hash) start = parseInt(hash[1], 10) - 1;
  go(start);
})();
