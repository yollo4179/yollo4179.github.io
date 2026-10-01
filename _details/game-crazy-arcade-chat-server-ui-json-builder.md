---
layout: game-article
title: UI 트리를 JSON으로 저장하고 다시 조립하기
project_slug: crazy-arcade-chat-server
game_portfolio: true
game_order: 2
topic: UI 제작 도구
summary: SRT_MATRIX와 컴포넌트 태그, CHILDREN을 저장한 뒤 ObjectBuilderSystem이 재귀적으로 UI를 만든다.
tags:
- JSON
- UI
- 직렬화
permalink: /projects/crazy-arcade-chat-server/technical/ui-json-builder/
nav_context: GAME PORTFOLIO / CHAT SERVER
---

## 문제와 구현

도구는 한 화면의 UI 세트를 JSON 객체로 저장한다. 각 노드에는 객체·텍스처·셰이더·버퍼의 태그와 레벨, 변환 행렬, Z 순서, 자식 노드 목록을 기록한다. 저장 함수는 부모 노드를 기록한 뒤 `CHILDREN`을 따라 자식 노드를 재귀적으로 저장한다. 불러올 때도 같은 트리를 순회한다.

클라이언트의 `ObjectBuilderSystem::BuildObject`는 JSON 노드의 `OBJECT_TAG`, `TEXTURE_TAG`, `SHADER_TAG`, `BUFFER_TAG`, `SRT_MATRIX`를 읽고 필요한 컴포넌트를 붙인다. `CHILDREN` 배열이 있으면 자식 객체를 만들고 같은 함수를 호출해 트리를 완성한다. 따라서 도구가 저장한 부모·자식 관계를 클라이언트 화면에서도 재구성할 수 있다.

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/crazy-arcade-chat-server/ui-load-demo.gif' | relative_url }}" alt="JSON에서 저장된 UI 배치를 다시 불러오는 시연" loading="lazy">
  <figcaption>저장된 UI 배치를 JSON에서 다시 불러오는 과정</figcaption>
</figure>

{% include game-media-gallery.html slug="crazy-arcade-chat-server" summary="UI 생성·정렬·JSON 저장 코드 이미지 12장" items="ui-creation-01.png|도구 객체의 기본 배치 속성;ui-creation-02.png|프로토타입에서 도구 객체를 복제하는 코드;ui-creation-03.png|ImGui에서 복제한 객체를 등록하는 코드;ui-layout-01.png|부모와 자식 UI의 변환 행렬;ui-layout-02.png|자식 UI를 부모에 추가하는 코드;ui-layout-03.png|그리드 정렬의 위치 계산 코드;ui-layout-04.png|그리드 정렬의 자식 UI 적용 코드;ui-serialization-01.png|UI 트리의 JSON 저장 형식;ui-serialization-02.png|저장 버튼에서 직렬화 함수를 호출하는 코드;ui-serialization-03.png|자식 UI를 재귀적으로 저장하는 코드;ui-serialization-04.png|UI 데이터 파일을 선택해 불러오는 코드;ui-serialization-05.png|JSON 자식 노드를 재귀적으로 읽는 코드" %}

## 저장 형식과 복원 순서

`CGameObject`의 저장 경로는 `SRT_MATRIX`, 객체·텍스처·셰이더·버퍼 태그, `ATLASINFO`, `CHILDREN`을 노드에 기록한다. 맵툴의 `ObjectBuilder()`는 태그를 먼저 읽어 컴포넌트를 구성하고 월드 행렬을 적용한 뒤 `CHILDREN`을 순회한다. 클라이언트의 `ObjectBuilderSystem`도 같은 키를 사용해 화면용 객체를 다시 만든다. 저장 형식의 키가 도구와 게임 사이의 계약이다.

클라이언트 조립 코드는 자식 행렬과 부모 행렬의 관계도 처리한다. 화면이 다시 불러와졌을 때 부모만 맞고 자식이 어긋나면 JSON의 좌표 값뿐 아니라 부모·자식 행렬을 어느 시점에 결합하는지도 확인해야 한다.
