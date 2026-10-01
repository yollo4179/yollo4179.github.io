---
layout: game-article
title: 이웃 셀 이동과 경계 슬라이딩
project_slug: gunfire-reborn
game_portfolio: true
game_order: 3
topic: 맵 제작과 이동
summary: 현재 셀과 이웃 셀을 따라 최종 위치를 검사하고, 연결이 없는 경계에서는 이동 벡터를 투영한다.
tags:
- 내비게이션
- 이동
- 벡터
permalink: /projects/gunfire-reborn/technical/navigation-sliding/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제

현재 삼각형 안에 있는지만 검사하면 셀 경계를 넘는 이동을 처리할 수 없다. 프레임 이동량이 큰 경우에는 한 번의 업데이트에서 여러 셀을 통과할 수도 있다. 연결이 없는 바깥 경계에서는 단순히 이동을 막으면 캐릭터가 벽에 걸린 것처럼 멈춘다.

## 공유 변과 이웃 셀

`CNavigation::SetUp_Neighbors()`는 각 셀의 AB·BC·CA 변을 다른 셀의 점 쌍과 비교한다. 공통 변을 가진 셀을 찾으면 해당 변에 이웃 셀을 등록한다. `CNavigation::isMove()`는 월드 위치를 내비메시의 로컬 공간으로 옮긴 뒤 현재 셀의 `isIn()`을 호출한다. 현재 셀 밖이라면 경계를 공유하는 이웃 셀로 넘어가 같은 최종 위치를 다시 검사한다.

처음 연결된 셀 하나만 확인하고 곧바로 이동을 허용하면, 이동량이 커서 그 다음 셀까지 지난 위치에서도 현재 인덱스가 잘못 남을 수 있다. 그래서 코드는 최종 위치를 포함하는 셀을 찾을 때까지 이웃 관계를 따라간다. 연결이 끊긴 변을 만나면 이동을 허용하지 않는다.

## 경계를 따라 미끄러지는 방향

`CCell::Get_Elements_For_Sliding()`은 이웃이 없는 경계의 선분을 찾는다. 이동 방향을 경계 방향에 투영하면 경계를 뚫는 성분은 빠지고, 경계와 나란한 성분만 남는다. 내비게이션 컴포넌트는 현재 셀의 경계 요소를 돌려주고 이동 객체가 그 방향으로 위치를 다시 계산한다. 삼각형의 높이는 셀 평면에서 계산해 지형 위의 Y 값에 반영한다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="셀 이웃 연결과 슬라이딩 계산 이미지 3장" items="navigation-mesh-implementation-06.png|공유 변을 기준으로 이웃 셀 등록;sliding-vector-01.png|셀 경계와 캐릭터 이동 방향;sliding-vector-02.png|경계 방향에 이동 벡터를 투영하는 계산" %}

{% include game-local-video.html slug="gunfire-reborn" file="navigation-sliding" title="내비메시 경계와 이동 방향을 표시한 슬라이딩 시연" %}

## 결과와 한계

셀 데이터가 이동 가능 영역을 정의하고, 이웃 관계가 셀 사이 이동을 결정한다. 경계 슬라이딩은 셀 밖으로 향하는 이동을 경계 방향으로 바꿔 갑작스러운 정지를 줄인다. 셀 그래프를 따라가므로 잘못 연결된 셀이나 서로 겹친 셀은 맵툴 데이터에서 바로잡아야 한다.
