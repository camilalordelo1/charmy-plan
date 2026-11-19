import { highlights } from "../data/highlights.js";
import { esc } from "../utils/html.js";
const folder = "src/assets/highlights/";
let activeIndex = 0;
let activeSlide = 0;
export function highlightsMarkup() {
  return `<section class="profile-highlights" aria-label="Destaques do Instagram"><div class="profile-highlights-row">${highlights.map((item) => `<button type="button" class="profile-highlight" data-highlight="${item.id}" aria-label="Abrir destaque ${esc(item.title)}"><span class="highlight-cover"><img src="${folder + item.file}" alt="Capa de ${esc(item.title)}" width="1254" height="1254" loading="lazy"></span><span class="highlight-label">${esc(item.title)}</span></button>`).join("")}</div><a class="highlight-download-all" href="${folder}capas-destaques.zip" download="charmy-capas-destaques.zip">Baixar capas 1:1 ↓</a></section>`;
}
function renderHighlight() {
  const item = highlights[activeIndex];
  const hasSlides = Boolean(item.slides?.length);
  const slide = hasSlides
    ? item.slides[activeSlide]
    : {
        file: item.file,
        title: "Capa de " + item.title,
        alt: "Capa de " + item.title,
        width: 1254,
        height: 1254,
      };
  const dialog = document.querySelector("#highlightViewer");
  dialog.classList.toggle("has-highlight-stories", hasSlides);
  dialog.scrollTop = 0;
  const image = document.querySelector("#highlightViewerImage");
  image.src = folder + slide.file;
  image.alt = slide.alt;
  image.width = slide.width;
  image.height = slide.height;
  document.querySelector("#highlightViewerTitle").textContent = item.title;
  document.querySelector("#highlightViewerKicker").textContent = hasSlides
    ? item.subtitle || "Conteúdo do destaque"
    : "Capa do destaque";
  document.querySelector("#highlightSlideTitle").textContent = slide.title;
  document.querySelector("#highlightSlideTitle").hidden = !hasSlides;
  document.querySelector("#highlightPosition").textContent = hasSlides
    ? `${activeSlide + 1} de ${item.slides.length}`
    : `${activeIndex + 1} de ${highlights.length}`;
  const progress = document.querySelector("#highlightProgress");
  progress.hidden = !hasSlides;
  progress.replaceChildren();
  if (hasSlides)
    item.slides.forEach((_, index) => {
      const step = document.createElement("span");
      step.classList.toggle("active", index === activeSlide);
      progress.append(step);
    });
  const download = document.querySelector("#downloadHighlight");
  download.href = folder + slide.file;
  download.download = slide.file.split("/").pop();
  download.textContent = hasSlides
    ? "Baixar esta tela ↓"
    : "Baixar capa quadrada ↓";
  const full = document.querySelector("#openHighlightFull");
  full.href = folder + slide.file;
  full.hidden = !hasSlides;
  const previous = document.querySelector("#previousHighlight");
  const next = document.querySelector("#nextHighlight");
  previous.disabled = hasSlides ? activeSlide === 0 : activeIndex === 0;
  next.disabled = hasSlides
    ? activeSlide === item.slides.length - 1
    : activeIndex === highlights.length - 1;
  previous.setAttribute(
    "aria-label",
    hasSlides ? "Tela anterior" : "Destaque anterior",
  );
  next.setAttribute(
    "aria-label",
    hasSlides ? "Próxima tela" : "Próximo destaque",
  );
}
export function openHighlight(id) {
  const index = highlights.findIndex((item) => item.id === id);
  if (index < 0) return;
  activeIndex = index;
  activeSlide = 0;
  renderHighlight();
  document.querySelector("#highlightViewer").showModal();
}
export function initializeHighlights() {
  const dialog = document.querySelector("#highlightViewer");
  document.querySelector("#closeHighlight").onclick = () => dialog.close();
  document.querySelector("#previousHighlight").onclick = () => {
    const item = highlights[activeIndex];
    if (item.slides?.length) {
      if (activeSlide === 0) return;
      activeSlide--;
    } else {
      if (activeIndex === 0) return;
      activeIndex--;
      activeSlide = 0;
    }
    renderHighlight();
  };
  document.querySelector("#nextHighlight").onclick = () => {
    const item = highlights[activeIndex];
    if (item.slides?.length) {
      if (activeSlide === item.slides.length - 1) return;
      activeSlide++;
    } else {
      if (activeIndex === highlights.length - 1) return;
      activeIndex++;
      activeSlide = 0;
    }
    renderHighlight();
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
