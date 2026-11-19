import { imagePreview } from "../utils/image-preview.js";
import { highlights } from "../data/highlights.js";
import { esc } from "../utils/html.js";
const folder = "src/assets/highlights/";
const duration = 12000;
const $ = (selector) => document.querySelector(selector);
let activeIndex = 0;
let activeSlide = 0;
let elapsed = 0;
let paused = false;
let timer;
let touchStart = null;
const liked = new Set();

export function highlightsMarkup() {
  return `<section class="profile-highlights" aria-label="Destaques do Instagram"><div class="profile-highlights-row">${highlights.map((item) => `<button type="button" class="profile-highlight" data-highlight="${item.id}" aria-label="Abrir destaque ${esc(item.title)}"><span class="highlight-cover"><img src="${imagePreview(folder + item.file, "thumb")}" alt="Capa de ${esc(item.title)}" width="1254" height="1254" loading="lazy"></span><span class="highlight-label">${esc(item.title)}</span></button>`).join("")}</div><a class="highlight-download-all" href="${folder}capas-destaques.zip" download="charmy-capas-destaques.zip">Baixar capas 1:1 ↓</a></section>`;
}
function currentSlides() {
  const item = highlights[activeIndex];
  return item.slides?.length ? item.slides : [{ file: item.file, title: item.title, alt: `Capa de ${item.title}`, width: 1254, height: 1254 }];
}
function likeKey() {
  return `${highlights[activeIndex].id}/${activeSlide}`;
}
function setPaused(value) {
  paused = value;
  const button = $("#pauseHighlight");
  button.setAttribute("aria-pressed", String(paused));
  button.setAttribute("aria-label", paused ? "Reproduzir Stories" : "Pausar Stories");
  button.innerHTML = paused
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
}
function renderHighlight() {
  const item = highlights[activeIndex];
  const slides = currentSlides();
  const slide = slides[activeSlide];
  elapsed = 0;
  $("#highlightViewer").classList.toggle("has-highlight-stories", Boolean(item.slides?.length));
  const image = $("#highlightViewerImage");
  image.src = imagePreview(folder + slide.file);
  image.alt = slide.alt;
  image.width = slide.width;
  image.height = slide.height;
  $("#highlightViewerTitle").textContent = item.title;
  $("#highlightViewerKicker").textContent = "charmyclube";
  $("#highlightSlideTitle").textContent = slide.title;
  $("#highlightPosition").textContent = `${activeSlide + 1} de ${slides.length}`;
  const progress = $("#highlightProgress");
  progress.replaceChildren();
  slides.forEach((_, index) => {
    const step = document.createElement("span");
    step.classList.toggle("active", index === activeSlide);
    step.classList.toggle("complete", index < activeSlide);
    step.append(document.createElement("i"));
    progress.append(step);
  });
  $("#downloadHighlight").href = folder + slide.file;
  $("#downloadHighlight").download = slide.file.split("/").pop();
  $("#openHighlightFull").href = folder + slide.file;
  $("#previousHighlight").disabled = activeSlide === 0;
  $("#nextHighlight").disabled = activeSlide === slides.length - 1;
  $("#likeHighlight").setAttribute("aria-pressed", String(liked.has(likeKey())));
  $("#highlightMenu").hidden = true;
  $("#highlightMenuToggle").setAttribute("aria-expanded", "false");
}
function advance(direction) {
  const target = activeSlide + direction;
  if (target < 0 || target >= currentSlides().length) return;
  activeSlide = target;
  renderHighlight();
}
function startPlayback() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!$("#highlightViewer").open || paused || document.hidden) return;
    elapsed = Math.min(duration, elapsed + 100);
    const bar = $("#highlightProgress .active i");
    if (bar) bar.style.width = `${(elapsed / duration) * 100}%`;
    if (elapsed < duration) return;
    if (activeSlide < currentSlides().length - 1) advance(1);
    else setPaused(true);
  }, 100);
}
export function openHighlight(id) {
  const index = highlights.findIndex((item) => item.id === id);
  if (index < 0) return;
  activeIndex = index;
  activeSlide = 0;
  renderHighlight();
  setPaused(false);
  if (!$("#highlightViewer").open) $("#highlightViewer").showModal();
  startPlayback();
}
export function initializeHighlights() {
  const dialog = $("#highlightViewer");
  $("#closeHighlight").onclick = () => {
    clearInterval(timer);
    dialog.close();
  };
  dialog.addEventListener("close", () => clearInterval(timer));
  $("#previousHighlight").onclick = () => advance(-1);
  $("#nextHighlight").onclick = () => advance(1);
  $("#pauseHighlight").onclick = () => {
    if (paused && elapsed === duration) elapsed = 0;
    setPaused(!paused);
  };
  $("#highlightMenuToggle").onclick = () => {
    const opening = $("#highlightMenu").hidden;
    $("#highlightMenu").hidden = !opening;
    $("#highlightMenuToggle").setAttribute("aria-expanded", String(opening));
    setPaused(opening);
  };
  $("#likeHighlight").onclick = () => {
    const key = likeKey();
    if (liked.has(key)) liked.delete(key);
    else liked.add(key);
    $("#likeHighlight").setAttribute("aria-pressed", String(liked.has(key)));
  };
  const image = $("#highlightViewerImage");
  image.onclick = (event) => {
    const rect = image.getBoundingClientRect();
    advance(event.clientX - rect.left < rect.width / 3 ? -1 : 1);
  };
  image.addEventListener("touchstart", (event) => {
    touchStart = event.changedTouches[0].clientX;
  }, { passive: true });
  image.addEventListener("touchend", (event) => {
    if (touchStart === null) return;
    const distance = touchStart - event.changedTouches[0].clientX;
    if (Math.abs(distance) > 40) {
      advance(distance > 0 ? 1 : -1);
      // Prevent a synthesized click from advancing a second time after a swipe.
      event.preventDefault();
    }
    touchStart = null;
  }, { passive: false });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      advance(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === " " && event.target === dialog) {
      event.preventDefault();
      $("#pauseHighlight").click();
    }
  });
}
