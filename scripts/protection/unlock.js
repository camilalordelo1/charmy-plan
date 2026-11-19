const form = document.querySelector("form"),
  message = document.querySelector("#message");
const bytes = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
// Bind the eye independently of optional recovery controls. Old cached login
// pages must continue working when they receive a newer unlock.js.
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");
if (passwordInput && togglePassword) togglePassword.onclick = () => {
  const visible = passwordInput.type === "password";
  passwordInput.type = visible ? "text" : "password";
  const label = visible ? "Ocultar senha" : "Mostrar senha";
  togglePassword.setAttribute("aria-label", label);
  togglePassword.title = label;
  togglePassword.setAttribute("aria-pressed", String(visible));
  passwordInput.focus();
};
const browserHelp = document.querySelector("#browserHelp");
const linkInput = document.querySelector("#accessLink");
const accessLink = new URL("./", location.href).href;
if (linkInput) linkInput.value = accessLink;
const copyAccessLink = document.querySelector("#copyAccessLink");
if (copyAccessLink) copyAccessLink.onclick = async () => {
  try {
    await navigator.clipboard.writeText(accessLink);
    message.textContent = "Link copiado. Cole na barra de endereço do navegador.";
  } catch {
    linkInput?.focus();
    linkInput?.select();
    message.textContent = "Selecione e copie o link abaixo.";
  }
};
async function readResponse(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (response.ok) return response;
    } catch { /* Retry a transient connection failure once. */ }
    finally { clearTimeout(timer); }
  }
  throw Error("connection");
}
function bounded(promise) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Error("worker")), 20000); }),
  ]).finally(() => clearTimeout(timer));
}
async function connectWorker() {
  try {
    const registration = await navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" });
    const updating = registration.installing || registration.waiting;
    if (updating && updating.state !== "activated") {
      await bounded(new Promise((resolve, reject) => {
        const changed = () => {
          if (!["activated", "redundant"].includes(updating.state)) return;
          updating.removeEventListener("statechange", changed);
          updating.state === "activated" ? resolve() : reject(Error("worker"));
        };
        updating.addEventListener("statechange", changed);
        changed();
      }));
    }
    await bounded(navigator.serviceWorker.ready);
    if (!navigator.serviceWorker.controller) {
      await bounded(new Promise((resolve) => {
        const changed = () => {
          if (!navigator.serviceWorker.controller) return;
          navigator.serviceWorker.removeEventListener("controllerchange", changed);
          resolve();
        };
        navigator.serviceWorker.addEventListener("controllerchange", changed);
        changed();
      }));
    }
    // Unlock the worker actually controlling this tab. During an update it can
    // differ from registration.active; sending the key to the other one loops login.
    return navigator.serviceWorker.controller;
  } catch (error) {
    throw Error(error.name === "SecurityError" || error.name === "NotAllowedError" ? "browser" : "worker");
  }
}
form.onsubmit = async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  if (browserHelp) browserHelp.hidden = true;
  message.textContent = "Desbloqueando…";
  try {
    if (!globalThis.isSecureContext || !globalThis.crypto?.subtle || !("serviceWorker" in navigator)) throw Error("browser");
    // Every publication has a new encryption salt and new ciphertext URLs.
    // A stale CDN manifest can refer to files removed by the latest deployment.
    const manifestUrl = new URL("manifest.json", location.href);
    manifestUrl.searchParams.set("access", Date.now().toString());
    const manifest = await (await readResponse(manifestUrl)).json();
    if (!manifest.files?.["index.html"] || !manifest.salt) throw Error("connection");
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(document.querySelector("#password").value),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: bytes(manifest.salt),
        iterations: manifest.iterations,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const entry = manifest.files["index.html"];
    const encrypted = await (await readResponse(entry.file)).arrayBuffer();
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: bytes(entry.iv) },
        key,
        encrypted,
      );
    } catch (error) {
      throw Error(error.name === "OperationError" ? "password" : "browser");
    }
    const worker = await connectWorker();
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const finish = (error) => {
        clearTimeout(timer);
        channel.port1.close();
        channel.port2.close();
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(() => finish(Error("worker")), 20000);
      channel.port1.onmessage = (event) => {
        if (event.data === "ready") finish();
      };
      try {
        worker.postMessage({ type: "unlock", key, manifest }, [channel.port2]);
      } catch { finish(Error("browser")); }
    });
    document.querySelector("#password").value = "";
    location.reload();
  } catch (error) {
    const messages = {
      password: "Senha incorreta. Tente novamente.",
      connection: "Não conseguimos carregar o acesso. Confira a conexão e toque em Desbloquear para tentar novamente.",
      browser: "Este navegador bloqueou a abertura do planejamento. Copie o link abaixo e abra em uma aba normal, fora do aplicativo e da navegação privada.",
      worker: "A abertura do site não terminou. Tente novamente. Se continuar, feche esta aba e abra o link abaixo em uma aba normal.",
    };
    message.textContent = messages[error.message] || messages.connection;
    if (browserHelp) browserHelp.hidden = error.message === "password";
    button.disabled = false;
  }
};
