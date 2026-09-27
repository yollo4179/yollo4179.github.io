(function () {
  "use strict";

  var loaderScript = document.currentScript;
  var sourceBlocks = Array.from(
    document.querySelectorAll("pre > code.language-mermaid")
  );

  if (!loaderScript || sourceBlocks.length === 0) {
    return;
  }

  var mermaidSource = loaderScript.dataset.mermaidSrc;

  if (!mermaidSource) {
    return;
  }

  var libraryScript = document.createElement("script");
  libraryScript.src = mermaidSource;
  libraryScript.async = true;

  libraryScript.addEventListener("load", async function () {
    if (!window.mermaid) {
      return;
    }

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: {
        background: "#ffffff",
        primaryColor: "#eef4ff",
        primaryTextColor: "#172033",
        primaryBorderColor: "#175cd3",
        secondaryColor: "#e8f6f5",
        tertiaryColor: "#f7f6f2",
        lineColor: "#5d6778",
        textColor: "#172033",
        fontFamily: "Pretendard, Inter, sans-serif"
      }
    });

    for (var index = 0; index < sourceBlocks.length; index += 1) {
      var sourceBlock = sourceBlocks[index];
      var sourceContainer = sourceBlock.parentElement;

      if (!sourceContainer) {
        continue;
      }

      var source = sourceBlock.textContent.trim();
      var isValid = false;

      try {
        isValid = Boolean(
          await window.mermaid.parse(source, { suppressErrors: true })
        );
      } catch (_error) {
        isValid = false;
      }

      if (!isValid) {
        sourceContainer.classList.add("mermaid-source--error");
        continue;
      }

      var diagram = document.createElement("pre");
      diagram.className = "mermaid";
      diagram.textContent = source;
      sourceContainer.replaceWith(diagram);

      try {
        await window.mermaid.run({
          nodes: [diagram],
          suppressErrors: true
        });
        diagram.classList.add("mermaid--rendered");
      } catch (_error) {
        sourceContainer.classList.add("mermaid-source--error");
        diagram.replaceWith(sourceContainer);
      }
    }
  });

  document.head.appendChild(libraryScript);
})();
