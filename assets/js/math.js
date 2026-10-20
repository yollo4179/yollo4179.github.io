// Support both older math/tex output and newer kramdown TeX delimiters.
document.querySelectorAll('script[type^="math/tex"]').forEach((source) => {
  const displayMode = source.type.includes("mode=display");
  const target = document.createElement(displayMode ? "div" : "span");
  target.className = displayMode ? "math-display" : "math-inline";
  katex.render(source.textContent, target, {
    displayMode,
    throwOnError: false,
    trust: false,
    output: "htmlAndMathml",
  });
  source.replaceWith(target);
});

renderMathInElement(document.getElementById("main-content") || document.body, {
  delimiters: [
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false },
  ],
  throwOnError: false,
  trust: false,
});
