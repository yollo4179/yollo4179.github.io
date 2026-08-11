(() => {
  "use strict";

  const ALL_FILTER = "all";
  const filterContainer = document.querySelector("[data-tag-filters]");
  const projectCards = [...document.querySelectorAll("[data-project-card]")];
  const projectResults = document.querySelector("[data-project-results]");
  const emptyState = document.querySelector("[data-empty-state]");

  if (
    !(filterContainer instanceof HTMLElement) ||
    !(projectResults instanceof HTMLElement) ||
    !(emptyState instanceof HTMLElement) ||
    projectCards.length === 0
  ) {
    return;
  }

  const getProjectTags = (projectCard) =>
    (projectCard.dataset.tags ?? "")
      .split("|")
      .map((tag) => tag.trim())
      .filter(Boolean);

  const availableTags = [
    ...new Set(projectCards.flatMap((projectCard) => getProjectTags(projectCard))),
  ].sort((firstTag, secondTag) => firstTag.localeCompare(secondTag, "ko"));

  const createFilterButton = (label, filterValue, isActive = false) => {
    const filterButton = document.createElement("button");
    filterButton.className = "tag-filter";
    filterButton.type = "button";
    filterButton.textContent = label;
    filterButton.dataset.filterValue = filterValue;
    filterButton.setAttribute("aria-pressed", String(isActive));
    filterButton.classList.toggle("is-active", isActive);
    return filterButton;
  };

  const renderFilterButtons = () => {
    const filterButtons = document.createDocumentFragment();
    filterButtons.append(createFilterButton("전체", ALL_FILTER, true));

    availableTags.forEach((tag) => {
      filterButtons.append(createFilterButton(tag, tag));
    });

    filterContainer.replaceChildren(filterButtons);
  };

  const updateFilterButtonState = (selectedFilter) => {
    filterContainer.querySelectorAll("[data-filter-value]").forEach((filterButton) => {
      const isActive = filterButton.dataset.filterValue === selectedFilter;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
  };

  const filterProjects = (selectedFilter) => {
    const visibleProjects = projectCards.filter((projectCard) => {
      const isVisible =
        selectedFilter === ALL_FILTER || getProjectTags(projectCard).includes(selectedFilter);
      projectCard.hidden = !isVisible;
      return isVisible;
    });

    const resultLabel = selectedFilter === ALL_FILTER ? "전체" : selectedFilter;
    projectResults.textContent = `${resultLabel} 프로젝트 ${visibleProjects.length}개`;
    emptyState.hidden = visibleProjects.length > 0;
    updateFilterButtonState(selectedFilter);
  };

  filterContainer.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const filterButton = event.target.closest("[data-filter-value]");

    if (!(filterButton instanceof HTMLButtonElement)) {
      return;
    }

    filterProjects(filterButton.dataset.filterValue ?? ALL_FILTER);
  });

  renderFilterButtons();
})();
