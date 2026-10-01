---
layout: game-article
title: 외곽선·글로우와 디졸브·물 효과 구성
project_slug: gunfire-reborn
game_portfolio: true
game_order: 6
topic: 트레일과 화면 효과
summary: 노멀·깊이 차이로 외곽선을 찾고 글로우와 디졸브, 물 디스토션을 별도 경로로 구성했다.
tags:
- 렌더링
- HLSL
- 후처리
permalink: /projects/gunfire-reborn/technical/post-processing/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제와 구현

카툰 외곽선은 노멀 렌더 타깃과 깊이 렌더 타깃을 함께 사용한다. 현재 픽셀과 주변 픽셀의 노멀·깊이 차이를 각각 계산하고, 두 검출 조건을 통과한 위치를 외곽선으로 그린다. 글로우는 빛낼 부분을 마스크로 추출한 뒤 텍스처를 축소한다. 축소한 텍스처에 가로·세로 블러를 따로 적용하고 원래 크기로 확대한 뒤 화면에 가산 합성한다.

몬스터가 죽으면 매 프레임 디졸브 임계값을 올린다. 픽셀 셰이더는 노이즈 텍스처의 샘플값과 임계값을 비교하고, 기준 아래로 내려간 픽셀을 버려 모델이 점차 사라지게 한다. 물 표면은 노이즈 값을 화면 텍스처의 UV 오프셋으로 사용해 뒤쪽 화면이 일렁이는 것처럼 다시 샘플링한다.

{% include game-local-video.html slug="gunfire-reborn" file="cartoon-rendering" title="지형과 캐릭터의 카툰 외곽선이 보이는 이동 장면" %}

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/gunfire-reborn/dissolve-demo.gif' | relative_url }}" alt="몬스터 모델이 노이즈 임계값에 따라 점차 사라지는 디졸브 효과" loading="lazy">
  <figcaption>몬스터 사망 시 적용한 디졸브 효과</figcaption>
</figure>

{% include game-media-gallery.html slug="gunfire-reborn" summary="카툰 외곽선과 글로우 이미지 9장" items="toon-rendering-result.png|카툰 렌더링 결과 화면;outline-implementation-01.png|주변 픽셀과의 노멀 차이 계산;outline-implementation-02.png|주변 픽셀과의 깊이 차이 계산;outline-implementation-03.png|외곽선 검출 조건 적용;glow-result.png|글로우 효과 결과 화면;glow-implementation-01.png|글로우 텍스처 다운샘플링;glow-implementation-02.png|가로·세로 블러 패스;glow-implementation-03.png|블러 결과 업샘플링;dissolve-implementation.png|노이즈 임계값에 따른 디졸브 계산" %}

{% include game-media-gallery.html slug="gunfire-reborn" summary="물 디스토션 코드 이미지 1장" items="water-distortion-implementation.png|노이즈 오프셋으로 화면 텍스처를 샘플링하는 코드" %}

{% include game-local-video.html slug="gunfire-reborn" file="water-distortion" title="건파이어 보스 전투의 물 구체 디스토션" %}
