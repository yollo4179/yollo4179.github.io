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

노멀은 0~1 텍스처 값에서 -1~1로 복원하고 뷰 행렬로 변환한다. 위치는 화면 UV에서 NDC 좌표를 구한 뒤 깊이 값과 역투영 행렬로 복원한다.

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
float4 vDepth = InputDepthTexture.SampleLevel(gSampler, vDepthCoord, 0);
float4 vNormal = InputNormalTexture.SampleLevel(gSampler, vNormalCoord, 0);
vNormal = vNormal * 2.f - 1.f;
vNormal.w = 0.f;
vNormal = mul(vNormal, g_View);
vNormal = normalize(vNormal);
vector vPosition = (vector) 0;
vPosition.x = vDepthCoord.x * 2.f - 1.f;
vPosition.y = vDepthCoord.y * -2.f + 1.f;
vPosition.z = vDepth.x;
vPosition.w = 1.f;
vPosition *= (vDepth.y * 1000.f);
vPosition = mul(vPosition, gInvProjection);
```

## 커널과 깊이 비교

셰이더는 `gSampleKernel`과 TBN 행렬로 `SamplePos`를 계산한다. 이어지는 화면 UV 계산은 `vPosition`을 투영한 값을 사용한다. 깊이의 차이가 0.0003보다 크면 반경에 따른 `rangeCheck`를 누적하고, 최종 값은 `1 - Occlusion / gNumSamples`로 기록한다. 커널 위치 계산과 실제 깊이 조회 좌표는 다음 발췌에 각각 나타난다.

`Client/Bin/ShaderFiles/CShader_Deffered_SSAO.hlsl` 발췌

```hlsl
for (int i = 0; i < gNumSamples; ++i)
{
    float3 RandomVec = gSampleKernel[63 - i];
    RandomVec.y = 0.f;
    float3 SamplePos = vPosition.xyz + gRadius* mul(gSampleKernel[i].xyz, ComputeTBN(vNormal.xyz, RandomVec));
    float4 offset = float4(float3(SamplePos), 1.0f);
    offset = mul(vPosition, gProjection);
    offset.x /= offset.w;
    offset.y /= offset.w;
    offset.x = offset.x * 0.5f + 0.5f;
    offset.y = offset.y * -0.5f + 0.5f;
    float4 SampleDepthDesc = InputDepthTexture.SampleLevel(gSampler, offset.xy, 0);
    float sampleDepth = SampleDepthDesc.y * 1000.f;
    float depthDifference = sampleDepth - (vPosition.z);
    float rangeCheck = smoothstep(0.f, 1.f, gRadius / abs(vPosition.z - sampleDepth));
    Occlusion += (depthDifference > 0.0003f) ? rangeCheck : 0.0f;
}
```

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

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="SSAO 샘플 생성·깊이 비교 코드 이미지 5장" items="ssao-implementation-01.png|노멀 주변 반구 샘플 생성 코드;ssao-implementation-02.png|샘플 분산용 노이즈 텍스처 생성 코드;ssao-implementation-03.png|픽셀의 뷰 공간 위치 복원 코드;ssao-implementation-04.png|샘플과 지형의 깊이를 비교하는 코드;ssao-implementation-05.png|SSAO 반구 샘플의 좌표 변환 설명" %}

{% include game-video-embed.html id="qfSZauMDXyE" title="SSAO 적용 영상" %}
