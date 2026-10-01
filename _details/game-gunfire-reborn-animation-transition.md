---
layout: game-article
title: 현재 자세에서 다음 애니메이션으로 전환하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 7
topic: 애니메이션과 리소스
summary: 진행 중인 동작을 끝 프레임으로 되돌리지 않고 현재 뼈 자세를 새 보간의 시작점으로 사용한다.
tags:
- 애니메이션
- 보간
- 상태
permalink: /projects/gunfire-reborn/technical/animation-transition/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제와 구현

공격과 이동 입력이 연속해서 들어오는 FPS에서는 이전 애니메이션이 끝나기 전에 다음 동작을 시작한다. 전환 시작점을 이전 클립의 첫 프레임이나 끝 프레임으로 고정하면 화면에 보이던 자세가 갑자기 바뀐다.

모델은 애니메이션과 뼈를 보관하고, 각 애니메이션은 영향을 주는 뼈의 채널과 키 프레임을 가진다. 다음 동작으로 바꿀 때 두 애니메이션에 공통으로 있는 채널을 찾는다. 해당 채널의 현재 위치·회전·크기와 목표 동작의 시작 키 프레임을 지정한 시간 동안 보간한 뒤 뼈 행렬을 갱신한다.

기존 동작이 진행 중이거나 전환을 보간하는 동안 새 입력이 들어올 수 있다. 이때 이전 동작의 마지막 프레임으로 되돌아가지 않고, 화면에 표시 중인 현재 자세를 새 보간의 시작점으로 사용한다. 보간 결과를 각 뼈의 결합 행렬에 반영해 빠른 입력 전환에서도 동작이 이어지도록 구성했다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="애니메이션 구조와 키 프레임 보간 이미지 5장" items="animation-structure.png|모델·애니메이션·채널·키 프레임 구조;animation-interpolation-01.png|목표 애니메이션 설정 코드;animation-interpolation-02.png|공통 뼈 채널의 시작 키 프레임 보관;animation-interpolation-03.png|진행 중인 애니메이션의 현재 키 프레임 취득;animation-interpolation-04.png|전환 중 트랙 위치 갱신과 뼈별 변환 함수 호출" %}

{% include game-local-video.html slug="gunfire-reborn" file="animation-transition" title="무기 동작이 이어지는 애니메이션 전환 시연" %}

## 채널과 키 프레임을 넘기는 순서

모델은 애니메이션별 채널과 뼈를 연결한다. 전환을 요청하면 기존 애니메이션의 공통 채널에서 지금 표시 중인 위치·회전·크기를 얻고, 목표 애니메이션의 시작 키 값과 보간한다. 전환 중 다시 입력이 들어왔을 때도 이미 계산한 현재 자세를 새 시작점으로 넘긴다. 이때 뼈마다 채널이 다를 수 있으므로 모델 전체의 시간만 바꾸는 것으로는 전환을 처리할 수 없다.

보간 결과는 뼈의 결합 행렬에 반영된다. 손에 든 무기와 본에 붙은 효과도 같은 뼈 변환을 따라가야 하므로, 자세를 갱신하는 시점과 렌더링에서 본 행렬을 사용하는 시점을 맞췄다.
