import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { imagePreviewPaths } from "../scripts/image-preview-paths.mjs";
import { applyCacheRevision } from "../scripts/cache-revision.mjs";
import { imagePreviews } from "../src/data/image-previews.js";
import { postCoverUrl } from "../src/views/instagram-feed.js";

// Replacing an image under the same original filename must invalidate both sizes.
const original = "src/assets/posts/cover.png";
const before = imagePreviewPaths(original, Buffer.from("old artwork"));
const after = imagePreviewPaths(original, Buffer.from("pink artwork"));
assert.notEqual(before.thumb, after.thumb);
assert.notEqual(before.display, after.display);
assert.deepEqual(after, imagePreviewPaths(original, Buffer.from("pink artwork")));
for (const [file, previews] of Object.entries(imagePreviews)) {
  const bytes = await readFile(new URL(`../${file}`, import.meta.url));
  assert.deepEqual(previews, imagePreviewPaths(file, bytes), file);
  for (const preview of Object.values(previews)) await access(new URL(`../${preview}`, import.meta.url));
}
const styling = { id: "roteiros-charmy-v1-3", format: "Reels" };
assert.equal(postCoverUrl(styling), imagePreviews["src/assets/posts/capas-sugeridas/poder-styling.png"].thumb);

// A new mapping must also invalidate cached modules throughout the import graph,
// including dynamic imports, and the page reached after password entry.
const output = await mkdtemp(path.join(os.tmpdir(), "charmy-cache-"));
try {
  async function fixture(mapping) {
    await mkdir(path.join(output, "src"), { recursive: true });
    await writeFile(path.join(output, "planner.html"), '<script>location.replace("./");</script><link href="./src/style.css"><script type="module" src="./src/main.js?v=old"></script>');
    await writeFile(path.join(output, "unlock.js"), 'location.assign(new URL("planner.html", location.href));');
    await writeFile(path.join(output, "src/main.js"), 'import { images } from "./images.js"; const lazy = import("./lazy.js");');
    await writeFile(path.join(output, "src/images.js"), `export const images = ${JSON.stringify(mapping)};`);
    await writeFile(path.join(output, "src/lazy.js"), 'export { images } from "./images.js";');
    await writeFile(path.join(output, "src/style.css"), 'body { color: black; }');
  }
  await fixture(before);
  const first = await applyCacheRevision(output);
  await fixture(after);
  const second = await applyCacheRevision(output);
  assert.notEqual(first, second);
  const html = await readFile(path.join(output, "planner.html"), "utf8");
  assert(html.includes(`./src/main.js?v=${second}`));
  assert(html.includes(`./src/style.css?v=${second}`));
  assert(html.includes(`location.replace("./?v=${second}")`));
  const code = await readFile(path.join(output, "src/main.js"), "utf8");
  assert(code.includes(`./images.js?v=${second}`));
  assert(code.includes(`./lazy.js?v=${second}`));
  assert((await readFile(path.join(output, "src/lazy.js"), "utf8")).includes(`./images.js?v=${second}`));
  assert((await readFile(path.join(output, "unlock.js"), "utf8")).includes(`planner.html?v=${second}`));
  assert.equal(JSON.parse(await readFile(path.join(output, "release.json"), "utf8")).revision, second);
  await fixture(after);
  assert.equal(await applyCacheRevision(output), second, "identical source must produce the same revision");
} finally { await rm(output, { recursive: true, force: true }); }
console.log("OK: changed artwork gets new thumbnail/display URLs; import graph, styles and login destination receive the same fresh version.");
