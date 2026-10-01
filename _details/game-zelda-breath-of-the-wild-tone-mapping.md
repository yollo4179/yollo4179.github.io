---
layout: game-article
title: 평균 휘도 축소와 톤매핑
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 1
topic: 화면의 밝기와 음영
summary: 16×16 컴퓨트 그룹의 휘도 리덕션 결과를 Yxy 톤 커브에 전달해 장면 밝기를 조정한다.
tags:
- HLSL
- 톤매핑
- HDR
permalink: /projects/zelda-breath-of-the-wild/technical/tone-mapping/
nav_context: GAME PORTFOLIO / ZELDA
---

## 문제와 구현

평균 휘도 계산에는 컴퓨트 셰이더를 사용했다. 픽셀 셰이더에서 화면을 절반씩 축소하는 방식은 축소 단계마다 별도의 렌더 패스가 필요한다. 컴퓨트 셰이더는 16×16 스레드 그룹의 각 스레드가 담당 픽셀의 휘도를 그룹 공유 메모리에 기록한 뒤, 병렬 리덕션으로 그룹의 합을 구한다. 그룹별 평균을 결과 텍스처에 저장하고, 최종적으로 1×1 텍스처에 평균 휘도가 남을 때까지 같은 계산을 반복한다.

톤매핑 단계는 RGB를 CIE Yxy 색공간으로 변환해 색도인 x·y와 휘도인 Y를 분리한다. `MiddleGrey`, `WhitePoint`, 평균 휘도를 톤 커브에 적용해 Y를 조정한 뒤 색도와 다시 결합한다. 화면 평균이 밝으면 노출을 낮추고, 어두우면 올리는 방식으로 장면의 밝기 변화에 대응한다. `WhitePoint`는 흰색에 도달하는 기준값이고, `MiddleGrey`는 중간 밝기의 기준값으로 사용했다.

```text
장면 렌더 타깃 → 픽셀 휘도 계산 → 그룹별 병렬 리덕션
             → 평균 휘도 → 톤 커브 → 최종 화면
```

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="톤매핑 계산식과 HLSL 코드 이미지 6장" items="tone-mapping-luminance-reduction.png|컴퓨트 셰이더의 휘도 병렬 리덕션 코드;tone-mapping-code-01.png|평균 휘도를 이용한 밝기 보정 코드;tone-mapping-code-02.png|Yxy 색공간 변환 코드;tone-mapping-code-03.png|최종 색상을 계산하는 코드;tone-mapping-formula-01.png|MiddleGrey와 평균 휘도의 관계식;tone-mapping-formula-02.png|WhitePoint를 반영한 톤 커브 식" %}

{% include game-video-embed.html id="Q9VEHbAQBt0" title="톤매핑 적용 영상 1" %}
{% include game-video-embed.html id="ycpSpUZEI10" title="톤매핑 적용 영상 2" %}

## 셰이더 값과 장면 설정

`CHDRI_Manager`는 `MiddleGrey`와 노출 관련 값을 장면 설정에서 읽고 JSON으로 저장한다. `Render_FilteredLuminance()` 경로는 휘도 결과를 축소해 화면 평균에 가깝게 만들고, 최종 패스는 `g_AvgLuminanceTexture`를 샘플링한다. HDRI 셰이더의 `NewHDR2()`는 RGB를 Yxy로 바꿔 휘도 Y에 중간 회색 값을 적용한 뒤 색도를 다시 결합한다. 장면마다 밝기가 달라도 같은 고정 노출값만 쓰지 않기 위한 구조다.
