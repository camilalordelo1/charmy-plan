import { imagePreview } from "../utils/image-preview.js";
import { postArtwork } from "../data/post-artworks.js";
import { mediaPreviews } from "../data/media-previews.js";
import { uploaded } from "../services/uploads.js";

export function mountPostCarousel(container, post) {
  const artwork = postArtwork(post);
  if (!artwork || artwork.slides.length < 2 || uploaded(post) || mediaPreviews[post.cover]) return false;
  let index = 0;
  let touchStart = null;
  const carousel = document.createElement("div");
  carousel.className = "post-carousel";
  carousel.setAttribute("role", "region");
  carousel.setAttribute("aria-label", artwork.title);
  const image = document.createElement("img");
  image.width = artwork.width;
  image.height = artwork.height;
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "carousel-previous";
  previous.setAttribute("aria-label", "Imagem anterior");
  previous.textContent = "‹";
  const next = document.createElement("button");
  next.type = "button";
  next.className = "carousel-next";
  next.setAttribute("aria-label", "Próxima imagem");
  next.textContent = "›";
  const position = document.createElement("span");
  position.className = "carousel-position";
  position.setAttribute("role", "status");
  position.setAttribute("aria-live", "polite");
  const dots = document.createElement("div");
  dots.className = "carousel-dots";
  const steps = artwork.slides.map((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Ver imagem ${i + 1}`);
    button.onclick = () => show(i);
    dots.append(button);
    return button;
  });
  function show(target) {
    index = Math.max(0, Math.min(artwork.slides.length - 1, target));
    image.src = imagePreview(artwork.slides[index].src);
    image.alt = artwork.slides[index].alt;
    previous.disabled = index === 0;
    next.disabled = index === artwork.slides.length - 1;
    position.textContent = `${index + 1} / ${artwork.slides.length}`;
    steps.forEach((step, i) => step.setAttribute("aria-current", String(i === index)));
  }
  previous.onclick = () => show(index - 1);
  next.onclick = () => show(index + 1);
  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    show(index + (event.key === "ArrowRight" ? 1 : -1));
  });
  carousel.addEventListener("touchstart", (event) => {
    touchStart = event.changedTouches[0].clientX;
  }, { passive: true });
  carousel.addEventListener("touchend", (event) => {
    if (touchStart === null) return;
    const distance = touchStart - event.changedTouches[0].clientX;
    if (Math.abs(distance) > 40) show(index + (distance > 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  carousel.append(image, previous, next, position, dots);
  container.append(carousel);
  show(0);
  return true;
}
