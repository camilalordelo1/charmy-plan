import { esc } from "../utils/html.js";
let files = [];
let initialized = false;
const video = (name) => /\.(mp4|webm|mov|m4v|ogv)$/i.test(name);
const supported = (name) =>
  /\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|m4v|ogv)$/i.test(name);
const root = new URL("../../", import.meta.url);
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
    visible
      .map(
        (f) =>
          `<article class="media-card">${video(f.name) ? `<video controls preload="metadata" src="${esc(f.url)}"></video>` : `<img loading="lazy" src="${esc(f.url)}" alt="${esc(f.name)}">`}<div><strong>${esc(f.name)}</strong><a href="${esc(f.url)}" target="_blank" rel="noopener">Abrir arquivo ↗</a></div></article>`,
      )
      .join("") ||
    '<p class="empty">Nenhum arquivo encontrado. Atualize o índice da pasta img ou selecione a pasta local abaixo.</p>';
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
