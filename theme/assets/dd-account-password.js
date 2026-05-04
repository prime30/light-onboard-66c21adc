/*
 * dd-account-password.js
 *
 * Inline change-password UX for the storefront /account page. Calls the
 * App Proxy at /apps/apply/change-password (Shopify signs the request
 * with logged_in_customer_id; the backend HMAC-verifies it).
 *
 * Contract: docs/contracts/account-change-password.md
 *
 * Notes:
 *   - We POST to a relative path so the browser sends the storefront
 *     cookie and Shopify's proxy layer appends the signed query string.
 *   - Client validation (length + match) is for instant feedback only —
 *     the server is the source of truth.
 *   - ERROR_COPY keys must match the backend's error codes verbatim.
 */
(function () {
  "use strict";

  var ENDPOINT = "/apps/apply/change-password";

  var ERROR_COPY = {
    unauthenticated: "Your session has expired. Please refresh the page and try again.",
    weak_password: "That password isn't accepted. Try at least 8 characters.",
    rate_limited: "Too many attempts. Please wait a moment and try again.",
    shopify_error: "Couldn't update your password right now. Please try again shortly.",
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function init(root) {
    var toggle = root.querySelector("[data-dd-password-toggle]");
    var panel = root.querySelector("[data-dd-password-panel]");
    var form = root.querySelector("[data-dd-password-form]");
    var input = root.querySelector("[data-dd-password-input]");
    var confirmInput = root.querySelector("[data-dd-password-confirm]");
    var message = root.querySelector("[data-dd-password-message]");
    var cancelBtn = root.querySelector("[data-dd-password-cancel]");
    var submitBtn = root.querySelector("[data-dd-password-submit]");

    if (!toggle || !panel || !form || !input || !confirmInput || !message || !submitBtn) {
      return;
    }

    function setMessage(text, kind) {
      message.textContent = text || "";
      message.setAttribute("data-kind", kind || "");
    }

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      setTimeout(function () { input.focus(); }, 0);
    }

    function close() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      form.reset();
      setMessage("", "");
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) open(); else close();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () { close(); });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = input.value || "";
      var confirmed = confirmInput.value || "";

      if (pw.length < 8) {
        setMessage("Password must be at least 8 characters.", "error");
        input.focus();
        return;
      }
      if (pw !== confirmed) {
        setMessage("Passwords don't match.", "error");
        confirmInput.focus();
        return;
      }

      submitBtn.disabled = true;
      setMessage("Updating…", "pending");

      fetch(ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ new_password: pw }),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { status: res.status, body: body || {} };
          });
        })
        .then(function (r) {
          submitBtn.disabled = false;
          if (r.body && r.body.ok) {
            setMessage("Password updated.", "success");
            // Clear the inputs so the new password isn't sitting in the DOM.
            form.reset();
            setTimeout(close, 1500);
            return;
          }
          var code = (r.body && r.body.error) || "shopify_error";
          var copy = ERROR_COPY[code] || ERROR_COPY.shopify_error;
          setMessage(copy, "error");
        })
        .catch(function () {
          submitBtn.disabled = false;
          setMessage(ERROR_COPY.shopify_error, "error");
        });
    });
  }

  ready(function () {
    var roots = document.querySelectorAll(".dd-account-details");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  });
})();
