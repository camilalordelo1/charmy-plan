import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

function version(url, revision) {
  const [withoutHash, hash] = url.split("#");
  const [pathname, query = ""] = withoutHash.split("?");
  const params = new URLSearchParams(query);
  params.set("v", revision);
  return `${pathname}?${params}${hash ? `#${hash}` : ""}`;
}
export function versionModuleReferences(code, revision) {
  return code.replace(/(["'])(\.{1,2}\/[^"'\s]*?\.(?:m?js|css)(?:\?[^"'\s#]*)?(?:#[^"'\s]*)?)\1/g,
    (_, quote, url) => quote + version(url, revision) + quote);
}
export function versionHtmlReferences(html, revision) {
  return html.replace(/\b(src|href)=(["'])([^"']+\.(?:js|css)(?:\?[^"'#]*)?(?:#[^"']*)?)\2/g,
    (match, attribute, quote, url) => /^(?:[a-z]+:|\/\/)/i.test(url) ? match
      : `${attribute}=${quote}${version(url, revision)}${quote}`);
}
export async function applyCacheRevision(output) {
  const files = [];
  async function scan(directory) {
    for (const entry of await readdir(path.join(output, directory), { withFileTypes: true })) {
      const name = path.posix.join(directory, entry.name);
      if (name === "src/vendor" || name === "img") continue;
      if (entry.isDirectory()) await scan(name);
      else if (/\.(?:js|css|html)$/.test(name)) files.push(name);
    }
  }
  await scan("");
  files.sort();
  const contents = new Map();
  const hash = createHash("sha256");
  hash.update(await readFile(new URL(import.meta.url)));
  for (const file of files) {
    const text = await readFile(path.join(output, file), "utf8");
    contents.set(file, text);
    hash.update(file).update("\0").update(text).update("\0");
  }
  const revision = hash.digest("hex").slice(0, 12);
  for (const [file, original] of contents) {
    let text = original;
    if (file.endsWith(".html")) text = versionHtmlReferences(text, revision);
    if (file === "planner.html") text = text.replaceAll('location.replace("./")', `location.replace("./?v=${revision}")`);
    if (file.endsWith(".js")) text = versionModuleReferences(text, revision);
    if (file === "unlock.js") text = text.replace(/(["'])planner\.html\1/g, (_, quote) => `${quote}planner.html?v=${revision}${quote}`);
    if (text !== original) await writeFile(path.join(output, file), text);
  }
  await writeFile(path.join(output, "release.json"), JSON.stringify({ revision }));
  console.log(`Versão dos arquivos: ${revision}`);
  return revision;
}
