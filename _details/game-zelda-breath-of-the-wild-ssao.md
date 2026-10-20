---
layout: game-article
title: 깊이·노멀 버퍼로 SSAO 계산하기
project_slug: zelda-breath-of-the-wild
game_portfolio: true
article_toc: true
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

## SSAO의 목적과 뷰 공간 기반 차폐 계산

<figure>
  <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-implementation-05.png' | relative_url }}" alt="각 표면의 노멀 방향에 맞춰 반구를 회전한 모습. 꺾인 표면에서는 반구 안의 일부 샘플이 이웃 표면에 가려진다.">
  <figcaption>표면의 노멀을 기준으로 배치한 반구 샘플과 이웃 표면의 차폐</figcaption>
</figure>

SSAO(Screen Space Ambient Occlusion)는 물체가 맞닿는 부분이나 움푹 들어간 틈의 주변광을 줄여, 표면의 굴곡과 물체 사이의 접촉감을 표현하기 위한 기법이다. 주변 표면이 빛의 접근을 막는 정도를 깊이와 노멀로 근사해 차폐값을 구한다.

이 SSAO 셰이더는 전처리 셰이더가 기록한 깊이에서 표면 위치를 복원하고, 노멀을 변환해 **카메라 기준의 뷰 공간(View Space)에서 차폐 정도를 계산한다.** Screen Space라는 이름은 화면에 기록된 버퍼를 이용한다는 뜻이며, 샘플 위치와 표면 깊이를 비교하는 좌표계는 뷰 공간이다.

셰이더는 뷰 공간의 표면 위치를 중심으로 노멀 방향의 반구에 샘플을 배치한다. 각 샘플을 화면 UV로 투영해 깊이 버퍼를 읽고, 읽어 온 표면 깊이와 샘플의 깊이를 뷰 공간에서 비교한다. <span class="notice-yellow">주변 표면에 가려지는 샘플의 비율이 높을수록 주변광이 덜 도달하는 영역</span>으로 계산한다.

## SSAO 매니저에서 +Z 방향의 반구 커널 생성

<span class="notice-yellow">CSSAO_Manager::Ready_Kernels()</span>는 재사용할 샘플 64개를 만든다. 매니저는 X·Y를 -1~1, Z를 0~1 범위에서 뽑아 벡터를 정규화한다. Z가 음수가 아니므로 샘플 방향은 +Z를 중심축으로 하는 반구에 놓인다. 이때 X·Y·Z는 월드 좌표가 아니라 표면의 접선·종접선·노멀 방향에 대응시킬 로컬 성분이다.

매니저는 정규화한 벡터에 0~1의 난수를 곱해 반구 내부의 거리도 달라지게 한다. 이어서 샘플 인덱스에 따라 <span class="notice-yellow">0.1 + 0.9 * (i / 64)²</span> 배율을 곱한다. 작은 인덱스의 샘플은 더 짧아지므로 표면 가까운 영역을 더 조밀하게 검사할 수 있다. 매니저는 생성한 벡터를 <span class="notice-yellow">g_SampleKernel</span>에 저장한다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="반구 샘플 생성 코드" items="ssao-implementation-01.png|로컬 +Z 방향의 반구 샘플 생성 코드" %}

## 깊이와 노멀을 뷰 공간으로 복원

셰이더는 깊이·노멀 텍스처를 픽셀 좌표로 읽고, 노멀을 -1~1 범위로 복원해 뷰 공간으로 변환한다. 위치는 화면 UV와 깊이 값에서 역투영한다. 화면 크기는 1920×1080, 깊이 복원에 사용하는 Far 값은 1000으로 고정돼 있다.

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

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="뷰 공간 위치 복원 코드 이미지" items="ssao-implementation-03.png|픽셀의 뷰 공간 위치 복원 코드" %}

## TBN으로 반구의 축을 뷰 공간 노멀에 맞추기

매니저가 만든 반구 샘플은 로컬 +Z 방향을 향한다. 바닥과 벽은 바깥쪽을 가리키는 노멀 방향이 다르므로, 같은 반구를 회전 없이 배치하면 일부 샘플이 표면 내부에 놓일 수 있다. 그러면 주변 물체가 가린 정도를 구하려던 계산에 표면 자체의 차폐가 섞인다.

셰이더는 각 표면의 바깥쪽을 검사하도록 TBN을 이용해 반구의 +Z축을 뷰 공간 노멀 방향으로 변환한다.

셰이더는 앞서 변환한 뷰 공간 노멀 <span class="notice-yellow">vNormal_InViewSpace</span>를 기준축으로 사용한다. 노이즈 벡터에서 노멀 방향 성분을 빼고 정규화하면 노멀에 수직인 <span class="notice-yellow">tangent</span>를 얻는다. <span class="notice-yellow">cross(vNormal_InViewSpace, tangent)</span>로 나머지 축인 <span class="notice-yellow">bitangent</span>를 만든다. 노이즈 벡터는 노멀을 중심으로 접선 방향을 바꿔 픽셀마다 같은 샘플 패턴이 반복되는 현상을 줄인다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="노이즈 텍스처 생성 코드" items="ssao-implementation-02.png|샘플 분산용 노이즈 텍스처 생성 코드" %}

셰이더는 <span class="notice-yellow">tangent</span>, <span class="notice-yellow">bitangent</span>, <span class="notice-yellow">vNormal_InViewSpace</span>를 TBN 행렬의 각 행에 넣는다. <span class="notice-yellow">mul(gSampleKernel[i].xyz, TBN)</span>은 다음처럼 샘플의 각 성분을 뷰 공간의 세 축에 곱해 더하는 연산이다.

```text
뷰 공간 샘플 방향 = 샘플.x × tangent
                  + 샘플.y × bitangent
                  + 샘플.z × vNormal_InViewSpace
```

따라서 로컬 +Z 방향은 표면의 노멀 방향으로 바뀌고, 반구 전체가 표면 바깥쪽을 향한다. 셰이더는 변환한 벡터에 <span class="notice-yellow">gRadius * 0.8f</span>를 곱하고 해당 픽셀의 뷰 공간 위치 <span class="notice-yellow">vPosition.xyz</span>를 더한다. 이 연산으로 원점 주변의 반구 커널이 실제 표면 주변의 샘플 위치가 된다.

```hlsl
float3 RandomVec = normalize(SSAONoiseTexture.SampleLevel(gSampler, NoiseScale * TexCoord, 0)).xyz;
float3 tangent = normalize(RandomVec - vNormal_InViewSpace * dot(RandomVec, vNormal_InViewSpace));
float3 bitangent = cross(vNormal_InViewSpace, tangent);
float3x3 TBN = float3x3(tangent, bitangent, vNormal_InViewSpace);
```

## 샘플 위치와 깊이 버퍼를 비교해 차폐 계산

깊이 버퍼는 화면 UV로 읽어야 하므로 셰이더는 뷰 공간 샘플 위치를 <span class="notice-yellow">gProjection</span>으로 투영한다. 이어서 X·Y를 W로 나누고 -1~1 범위를 0~1로 변환한다. Y축은 화면 UV 방향에 맞춰 뒤집는다. 이 UV에서 읽은 깊이는 샘플 자체의 깊이가 아니라, 같은 화면 위치에서 카메라에 가장 먼저 보이는 표면의 깊이다.

셰이더는 깊이 텍스처의 Y 성분에 <span class="notice-yellow">1000.f</span>를 곱해 <span class="notice-yellow">OccluderPosZ</span>를 얻고, 샘플의 뷰 공간 깊이 <span class="notice-yellow">sample.z</span>와 비교한다. <span class="notice-yellow">OccluderPosZ &lt; sample.z - gBias - 0.2f</span>이면 실제 표면이 샘플보다 카메라 가까이에 있으므로 차폐 횟수를 1 늘린다. <span class="notice-yellow">gBias + 0.2f</span>는 거의 같은 깊이의 표면을 차폐로 세는 현상을 줄이기 위한 간격이다.

평평하고 열린 표면에서는 노멀 방향으로 배치한 샘플이 주변 표면에 가려지는 비율이 낮다. 모서리나 접촉부에서는 이웃 표면이 샘플 앞을 가리는 비율이 높아진다. 셰이더는 이 비율을 <span class="notice-yellow">occlusion / gNumSamples</span>로 계산하고, <span class="notice-yellow">1 - occlusion / gNumSamples</span>를 출력한다. 출력값이 1에 가까우면 차폐가 적고, 0에 가까우면 차폐가 많다.

```hlsl
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

이 비교는 화면에 보이는 깊이를 이용한 근사다. 화면 밖이나 다른 물체 뒤의 표면은 반영할 수 없다. 또한 차폐 루프에는 샘플과 표면 사이의 깊이 차이로 기여도를 제한하는 거리 검사가 없어, 깊이가 크게 떨어진 전경도 비교 조건을 만족하면 차폐로 집계될 수 있다.

## 깊이 차이를 반영한 양방향 블러

블러는 가로·세로 방향으로 나눠 처리한다. 화면상 거리에 따른 가중치와 중심·이웃 픽셀의 깊이 차이에 따른 가중치를 곱하고, 가중치 합으로 나눠 출력한다. 깊이가 다른 표면은 블러에 기여하는 비중이 작아진다.

```hlsl
float BilateralWeight(float centerDepth, float sampleDepth, float sigma)
{
    float diff = centerDepth - sampleDepth;
    return exp(-diff * diff / (2 * sigma * sigma));
}
```

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

## SSAO 적용 결과와 영상

<div class="game-image-pair">
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-01.png' | relative_url }}" alt="지형 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>지형 장면의 SSAO 적용 비교</figcaption></figure>
  <figure><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/ssao-result-02.png' | relative_url }}" alt="풀밭 장면의 SSAO 적용 전후와 차폐 마스크 비교" loading="lazy"><figcaption>풀밭 장면의 SSAO 적용 비교</figcaption></figure>
</div>

{% include game-video-embed.html id="qfSZauMDXyE" title="SSAO 적용 영상" %}
