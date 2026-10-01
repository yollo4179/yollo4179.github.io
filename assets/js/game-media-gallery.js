(() => {
  "use strict";

  const galleries = [...document.querySelectorAll(".game-media-gallery")];
  if (!galleries.length || typeof HTMLDialogElement === "undefined") return;

  const dialog = document.createElement("dialog");
  dialog.className = "game-gallery-viewer";
  dialog.setAttribute("aria-label", "이미지 확대 보기");
  const header = document.createElement("div");
  header.className = "game-gallery-viewer__header";
  const count = document.createElement("span");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "game-gallery-viewer__close";
  close.textContent = "닫기 ×";
  close.setAttribute("aria-label", "이미지 확대 보기 닫기");
  header.append(count, close);

  const stage = document.createElement("div");
  stage.className = "game-gallery-viewer__stage";
  const photo = document.createElement("img");
  photo.draggable = false;
  stage.append(photo);
  const navigation = document.createElement("div");
  navigation.className = "game-gallery-viewer__navigation";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "←";
  previous.setAttribute("aria-label", "이전 사진");
  const caption = document.createElement("p");
  caption.id = "game-gallery-viewer-caption";
  caption.setAttribute("aria-live", "polite");
  caption.setAttribute("aria-atomic", "true");
  photo.setAttribute("aria-describedby", caption.id);
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "→";
  next.setAttribute("aria-label", "다음 사진");
  navigation.append(previous, caption, next);
  dialog.append(header, stage, navigation);
  document.body.append(dialog);

  let items = [];
  let current = 0;
  let opener = null;
  const render = () => {
    const item = items[current];
    photo.src = item.url;
    photo.alt = item.caption;
    caption.textContent = item.caption;
    count.textContent = `${current + 1} / ${items.length}`;
    previous.disabled = next.disabled = items.length < 2;
  };
  const move = (direction) => {
    if (items.length < 2) return;
    current = (current + direction + items.length) % items.length;
    render();
  };

  galleries.forEach((gallery) => {
    const links = [...gallery.querySelectorAll("figure > a")];
    links.forEach((link, index) => {
      link.setAttribute("aria-haspopup", "dialog");
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        items = links.map((entry) => ({
          url: entry.href,
          caption: entry.closest("figure").querySelector("figcaption")?.textContent.trim()
            || entry.querySelector("img")?.alt || "이미지",
        }));
        current = index;
        opener = link;
        render();
        dialog.showModal();
        document.body.classList.add("game-gallery-open");
        close.focus({ preventScroll: true });
      });
    });
  });

  close.addEventListener("click", () => dialog.close());
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
    if (event.key === "Tab") {
      const buttons = [...dialog.querySelectorAll("button:not(:disabled)")];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("game-gallery-open");
    photo.removeAttribute("src");
    opener?.focus({ preventScroll: true });
  });
})();
