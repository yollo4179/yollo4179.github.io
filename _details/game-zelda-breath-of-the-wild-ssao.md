---
layout: game-article
title: 깊이·노멀 버퍼로 SSAO 계산하기
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 2
topic: 화면의 밝기와 음영
summary: 뷰 공간 위치와 노멀을 복원하고 반구 샘플을 깊이 버퍼와 비교해 차폐를 계산한다.
tags:
- HLSL
- SSAO
- 후처리
permalink: /projects/zelda-breath-of-the-wild/technical/ssao/
nav_context: GAME PORTFOLIO / ZELDA
---

## 문제와 구현

SSAO는 빛이 닿기 어려운 접촉부와 움푹한 곳에 화면 공간의 차폐 음영을 더한다. 장면을 그릴 때 깊이와 월드 노멀을 별도 렌더 타깃에 함께 기록했다. 노멀은 텍스처에 저장할 수 있도록 −1~1 범위에서 0~1 범위로 변환한다.

후처리 셰이더는 깊이 값과 역투영 행렬로 현재 픽셀의 뷰 공간 위치를 복원하고, 노멀을 같은 공간으로 변환한다. CPU가 준비한 반구 샘플 64개를 노이즈 텍스처와 TBN 행렬로 회전시켜 픽셀 주변의 샘플 위치를 만든다. 각 샘플을 화면에 다시 투영한 뒤 깊이 텍스처의 실제 지형 깊이와 비교한다. 지형이 샘플 위치를 가린 횟수를 누적해 차폐 농도를 결정한다.

<div class="game-image-pair">
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-01.png' | relative_url }}" alt="지형 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>지형 장면의 SSAO 적용 비교</figcaption></figure>
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-02.png' | relative_url }}" alt="풀밭 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>풀밭 장면의 SSAO 적용 비교</figcaption></figure>
</div>

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="SSAO 샘플 생성·깊이 비교 코드 이미지 5장" items="ssao-implementation-01.png|노멀 주변 반구 샘플 생성 코드;ssao-implementation-02.png|샘플 분산용 노이즈 텍스처 생성 코드;ssao-implementation-03.png|픽셀의 뷰 공간 위치 복원 코드;ssao-implementation-04.png|샘플과 지형의 깊이를 비교하는 코드;ssao-implementation-05.png|SSAO 반구 샘플의 좌표 변환 설명" %}

{% include game-video-embed.html id="qfSZauMDXyE" title="SSAO 적용 영상" %}

## 화면 공간 좌표의 일치

깊이 텍스처의 값은 바로 월드 거리로 쓰지 않는다. 셰이더가 픽셀의 뷰 공간 위치를 복원한 뒤, 같은 공간에서 노멀과 반구 샘플을 다뤄야 깊이 비교가 성립한다. 샘플을 화면으로 다시 투영해 실제 깊이와 비교하고, 차폐 결과는 후처리 단계에서 주변 픽셀과 섞어 노이즈를 줄인다. 노멀과 깊이의 공간이 어긋나면 접촉부가 아닌 곳에 어두운 테두리가 생길 수 있다.
