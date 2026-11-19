import { highlights } from "../data/highlights.js";
import { esc } from "../utils/html.js";
const folder = "src/assets/highlights/";
let activeIndex = 0;
export function highlightsMarkup() {
  return `<section class="profile-highlights" aria-label="Destaques do Instagram"><div class="profile-highlights-row">${highlights.map((item) => `<button type="button" class="profile-highlight" data-highlight="${item.id}" aria-label="Abrir destaque ${esc(item.title)}"><span class="highlight-cover"><img src="${folder + item.file}" alt="Capa de ${esc(item.title)}" width="1254" height="1254" loading="lazy"></span><span class="highlight-label">${esc(item.title)}</span></button>`).join("")}</div><a class="highlight-download-all" href="${folder}capas-destaques.zip" download="charmy-capas-destaques.zip">Baixar capas 1:1 ↓</a></section>`;
}
function renderHighlight() {
  const item = highlights[activeIndex];
  const image = document.querySelector("#highlightViewerImage");
  image.src = folder + item.file;
  image.alt = "Capa de " + item.title;
  document.querySelector("#highlightViewerTitle").textContent = item.title;
  document.querySelector("#highlightPosition").textContent =
    `${activeIndex + 1} de ${highlights.length}`;
  const download = document.querySelector("#downloadHighlight");
  download.href = folder + item.file;
  download.download = item.file;
  document.querySelector("#previousHighlight").disabled = activeIndex === 0;
  document.querySelector("#nextHighlight").disabled =
    activeIndex === highlights.length - 1;
}
export function openHighlight(id) {
  const index = highlights.findIndex((item) => item.id === id);
  if (index < 0) return;
  activeIndex = index;
  renderHighlight();
  document.querySelector("#highlightViewer").showModal();
}
export function initializeHighlights() {
  const dialog = document.querySelector("#highlightViewer");
  document.querySelector("#closeHighlight").onclick = () => dialog.close();
  document.querySelector("#previousHighlight").onclick = () => {
    if (activeIndex > 0) {
      activeIndex--;
      renderHighlight();
    }
  };
  document.querySelector("#nextHighlight").onclick = () => {
    if (activeIndex < highlights.length - 1) {
      activeIndex++;
      renderHighlight();
    }
  };
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      document.querySelector("#previousHighlight").click();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      document.querySelector("#nextHighlight").click();
    }
  });
}
