import { webcrypto as crypto, createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import path from "node:path";
const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
const password = process.env.SITE_PASSWORD;
if (!password)
  throw new Error("SITE_PASSWORD is required for encrypted publication");
const salt = crypto.getRandomValues(new Uint8Array(16));
const material = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveKey"],
);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
  material,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const manifest = {
  version: 1,
  salt: Buffer.from(salt).toString("base64"),
  iterations: 600000,
  files: {},
};
const encrypted = [];
async function scan(dir, relative = "") {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name),
      name = relative + item.name;
    if (item.isDirectory()) await scan(file, name + "/");
    else {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        await readFile(file),
      );
      const target =
        "vault/" + createHash("sha256").update(Buffer.from(data)).digest("hex") + ".bin";
      manifest.files[name] = {
        file: target,
        iv: Buffer.from(iv).toString("base64"),
      };
      encrypted.push([target, Buffer.from(data)]);
    }
  }
}
await scan(path.resolve(output.pathname));
await rm(output, { recursive: true, force: true });
await mkdir(new URL("vault/", output), { recursive: true });
for (const [name, data] of encrypted)
  await writeFile(new URL(name, output), data);
await writeFile(new URL("manifest.json", output), JSON.stringify(manifest));
for (const file of ["index.html", "unlock.js", "service-worker.js"])
  await cp(new URL("scripts/protection/" + file, root), new URL(file, output));
await writeFile(new URL(".nojekyll", output), "");
console.log(`Encrypted ${encrypted.length} files with AES-256-GCM.`);
