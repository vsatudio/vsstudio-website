/**
 * VS Studio Beauty & Academy — comportamiento ligero (sin dependencias)
 * Menú móvil, año en pie y cierre con teclado.
 */

(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (document.querySelector(".instagram-media")) {
    var igScript = document.createElement("script");
    igScript.async = true;
    igScript.src = "https://www.instagram.com/embed.js";
    document.body.appendChild(igScript);
  }

  var galeriaIframe = document.getElementById("galeria-instagram-iframe");
  var galeriaWrap = galeriaIframe ? galeriaIframe.closest("[data-embed=\"lightwidget\"]") : null;
  if (galeriaIframe && galeriaWrap) {
    var markGaleriaReady = function () {
      galeriaWrap.classList.add("is-embed-ready");
      galeriaWrap.setAttribute("aria-busy", "false");
    };
    galeriaIframe.addEventListener("load", markGaleriaReady);
    setTimeout(markGaleriaReady, 12000);
  }

  /* Consent gate (Option A widgets): only load 3rd party after explicit accept */
  var CONSENT_KEY = "vsstudio.thirdPartyWidgets";
  var consentBanner = document.getElementById("consent-banner");
  var elfsightWrap = document.getElementById("elfsight-reviews-embed");
  var elfsightPlaceholder = document.getElementById("reviews-widget-placeholder");
  var reviewsWidgetBox = document.getElementById("reviews-widget");
  var elfsightObserver = null;
  var elfsightReady = false;

  function getConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch (err) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (err) {
      /* ignore */
    }
  }

  function clearConsent() {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function ensureElfsightLoaded() {
    if (!elfsightWrap) return;
    if (document.querySelector('script[data-third-party-script="elfsight"]')) return;
    var s = document.createElement("script");
    s.src = "https://elfsightcdn.com/platform.js";
    s.async = true;
    s.setAttribute("data-third-party-script", "elfsight");
    document.body.appendChild(s);
  }

  function ensureLightwidgetLoaded() {
    if (document.querySelector('script[data-third-party-script="lightwidget"]')) return;
    var s = document.createElement("script");
    s.src = "https://cdn.lightwidget.com/widgets/lightwidget.js";
    s.defer = true;
    s.setAttribute("data-third-party-script", "lightwidget");
    document.body.appendChild(s);
  }

  function enableThirdPartyIframes() {
    document.querySelectorAll("iframe[data-src]").forEach(function (iframe) {
      /* Only load if the iframe is currently visible (avoid loading both mobile+desktop embeds). */
      if (!(iframe.offsetWidth || iframe.offsetHeight || iframe.getClientRects().length)) return;
      if (iframe.getAttribute("src") && iframe.getAttribute("src") !== "about:blank") return;
      var src = iframe.getAttribute("data-src");
      if (!src) return;
      iframe.setAttribute("src", src);
      var frame = iframe.closest(".embed-frame");
      if (frame) {
        frame.classList.add("is-third-party-ready");
      }
    });
  }

  function disableThirdPartyIframes() {
    document.querySelectorAll("iframe[data-src]").forEach(function (iframe) {
      iframe.setAttribute("src", "about:blank");
      var frame = iframe.closest(".embed-frame");
      if (frame) {
        frame.classList.remove("is-third-party-ready");
      }
    });
  }

  function isElfsightRendered() {
    if (!elfsightWrap) return false;
    /* Elfsight injects extra nodes / iframes once initialized */
    return !!elfsightWrap.querySelector("iframe, [class*='eapp-'], [class^='eapp-'], [class*='elfsight']");
  }

  function setElfsightReady(on) {
    elfsightReady = !!on;
    if (elfsightPlaceholder) {
      elfsightPlaceholder.classList.toggle("is-hidden", elfsightReady);
    }
    if (reviewsWidgetBox) {
      reviewsWidgetBox.classList.toggle("is-loading", !elfsightReady);
    }
  }

  function startElfsightObserver() {
    if (!elfsightWrap || elfsightObserver) return;
    if (isElfsightRendered()) {
      setElfsightReady(true);
      return;
    }
    elfsightObserver = new MutationObserver(function () {
      if (isElfsightRendered()) {
        setElfsightReady(true);
        if (elfsightObserver) {
          elfsightObserver.disconnect();
          elfsightObserver = null;
        }
      }
    });
    elfsightObserver.observe(elfsightWrap, { childList: true, subtree: true });
  }

  function stopElfsightObserver() {
    if (elfsightObserver) {
      elfsightObserver.disconnect();
      elfsightObserver = null;
    }
  }

  function applyConsentState() {
    var consent = getConsent();
    var accepted = consent === "accepted";

    if (consentBanner) {
      if (consent === null) {
        consentBanner.classList.remove("is-hidden");
      } else {
        consentBanner.classList.add("is-hidden");
      }
    }

    if (elfsightWrap) {
      elfsightWrap.classList.toggle("is-hidden", !accepted);
      elfsightWrap.setAttribute("aria-hidden", accepted ? "false" : "true");
    }
    if (accepted) {
      setElfsightReady(false);
      ensureElfsightLoaded();
      ensureLightwidgetLoaded();
      enableThirdPartyIframes();
      startElfsightObserver();
      /* Safety: if it renders but observer misses, flip after a moment */
      setTimeout(function () {
        if (!elfsightReady && isElfsightRendered()) {
          setElfsightReady(true);
        }
      }, 2500);
    } else {
      stopElfsightObserver();
      setElfsightReady(false);
      disableThirdPartyIframes();
    }
  }

  if (consentBanner) {
    consentBanner.querySelectorAll("[data-consent-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-consent-action");
        setConsent(action === "accept" ? "accepted" : "rejected");
        applyConsentState();
      });
    });
  }

  /* Allow in-page consent buttons (e.g. reviews section CTA) */
  document.querySelectorAll("[data-consent-action]").forEach(function (btn) {
    if (consentBanner && consentBanner.contains(btn)) return;
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-consent-action");
      setConsent(action === "accept" ? "accepted" : "rejected");
      applyConsentState();
    });
  });

  document.querySelectorAll("[data-consent-open]").forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      clearConsent();
      applyConsentState();
      if (consentBanner) {
        consentBanner.classList.remove("is-hidden");
        var firstBtn = consentBanner.querySelector("[data-consent-action]");
        if (firstBtn) {
          window.requestAnimationFrame(function () {
            firstBtn.focus();
          });
        }
      }
    });
  });

  applyConsentState();

  var skipLink = document.querySelector(".skip-link");
  var mainContent = document.getElementById("contenido-principal");
  if (skipLink && mainContent) {
    skipLink.addEventListener("click", function () {
      window.requestAnimationFrame(function () {
        mainContent.focus();
      });
    });
  }

  var header = document.querySelector(".site-header");
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  var mainEl = document.getElementById("contenido-principal");
  var footerEl = document.querySelector(".site-footer");

  if (!header || !toggle || !nav) {
    return;
  }

  var links = nav.querySelectorAll("a");
  var backdrop = document.getElementById("nav-backdrop");
  var wordmark = header.querySelector(".wordmark");
  var moreDetails = document.getElementById("nav-more");
  var moreSummary = moreDetails ? moreDetails.querySelector("summary") : null;
  var moreSafetyTimer = null;
  var MORE_SAFETY_MS = 2500;
  var mqNavMobile = window.matchMedia("(max-width: 959px)");
  var mqNavDesktop = window.matchMedia("(min-width: 960px)");

  function clearMoreSafetyTimer() {
    if (moreSafetyTimer !== null) {
      clearTimeout(moreSafetyTimer);
      moreSafetyTimer = null;
    }
  }

  function scheduleMoreSafetyClose() {
    clearMoreSafetyTimer();
    moreSafetyTimer = setTimeout(function () {
      moreSafetyTimer = null;
      if (moreDetails && moreDetails.hasAttribute("open")) {
        setMoreClosed();
      }
    }, MORE_SAFETY_MS);
  }

  function syncMoreSummaryAriaExpanded() {
    if (!moreSummary || !moreDetails) return;
    moreSummary.setAttribute("aria-expanded", moreDetails.hasAttribute("open") ? "true" : "false");
  }

  function setMoreClosed() {
    clearMoreSafetyTimer();
    if (moreDetails) {
      moreDetails.removeAttribute("open");
    }
    syncMoreSummaryAriaExpanded();
  }

  function updateNavAccessibility() {
    if (mqNavDesktop.matches) {
      nav.removeAttribute("aria-hidden");
    } else {
      var drawerOpen = header.classList.contains("is-open");
      if (drawerOpen) {
        nav.removeAttribute("aria-hidden");
      } else {
        nav.setAttribute("aria-hidden", "true");
      }
    }
  }

  function setElementInert(el, on) {
    if (!el) return;
    /* Only use the native property; avoid inert="" on engines that mishandle it (iOS WebKit quirks). */
    if (!("inert" in HTMLElement.prototype)) return;
    try {
      el.inert = !!on;
    } catch (err) {
      /* ignore */
    }
  }

  function updateInertBehindDrawer() {
    var trap = mqNavMobile.matches && header.classList.contains("is-open");
    setElementInert(mainEl, trap);
    setElementInert(footerEl, trap);
  }

  function getNavFocusables() {
    var sel = "a[href], button:not([disabled]), summary";
    return Array.prototype.filter.call(nav.querySelectorAll(sel), function (el) {
      if (el.hasAttribute("disabled")) return false;
      var det = el.closest("details");
      if (det && !det.hasAttribute("open") && el.tagName !== "SUMMARY") {
        return false;
      }
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
  }

  function setOpen(isOpen, opts) {
    opts = opts || {};
    header.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (backdrop) {
      backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
    if (!isOpen) {
      setMoreClosed();
    }
    updateInertBehindDrawer();
    updateNavAccessibility();
    if (!isOpen && opts.focusToggle && mqNavMobile.matches) {
      window.requestAnimationFrame(function () {
        toggle.focus();
      });
    }
  }

  function closeMenu(opts) {
    setOpen(false, opts || {});
  }

  /*
   * Native <details> toggling is unreliable in Safari/WebKit (second tap often does not close).
   * We toggle in script; also close on outside pointer, Escape, focus leaving, and a short safety timeout.
   */
  if (moreDetails && moreSummary) {
    moreSummary.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        if (moreDetails.hasAttribute("open")) {
          setMoreClosed();
        } else {
          moreDetails.setAttribute("open", "");
          scheduleMoreSafetyClose();
          syncMoreSummaryAriaExpanded();
        }
      },
      true
    );

    document.addEventListener("click", function (e) {
      if (!moreDetails.hasAttribute("open")) return;
      if (moreDetails.contains(e.target)) return;
      setMoreClosed();
    });

    /* No focusout auto-close: Safari can fire it before the in-dropdown link receives focus, cancelling the click. */

    syncMoreSummaryAriaExpanded();
  }

  toggle.addEventListener("click", function () {
    var willOpen = !header.classList.contains("is-open");
    setOpen(willOpen);
    if (willOpen) {
      window.requestAnimationFrame(function () {
        var items = getNavFocusables();
        if (items.length) {
          items[0].focus();
        }
      });
    }
  });

  nav.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !mqNavMobile.matches || !header.classList.contains("is-open")) {
      return;
    }
    var items = getNavFocusables();
    if (items.length === 0) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener(
    "focusin",
    function (e) {
      if (!mqNavMobile.matches || !header.classList.contains("is-open")) return;
      var t = e.target;
      if (nav.contains(t) || t === toggle) return;
      var items = getNavFocusables();
      if (items.length) items[0].focus();
    },
    true
  );

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      setMoreClosed();
      if (mqNavMobile.matches) {
        closeMenu({ focusToggle: false });
      }
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      closeMenu({ focusToggle: true });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (header.classList.contains("is-open")) {
      e.preventDefault();
      closeMenu({ focusToggle: true });
      return;
    }
    if (moreDetails && moreDetails.hasAttribute("open")) {
      setMoreClosed();
      if (moreSummary) {
        moreSummary.focus();
      }
    }
  });

  window.addEventListener("resize", function () {
    if (mqNavDesktop.matches) {
      closeMenu({ focusToggle: false });
    }
    updateInertBehindDrawer();
    updateNavAccessibility();
  });

  updateInertBehindDrawer();
  updateNavAccessibility();

  if (wordmark) {
    wordmark.addEventListener("click", function () {
      if (mqNavMobile.matches) {
        closeMenu({ focusToggle: false });
      }
    });
  }

  /* #inicio en el hero, no en el header: refuerzo por si el hash ya es #inicio o el navegador no hace scroll */
  document.querySelectorAll('a[href="#inicio"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var target = document.getElementById("inicio");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: "start" });
      if (history.replaceState) {
        history.replaceState(null, "", "#inicio");
      }
    });
  });

  var courseModal = document.getElementById("course-modal");
  var courseModalTitle = document.getElementById("course-modal-title");
  var courseModalDuration = document.getElementById("course-modal-duration");
  var courseModalIntro = document.getElementById("course-modal-intro");
  var courseModalFeatures = document.getElementById("course-modal-features");
  var courseModalIncludes = document.getElementById("course-modal-includes");
  var courseModalCloseIcon = document.querySelector(".modal__close");
  var courseModalCloseButton = document.getElementById("course-modal-close");
  var courseModalRequest = document.getElementById("course-modal-request");
  var courseModalBadges = document.getElementById("course-modal-badges");
  var courseModalPrograma = document.getElementById("course-modal-programa");
  var courseButtons = document.querySelectorAll("[data-course-id]");
  var lastFocusedCourseButton = null;
  var currentCourseId = null;

  var courseDetails = {
    "manicura-profesional": {
      title: "Manicura Profesional",
      durationHours: "8",
      intro: "Curso orientado a la técnica, el acabado y la salud de la uña en servicio profesional.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Técnica avanzada de limado y perfilado",
        "Preparación saludable de uñas naturales",
        "Aplicación de semipermanente y decoración ligera",
        "Reparación, refuerzo y acabado premium"
      ],
      programa: [
        { title: "Características del sistema", description: "Conceptos básicos de la manicura profesional y beneficios de la técnica" },
        { title: "Materiales y herramientas", description: "Selección y uso correcto de herramientas profesionales" },
        { title: "Productos necesarios", description: "Conocimiento detallado de esmaltes, bases y top coats de calidad" },
        { title: "El tip: tamaños y ajuste", description: "Medición correcta y ajuste perfecto de tips según cada cliente" },
        { title: "Paso a paso de aplicación", description: "Preparación, aplicación y finalización con técnica experta" },
        { title: "Errores comunes", description: "Identificación y prevención de los fallos más frecuentes" },
        { title: "Bioseguridad y asepsia", description: "Protocolos de higiene y desinfección profesional" },
        { title: "Técnicas en tendencia", description: "Diseños actuales y tendencias en manicura" },
        { title: "Evaluación final", description: "Prueba práctica para validar tus conocimientos" }
      ],
      includes: "Prácticas guiadas, materiales de trabajo, fichas técnicas y guía de mantenimiento completa."
    },
    "soft-gel": {
      title: "Sistema Soft Gel",
      durationHours: "8",
      intro: "Formación en una técnica actual para conseguir un acabado natural, duradero y confortable.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Aplicación de soft gel con acabado natural",
        "Esculpido, limado y formas modernas",
        "Adhesión segura y preparación de superficie",
        "Retirado y mantenimiento profesionales"
      ],
      programa: [
        { title: "Características del sistema", description: "Propiedades y ventajas del soft gel frente a otros sistemas" },
        { title: "Materiales y herramientas", description: "Equipamiento profesional específico para soft gel" },
        { title: "Productos necesarios", description: "Geles, bases, acabados y productos complementarios" },
        { title: "El tip: tamaños y ajuste", description: "Selección correcta de formas y tamaños" },
        { title: "Paso a paso para aplicación correcta", description: "Preparación de uña, aplicación en capas y finalización perfecta" },
        { title: "Errores comunes", description: "Problemas frecuentes y cómo evitarlos" },
        { title: "Bioseguridad y asepsia", description: "Estándares de higiene en aplicación de soft gel" },
        { title: "Técnicas en tendencia", description: "Diseños modernos y decoraciones actuales" },
        { title: "Evaluación final", description: "Validación de habilidades y conocimientos adquiridos" }
      ],
      includes: "Kit de soft gel completo, práctica supervisada, fichas técnicas y guías de mantenimiento."
    },
    "acrilico-polygel": {
      title: "Sistema Acrílico y Polygel",
      durationHours: "8",
      intro: "Entiende y domina dos sistemas de uñas técnicas para ofrecer servicios de alta calidad.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Modelado en acrílico y polygel paso a paso",
        "Transición entre técnicas y mantenimiento",
        "Corrección de volumen y acabado suave",
        "Seguridad y durabilidad en servicio real"
      ],
      programa: [
        { title: "Conceptos básicos", description: "Monómeros, polímeros, polygel y acrygel explicados" },
        { title: "Herramientas y productos", description: "Equipamiento profesional para ambos sistemas" },
        { title: "Pinceles y uso correcto", description: "Tipos de pinceles y técnica adecuada de aplicación" },
        { title: "Estructuras de uñas artificiales", description: "Construcción de formas y estructuras resistentes" },
        { title: "Estructuras de salón", description: "Adaptación a diferentes tipos de clientes" },
        { title: "Moldes y uso correcto", description: "Selección de moldes y aplicación perfecta" },
        { title: "Tipos de uñas naturales", description: "Análisis y adaptación según la base natural" },
        { title: "Bioseguridad y asepsia", description: "Protocolos de higiene en trabajos con químicos" },
        { title: "Estructura de costes", description: "Cálculo de rentabilidad y precios profesionales" },
        { title: "Tips y recomendaciones", description: "Consejos expertos para maximizar resultados" }
      ],
      includes: "Productos acrílico y polygel, moldes profesionales, pinceles de calidad y guía completa de diseño."
    },
    "lifting-pestanas": {
      title: "Lifting de Pestañas",
      durationHours: "8",
      intro: "Curso para crear levantamiento y definición en pestañas naturales con un resultado elegante.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Evaluación de pestañas y diseño del lifting",
        "Aplicación de soluciones técnicas y seguridad ocular",
        "Tinte y mantenimiento de resultados",
        "Atención personalizada por tipo de pelo"
      ],
      programa: [
        { title: "Características del lifting", description: "Concepto y beneficios del lifting de pestañas" },
        { title: "Materiales y herramientas", description: "Equipamiento necesario para lifting profesional" },
        { title: "Productos químicos", description: "Soluciones de lifting, fijación y cuidado" },
        { title: "Evaluación de pestañas", description: "Análisis correcto del estado y tipo de pestañas" },
        { title: "Diseño y aplicación del lifting", description: "Paso a paso de la técnica de levantamiento" },
        { title: "Tinte y acabado", description: "Aplicación de pigmento y resultado final perfecto" },
        { title: "Tiempos de exposición", description: "Control de tiempos para resultados óptimos" },
        { title: "Seguridad ocular", description: "Protocolos de protección durante el tratamiento" },
        { title: "Mantenimiento postcuidado", description: "Consejos para prolongar resultados y cuidado de pestañas" }
      ],
      includes: "Kit de lifting completo, soluciones profesionales, tintes y protocolo de cuidados."
    },
    "extensiones-pestanas": {
      title: "Extensiones de Pestañas Básico",
      durationHours: "8",
      intro: "Una base sólida en extensiones clásicas para ofrecer un resultado natural y seguro.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Adhesión correcta de extensiones clásicas",
        "Selección de longitudes y curvaturas",
        "Aplicación segura y acabado natural",
        "Retiro y mantenimiento para clientas"
      ],
      programa: [
        { title: "Características del sistema", description: "Extensiones clásicas vs otras técnicas" },
        { title: "Materiales y productos", description: "Selección de extensiones y adhesivos profesionales" },
        { title: "Herramientas necesarias", description: "Equipamiento para aplicación y mantenimiento" },
        { title: "Evaluación de pestañas", description: "Análisis de salud y densidad de pestañas naturales" },
        { title: "Técnica de aplicación", description: "Paso a paso para aplicación clásica correcta" },
        { title: "Aislamiento y adherencia", description: "Técnica perfecta para máxima retención" },
        { title: "Acabado y densidad", description: "Creación de volumen y naturalidad" },
        { title: "Mantenimiento y retoques", description: "Protocolo de cuidado entre sesiones" },
        { title: "Retiro seguro", description: "Técnica correcta para remover sin dañar pestañas" }
      ],
      includes: "Extensiones profesionales, adhesivos de calidad, herramientas especializadas y guía completa."
    },
    "diseno-cejas": {
      title: "Diseño de Cejas y Tinte",
      durationHours: "8",
      intro: "Aprende a diseñar cejas con proporción, color y estilo adaptado a cada rostro.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Diseño facial y proporción natural",
        "Mapeo y simetría profesional",
        "Técnica de tinte con henna y tonos precisos",
        "Consejos de mantenimiento para clientas"
      ],
      programa: [
        { title: "Morfología facial", description: "Análisis de proporciones y características faciales" },
        { title: "Teoría de color", description: "Selección de tonos según tipo de piel" },
        { title: "Herramientas y materiales", description: "Equipamiento para diseño y tinte" },
        { title: "Mapeo profesional", description: "Técnica de medición y diseño preciso" },
        { title: "Aplicación de tinte con henna", description: "Paso a paso para color duradero" },
        { title: "Perfilado y forma", description: "Creación de formas favorecedoras" },
        { title: "Simetría y balance", description: "Técnicas para equilibrio perfecto" },
        { title: "Tendencias actuales", description: "Diseños modernos y estilos en boga" },
        { title: "Cuidados postcuidado", description: "Recomendaciones para prolongar resultados" }
      ],
      includes: "Materiales de medición, tintes profesionales, hennas y guía completa de color."
    },
    "powder-brows": {
      title: "Powder Brows",
      durationHours: "Duración a consultar",
      intro: "Formación en un diseño suave de cejas con técnica de sombreado y acabado polvoso.",
      badges: ["Práctica real", "Certificado incluido", "Kit profesional incluido"],
      features: [
        "Diseño de ceja soft powder",
        "Técnica de sombreado y profundidad",
        "Selección de color y estilo para cada clienta",
        "Cuidado posaplicación y retoque"
      ],
      programa: [
        { title: "Características del sistema", description: "Powder brows vs otras técnicas de maquillaje" },
        { title: "Análisis de piel", description: "Evaluación para determinar idoneidad" },
        { title: "Herramientas profesionales", description: "Equipamiento especializado para powder brows" },
        { title: "Teoría del color", description: "Selección de tonos según características" },
        { title: "Técnica de sombreado", description: "Paso a paso del efecto powder" },
        { title: "Profundidad y densidad", description: "Control para resultado natural o intenso" },
        { title: "Acabado perfecto", description: "Detalle final para resultado profesional" },
        { title: "Cuidado postcuidado", description: "Protocolo de cuidado entre sesiones" },
        { title: "Retoque y mantenimiento", description: "Programación de sesiones de retoque" }
      ],
      includes: "Formación práctica completa, materiales específicos para powder brows y monitoreo de resultados."
    }
  };

  function renderCourseModal(courseId) {
    if (!courseModal) return;
    var course = courseDetails[courseId];
    if (!course) return;
    currentCourseId = courseId;
    courseModalTitle.textContent = course.title;
    
    courseModalBadges.innerHTML = "";
    if (course.badges) {
      var badgesHTML = "";
      badgesHTML += "<span class='modal__badge'>Duración: " + course.durationHours + " horas</span>";
      course.badges.forEach(function (badge) {
        badgesHTML += "<span class='modal__badge'>" + badge + "</span>";
      });
      courseModalBadges.innerHTML = badgesHTML;
    }
    
    courseModalIntro.textContent = course.intro;
    
    courseModalFeatures.innerHTML = "";
    course.features.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      courseModalFeatures.appendChild(li);
    });
    
    courseModalPrograma.innerHTML = "";
    if (course.programa) {
      course.programa.forEach(function (module) {
        var moduleDiv = document.createElement("div");
        moduleDiv.className = "modal__programa-item";
        var titleElement = document.createElement("h4");
        titleElement.textContent = module.title;
        titleElement.className = "modal__programa-title";
        var descElement = document.createElement("p");
        descElement.textContent = module.description;
        descElement.className = "modal__programa-desc";
        moduleDiv.appendChild(titleElement);
        moduleDiv.appendChild(descElement);
        courseModalPrograma.appendChild(moduleDiv);
      });
    }
    
    courseModalIncludes.textContent = course.includes;
  }
  function openCourseModal(courseId, sourceButton) {
    if (!courseModal) return;
    renderCourseModal(courseId);
    lastFocusedCourseButton = sourceButton || document.activeElement;
    courseModal.classList.remove("is-hidden");
    courseModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (courseModalClose) {
      courseModalClose.focus();
    }
  }

  function closeCourseModal() {
    if (!courseModal) return;
    courseModal.classList.add("is-hidden");
    courseModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    currentCourseId = null;
    if (lastFocusedCourseButton && typeof lastFocusedCourseButton.focus === "function") {
      lastFocusedCourseButton.focus();
    }
  }

  function openWhatsAppRequest() {
    if (!currentCourseId) return;
    var course = courseDetails[currentCourseId];
    if (!course) return;
    var message = "Hola, estoy interesada en el curso " + course.title + ". ¿Podéis enviarme información sobre fechas, precio y plazas disponibles?";
    var url = "https://wa.me/34614529469?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  courseButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openCourseModal(button.getAttribute("data-course-id"), button);
    });
  });

  if (courseModalCloseIcon) {
    courseModalCloseIcon.addEventListener("click", closeCourseModal);
  }

  if (courseModalCloseButton) {
    courseModalCloseButton.addEventListener("click", closeCourseModal);
  }

  if (courseModalRequest) {
    courseModalRequest.addEventListener("click", openWhatsAppRequest);
  }

  if (courseModal) {
    courseModal.addEventListener("click", function (event) {
      if (event.target === courseModal) {
        closeCourseModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (courseModal && !courseModal.classList.contains("is-hidden")) {
      event.preventDefault();
      closeCourseModal();
    }
  });

})();

