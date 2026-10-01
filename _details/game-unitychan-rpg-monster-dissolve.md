---
layout: game-article
title: 노이즈 임계값으로 몬스터 등장·퇴장 표현하기
project_slug: unitychan-rpg
game_portfolio: true
game_order: 6
topic: 데이터와 표현
summary: SplitValue와 GlowOffset으로 모델의 표시 영역과 발광 경계를 나눠 만든다.
tags:
- Shader Graph
- 디졸브
- 렌더링
permalink: /projects/unitychan-rpg/technical/monster-dissolve/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 문제와 구현

몬스터가 나타나고 사라지는 순간을 활성 상태만 바꿔 처리하면 모델이 한 프레임에 통째로 전환된다. 같은 노이즈 텍스처에서 모델의 표시 영역과 그 경계를 따로 계산해 등장과 사망의 진행 상태를 보이도록 했다.

Shader Graph에서는 몬스터의 등장과 사망에 페이즈·디졸브 효과를 적용했다. 같은 노이즈 텍스처를 두 기준값으로 샘플링한다. 하나는 시간에 따라 변하는 `SplitValue`를 기준으로 모델의 표시 영역을 결정하고, 다른 하나는 `SplitValue`에서 `GlowOffset`을 뺀 값을 기준으로 발광 경계를 만든다. `SplitValue`를 바꾸면 모델이 드러나거나 사라지고, 두 기준 사이의 영역에는 발광 효과가 남는다.

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }}" alt="몬스터 등장과 사망 때 적용한 페이즈·디졸브 Shader Graph 구성" loading="lazy">
  <figcaption>Shader Graph에서 노이즈 임계값으로 알파 영역과 발광 경계를 나눈 구성</figcaption>
</figure>

## 두 임계값의 역할

Shader Graph는 노이즈 값이 `SplitValue`를 넘는 영역을 알파 표시 영역으로 사용한다. 두 번째 기준은 `SplitValue - GlowOffset`이다. 두 기준 사이에 들어온 픽셀을 발광 영역으로 사용하면 사라지는 경계를 따라 빛이 남는다. `SplitValue`를 시간에 따라 바꾸면 표시 영역이 점차 넓어지거나 줄어들고, `GlowOffset`은 경계 띠의 폭을 정한다.

몬스터가 리스폰할 때는 드러나는 방향으로, 사망할 때는 사라지는 방향으로 값을 갱신한다. 두 효과가 같은 그래프를 쓰더라도 시작값과 진행 방향이 달라야 한다.
