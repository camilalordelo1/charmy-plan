const form = document.querySelector("form"),
  message = document.querySelector("#message");
const bytes = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
form.onsubmit = async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  message.textContent = "Desbloqueando…";
  try {
    if (!("serviceWorker" in navigator)) throw Error("unsupported");
    const manifest = await (
      await fetch("manifest.json", { cache: "no-store" })
    ).json();
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
    const encrypted = await (await fetch(entry.file)).arrayBuffer();
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: bytes(entry.iv) },
        key,
        encrypted,
      );
    } catch {
      throw Error("password");
    }
    await navigator.serviceWorker.register("service-worker.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(Error("worker")), 15000);
      channel.port1.onmessage = () => {
        clearTimeout(timer);
        resolve();
      };
      navigator.serviceWorker.controller.postMessage(
        { type: "unlock", key, manifest },
        [channel.port2],
      );
    });
    document.querySelector("#password").value = "";
    location.reload();
  } catch (error) {
    message.textContent =
      error.message === "password"
        ? "Senha incorreta. Tente novamente."
        : "Não foi possível abrir. Use HTTPS e permita o funcionamento do site neste navegador.";
    button.disabled = false;
  }
};

const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");
togglePassword.onclick = () => {
  const visible = passwordInput.type === "password";
  passwordInput.type = visible ? "text" : "password";
  const label = visible ? "Ocultar senha" : "Mostrar senha";
  togglePassword.setAttribute("aria-label", label);
  togglePassword.title = label;
  togglePassword.setAttribute("aria-pressed", String(visible));
  passwordInput.focus();
};
