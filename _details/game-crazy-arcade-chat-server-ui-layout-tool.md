---
layout: game-article
title: 부모·자식 UI를 배치하는 ImGui 도구
project_slug: crazy-arcade-chat-server
game_portfolio: true
game_order: 1
topic: UI 제작 도구
summary: 프로토타입으로 만든 UI 객체를 도구에서 편집하고, 부모 패널의 패딩·간격·열 개수로 자식을 재배치한다.
tags:
- ImGui
- UI
- 그리드
permalink: /projects/crazy-arcade-chat-server/technical/ui-layout-tool/
nav_context: GAME PORTFOLIO / CHAT SERVER
---

## 문제와 구현

ImGui 도구는 기본 UI 객체의 프로토타입을 복제해 도구 화면에 등록한다. 도구에서 UI를 선택하면 크기·위치·텍스처를 바꾸거나 자식 UI를 추가할 수 있다. 복제 객체는 오브젝트 매니저의 업데이트·렌더 준비 경로에도 등록된다. 선택한 UI를 클릭하면 Z 순서를 올려 다른 UI보다 뒤에 그려지지 않도록 했다.

자식 UI의 위치는 부모가 이동하거나 크기가 바뀌어도 관계를 유지해야 한다. 도구는 자식의 부모 대비 크기와 부모 변환 행렬, 이동량을 조합해 최종 변환을 계산한다. 그리드 정렬 기능은 부모 패널의 크기에서 기준점을 구하고, 패딩·셀 크기·열 개수·셀 사이 간격으로 각 자식의 위치를 다시 계산한다. 정렬 기능을 실행하면 자식 UI의 변환과 크기가 한 번에 갱신된다.

```text
ImGui 배치 도구 → 부모·자식 UI 트리 → JSON 저장
                                      ↓
클라이언트 화면 ← 재귀적 UI 조립 ← JSON 로드
```

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/crazy-arcade-chat-server/grid-align-demo.gif' | relative_url }}" alt="UI 배치 도구에서 자식 UI를 그리드로 정렬하는 과정" loading="lazy">
  <figcaption>그리드 배치 도구가 자식 UI의 크기, 패딩, 간격에 따라 위치를 조정하는 과정</figcaption>
</figure>

<div class="game-video-grid">
  <figure><video controls preload="metadata" playsinline aria-label="UI 텍스처를 지정하는 도구 시연"><source src="{{ '/assets/videos/projects/crazy-arcade-chat-server/texture-setting-demo.mp4' | relative_url }}" type="video/mp4"></video><figcaption>선택한 UI의 텍스처 지정 · <a href="{{ '/assets/videos/projects/crazy-arcade-chat-server/texture-setting-demo.mp4' | relative_url }}">영상 파일 열기</a></figcaption></figure>
  <figure><video controls preload="metadata" playsinline aria-label="UI 렌더 순서를 조정하는 도구 시연"><source src="{{ '/assets/videos/projects/crazy-arcade-chat-server/sort-order-demo.mp4' | relative_url }}" type="video/mp4"></video><figcaption>선택한 UI의 렌더 순서 조정 · <a href="{{ '/assets/videos/projects/crazy-arcade-chat-server/sort-order-demo.mp4' | relative_url }}">영상 파일 열기</a></figcaption></figure>
</div>

## 정렬 계산의 책임

`CLevelMapTool::ReArrangeChildrenOf()`는 현재 선택한 부모 객체에 패딩, 자식 사이 간격, 열 개수, 셀 크기를 입력받는다. 정렬 명령은 부모의 `RearrangeChildGrid()`를 호출한다. 부모가 움직이거나 복제돼도 자식의 상대 배치가 유지되도록, 자식 추가와 복제는 부모 객체의 계층 API를 통해 처리한다. 객체를 직접 화면 좌표 목록으로만 저장했다면 부모 이동 때 자식 좌표를 모두 다시 계산해야 했다.
