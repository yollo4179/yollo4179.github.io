---
layout: game-article
title: 노멀·깊이 렌더 타깃으로 카툰 외곽선 그리기
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
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

## 카툰 외곽선의 목적과 화면 공간 경계 검출

지형과 캐릭터의 경계를 강조하기 위해 렌더링한 화면에 검은 외곽선을 합성한다. 같은 표면의 이웃 픽셀은 노멀과 깊이가 비슷하지만, 표면 방향이나 앞뒤 거리가 달라지는 곳에서는 차이가 커진다. 셰이더는 화면 UV 주변의 노멀·깊이 텍스처를 비교하고 두 경계 조건을 모두 만족하는 픽셀을 검게 출력한다.

## 구현 순서와 역할

노멀·깊이 렌더 타깃 → 네 방향 이웃 샘플 → 차이 누적 → 두 임계값 비교 → 검은 외곽선 합성.

## 노멀 차이로 경계 찾기

노멀 텍스처의 값을 -1~1 범위로 복원한다. 네 방향의 이웃 노멀과 현재 노멀 사이의 차이를 누적하고 보정 계수를 곱해 경계 강도를 만든다.

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

{% include game-media-gallery.html slug="gunfire-reborn" summary="노멀 경계 검출" items="outline-implementation-01.png|노멀 차이 계산" %}

## 깊이 경계와 함께 외곽선 결정

깊이 검출은 텍스처의 Y 성분에 1000을 곱해 비교한다. 최종 합성은 깊이 경계가 0.8 이상이고 노멀 경계가 0.2 이상인 픽셀에 외곽선을 적용한다. 이 패스의 샘플 간격은 1280×720을 기준으로 설정돼 있다.

```hlsl
if (0.8f <= DetectDepthEdges(In.vTexcoord, float2((1.f / 1280.f), (1.f / 720.f))) && 0.2f <= DetectNormalEdges(In.vTexcoord, float2((1.f / 1280.f), (1.f / 720.f))))
    Out.vFinal = float4(0.f, 0.f, 0.f, 1.f);
```

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

{% include game-media-gallery.html slug="gunfire-reborn" summary="깊이 경계 검출" items="outline-implementation-02.png|깊이 차이 계산" %}

## 카툰 외곽선 적용 결과

노멀 차이와 깊이 차이가 각각의 임계값을 넘는 영역에 외곽선을 표시한다. 이 패스는 1280×720 기준의 샘플 간격을 사용하므로, 해상도를 바꿀 때는 샘플 간격도 함께 조정해야 한다.

{% include game-local-video.html slug="gunfire-reborn" file="cartoon-rendering" title="지형과 캐릭터의 카툰 외곽선" %}

{% include game-media-gallery.html slug="gunfire-reborn" summary="카툰 외곽선 적용 화면" items="toon-rendering-result.png|카툰 렌더링 결과 화면" %}
