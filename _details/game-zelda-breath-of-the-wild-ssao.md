---
layout: game-article
title: 깊이·노멀 버퍼로 SSAO 계산하기
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 2
topic: 화면의 밝기와 음영
summary: 깊이·노멀에서 뷰 공간 정보를 복원하고 깊이 비교와 양방향 블러를 계산하는 SSAO 셰이더를 구성했다.
tags:
- HLSL
- SSAO
- 후처리
permalink: /projects/zelda-breath-of-the-wild/technical/ssao/
nav_context: GAME PORTFOLIO / ZELDA
---

## 구현 구조

```text
Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl
```

깊이·노멀 텍스처 읽기 → 뷰 공간 위치와 노멀 복원 → 깊이 비교 값 누적 → 차폐값 출력 → 깊이를 고려한 블러.


## 깊이와 노멀을 뷰 공간으로 복원

셰이더는 깊이·노멀 텍스처를 픽셀 좌표로 읽고, 노멀을 -1~1 범위로 복원해 뷰 공간으로 변환한다. 위치는 화면 UV와 깊이 값에서 역투영한다. 화면 크기는 1920×1080, 깊이 복원에 사용하는 Far 값은 1000으로 고정돼 있다.

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
uint2 TexSize = { 1920, 1080 };
float2 TexCoord = float2(DTid.xy) / float2(TexSize);
vector vDepth = InputDepthTexture.Load(int3(DTid.xy, 0));
float2 NoiseScale = { 1920 / 4.F, 1080 / 4.F };
vector vNormal = InputNormalTexture.Load(int3(DTid.xy, 0));
vNormal.xyz = normalize(vNormal.xyz * 2.f - 1.f);
float3x3 matView3x3 = (float3x3) gView;
float3 vNormal_InViewSpace = normalize(mul(vNormal.xyz, matView3x3));
vector vPosition = (vector) 0;
vPosition.x = TexCoord.x * 2.f - 1.f;
vPosition.y = TexCoord.y * -2.f + 1.f;
vPosition.z = vDepth.x;
vPosition.w = 1.f;
vPosition *= vDepth.y * 1000;
vPosition = mul(vPosition, gInvProjection);
```

## 커널과 깊이 비교

셰이더는 노이즈 벡터와 뷰 공간 노멀로 TBN 행렬을 구성하고, 커널에 반경과 0.8을 곱해 샘플 위치를 계산한다. 샘플 위치를 투영한 UV에서 깊이를 읽고, 해당 깊이가 `sample.z - gBias - 0.2f`보다 작으면 차폐 횟수를 늘린다. 최종 값은 `1 - occlusion / gNumSamples`로 출력한다.

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
float3 RandomVec = normalize(SSAONoiseTexture.SampleLevel(gSampler, NoiseScale * TexCoord, 0)).xyz;
float3 tangent = normalize(RandomVec - vNormal_InViewSpace * dot(RandomVec, vNormal_InViewSpace));
float3 bitangent = cross(vNormal_InViewSpace, tangent);
float3x3 TBN = float3x3(tangent, bitangent, vNormal_InViewSpace);
float occlusion = 0.f;
for (int i = 0; i < gNumSamples; ++i)
{
    float3 sample = mul(gSampleKernel[i].xyz, TBN);
    sample = vPosition.xyz + sample * gRadius*0.8f;
    vector offset = vector(sample, 1.f);
    offset = mul(offset, gProjection);
    offset.x /= offset.w;
    offset.y /= offset.w;
    offset.x = offset.x * 0.5f + 0.5f;
    offset.y = offset.y * -0.5f + 0.5f;
    float OccluderPosZ = InputDepthTexture.SampleLevel(gSampler, offset.xy, 0).y * 1000.f;
    occlusion += (OccluderPosZ < sample.z - gBias-0.2f  ? 1.f : 0.f);
}
float ao = 1.f - (occlusion / gNumSamples);
OutputReturnSSAO[DTid.xy] = ao;
```

## TBN으로 접선 공간 커널을 뷰 공간으로 변환

셰이더는 `tangent`, `bitangent`, 뷰 공간 노멀을 TBN의 각 행으로 구성한다.
`mul(gSampleKernel[i].xyz, TBN)`은 커널의 X·Y·Z 성분을 각 기저에 곱해 더하므로,
접선 공간의 반구 샘플을 뷰 공간 방향으로 변환한다. 셰이더는 이 방향에 반경을
곱한 뒤 `vPosition.xyz`를 더해 깊이 비교에 사용할 샘플 위치를 만든다.

## 깊이 차이를 반영한 양방향 블러

블러는 가로·세로 방향으로 나눠 처리한다. 화면상 거리에 따른 가중치와 중심·이웃 픽셀의 깊이 차이에 따른 가중치를 곱하고, 가중치 합으로 나눠 출력한다. 깊이가 다른 표면은 블러에 기여하는 비중이 작아진다.

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
float BilateralWeight(float centerDepth, float sampleDepth, float sigma)
{
    float diff = centerDepth - sampleDepth;
    return exp(-diff * diff / (2 * sigma * sigma));
}
```

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
if (0.5f < Vertical_Horize.x)
{
    for (int i = -fRadius; i <= fRadius; ++i)
    {
        float2 UVAndoffset = float2(vTexCoord.x + (1.f / texSize.x) * i, vTexCoord.y);
        float SampleDepth = DepthTexture.SampleLevel(gSampler, UVAndoffset, 0).x;
        float SampleSSAO = InputTexture.SampleLevel(gSampler, UVAndoffset, 0).x;
        float spatialWeight = exp(-i * i / (2 * sigmaD * sigmaD));
        float rangeWeight = BilateralWeight(fCenterDepth.x, SampleDepth, sigmaR);
        float weight = spatialWeight * rangeWeight;
        result += SampleSSAO.x * weight;
        weightSum += weight;
    }
}
```

## SSAO 영상과 계산 자료

<div class="game-image-pair">
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-01.png' | relative_url }}" alt="지형 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>지형 장면의 SSAO 적용 비교</figcaption></figure>
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-02.png' | relative_url }}" alt="풀밭 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>풀밭 장면의 SSAO 적용 비교</figcaption></figure>
</div>

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="SSAO 샘플 생성·좌표 변환 자료 4장" items="ssao-implementation-01.png|노멀 주변 반구 샘플 생성 코드;ssao-implementation-02.png|샘플 분산용 노이즈 텍스처 생성 코드;ssao-implementation-03.png|픽셀의 뷰 공간 위치 복원 코드;ssao-implementation-05.png|SSAO 반구 샘플의 좌표 변환 설명" %}

{% include game-video-embed.html id="qfSZauMDXyE" title="SSAO 적용 영상" %}
