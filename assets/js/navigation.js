(() => {
  "use strict";

  const menuButton = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-site-navigation]");
  const menuBackdrop = document.querySelector("[data-menu-backdrop]");

  if (
    !(menuButton instanceof HTMLButtonElement) ||
    !(navigation instanceof HTMLElement) ||
    !(menuBackdrop instanceof HTMLButtonElement)
  ) {
    return;
  }

  const setMenuState = (isOpen, shouldReturnFocus = false) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
    navigation.classList.toggle("is-open", isOpen);
    navigation.inert = !isOpen;
    menuBackdrop.classList.toggle("is-visible", isOpen);
    menuBackdrop.setAttribute("aria-hidden", String(!isOpen));
    menuBackdrop.tabIndex = isOpen ? 0 : -1;
    document.body.classList.toggle("menu-open", isOpen);

    if (isOpen) {
      navigation.querySelector("a")?.focus();
      return;
    }

    if (shouldReturnFocus) {
      menuButton.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  menuBackdrop.addEventListener("click", () => {
    setMenuState(false, true);
  });

  navigation.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("a")) {
      return;
    }

    setMenuState(false);
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    if (event.key !== "Escape" || !isOpen) {
      return;
    }

    setMenuState(false, true);
  });

  setMenuState(false);
})();
