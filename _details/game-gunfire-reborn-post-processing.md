---
layout: game-article
title: 노멀·깊이 렌더 타깃으로 카툰 외곽선 그리기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 6
topic: 트레일과 화면 효과
summary: 네 방향 이웃 픽셀의 노멀·깊이 차이를 계산하고 두 경계 조건을 함께 적용해 외곽선을 합성한다.
tags:
- 렌더링
- HLSL
- 후처리
permalink: /projects/gunfire-reborn/technical/post-processing/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Engine/Bin/ShaderFiles/Shader_Deferred.hlsl
```

노멀·깊이 렌더 타깃 → 네 방향 이웃 샘플 → 차이 누적 → 두 임계값 비교 → 검은 외곽선 합성.


## 노멀 차이로 경계 찾기

노멀 텍스처의 값을 -1~1 범위로 복원한다. 네 방향의 이웃 노멀과 현재 노멀 사이의 차이를 누적하고 보정 계수를 곱해 경계 강도를 만든다.

`Engine/Bin/ShaderFiles/Shader_Deferred.hlsl` 발췌

```hlsl
float DetectNormalEdges(float2 uv, float2 PixelSize)
{
    vector vCenterNormal = g_NormalTexture.Sample(LinearSampler, uv) * 2.f - 1.f;
    vector NormalOffsets[4];
    NormalOffsets[0] = g_NormalTexture.Sample(LinearSampler_Clamp, uv + float2(-PixelSize.x/5, 0.f)) * 2.f - 1.f;
    NormalOffsets[1] = g_NormalTexture.Sample(LinearSampler_Clamp, uv + float2(PixelSize.x/5, 0.f)) * 2.f - 1.f;
    NormalOffsets[2] = g_NormalTexture.Sample(LinearSampler_Clamp, uv + float2(0.f, -PixelSize.y/5)) * 2.f - 1.f;
    NormalOffsets[3] = g_NormalTexture.Sample(LinearSampler_Clamp, uv + float2(0.f, PixelSize.y/5)) * 2.f - 1.f;
    float fEdgeStrength = 0.0f;
    for (int i = 0; i < 4; ++i)
    {
        fEdgeStrength += length(vCenterNormal - NormalOffsets[i]);
    }
    return saturate(fEdgeStrength * 2.f);
}
```

## 깊이 경계와 함께 외곽선 결정

깊이 검출은 텍스처의 Y 성분에 1000을 곱해 비교한다. 최종 합성은 깊이 경계 0.8과 노멀 경계 0.2를 모두 넘는 픽셀에 외곽선을 적용한다. 이 패스의 샘플 간격은 1280×720을 기준으로 설정돼 있다.

`Engine/Bin/ShaderFiles/Shader_Deferred.hlsl` 발췌

```hlsl
float DetectDepthEdges(float2 uv, float2 PixelSize)
{
    vector vCenterDepth = g_DepthTexture.Sample(LinearSampler, uv);
    float fViewZ = vCenterDepth.y * 1000.f;
    float DepthOffsets[4];
    DepthOffsets[0] = g_DepthTexture.Sample(LinearSampler_Clamp, uv + float2(-PixelSize.x, 0.f)).y*1000.f;
    DepthOffsets[1] = g_DepthTexture.Sample(LinearSampler_Clamp, uv + float2(PixelSize.x, 0.f)).y * 1000.f;
    DepthOffsets[2] = g_DepthTexture.Sample(LinearSampler_Clamp, uv + float2(0.f, -PixelSize.y)).y * 1000.f;
    DepthOffsets[3] = g_DepthTexture.Sample(LinearSampler_Clamp, uv + float2(0.f, PixelSize.y)).y * 1000.f;
    float fEdgeStrength = 0.0f;
    for (int i = 0; i < 4; ++i)
    {
        fEdgeStrength += length(fViewZ - DepthOffsets[i]);
    }
    return saturate(fEdgeStrength * 20.f);
}
```

{% include game-local-video.html slug="gunfire-reborn" file="cartoon-rendering" title="지형과 캐릭터의 카툰 외곽선" %}

{% include game-media-gallery.html slug="gunfire-reborn" summary="외곽선 결과와 구현 자료" items="toon-rendering-result.png|카툰 렌더링 결과 화면;outline-implementation-01.png|노멀 차이 계산;outline-implementation-02.png|깊이 차이 계산;outline-implementation-03.png|외곽선 검출 조건" %}
