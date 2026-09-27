(function () {
  'use strict';
  var body = document.querySelector('.ssketch-article__body');
  if (!body) return;
  function sizeDiagrams() {
    body.querySelectorAll('pre.mermaid svg:not([data-readable])').forEach(function (svg) {
      var width = svg.viewBox.baseVal.width;
      if (!width) return;
      svg.dataset.readable = 'true';
      svg.style.setProperty('--diagram-readable-width', Math.min(width, 900) + 'px');
      var container = svg.parentElement;
      var diagramType = svg.getAttribute('aria-roledescription') || '';
      if (diagramType.indexOf('flowchart') === 0) {
        container.classList.add('mermaid--flowchart');
      }
      container.tabIndex = 0;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', '구조도. 화면보다 넓으면 좌우로 스크롤할 수 있습니다.');
    });
  }
  new MutationObserver(sizeDiagrams).observe(body, {childList:true, subtree:true});
  sizeDiagrams();
}());
