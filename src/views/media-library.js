import { mediaPreviews } from "../data/media-previews.js";
import { videoPreviews } from "../data/video-previews.js";
import { esc } from "../utils/html.js";
let files = [];
let initialized = false;
const previewCache = new Map();
let conversionQueue = Promise.resolve();
const heic = (name) => /\.(heic|heif)$/i.test(name);

function attachHeicPreviews() {
  for (const image of document.querySelectorAll("#mediaGrid img[data-heic]")) {
    image.onerror = () => {
      image.onerror = null;
      const original = image.dataset.heic;
      const card = image.closest(".media-card");
      const label = card.querySelector(".media-preview-status");
      label.textContent = "Preparando prévia…";
      let preview = previewCache.get(original);
      if (!preview) {
        preview = conversionQueue.then(async () => {
          const response = await fetch(original);
          if (!response.ok) throw new Error("Arquivo indisponível");
          const converted = await window.heic2any({
            blob: await response.blob(),
            toType: "image/jpeg",
            quality: 0.8,
          });
          return URL.createObjectURL(
            Array.isArray(converted) ? converted[0] : converted,
          );
        });
        previewCache.set(original, preview);
        conversionQueue = preview.catch(() => {});
      }
      preview
        .then((url) => {
          image.src = url;
          label.textContent = "Prévia JPEG · original HEIC/HEIF preservado";
        })
        .catch(() => {
          image.hidden = true;
          label.textContent =
            "Prévia indisponível para este arquivo. Abra ou baixe o original.";
          previewCache.delete(original);
        });
    };
  }
}
const video = (name) => /\.(mp4|webm|mov|m4v|ogv)$/i.test(name);
const supported = (name) =>
  /\.(jpe?g|png|gif|webp|avif|svg|heic|heif|mp4|webm|mov|m4v|ogv)$/i.test(name);
const root = new URL("../../", import.meta.url);
const previews = {
  ...mediaPreviews,
  ...Object.fromEntries(Object.entries(videoPreviews).map(([file, item]) => [file, item.src])),
};
const posters = Object.fromEntries(Object.entries(videoPreviews).map(([file, item]) => [file, item.poster]));
function previewUrl(file, mapping = previews, fallback = file.url) {
  const match = Object.entries(mapping).find(
    ([original]) =>
      new URL(original.split("/").map(encodeURIComponent).join("/"), root)
        .href === file.url,
  );
  if (match) return new URL(match[1], root).href;
  if (file.url.startsWith("blob:")) {
    const matches = Object.entries(mapping).filter(
      ([original]) => original.split("/").pop() === file.name,
    );
    if (matches.length === 1) return new URL(matches[0][1], root).href;
  }
  return fallback;
}
function mediaCard(file) {
  const preview = previewUrl(file);
  const poster = previewUrl(file, posters, "");
  const isVideo = video(file.name);
  const media = isVideo
    ? `<video controls playsinline preload="metadata" ${poster ? `poster="${esc(poster)}"` : ""} src="${esc(preview)}"></video>`
    : `<img loading="lazy" ${heic(file.name) ? `data-heic="${esc(file.url)}"` : ""} src="${esc(preview)}" alt="${esc(file.name)}">`;
  const label = heic(file.name)
    ? `<small class="media-preview-status">${preview !== file.url ? "Prévia JPEG · original HEIC / HEIF" : "HEIC / HEIF"}</small>`
    : "";
  return `<article class="media-card">${media}<div>${label}<strong>${esc(file.name)}</strong><a href="${esc(preview)}" target="_blank" rel="noopener">${isVideo ? "Abrir vídeo" : "Abrir imagem"} ↗</a>${preview !== file.url ? `<a href="${esc(file.url)}" download="${esc(file.name)}">Baixar original</a>` : ""}</div></article>`;
}
function renderMedia() {
  const query = document.querySelector("#mediaSearch").value.toLowerCase();
  const type = document.querySelector("#mediaType").value;
  const visible = files.filter(
    (f) =>
      f.name.toLowerCase().includes(query) &&
      (!type || (video(f.name) ? "video" : "image") === type),
  );
  document.querySelector("#mediaCount").textContent =
    `${visible.length} arquivo(s)`;
  document.querySelector("#mediaGrid").innerHTML =
    visible.map(mediaCard).join("") ||
    '<p class="empty">Nenhum arquivo encontrado. Atualize o índice da pasta img ou selecione a pasta local abaixo.</p>';
  attachHeicPreviews();
}
async function directoryFiles(url, depth = 0) {
  if (depth > 8) return [];
  const response = await fetch(url);
  if (!response.ok) return [];
  const doc = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const found = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    const link = new URL(href, url);
    if (
      link.origin !== root.origin ||
      !link.pathname.startsWith(url.pathname) ||
      link.pathname === url.pathname ||
      link.search ||
      link.hash
    )
      continue;
    if (link.pathname.endsWith("/"))
      found.push(...(await directoryFiles(link, depth + 1)));
    else if (supported(link.pathname))
      found.push({
        name: decodeURIComponent(link.pathname.split("/").pop()),
        url: link.href,
      });
  }
  return found;
}
async function refresh() {
  document.querySelector("#mediaCount").textContent = "Carregando…";
  try {
    const response = await fetch(new URL("src/data/media.json", root), {
      cache: "no-store",
    });
    const indexed = response.ok ? await response.json() : [];
    files = indexed.map((file) => ({
      name: file.split("/").pop(),
      url: new URL(file.split("/").map(encodeURIComponent).join("/"), root)
        .href,
    }));
    // Live Server exposes directory listings; no build is needed in that case.
    try {
      const live = await directoryFiles(new URL("img/", root));
      if (live.length) files = live;
    } catch {}
  } catch {
    files = [];
  }
  renderMedia();
}
export function openMediaLibrary() {
  if (initialized) return;
  initialized = true;
  document.querySelector("#mediaSearch").oninput = renderMedia;
  document.querySelector("#mediaType").onchange = renderMedia;
  document.querySelector("#refreshMedia").onclick = refresh;
  document.querySelector("#selectMediaFolder").onclick = () =>
    document.querySelector("#mediaFolder").click();
  document.querySelector("#mediaFolder").onchange = (e) => {
    for (const f of files)
      if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
    files = Array.from(e.target.files)
      .filter((f) => supported(f.name))
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    renderMedia();
  };
  refresh();
}
