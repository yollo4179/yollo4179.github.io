---
layout: game-article
title: 화면 UV와 노이즈로 물 디스토션 구현하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 9
topic: 트레일과 화면 효과
summary: 투영 위치에서 화면 UV를 구하고 굴절 방향·시간 기반 노이즈를 더해 물 뒤의 화면을 다시 샘플링한다.
tags:
- 렌더링
- HLSL
- 후처리
permalink: /projects/gunfire-reborn/technical/water-distortion/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Client/Bin/ShaderFiles/Shader_VtxWater.hlsl
```

투영 위치를 화면 UV로 변환 → 굴절 방향과 노이즈 오프셋 계산 → 화면 텍스처 재샘플링 → 물 색과 혼합.


## 물 표면 뒤의 화면 좌표 구하기

`PS_MAIN_WAVE()`는 투영 위치를 W로 나눈 뒤 X·Y를 0~1 범위의 화면 UV로 바꾼다. 시선 방향과 노멀에서 굴절 방향을 구하고, 노이즈에 시간 기반 sin·cos를 곱해 샘플 위치를 움직인다.

## 화면 색과 물 텍스처 혼합

화면 텍스처는 굴절 방향과 노이즈 오프셋을 더한 UV로 읽는다. 물의 디퓨즈 색과 화면 색을 0.5 비율로 섞고 디스토션 출력에 기록한다.

`Client/Bin/ShaderFiles/Shader_VtxWater.hlsl` 발췌

```hlsl
PS_WAVE_OUT PS_MAIN_WAVE(PS_WAVE_IN In)
{
    PS_WAVE_OUT Out = (PS_WAVE_OUT) 0;
    float3 vViewDir = normalize(In.vWorldPos - g_vCamPosition);
    float3 RefractionDir = refract(vViewDir, In.vNormal.xyz, g_Refractive_index);
    float2 vTexcoordScreen;
    vTexcoordScreen.x = In.vProjPos.x / In.vProjPos.w;
    vTexcoordScreen.y = In.vProjPos.y / In.vProjPos.w;
    vTexcoordScreen.x = (vTexcoordScreen.x) * 0.5f + 0.5f;
    vTexcoordScreen.y = (vTexcoordScreen.y) * -0.5f + 0.5f;
    float2 vTexcoordNoise = In.vTexcoord;
    float3 vNoise = g_NoiseTexture.Sample(LinearSampler, vTexcoordNoise);
    float2 noiseOffset = (vNoise.gb - 0.5f) * g_NoiseStrength;
    noiseOffset.x = vNoise.x * g_NoiseStrength * cos(g_Time*0.8f );
    noiseOffset.y = vNoise.y * g_NoiseStrength * sin(g_Time *0.8f);
    float2 Refraction_Texcoord = RefractionDir.xy*0.1f  + noiseOffset + vTexcoordScreen;
    float2 Diffuse_ReflectedTexcoord = RefractionDir.xy * 0.5f + noiseOffset + In.vTexcoord;
    vector vDiffuseColor = g_DiffuseTexture.Sample(LinearSampler, Diffuse_ReflectedTexcoord);
    vDiffuseColor.a = 0.5;
    vector RefracedColor = g_ScreenTexture.Sample(LinearSampler, Refraction_Texcoord);
    vector vFinalColor = lerp(vDiffuseColor, RefracedColor, vDiffuseColor.a);
    vFinalColor.a = 0.5f;
    Out.vDistortion = vFinalColor;
    return Out;
}
```

{% include game-local-video.html slug="gunfire-reborn" file="water-distortion" title="보스 전투의 물 구체 디스토션" %}

{% include game-media-gallery.html slug="gunfire-reborn" summary="물 디스토션 계산" items="water-distortion-implementation.png|노이즈 오프셋으로 화면 텍스처 샘플링" %}
