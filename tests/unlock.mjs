import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { mkdtemp, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { webcrypto as crypto } from "node:crypto";

const source = await readFile(new URL("../scripts/protection/unlock.js", import.meta.url), "utf8");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const password = "test-fixture-password";
const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 2, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode("<html>private site</html>"));
const manifest = { salt: Buffer.from(salt).toString("base64"), iterations: 2, files: { "index.html": { file: "vault/current.bin", iv: Buffer.from(iv).toString("base64") } } };

async function scenario(mode) {
  const nodes = Object.fromEntries(["form", "#message", "#browserHelp", "#accessLink", "#copyAccessLink", "#password", "#togglePassword"].map(name => [name, { hidden: true, value: "", textContent: "", focus() {}, select() {}, setAttribute() {} }]));
  const button = { disabled: false };
  nodes.form.querySelector = () => button;
  nodes["#password"].type = "password";
  if (mode === "legacy") {
    delete nodes["#browserHelp"];
    delete nodes["#accessLink"];
    delete nodes["#copyAccessLink"];
  }
  nodes["#password"].value = mode === "password" ? "wrong-fixture-password" : password;
  const calls = [];
  let reloaded = 0, unlocks = 0;
  const controller = { postMessage(message, ports) {
    assert.equal(message.type, "unlock");
    assert.equal(message.key.extractable, false);
    unlocks++;
    ports[0].postMessage("ready");
  } };
  const serviceWorker = {
    controller,
    ready: mode === "timeout" ? new Promise(() => {}) : Promise.resolve({}),
    register: async (_, options) => {
      assert.equal(options.updateViaCache, "none");
      if (mode === "blocked") throw Object.assign(Error("disabled"), { name: "SecurityError" });
      if (mode === "update") {
        const installing = { state: "installing", addEventListener(_, changed) {
          setTimeout(() => { installing.state = "activated"; serviceWorker.controller = controller; changed(); }, 5);
        }, removeEventListener() {} };
        serviceWorker.controller = { postMessage() { throw Error("old worker must finish updating first"); } };
        return { installing };
      }
      return { active: { postMessage() { throw Error("must use the controlling worker"); } } };
    },
    addEventListener() {}, removeEventListener() {},
  };
  vm.runInNewContext(source, {
    document: { querySelector: name => nodes[name] },
    navigator: mode === "unsupported" ? {} : { serviceWorker },
    location: { href: "https://site.test/app/", reload: () => reloaded++ },
    isSecureContext: true, crypto, Uint8Array, atob, TextEncoder, URL,
    AbortController, MessageChannel,
    setTimeout: (fn, delay) => setTimeout(fn, mode === "timeout" ? 25 : delay), clearTimeout,
    fetch: async (url, options) => {
      assert.equal(options.cache, "no-store");
      calls.push(String(url));
      if (String(url).includes("manifest.json")) {
        assert(new URL(url).searchParams.has("access"), "must bypass a stale CDN manifest");
        return { ok: true, json: async () => manifest };
      }
      const count = calls.filter(url => url === "vault/current.bin").length;
      return { ok: mode !== "offline" && !(mode === "transient" && count === 1), arrayBuffer: async () => encrypted };
    },
  });
  nodes["#togglePassword"].onclick();
  assert.equal(nodes["#password"].type, "text", "the eye must reveal the password before unlocking");
  nodes["#togglePassword"].onclick();
  assert.equal(nodes["#password"].type, "password", "the eye must hide the password again");
  await nodes.form.onsubmit({ preventDefault() {} });
  return { nodes, button, calls, reloaded, unlocks };
}
for (const mode of ["success", "transient", "update", "legacy"]) {
  const result = await scenario(mode);
  assert.equal(result.reloaded, 1);
  assert.equal(result.unlocks, 1);
  assert.equal(result.nodes["#password"].value, "");
  if (mode === "transient") assert.equal(result.calls.filter(url => url === "vault/current.bin").length, 2);
}
for (const mode of ["unsupported", "blocked", "offline", "timeout", "password"]) {
  const result = await scenario(mode);
  assert.equal(result.reloaded, 0);
  assert.equal(result.button.disabled, false);
  assert.equal(result.nodes["#browserHelp"].hidden, mode === "password");
  assert.equal(result.nodes["#accessLink"].value, "https://site.test/app/");
  const message = result.nodes["#message"].textContent;
  if (mode === "password") assert.match(message, /Senha incorreta/);
  else if (mode === "offline") assert.match(message, /conexão/);
  else if (mode === "timeout") assert.match(message, /não terminou/);
  else assert.match(message, /navegador bloqueou/);
}
console.log("OK: real password verification, fresh manifests, transient retries, controlling worker handshake and actionable browser/network/timeout errors.");

// Exercise the actual publisher on a tiny site, without altering the real build
// or using its password. Login HTML and code must ship as one cached document.
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "charmy-unlock-"));
try {
  await mkdir(path.join(fixtureRoot, "scripts/protection"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "dist"));
  await mkdir(path.join(fixtureRoot, "src/assets"), { recursive: true });
  await cp(new URL("../scripts/protect.mjs", import.meta.url), path.join(fixtureRoot, "scripts/protect.mjs"));
  for (const name of ["index.html", "unlock.js", "service-worker.js"])
    await cp(new URL(`../scripts/protection/${name}`, import.meta.url), path.join(fixtureRoot, "scripts/protection", name));
  await writeFile(path.join(fixtureRoot, "src/assets/charmy-logo.png"), "fixture-icon");
  const privateHtml = "<html>private-planning-fixture</html>";
  await writeFile(path.join(fixtureRoot, "dist/index.html"), privateHtml);
  execFileSync(process.execPath, [path.join(fixtureRoot, "scripts/protect.mjs")], { env: { ...process.env, SITE_PASSWORD: password } });
  const login = await readFile(path.join(fixtureRoot, "dist/index.html"), "utf8");
  assert(!login.includes(privateHtml));
  assert(!/<script src="unlock\.js/.test(login));
  const embedded = login.match(/<script data-unlock="inline-6">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(embedded, source);
  const legacyScript = await readFile(path.join(fixtureRoot, "dist/unlock.js"), "utf8");
  assert.equal(legacyScript, source, "old cached login pages must receive the compatible external code");
  const publishedManifest = JSON.parse(await readFile(path.join(fixtureRoot, "dist/manifest.json"), "utf8"));
  const unlockKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: Buffer.from(publishedManifest.salt, "base64"), iterations: publishedManifest.iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const entry = publishedManifest.files["index.html"];
  const cipher = await readFile(path.join(fixtureRoot, "dist", entry.file));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(entry.iv, "base64") }, unlockKey, cipher);
  assert.equal(new TextDecoder().decode(plain), privateHtml);
  console.log("OK: eye works on both cached and current login pages; publisher embeds matching login code and keeps the planning encrypted.");
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
