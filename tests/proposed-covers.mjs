import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { notionPosts } from "../src/data/notion-posts.js";
import { suggestions } from "../src/data/posts.js";
import { proposedCover, productionNote } from "../src/data/proposed-covers.js";
import { postProposal, needsProduction } from "../src/services/post-proposal.js";
import { coverUrl, postCoverUrl, feedMarkup } from "../src/views/instagram-feed.js";
import { imagePreview } from "../src/utils/image-preview.js";
import { isVideoUpload, loadUploads } from "../src/services/uploads.js";
import { artworkLibrary } from "../src/data/artwork-library.js";
const root = new URL("../", import.meta.url);
const posts = [...notionPosts, ...suggestions];
const pending = posts.filter(needsProduction);
assert.equal(pending.length, 10);
assert.equal(artworkLibrary.length, 27);
assert.equal(new Set(artworkLibrary.map(item => item.src)).size, 27);
assert.equal(productionNote, "* Conteúdo a ser produzido pela loja.");
for (const post of pending) {
  const cover = proposedCover(post);
  assert.equal(postProposal(post), cover);
  assert(!isVideoUpload(post));
  assert.equal(coverUrl(post), imagePreview(cover.src));
  assert.equal(postCoverUrl(post), imagePreview(cover.src, "thumb"));
  assert(!feedMarkup([post]).includes("<video"));
  const png = await readFile(new URL(cover.src, root));
  assert.equal(png.readUInt32BE(16), 1080);
  assert.equal(png.readUInt32BE(20), 1350);
  await access(new URL(imagePreview(cover.src, "thumb"), root));
  assert.equal(postProposal({ ...post, id: "saved-copy" }), cover);
  assert.equal(postProposal({ ...post, cover: "custom-photo.png" }), null);
  assert(cover.products.length);
  for (const product of cover.products) assert(product.url.startsWith("https://charmozinha.bagypro.com/"));
}
for (const day of ["02", "04", "09"]) {
  const post = posts.find(post => post.id === `charmy-notion-dec-${day}`);
  assert(!needsProduction(post));
  assert.equal(postProposal(post), null);
  assert(isVideoUpload(post));
}
// A real upload must immediately replace a suggested cover and clear its notice.
const fixture = { id: "produced-video", name: "finished.mp4", type: "video/mp4", file: new Blob(["test video"], { type: "video/mp4" }) };
globalThis.indexedDB = { open() {
  const request = {};
  queueMicrotask(() => {
    request.result = { transaction: () => ({ objectStore: () => ({ getAll() {
      const rows = {};
      queueMicrotask(() => { rows.result = [fixture]; rows.onsuccess(); });
      return rows;
    } }) }) };
    request.onsuccess();
  });
  return request;
} };
await loadUploads();
const produced = { ...pending[0], uploadId: fixture.id };
assert(!needsProduction(produced));
assert.equal(postProposal(produced), null);
assert(isVideoUpload(produced));
assert(coverUrl(produced).startsWith("blob:"));
assert(feedMarkup([produced]).includes("<video"));
console.log("OK: ten proposed covers, correct dimensions and original products; no video playback claimed; existing videos, custom covers and later uploads preserved.");
