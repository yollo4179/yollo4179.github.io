---
layout: game-article
title: 다운샘플링과 분리 블러로 글로우 합성하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 7
topic: 트레일과 화면 효과
summary: 발광 텍스처를 축소하고 가로·세로로 블러 처리한 뒤 원본 화면에 가산 합성한다.
tags:
- 렌더링
- HLSL
- 후처리
permalink: /projects/gunfire-reborn/technical/glow/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Engine/Bin/ShaderFiles/Shader_Deferred.hlsl
Engine/Private/Renderer.cpp
```

발광 대상 렌더링 → 다운샘플링 → 가로·세로 블러 → 업샘플링 → 원본 화면에 더하기.


## 축을 나눠 블러 계산

축소한 발광 텍스처에 가로·세로 패스를 적용한다. 가로 패스는 X 좌표를 이동하며 13개 샘플에 가중치를 곱한다. 세로 패스는 같은 구성을 Y 방향으로 적용한다.

`Engine/Bin/ShaderFiles/Shader_Deferred.hlsl` 발췌

```hlsl
PS_OUT PS_MAIN_DOWNSAMPLING_BLURX(PS_IN In)
{
    PS_OUT Out = (PS_OUT) 0;
    float2 vTexcoord = 0.f;
    for (int i = -6; i < 7; i++)
    {
        vTexcoord = float2(In.vTexcoord.x + (1.f / g_TexelSizeToSampling.x) * i, In.vTexcoord.y);
        vector vBlur = g_SamplingBlurXTexture.Sample(LinearSampler_Clamp, vTexcoord);
        vBlur.w = 0;
         Out.vColor += g_fWeights[i + 6] * vBlur;
    }
    Out.vColor /= 6.f;
    return Out;
}
```

## 확대 결과를 화면에 합성

업샘플링한 발광 색에 강도 텍스처의 값을 반영하고 원본 화면 색에 더한다. 이 합성 경로가 밝은 부분 주변으로 퍼지는 글로우를 만든다.

`Engine/Bin/ShaderFiles/Shader_Deferred.hlsl` 발췌

```hlsl
PS_OUT PS_MAIN_GLOW_DEFFERED_UPSMAPLING(PS_IN In)
{
    PS_OUT Out = (PS_OUT) 0;
    vector vGlowOriginColor = g_Glow_Original_Texture.Sample(LinearSampler, In.vTexcoord);
    vector vGlowColor = g_Glow_UpSampling.Sample(LinearSampler, In.vTexcoord);
    vector vGlowIntensity = g_Glow_Intensity_Texture.Sample(LinearSampler, In.vTexcoord);
    vGlowColor = Gaussian_Col_UpSampling(In.vTexcoord);
    vGlowIntensity.w = 0.f;
    if (0.f == vGlowIntensity.x &&
        dot(vGlowColor.xyz, vGlowColor.xyz) != 0
        )
        vGlowIntensity.x = 3.f;
    else
        vGlowIntensity.x *= 6.f;
    Out.vColor = vGlowOriginColor + vGlowColor * vGlowIntensity.x;
    return Out;
}
```

{% include game-media-gallery.html slug="gunfire-reborn" summary="글로우 합성 단계" items="glow-result.png|글로우 결과 화면;glow-implementation-01.png|다운샘플링;glow-implementation-02.png|가로·세로 블러;glow-implementation-03.png|업샘플링" %}
