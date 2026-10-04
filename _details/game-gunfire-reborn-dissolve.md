---
layout: game-article
title: 노이즈 임계값과 경계 색으로 디졸브 구현하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 8
topic: 트레일과 화면 효과
summary: 시간에 따른 노이즈 UV와 임계값을 사용해 픽셀을 제거하고 사라지는 경계에 색을 적용한다.
tags:
- 렌더링
- HLSL
- 후처리
permalink: /projects/gunfire-reborn/technical/dissolve/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Client/Bin/ShaderFiles/Shader_VtxAnimMesh.hlsl
```

노이즈 UV 계산 → 노이즈와 임계값 비교 → 픽셀 제거 → 경계 색 출력.


## 시간 비율로 노이즈 UV 이동

`PS_MAIN_DESOLVE()`는 현재 노이즈 시간과 최대 시간의 비율을 구한다. 노이즈의 RG 값으로 UV 오프셋을 만들고 강도와 시간 비율을 곱한다. 변형한 UV에서 읽은 노이즈 값을 디졸브 기준으로 사용한다.

## 임계값 아래의 픽셀 제거

노이즈 값이 임계값보다 작으면 `discard`로 픽셀을 제거한다. 임계값 주변에서는 `smoothstep`으로 경계 색을 계산해 사라지는 면의 가장자리를 표시한다.

`Client/Bin/ShaderFiles/Shader_VtxAnimMesh.hlsl` 발췌

```hlsl
PS_OUT PS_MAIN_DESOLVE(PS_IN In)
{
    PS_OUT Out = (PS_OUT) 0;
    vector vMtrlDiffuse = g_DiffuseTexture.Sample(LinearSampler, In.vTexcoord);
    if(vMtrlDiffuse.a<0.1f)
        discard;
    Out.vDiffuse = vMtrlDiffuse;
    float fRatio = (g_NoiseCurTime / g_NoiseMaxTime);
    vector vNoise = g_NoiseTexture.Sample(LinearSampler, In.vTexcoord);
    float2 UVDistortion = (vNoise.rg - 0.5f) * g_NoiseStrength * fRatio;
    float2 DistortedUV = clamp(In.vTexcoord + UVDistortion, 0.f, 1.f);
    vector vDistortedNoise = g_NoiseTexture.Sample(LinearSampler, DistortedUV);
    float Alpha_ToDiscard = vDistortedNoise.r;
    if(Alpha_ToDiscard <fRatio)
    {
        discard;
    }
    else if( Alpha_ToDiscard>= fRatio -0.2f && Alpha_ToDiscard<= fRatio+0.2f)
    {
        float GlowFactor = smoothstep(fRatio - 0.02f, fRatio + 0.02f, Alpha_ToDiscard);
        Out.vDiffuse.r = 1.0f + GlowFactor * 2.0f;
        Out.vDiffuse.g = Out.vDiffuse.r * 0.2f;
        Out.vDiffuse.b = Out.vDiffuse.r * 0.1f;
        Out.vDiffuse.rgb *= GlowFactor * g_GlowIntensity;
    }
    else
    {
        float GlowFactor = smoothstep(fRatio - 0.05f, fRatio + 0.05f, Alpha_ToDiscard);
        Out.vDiffuse.rgb += GlowFactor * g_GlowIntensity;
        Out.vDiffuse.rgb *= lerp(1.f, 0.f, fRatio);
    }
    Out.vNormal = float4(In.vNormal.xyz * 0.5f + 0.5f, 0.f);
    Out.vDepth = float4(In.vProjPos.z / In.vProjPos.w, In.vProjPos.w / 1000.f, 0.f, 0.f);
    Out.vWorld = In.vWorldPos;
    return Out;
}
```

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/gunfire-reborn/dissolve-demo.gif' | relative_url }}" alt="몬스터 모델이 노이즈 임계값에 따라 점차 사라지는 디졸브 효과" loading="lazy">
  <figcaption>몬스터 사망 시 적용한 디졸브 효과</figcaption>
</figure>

{% include game-media-gallery.html slug="gunfire-reborn" summary="디졸브 픽셀 셰이더" items="dissolve-implementation.png|노이즈 임계값과 경계 색 계산" %}
