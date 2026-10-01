---
layout: game-article
title: 카메라 거리별 그림자 영역 분할
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 3
topic: 그림자
summary: 분할 프러스텀을 포함하는 그림자 카메라를 만들고 거리별 그림자 맵 깊이를 비교한다.
tags:
- 그림자
- CSM
- DirectX
permalink: /projects/zelda-breath-of-the-wild/technical/cascaded-shadows/
nav_context: GAME PORTFOLIO / ZELDA
---

## 문제와 구현

메인 카메라의 프러스텀을 거리별 구간으로 나눴다. 각 분할 구간의 NDC 경계점 여덟 개를 역 뷰·투영 변환으로 월드 공간에 옮기고, 경계점을 모두 포함하는 볼륨을 구했다. 그림자 카메라는 빛의 반대 방향에서 해당 볼륨의 중심을 바라보며, 그 범위를 담는 직교 투영 행렬로 깊이 맵을 기록한다.

조명 계산 단계에서는 화면 픽셀의 월드 위치를 복원하고 해당 구간의 그림자 카메라 공간으로 변환한다. 그림자 맵에 기록된 깊이보다 픽셀이 뒤에 있으면, 그림자 카메라가 먼저 본 물체에 가려진 영역으로 판단해 어둡게 처리한다. 구간별로 그림자 범위를 계산하므로 가까운 곳과 먼 곳에 각각 다른 그림자 맵 영역을 적용할 수 있다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="캐스케이드 그림자 프러스텀·깊이 비교 이미지 6장" items="cascaded-shadow-implementation-01.png|NDC 프러스텀 경계 정점 구성;cascaded-shadow-implementation-02.png|분할 프러스텀의 경계 상자 계산;cascaded-shadow-implementation-03.png|NDC 영역을 월드 프러스텀으로 변환;cascaded-shadow-implementation-04.png|그림자 카메라의 뷰·투영 행렬 설정;cascaded-shadow-implementation-05.png|픽셀 위치와 그림자 맵 깊이 비교 코드;cascaded-shadow-implementation-06.png|캐스케이드 그림자의 장면 출력" %}

{% include game-video-embed.html id="66Sgophfmdo" title="캐스케이드 그림자 적용 영상" start="1" %}

## 분할 범위를 그림자 카메라로 옮기기

클라이언트는 카메라 프러스텀의 구간마다 경계점을 월드 공간으로 복원한다. 각 구간을 포함하는 광원 뷰·직교 투영 행렬로 그림자 깊이를 기록한다. 디퍼드 조명 셰이더에는 근·중·원거리 그림자 텍스처가 각각 바인딩된다. 픽셀의 월드 위치가 속한 구간의 그림자 맵과 깊이를 비교해 차폐 여부를 결정한다. 가까운 물체와 먼 지형을 하나의 그림자 맵 해상도로 처리할 때 생기는 품질 차이를 줄이기 위한 분할이다.
