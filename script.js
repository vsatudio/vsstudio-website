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

})();

