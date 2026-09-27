(function () {
  "use strict";

  var RESET_DELAY_MILLISECONDS = 1600;
  var LANGUAGE_LABELS = {
    bash: "Shell",
    css: "CSS",
    html: "HTML",
    java: "JAVA",
    javascript: "JavaScript",
    js: "JavaScript",
    json: "JSON",
    powershell: "PowerShell",
    shell: "Shell",
    sql: "SQL",
    ts: "TypeScript",
    tsx: "TSX",
    typescript: "TypeScript",
    yaml: "YAML",
    yml: "YAML"
  };

  function findLanguage(code) {
    var languageElement = code.closest('[class*="language-"]');
    if (!languageElement) {
      return "";
    }

    var languageClass = Array.from(languageElement.classList).find(function (className) {
      return className.indexOf("language-") === 0;
    });

    return languageClass ? languageClass.slice("language-".length).toLowerCase() : "";
  }

  function formatLanguage(language) {
    return LANGUAGE_LABELS[language]
      || language.replace(/[^a-z0-9+#.-]/gi, "").toUpperCase();
  }

  function copyWithFallback(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        if (!document.execCommand("copy")) {
          throw new Error("Copy command was rejected.");
        }
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  function createShell(pre) {
    var parent = pre.parentElement;

    if (parent && parent.classList.contains("highlight")) {
      parent.classList.add("code-block-shell");
      return parent;
    }

    var shell = document.createElement("div");
    shell.className = "code-block-shell";
    pre.replaceWith(shell);
    shell.appendChild(pre);
    return shell;
  }

  function enhanceCodeBlock(code, index) {
    var language = findLanguage(code);
    if (language === "mermaid") {
      return;
    }

    var pre = code.parentElement;
    if (!pre || pre.tagName !== "PRE") {
      return;
    }

    var shell = createShell(pre);
    if (shell.dataset.copyEnhanced === "true") {
      return;
    }
    shell.dataset.copyEnhanced = "true";

    if (language) {
      var languageLabel = document.createElement("span");
      languageLabel.className = "code-language-label";
      languageLabel.textContent = formatLanguage(language);
      languageLabel.setAttribute("aria-hidden", "true");
      shell.appendChild(languageLabel);
    }

    var button = document.createElement("button");
    var label = "코드 복사";
    button.type = "button";
    button.className = "code-copy-button";
    button.textContent = "복사";
    button.setAttribute("aria-label", label + " " + (index + 1));
    button.setAttribute("aria-live", "polite");
    button.title = label;

    var resetTimer = null;
    button.addEventListener("click", function () {
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
      button.disabled = true;

      copyWithFallback(code.textContent).then(function () {
        button.textContent = "복사됨";
      }).catch(function () {
        button.textContent = "복사 실패";
      }).finally(function () {
        button.disabled = false;
        button.focus();
        resetTimer = window.setTimeout(function () {
          button.textContent = "복사";
          resetTimer = null;
        }, RESET_DELAY_MILLISECONDS);
      });
    });

    shell.appendChild(button);
  }

  Array.from(
    document.querySelectorAll(".markdown-content pre > code")
  ).forEach(enhanceCodeBlock);
})();
