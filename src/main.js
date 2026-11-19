import { openHighlight, initializeHighlights } from "./views/highlights.js";
import { mountPostCarousel } from "./views/post-carousel.js";
import { postArtwork, applyArtworkFormat } from "./data/post-artworks.js";
import { mountTiktokPreview } from "./views/tiktok-preview.js";
import {
  loadUploads,
  uploaded,
  isVideoUpload,
  storeUpload,
  saveUploadToFolder,
} from "./services/uploads.js";
await loadUploads();
import { tiktokFeedMarkup } from "./views/tiktok-feed.js";
import { imagePreview } from "./utils/image-preview.js";
import { postProposal, needsProduction } from "./services/post-proposal.js";
import { postMedia } from "./data/post-media.js";
import { feedMarkup, coverUrl, postCaption } from "./views/instagram-feed.js";
import { mediaPreviews } from "./data/media-previews.js";
import { matchesPostCategory } from "./utils/post-filter.js";
import { notionPosts } from "./data/notion-posts.js";
import { openMediaLibrary } from "./views/media-library.js";
import { suggestions } from "./data/posts.js";
import { loadPosts, savePosts } from "./services/storage.js";
import { card } from "./views/post-card.js";

const $ = (selector) => document.querySelector(selector);
let posts = loadPosts([...notionPosts, ...suggestions]).map(applyArtworkFormat);
let view = "grid";
let ideas = false;
let kpis = false;
let media = false;
let editing = null;
let editEnabled = false;
let draftUploadId = "";
let storyPosts = [];
let storyIndex = 0;
let videoConversionController = null;

function save() {
  try {
    savePosts(posts);
  } catch {
    alert(
      "Não foi possível salvar neste navegador. Exporte uma cópia do planejamento.",
    );
  }
  render();
}
function filtered() {
  return posts
    .filter(
      (p) =>
        (!ideas || p.status === "Ideia") &&
        matchesPostCategory(p, $("#channel").value) &&
        (!$("#status").value || p.status === $("#status").value) &&
        `${p.title} ${p.notes} ${p.pillar}`
          .toLowerCase()
          .includes($("#search").value.toLowerCase()),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function render() {
  $("#kpisPanel").hidden = !kpis;
  $("#calendarPanel").hidden = kpis || media;
  $("#mediaPanel").hidden = !media;
  $("#new").hidden = kpis || media;
  $("main > .localnote").hidden = kpis || media;
  for (const [id, active] of [
    ["calendarNav", !ideas && !kpis && !media],
    ["ideasNav", ideas && !kpis && !media],
    ["kpisNav", kpis],
    ["mediaNav", media],
  ]) {
    const button = $("#" + id);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  $("#total").textContent = posts.length;
  $("#approved").textContent = posts.filter(
    (p) => p.status === "Aprovado",
  ).length;
  const data = filtered();
  $("#viewTitle").textContent = ideas
    ? "Banco de ideias"
    : "Calendário editorial";
  $("#viewDescription").textContent = ideas
    ? "Rascunhos para transformar em conteúdo."
    : "Cada post, uma nova conexão.";
  $("#gridView").classList.toggle("selected", view === "grid" && !ideas);
  $("#listView").classList.toggle("selected", view === "list" || ideas);
  $("#feedView").classList.toggle("selected", view === "feed" && !ideas);
  $("#tiktokView").classList.toggle("selected", view === "tiktok" && !ideas);
  if (view === "tiktok" && !ideas) {
    $("#calendar").innerHTML = tiktokFeedMarkup(data);
  } else if (view === "feed" && !ideas) {
    $("#calendar").innerHTML = feedMarkup(data);
  } else if (view === "list" || ideas) {
    $("#calendar").innerHTML =
      `<div class="list">${data.length ? data.map((p) => card(p, true)).join("") : '<div class="empty">Nenhum post por aqui. Que tal criar uma nova ideia? ✧</div>'}</div>`;
  } else {
    let html =
      '<div class="weekdays">' +
      ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
        .map((d) => `<span>${d}</span>`)
        .join("") +
      '</div><div class="grid">';
    for (let i = 0; i < 35; i++) {
      const day = i,
        valid = day >= 1 && day <= 31;
      const date = `2026-12-${String(day).padStart(2, "0")}`;
      html += `<div class="day ${valid ? "" : "outside"}" ${valid ? `data-date="${date}" tabindex="0" role="button" aria-label="Adicionar post em ${day} de dezembro"` : ""}><div class="number">${valid ? day : day === 0 ? 30 : day - 31}<span class="mobile-weekday">${valid ? ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"][i % 7] : ""}</span><em>＋</em></div>${
        valid
          ? data
              .filter((p) => p.date === date)
              .map((p) => card(p))
              .join("")
          : ""
      }</div>`;
    }
    $("#calendar").innerHTML = html + "</div>";
  }
}
function openEditor(id, date) {
  editing = id || null;
  const p = id
    ? posts.find((p) => p.id === id)
    : {
        title: "",
        date: date || "2026-12-01",
        time: "18:00",
        channel: "Instagram",
        format: "Reels",
        status: "Ideia",
        pillar: "Estilo & identidade",
        notes: "",
      };
  for (const name of [
    "title",
    "date",
    "time",
    "channel",
    "format",
    "status",
    "pillar",
    "notes",
    "cover",
  ])
    $("#form").elements[name].value = p[name] || "";
  draftUploadId = p.uploadId || "";
  $("#saveMediaFolder").hidden = !uploaded(p);
  refreshVideoActions(p);
  $("#postUploadStatus").textContent = uploaded(p)
    ? "Mídia salva neste navegador: " + uploaded(p).name
    : "Adicione a mídia aqui. Ela será salva neste navegador.";
  updatePostPreview(p);
  setEditorMode(!id);
  $("#delete").hidden = !id;
  $("#editor").showModal();
  $("#editor").scrollTop = 0;
  expandNotes();
}
$("#calendar").onclick = (e) => {
  const highlight = e.target.closest("[data-highlight]");
  if (highlight) {
    openHighlight(highlight.dataset.highlight);
    return;
  }
  const story = e.target.closest("[data-story]");
  if (story) {
    storyPosts = filtered()
      .filter((p) => p.format === "Stories")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    storyIndex = storyPosts.findIndex((p) => p.id === story.dataset.story);
    showStory();
    return;
  }

  const post = e.target.closest("[data-id]");
  if (post) return openEditor(post.dataset.id);
  const day = e.target.closest("[data-date]");
  if (day) openEditor(null, day.dataset.date);
};
$("#calendar").onkeydown = (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-date]")) {
    e.preventDefault();
    openEditor(null, e.target.dataset.date);
  }
};
$("#new").onclick = () => openEditor();
$("#close").onclick = () => $("#editor").close();
$("#form").onsubmit = (e) => {
  e.preventDefault();
  if (!editEnabled) return;
  const values = Object.fromEntries(new FormData(e.target));
  values.uploadId = draftUploadId;
  values.title = values.title.trim();
  if (!values.title) return;
  values.id = editing || crypto.randomUUID();
  if (editing)
    posts = posts.map((p) => (p.id === editing ? { ...p, ...values } : p));
  else posts.push(values);
  save();
  $("#editor").close();
};
$("#delete").onclick = () => {
  if (confirm("Excluir este post do planejamento?")) {
    posts = posts.filter((p) => p.id !== editing);
    save();
    $("#editor").close();
  }
};
for (const id of ["search", "channel", "status"])
  $("#" + id).addEventListener("input", render);
$("#gridView").onclick = () => {
  view = "grid";
  ideas = false;
  render();
};
$("#listView").onclick = () => {
  view = "list";
  render();
};
$("#ideasNav").onclick = () => {
  media = false;
  kpis = false;
  ideas = true;
  render();
};
$("#calendarNav").onclick = () => {
  media = false;
  kpis = false;
  ideas = false;
  view = "grid";
  render();
};
$("#kpisNav").onclick = () => {
  media = false;
  kpis = true;
  ideas = false;
  render();
};
$("#export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "charmy-dezembro-2026.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#import").onclick = () => $("#importFile").click();
$("#importFile").onchange = async (e) => {
  try {
    const incoming = JSON.parse(await e.target.files[0].text());
    const statuses = ["Ideia", "Em produção", "Aprovado", "Publicado"];
    if (
      !Array.isArray(incoming) ||
      incoming.some(
        (p) =>
          !p ||
          typeof p.title !== "string" ||
          !/^2026-12-(0[1-9]|[12]\d|3[01])$/.test(p.date) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) ||
          !statuses.includes(p.status) ||
          !["Instagram", "TikTok", "WhatsApp"].includes(p.channel) ||
          !["Reels", "Carrossel", "Stories", "Vídeo", "Imagem"].includes(
            p.format,
          ) ||
          ![
            "Estilo & identidade",
            "Comunidade",
            "Bastidores",
            "Produto",
          ].includes(p.pillar) ||
          typeof p.notes !== "string",
      )
    )
      throw Error();
    if (confirm("Substituir o planejamento atual pelo arquivo?")) {
      posts = incoming.map((p) => applyArtworkFormat({ ...p, id: crypto.randomUUID() }));
      save();
    }
  } catch {
    alert(
      "Arquivo inválido. Use um JSON exportado deste calendário de dezembro de 2026.",
    );
  }
  e.target.value = "";
};
// Existing browser records are only changed when the user requests it.
$("#addScripts").onclick = () => {
  const missing = suggestions.filter(
    (script) =>
      !posts.some(
        (post) => post.id === script.id || post.source === script.source,
      ),
  );
  if (!missing.length) {
    alert("Os seis roteiros já estão no planejamento.");
    return;
  }
  if (
    confirm(
      `Adicionar ${missing.length} roteiro(s) do PDF sem remover os posts atuais? As datas e horários são sugestões.`,
    )
  ) {
    posts.push(...missing.map((script) => ({ ...script })));
    save();
  }
};
render();

$("#mediaNav").onclick = () => {
  media = true;
  kpis = false;
  ideas = false;
  render();
  openMediaLibrary();
};

$("#addNotion").onclick = () => {
  const missing = notionPosts.filter(
    (item) =>
      !posts.some((post) => post.id === item.id || post.source === item.source),
  );
  if (!missing.length)
    return alert("Os posts do Notion já estão no calendário.");
  if (
    confirm(
      `Adicionar ${missing.length} posts do Notion, preservando os posts atuais?`,
    )
  ) {
    posts.push(...missing.map((item) => ({ ...item })));
    save();
  }
};

function expandNotes() {
  const notes = $("#form").elements.notes;
  notes.style.height = "auto";
  notes.style.height = `${notes.scrollHeight + 2}px`;
}
$("#form").elements.notes.addEventListener("input", expandNotes);
window.addEventListener("resize", () => {
  if ($("#editor").open) expandNotes();
});

function setEditorMode(enabled) {
  editEnabled = enabled;
  $("#briefingDetails").open = enabled;
  $("#editor").classList.toggle("reading", !enabled);
  $("#postPreview").hidden = enabled || !editing;
  $("#modalTitle").textContent = enabled
    ? editing
      ? "Editar post"
      : "Novo post"
    : "Detalhes do post";
  for (const field of $("#form").querySelectorAll(
    "input[name], select[name], textarea[name]",
  )) {
    field.disabled = !enabled;
    let display = field.parentElement.querySelector(".field-value");
    if (!display) {
      display = document.createElement("span");
      display.className = "field-value";
      field.parentElement.append(display);
    }
    display.textContent =
      field.name === "cover"
        ? field.selectedOptions[0]?.textContent || "Sem capa"
        : field.name === "date"
          ? field.value.split("-").reverse().join("/")
          : field.value || "Não informado";
    display.classList.toggle("notes-value", field.name === "notes");
    display.hidden = enabled;
  }
  $("#editPost").hidden = enabled;
  $("#savePost").hidden = !enabled;
  $("#cancelEdit").hidden = !enabled || !editing;
  $("#delete").hidden = !enabled || !editing;
}
$("#editPost").onclick = () => {
  setEditorMode(true);
  expandNotes();
};
$("#cancelEdit").onclick = () => openEditor(editing);

for (const original of Object.keys(mediaPreviews)) {
  const option = document.createElement("option");
  option.value = original;
  option.textContent = original.split("/").pop();
  $("#postCover").append(option);
}
$("#feedView").onclick = () => {
  view = "feed";
  ideas = false;
  render();
};
function updatePostPreview(post) {
  const preview = $("#postPreview");
  $("#editor").classList.toggle("tiktok-dialog", view === "tiktok");
  $("#editor").classList.remove("tiktok-landscape");
  preview.classList.toggle("tiktok-preview", view === "tiktok");
  preview.classList.remove("native-video-mode");
  $("#nativePlayerButton").textContent = "Usar controles do navegador";
  preview
    .querySelectorAll(".tt-ratio-controls")
    .forEach((element) => element.remove());
  $("#postPreviewImage").querySelector("video")?.pause();
  const image = $("#postPreviewImage");
  image.onclick = null;
  image.replaceChildren();
  const hasCarousel = view !== "tiktok" && mountPostCarousel(image, post);
  const artwork = postArtwork(post);
  const download = $("#postCarouselDownload");
  const proposal = postProposal(post);
  $("#postProductionNote").hidden = !needsProduction(post);
  download.hidden = !artwork && !postMedia(post) && !proposal;
  if (proposal) {
    download.href = proposal.src;
    download.download = `charmy-capa-sugerida-${post.source || post.id}.png`;
    download.textContent = "Baixar capa sugerida";
  }
  if (!artwork && postMedia(post)) {
    download.href = postMedia(post).cover;
    download.download = `charmy-capa-reels-${post.date}.png`;
    download.textContent = "Baixar capa do Reels";
  }
  if (artwork) {
    download.href = artwork.download;
    download.download = artwork.download.split("/").pop();
    download.textContent = artwork.slides.length > 1
      ? "Baixar carrossel completo" : "Baixar arte";
  }
  const url = coverUrl(post);
  if (!hasCarousel && url) {
    const isVideo = isVideoUpload(post);
    const img = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      img.controls = true;
      img.playsInline = true;
      img.preload = "none";
      if (postMedia(post)) img.poster = imagePreview(postMedia(post).cover);
    }
    img.src = url;
    img.alt = post.title;
    image.append(img);
  } else if (!hasCarousel) {
    const placeholder = document.createElement("div");
    placeholder.className = "feed-placeholder";
    placeholder.textContent = post.title + " · Escolha uma capa em Editar post";
    image.append(placeholder);
  }
  $("#postPreview")
    .querySelectorAll(".tiktok-overlay")
    .forEach((el) => el.remove());
  if (view === "tiktok") mountTiktokPreview(preview, image, post);
  $("#postPreviewCaption").textContent =
    postCaption(post) ||
    "Legenda ainda não definida. O roteiro completo está disponível abaixo.";
}

$("#tiktokView").onclick = () => {
  view = "tiktok";
  ideas = false;
  render();
};

$("#uploadPost").onclick = () => $("#postUploadFile").click();
$("#postUploadFile").onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const status = $("#postUploadStatus");
  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/") &&
    !/\.(heic|heif|mp4|mov|m4v|webm|ogv|avi|mkv)$/i.test(file.name)
  ) {
    status.textContent = "Selecione uma imagem ou vídeo.";
    return;
  }
  status.textContent = "Salvando mídia…";
  try {
    let previewFile = file;
    if (/\.(heic|heif)$/i.test(file.name)) {
      const converted = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      previewFile = new File(
        [Array.isArray(converted) ? converted[0] : converted],
        file.name + ".jpg",
        { type: "image/jpeg" },
      );
    }
    const id = crypto.randomUUID();
    await storeUpload(id, previewFile);
    draftUploadId = id;
    if (editing) {
      posts = posts.map((p) => (p.id === editing ? { ...p, uploadId: id } : p));
      save();
    }
    const current = editing
      ? posts.find((p) => p.id === editing)
      : {
          title: $("#form").elements.title.value,
          notes: $("#form").elements.notes.value,
          uploadId: id,
        };
    refreshVideoActions(current);
    updatePostPreview(current);
    $("#saveMediaFolder").hidden = false;
    status.textContent =
      "Mídia salva neste navegador. Você também pode guardar uma cópia na pasta img.";
  } catch {
    status.textContent =
      "Não foi possível salvar a mídia. Verifique espaço no navegador e o formato do arquivo.";
  }
  event.target.value = "";
};
$("#saveMediaFolder").onclick = async () => {
  try {
    const item = uploaded({ uploadId: draftUploadId });
    if (item)
      $("#postUploadStatus").textContent = await saveUploadToFolder(item);
  } catch (error) {
    if (error.name !== "AbortError")
      $("#postUploadStatus").textContent =
        "Não foi possível gravar. Verifique a permissão da pasta.";
  }
};
function showStory() {
  const post = storyPosts[storyIndex];
  if (!post) return;
  const container = $("#storyMedia");
  container.querySelector("video")?.pause();
  container.replaceChildren();
  const url = coverUrl(post);
  if (url) {
    const video = isVideoUpload(post);
    const element = document.createElement(video ? "video" : "img");
    element.src = url;
    if (video) {
      element.controls = true;
      element.playsInline = true;
    } else element.alt = post.title;
    container.append(element);
  } else
    container.textContent =
      post.title + " · Adicione a mídia em detalhes do post";
  const dateText = post.date.split("-").reverse().join("/");
  $("#storyDate").dateTime = post.date;
  $("#storyDate").textContent = dateText + (post.time ? " · " + post.time : "");
  $("#storyPosition").textContent = `${storyIndex + 1} de ${storyPosts.length}`;
  $("#storyTitle").textContent =
    post.title + " · " + post.date.slice(8) + "/12";
  $("#prevStory").disabled = storyIndex === 0;
  $("#nextStory").disabled = storyIndex === storyPosts.length - 1;
  $(".story-progress").textContent = storyPosts
    .map((_, i) => (i === storyIndex ? "━━━━" : "────"))
    .join(" ");
  if (!$("#storyViewer").open) $("#storyViewer").showModal();
}
$("#prevStory").onclick = () => {
  if (storyIndex > 0) {
    storyIndex--;
    showStory();
  }
};
$("#nextStory").onclick = () => {
  if (storyIndex < storyPosts.length - 1) {
    storyIndex++;
    showStory();
  }
};
$("#closeStory").onclick = () => {
  $("#storyViewer").close();
  $("#storyMedia").querySelector("video")?.pause();
};
$("#storyViewer").addEventListener("close", () =>
  $("#storyMedia").querySelector("video")?.pause(),
);
$("#storyViewer").addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") $("#nextStory").click();
  if (e.key === "ArrowLeft") $("#prevStory").click();
});
$("#editStory").onclick = () => {
  const post = storyPosts[storyIndex];
  $("#storyViewer").close();
  openEditor(post.id);
};

$("#editor").addEventListener("close", () =>
  $("#postPreviewImage").querySelector("video")?.pause(),
);

function refreshVideoActions(post) {
  const hasVideo = isVideoUpload(post);
  $("#convertPostVideo").hidden = !hasVideo;
  $("#nativePlayerButton").hidden = !hasVideo;
}
$("#nativePlayerButton").onclick = () => {
  const video = $("#postPreviewImage").querySelector("video");
  if (!video) return;
  $("#postPreview").classList.toggle("native-video-mode");
  video.controls = $("#postPreview").classList.contains("native-video-mode");
  $("#nativePlayerButton").textContent = video.controls
    ? "Voltar ao player TikTok"
    : "Usar controles do navegador";
};
$("#postPreview").addEventListener("media-playback-error", (event) => {
  $("#postUploadStatus").textContent = event.detail.message;
});
$("#convertPostVideo").onclick = async () => {
  if (videoConversionController) return;
  const item = uploaded({ uploadId: draftUploadId });
  if (!item) return;
  const controller = new AbortController();
  videoConversionController = controller;
  const status = $("#postUploadStatus");
  $("#convertPostVideo").disabled = true;
  $("#uploadPost").disabled = true;
  $("#cancelVideoConversion").hidden = false;
  $("#postPreviewImage").querySelector("video")?.pause();
  try {
    const { convertToMp4 } = await import("./services/video-conversion.js");
    const converted = await convertToMp4(item.originalFile || item.file, {
      signal: controller.signal,
      onProgress: (message) => {
        status.textContent = message;
      },
    });
    if (controller.signal.aborted) return;
    await storeUpload(item.id, converted, item.originalFile || item.file);
    const current = editing
      ? posts.find((post) => post.id === editing)
      : {
          title: $("#form").elements.title.value,
          notes: $("#form").elements.notes.value,
          uploadId: draftUploadId,
        };
    render();
    updatePostPreview(current);
    status.textContent =
      "Vídeo convertido para MP4/H.264 e salvo neste navegador. Pressione reproduzir. O original foi preservado.";
  } catch (error) {
    status.textContent = controller.signal.aborted
      ? "Conversão cancelada. O vídeo original foi preservado."
      : error.message ||
        "Não foi possível converter. Tente pelo computador ou use um MP4/H.264.";
  } finally {
    videoConversionController = null;
    $("#convertPostVideo").disabled = false;
    $("#uploadPost").disabled = false;
    $("#cancelVideoConversion").hidden = true;
  }
};
$("#cancelVideoConversion").onclick = () => videoConversionController?.abort();
$("#editor").addEventListener("close", () =>
  videoConversionController?.abort(),
);

initializeHighlights();

function openArtworkLibraryFromHash() {
  if (window.location?.hash !== "#artes") return;
  $("#mediaNav").click();
  $("#mediaSearch").value = "";
  $("#mediaType").value = "art";
  $("#mediaType").onchange?.();
}
window.addEventListener("hashchange", openArtworkLibraryFromHash);
openArtworkLibraryFromHash();
