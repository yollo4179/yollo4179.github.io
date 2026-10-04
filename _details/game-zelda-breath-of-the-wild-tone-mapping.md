---
layout: game-article
title: 평균 휘도 축소와 톤매핑
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 1
topic: 화면의 밝기와 음영
summary: 로그 휘도의 2×2 축소, 프레임 간 휘도 적응과 Yxy 톤 커브로 화면 밝기를 계산한다.
tags:
- HLSL
- 톤매핑
- HDR
permalink: /projects/zelda-breath-of-the-wild/technical/tone-mapping/
nav_context: GAME PORTFOLIO / ZELDA
---

## 구현 구조

```text
Client/Private/HDRI_Manager.cpp
Client/Bin/ShaderFiles/CShader_Deffered_HDRI.hlsl
Client/Bin/ShaderFiles/Shader_Deffered_HDRI.hlsl
```

HDR 색 → 로그 휘도 → 2×2 평균 축소 → 이전 휘도와 시간 보간 → Yxy 톤 커브 → RGB 출력.


## 로그 휘도를 2×2 평균으로 축소

`CS_Luminance()`는 RGB에 휘도 가중치를 적용하고 `log(max(luminance, 1e-6))`를 기록한다. `CS_DownScale()`의 각 스레드는 입력 네 픽셀의 평균을 출력한다. 매니저는 축소 단계마다 이전 SRV와 다음 UAV를 바인딩해 평균 휘도를 줄여 나간다.

`Client/Bin/ShaderFiles/CShader_Deffered_HDRI.hlsl` 발췌

```hlsl
void CS_DownScale(uint3 DTid : SV_DispatchThreadID)
{
    float2 texCoord = (float2(DTid.xy))*2;
    float Avg = 0;
    for (int i = 0; i < 2;++i)
        for (int j = 0; j < 2;++j)
        {
            Avg += InputTexture.Load(int3(texCoord + uint2(i,j), 0));
        }
    Avg *= 0.25f;
    OutputReturn[DTid.xy] = Avg;
}
```

## 이전 프레임과 밝기 적응

축소 결과를 `exp()`로 복원한다. 적응 속도와 프레임 시간으로 계산한 alpha를 사용해 이전 휘도와 새 휘도를 섞는다. 필터 결과는 다음 프레임의 이전 휘도로 복사한다.

`Client/Bin/ShaderFiles/Shader_Deffered_HDRI.hlsl` 발췌

```hlsl
PS_OUT PS_MAIN_FILTER_LUM(PS_IN In)
{
    PS_OUT Out = (PS_OUT) 0;
    float alpha = 1.0f - exp(g_AdaptationSpeed * (-g_Time));
    float fDstLum = g_AvgLumNewTexture.Sample(LinearSampler, In.vTexcoord).x;
    fDstLum = exp(fDstLum);
    float fSrcLum = (g_AvgLumPrevTexture.Sample(LinearSampler, In.vTexcoord).x);
    float fUpdatedLum = (1.f - alpha) * fSrcLum + (alpha) * fDstLum;
    Out.vColor.x = fUpdatedLum;
    return Out;
}
```

## Yxy 휘도에 톤 커브 적용

RGB를 Yxy로 변환하고 밝기 Y에 평균 휘도와 MiddleGrey를 적용한다. Reinhard 커브에 WhitePoint 매개변수를 전달한 뒤 RGB로 되돌린다. 색좌표와 밝기를 분리해 노출과 톤 커브를 처리한다.

`Client/Bin/ShaderFiles/Shader_Deffered_HDRI.hlsl` 발췌

```hlsl
float3 NewHDR2(float g_AvgLuminance, float3 vHDRColor)
{
    float AvgLuminance =g_AvgLuminance;
    float3 Yxy = ConvertRGB2Yxy(vHDRColor);
    float lp = Yxy.x * (g_MiddleGrey / (AvgLuminance*9.6 + 0.0001));
    Yxy.x = reinhard2(lp, g_fLumWhiteSqr);;
    float3 mappedRGB = convertYxy2RGB(Yxy);
    return mappedRGB.xyz;
}
```

## 톤매핑 영상과 수식 자료

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="톤매핑 계산식과 HLSL 코드 이미지 6장" items="tone-mapping-luminance-reduction.png|컴퓨트 셰이더의 휘도 병렬 리덕션 코드;tone-mapping-code-01.png|평균 휘도를 이용한 밝기 보정 코드;tone-mapping-code-02.png|Yxy 색공간 변환 코드;tone-mapping-code-03.png|최종 색상을 계산하는 코드;tone-mapping-formula-01.png|MiddleGrey와 평균 휘도의 관계식;tone-mapping-formula-02.png|WhitePoint를 반영한 톤 커브 식" %}

{% include game-video-embed.html id="Q9VEHbAQBt0" title="톤매핑 적용 영상 1" %}

{% include game-video-embed.html id="ycpSpUZEI10" title="톤매핑 적용 영상 2" %}
