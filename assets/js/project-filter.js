(() => {
  "use strict";

  const ALL_FILTER = "all";
  const projectFilter = document.querySelector("[data-project-filter]");
  const technologyOptions = document.querySelector("[data-technology-options]");
  const domainSummary = document.querySelector("[data-domain-summary]");
  const technologySummary = document.querySelector("[data-technology-summary]");
  const filterSelection = document.querySelector("[data-filter-selection]");
  const filterReset = document.querySelector("[data-filter-reset]");
  const projectCards = [...document.querySelectorAll("[data-project-card]")];
  const projectResults = document.querySelector("[data-project-results]");
  const emptyState = document.querySelector("[data-empty-state]");

  if (
    !(projectFilter instanceof HTMLElement) ||
    !(technologyOptions instanceof HTMLElement) ||
    !(domainSummary instanceof HTMLElement) ||
    !(technologySummary instanceof HTMLElement) ||
    !(filterSelection instanceof HTMLElement) ||
    !(filterReset instanceof HTMLButtonElement) ||
    !(projectResults instanceof HTMLElement) ||
    !(emptyState instanceof HTMLElement) ||
    projectCards.length === 0
  ) {
    return;
  }

  const parseValues = (value) =>
    (value ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

  const getProjectValues = (projectCard, group) =>
    parseValues(group === "domain" ? projectCard.dataset.domains : projectCard.dataset.technologies);

  const availableTechnologies = [
    ...new Set(projectCards.flatMap((projectCard) => getProjectValues(projectCard, "technology"))),
  ].sort((firstTechnology, secondTechnology) =>
    firstTechnology.localeCompare(secondTechnology, "ko"),
  );

  const createFilterOption = (group, value, description = "") => {
    const label = document.createElement("label");
    label.className = "project-filter-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.dataset.filterInput = group;

    const check = document.createElement("span");
    check.className = "project-filter-option__check";
    check.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = value === ALL_FILTER ? "전체" : value;
    copy.append(title);

    if (description) {
      const detail = document.createElement("small");
      detail.textContent = description;
      copy.append(detail);
    }

    label.append(input, check, copy);
    return label;
  };

  const renderTechnologyOptions = () => {
    const options = document.createDocumentFragment();
    const allOption = createFilterOption("technology", ALL_FILTER, "기술 제한 없음");
    allOption.querySelector("input").checked = true;
    options.append(allOption);

    availableTechnologies.forEach((technology) => {
      options.append(createFilterOption("technology", technology));
    });

    technologyOptions.append(options);
  };

  const getInputs = (group) => [
    ...document.querySelectorAll(`[data-filter-input="${group}"]`),
  ];

  const getSelectedValues = (group) =>
    getInputs(group)
      .filter((input) => input.checked)
      .map((input) => input.value);

  const setGroupToAll = (group) => {
    getInputs(group).forEach((input) => {
      input.checked = input.value === ALL_FILTER;
    });
  };

  const clearGroup = (group) => {
    getInputs(group).forEach((input) => {
      input.checked = false;
    });
  };

  const normalizeGroupSelection = (changedInput) => {
    const group = changedInput.dataset.filterInput;
    const inputs = getInputs(group);
    const allInput = inputs.find((input) => input.value === ALL_FILTER);

    if (changedInput.value === ALL_FILTER && changedInput.checked) {
      inputs.forEach((input) => {
        input.checked = input === changedInput;
      });
      return;
    }

    if (changedInput.value !== ALL_FILTER && changedInput.checked && allInput) {
      allInput.checked = false;
    }

    if (group === "technology" && !inputs.some((input) => input.checked)) {
      setGroupToAll("technology");
    }
  };

  const formatSummary = (values, emptyLabel, allLabel) => {
    if (values.includes(ALL_FILTER)) {
      return allLabel;
    }
    if (values.length === 0) {
      return emptyLabel;
    }
    if (values.length === 1) {
      return values[0];
    }
    return `${values[0]} 외 ${values.length - 1}개`;
  };

  const renderSelectionChips = (domainValues, technologyValues) => {
    const fragment = document.createDocumentFragment();
    const entries = [];

    if (domainValues.includes(ALL_FILTER)) {
      entries.push(["DOMAIN", "전체"]);
    } else {
      domainValues.forEach((value) => entries.push(["DOMAIN", value]));
    }

    if (!technologyValues.includes(ALL_FILTER)) {
      technologyValues.forEach((value) => entries.push(["TECH", value]));
    }

    if (entries.length === 0) {
      const empty = document.createElement("span");
      empty.className = "project-filter-selection__empty";
      empty.textContent = "도메인을 선택해 주세요.";
      fragment.append(empty);
    } else {
      entries.forEach(([group, value]) => {
        const chip = document.createElement("span");
        chip.className = "project-filter-chip";
        const category = document.createElement("small");
        category.textContent = group;
        chip.append(category, document.createTextNode(value));
        fragment.append(chip);
      });
    }

    filterSelection.replaceChildren(fragment);
  };

  const filterProjects = () => {
    const domainValues = getSelectedValues("domain");
    const technologyValues = getSelectedValues("technology");
    const isDomainReady = domainValues.length > 0;

    domainSummary.textContent = formatSummary(domainValues, "도메인 선택", "전체 도메인");
    technologySummary.textContent = formatSummary(
      technologyValues,
      "전체 기술",
      "전체 기술",
    );
    renderSelectionChips(domainValues, technologyValues);

    if (!isDomainReady) {
      projectCards.forEach((projectCard) => {
        projectCard.hidden = true;
      });
      projectResults.textContent = "조건을 선택하면 프로젝트를 확인할 수 있습니다.";
      emptyState.hidden = true;
      return;
    }

    const selectedDomains = domainValues.filter((value) => value !== ALL_FILTER);
    const selectedTechnologies = technologyValues.filter((value) => value !== ALL_FILTER);
    const visibleProjects = projectCards.filter((projectCard) => {
      const projectDomains = getProjectValues(projectCard, "domain");
      const projectTechnologies = getProjectValues(projectCard, "technology");
      const matchesDomains =
        selectedDomains.length === 0 ||
        selectedDomains.some((domain) => projectDomains.includes(domain));
      const matchesTechnologies =
        selectedTechnologies.length === 0 ||
        selectedTechnologies.some((technology) => projectTechnologies.includes(technology));
      const isVisible = matchesDomains && matchesTechnologies;

      projectCard.hidden = !isVisible;
      projectCard.removeAttribute("data-filter-pending");
      return isVisible;
    });

    const domainLabel = domainValues.includes(ALL_FILTER)
      ? "전체 도메인"
      : domainValues.join(" + ");
    const technologyLabel = technologyValues.includes(ALL_FILTER)
      ? "전체 기술"
      : technologyValues.join(" + ");

    projectResults.textContent = `${domainLabel} · ${technologyLabel} ${visibleProjects.length}개`;
    emptyState.hidden = visibleProjects.length > 0;
  };

  renderTechnologyOptions();

  projectFilter.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.dataset.filterInput) {
      return;
    }

    normalizeGroupSelection(event.target);
    filterProjects();
  });

  filterReset.addEventListener("click", () => {
    clearGroup("domain");
    setGroupToAll("technology");
    document.querySelectorAll("[data-filter-dropdown]").forEach((dropdown) => {
      dropdown.open = false;
    });
    filterProjects();
  });

  document.querySelectorAll("[data-filter-dropdown]").forEach((dropdown) => {
    dropdown.addEventListener("toggle", () => {
      if (!dropdown.open) {
        return;
      }
      document.querySelectorAll("[data-filter-dropdown]").forEach((otherDropdown) => {
        if (otherDropdown !== dropdown) {
          otherDropdown.open = false;
        }
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-filter-dropdown]")) {
      return;
    }
    document.querySelectorAll("[data-filter-dropdown]").forEach((dropdown) => {
      dropdown.open = false;
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    document.querySelectorAll("[data-filter-dropdown]").forEach((dropdown) => {
      dropdown.open = false;
    });
  });

  filterProjects();
})();
