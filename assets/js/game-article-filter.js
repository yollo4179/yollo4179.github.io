(() => {
  "use strict";

  const filter = document.querySelector("[data-game-tag-filter]");
  const buttonList = document.querySelector("[data-game-tag-buttons]");
  const result = document.querySelector("[data-game-tag-result]");
  const cards = [...document.querySelectorAll("[data-game-article]")];
  const groups = [...document.querySelectorAll("[data-game-topic]")];

  if (!(filter instanceof HTMLElement) || !(buttonList instanceof HTMLElement) ||
      !(result instanceof HTMLElement) || cards.length === 0) {
    return;
  }

  const cardTags = (card) => (card.dataset.tags ?? "").split("|").filter(Boolean);
  const tags = [...new Set(cards.flatMap(cardTags))].sort((a, b) => a.localeCompare(b, "ko"));
  const options = ["전체", ...tags];

  const applyFilter = (selected) => {
    let visibleCount = 0;
    cards.forEach((card) => {
      const show = selected === "전체" || cardTags(card).includes(selected);
      card.hidden = !show;
      if (show) visibleCount += 1;
    });
    groups.forEach((group) => {
      group.hidden = !group.querySelector("[data-game-article]:not([hidden])");
    });
    buttonList.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.tag === selected));
    });
    result.textContent = `${selected} · 기술 글 ${visibleCount}편`;
  };

  options.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-tag-filter__button";
    button.dataset.tag = tag;
    button.textContent = tag;
    button.addEventListener("click", () => applyFilter(tag));
    buttonList.append(button);
  });

  filter.hidden = false;
  applyFilter("전체");
})();
