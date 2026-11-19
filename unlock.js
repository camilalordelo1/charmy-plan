"use strict";

// This is a convenience gate on a public static site, NOT secure authentication.
const ACCESS_PASSWORD = "charmy2026";
const ACCESS_KEY = "charmy:access";
const form = document.querySelector("form");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#message");
const togglePassword = document.querySelector("#togglePassword");

if (passwordInput && togglePassword) {
  togglePassword.onclick = () => {
    const visible = passwordInput.type === "password";
    passwordInput.type = visible ? "text" : "password";
    togglePassword.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
    togglePassword.setAttribute("aria-pressed", String(visible));
    passwordInput.focus();
  };
}

// Retire the OLD encrypted site's Service Worker without registering another.
// Cleanup is best-effort and never blocks submitting the login form.
function cleanupOldSite() {
  const base = new URL("./", location.href);
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations
          .filter((registration) => registration.scope === base.href)
          .map((registration) => registration.unregister()))
      ).catch(() => {});
    }
  } catch { /* Some embedded browsers restrict worker access. */ }
  try {
    if (globalThis.caches?.keys) {
      caches.keys().then(async (names) => {
        for (const name of names) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) {
            const url = new URL(request.url);
            if (url.origin === base.origin && url.pathname.startsWith(base.pathname))
              await cache.delete(request);
          }
        }
      }).catch(() => {});
    }
  } catch { /* Cache Storage may be disabled; login still works. */ }
}
cleanupOldSite();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (passwordInput.value !== ACCESS_PASSWORD) {
    message.textContent = "Senha incorreta. Tente novamente.";
    passwordInput.focus();
    return;
  }
  try {
    sessionStorage.setItem(ACCESS_KEY, "ok");
  } catch {
    message.textContent = "Este navegador bloqueou o armazenamento de sessão. Abra o site no Safari ou Chrome.";
    return;
  }
  passwordInput.value = "";
  window.location.assign(new URL("planner.html", location.href).href);
});
