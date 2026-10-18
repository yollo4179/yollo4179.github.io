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

## Reinhard 톤 매핑의 원리와 변수 관계

HDR 장면의 선형 휘도는 화면에 표시할 범위를 넘을 수 있다. 먼저 장면의 대표 휘도로 노출을 조절하고, 그 결과에 톤 커브를 적용한다. **Middle Gray와 평균 휘도는 커브에 들어갈 입력을 바꾸고, White Point는 커브의 밝은 영역을 조절한다.**

### 노출 스케일링과 톤 커브를 나눈다

<p><strong>노출 스케일링:</strong> s = L<sub>Scaled</sub>(x) = (a / L<sub>avg</sub>) × x</p>
<p><strong>톤 매핑:</strong> L<sub>Out</sub>(x) = s × (1 + s / P) / (1 + s)</p>

표준 확장 Reinhard 식은 화이트 포인트 W의 제곱을 분모로 사용하므로 **P = W²**이다. 아래 Desmos 그래프는 `wp¹`을 사용하므로 **P = wp**로 읽는다. W와 wp에 같은 숫자를 넣어도 두 식의 결과는 다르다. 노출 스케일링과 표준 톤 커브는 [Reinhard 논문의 식 (2)·(4)](https://w3.impa.br/~lvelho/ip02/papers/reinhard/tonemap.pdf)를 따른다.

| 변수 | 의미 | 다른 변수와의 관계 |
| --- | --- | --- |
| x | 톤 매핑 전 픽셀의 선형 휘도. 그래프의 가로축 | FP16 저장값이라는 이유만으로 nit 단위가 되지는 않는다. |
| L<sub>avg</sub> | 장면을 대표하는 휘도. 원 논문에서는 로그 평균 휘도 | 한 곡선 안에서는 고정한다. 같은 x에서 이 값이 작아지면 노출 배율이 커진다. |
| a = V<sub>middleGrey</sub> | 대표 휘도를 스케일링 후 어느 밝기에 놓을지 정하는 키 값 | x = L<sub>avg</sub>이면 s = a다. 최종 출력이 a가 된다는 뜻은 아니다. |
| a / L<sub>avg</sub> | 원본 휘도에 곱하는 노출 배율 | a를 키우거나 L<sub>avg</sub>를 낮추면 같은 픽셀의 s가 커진다. |
| s = L<sub>Scaled</sub> | 노출을 적용한 휘도 | 톤 커브의 입력이며 0~1로 제한되지 않는다. |
| W | 표준식에서 출력 1에 대응하는 스케일된 입력 | P = W²일 때 s = W에서 출력이 1이다. 모니터 최대 nit를 그대로 넣는 값이 아니다. |
| P | 톤 커브에 실제로 들어가는 분모 | 표준식에서는 W², 그래프에서는 wp다. s = √P에서 출력이 1이다. |
| L<sub>Out</sub> | 톤 매핑으로 계산한 상대 휘도 | 디스플레이의 nit나 8비트 정수 코드와 다르며 1을 넘을 수 있다. |
| L<sub>max</sub> | 장면 또는 실험에서 정한 입력 휘도의 최댓값 | 평균 휘도 및 자료형의 최대 표현값과 구분한다. |

### 평균 휘도에 따른 그래프 변화

네 그래프는 **a = 0.18, P = 1.8을 고정**하고 L<sub>avg</sub>를 바꾼 실험이다. 빨간 선은 노출 스케일링 결과, 파란 선은 톤 매핑 결과다. 두 선은 같은 원본 입력 x를 서로 다른 처리 단계에서 비교한다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="평균 휘도별 Reinhard 그래프 4장" items="tone-mapping-desmos-average-8700.png|평균 휘도 8,700, Middle Gray 0.18, P 1.8. 빨간 선은 스케일링, 파란 선은 톤 매핑 결과.;tone-mapping-desmos-average-65300.png|평균 휘도 65,300, Middle Gray 0.18, P 1.8. 같은 입력 범위에서 노출 배율이 작아진다.;tone-mapping-desmos-average-15200.png|평균 휘도 15,200, Middle Gray 0.18, P 1.8. 평균 휘도 65,300일 때보다 같은 픽셀의 출력이 높다.;tone-mapping-desmos-average-4400.png|평균 휘도 4,400, Middle Gray 0.18, P 1.8. 노출 배율이 커지고 톤 매핑 출력도 1을 넘는다." %}

**같은 픽셀 입력 x에서 평균 휘도를 낮추면 출력이 높아진다.** 다만 x도 평균 휘도와 함께 바꾸면 조건이 달라진다. a와 P를 고정했을 때의 관계는 다음과 같다.

| 관찰 조건 | 스케일링 결과 | 톤 매핑 결과 |
| --- | --- | --- |
| x를 고정하고 L<sub>avg</sub>를 증가 | s가 감소 | 출력이 낮아진다. L<sub>avg</sub>를 무한히 키우면 출력은 0으로 간다. |
| 항상 x = L<sub>avg</sub>가 되도록 함께 변경 | s = a | 원본 수치가 커져도 출력은 같다. |
| L<sub>avg</sub> = L<sub>max</sub>로 고정하고 0 ≤ x ≤ L<sub>max</sub>를 관찰 | 0 ≤ s ≤ a | 이 입력 범위에서는 s = a일 때 출력이 가장 크다. |

마지막 조건에서 a = 0.18이면 스케일된 입력의 최댓값도 0.18이다. P = 1.8을 대입한 출력은 `0.18 × (1 + 0.18 / 1.8) / 1.18 ≈ 0.1678`이다. **0.1678은 정해진 입력 범위의 끝값이며, 무한한 입력에 대한 수렴값이 아니다.**

### Middle Gray와 WP가 영향을 주는 위치

Middle Gray는 노출 배율을 통해 s 자체를 바꾼다. 반면 P는 다음 식의 추가 배율에 들어간다.

<p>L<sub>Out</sub> = [s / (1 + s)] × (1 + s / P)</p>

s ≤ 0.18, P = 1.8인 구간에서는 s / P ≤ 0.1이므로 추가 배율은 최대 1.1이다. 이 조건에서는 Middle Gray를 조절한 변화가 WP를 조절한 변화보다 크게 보일 수 있다. 네 그래프 전체가 이 작은 s 구간에 해당하는 것은 아니다.

같은 s에서 P를 키우면 출력이 낮아지고, P를 매우 크게 하면 기본 Reinhard인 `s / (1 + s)`에 가까워진다. 기본식도 비선형이다. 작은 입력 구간이나 넓은 축 범위에서는 곡선이 직선처럼 보일 수 있다. 원본 x를 가로축으로 삼으면 원점의 기울기는 a / L<sub>avg</sub>다. 초기 기울기가 1인 것은 s를 가로축으로 삼았을 때다.

### 출력 1과 입력 범위를 구분한다

확장식은 다음과 같이 나눌 수 있다.

<p>L<sub>Out</sub> = s / P + (1 − 1 / P) × s / (1 + s)</p>

유한한 P에서는 s / P 항이 남으므로 입력을 계속 키우면 출력도 계속 증가한다. **확장 Reinhard 식 자체는 출력을 0~1에 가두지 않는다.** 출력이 1에서 평평해지는 경우에는 `saturate` 등 후속 클램핑과 톤 커브를 구분해야 한다.

휘도는 x ≥ 0, L<sub>avg</sub> > 0, a > 0, P > 0인 영역에서 해석한다. 이 조건에서 출력은 음수가 되지 않는다. 음수 x까지 그리면 실제 휘도로 사용하지 않는 영역이 나타나며, x = −L<sub>avg</sub> / a에서는 s = −1이 되어 분모가 0이 된다.

### FP16은 장면의 밝기 분포를 정하지 않는다

FP16의 최대 유한값은 **65,504**다. 65,535는 부호 없는 16비트 정수의 최댓값이다. FP16은 음수와 소수도 표현한다. [Microsoft의 Half 자료형 설명](https://devblogs.microsoft.com/dotnet/introducing-the-half-type/)

휘도를 FP16에 저장하더라도 장면이 0~65,504 전체를 사용하거나 평균 휘도가 약 32,000이 되는 것은 아니다. **자료형은 저장 가능한 범위를 정하고, 장면과 렌더링 결과는 실제 휘도 분포를 정한다.** 그래프의 슬라이더 상한 역시 FP16의 최대 유한값을 뜻하지 않는다. x와 L<sub>avg</sub>를 같은 단위와 배율로 표현하면 두 값의 비율로 노출을 계산할 수 있다.

## 톤매핑 결과 영상

{% include game-video-embed.html id="Q9VEHbAQBt0" title="톤매핑 적용 영상 1" %}

{% include game-video-embed.html id="ycpSpUZEI10" title="톤매핑 적용 영상 2" %}

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

위 셰이더의 노출 배율은 `g_MiddleGrey / (AvgLuminance × 9.6 + 0.0001)`이다. Desmos의 단순화된 `a / L_avg`와는 분모가 다르므로 같은 매개변수 값을 넣어도 결과가 같지 않다. 특히 셰이더에서는 입력 휘도가 평균 휘도와 같아도 `lp`가 곧바로 MiddleGrey가 되지 않는다. 그래프의 0.1678은 그래프 식에 대한 계산값이다.

## ImGui HDR 설정과 장면별 JSON {#hdr-tool}

Debug 빌드의 `Minho_ImGui_HDRI()`는 HDR 매니저의 설정을 읽어 `MiddleGrey`와 `fLumWhiteSqr`를 슬라이더로 조정한다. 각 토글은 슬라이더 범위를 바꾸며, 수정한 설정은 `Set_HDRI_Desc()`로 매니저에 전달한다. HDR 켜기·끄기도 도구에서 전환한다.

`Client/Private/Level_GamePlay.cpp` · 높은 값 범위의 슬라이더 호출 발췌

```cpp
ImGui::SliderFloat("MiddleGrey", &desc.fMiddleGrey, 1.f, 100.f);
ImGui::SliderFloat("fLumWhiteSqr", &desc.fLumWhiteSqr, 1.f, 1000000.f);
```

낮은 값 범위는 각각 0.001~1과 0.1~1이다. 사용자가 경로를 입력하고 저장 버튼을 누르면 도구가 두 값을 JSON 파일로 기록한다.

`Client/Private/Level_GamePlay.cpp` · 저장 동작 발췌

```cpp
ImGui::InputText("PathToSaveNowData", m_BaseBuf,sizeof(_char)*MAX_PATH);
if (ImGui::Button("Save_Now Data", ImVec2(100, 20)))
{
    m_pHDRI_Manager->SaveAsJson(m_BaseBuf,desc);
}
```

`Client/Bin/Resources/CMH/Json/HDR/Town.json` 저장 값

```json
{
    "LumWhite": 46681.19140625,
    "MiddleGrey": 2.275100040435791
}
```

장면 초기화에서 `SetInfo_ByJson()`이 파일을 읽고 `Read_From_Json()`으로 매니저의 값을 복원한다. Town과 Maze_Ganon의 설정 파일을 각 장면에 적용한다.

`Client/Private/HDRI_Manager.cpp` · `Read_From_Json()` 발췌

```cpp
m_fLumWhiteSqr = jFile["LumWhite"].get<float>();
m_fMiddleGrey = jFile["MiddleGrey"].get<float>();
```

## 구현 수식과 코드 자료

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="톤매핑 계산식과 HLSL 코드 이미지 6장" items="tone-mapping-luminance-reduction.png|컴퓨트 셰이더의 휘도 병렬 리덕션 코드;tone-mapping-code-01.png|평균 휘도를 이용한 밝기 보정 코드;tone-mapping-code-02.png|Yxy 색공간 변환 코드;tone-mapping-code-03.png|최종 색상을 계산하는 코드;tone-mapping-formula-01.png|MiddleGrey와 평균 휘도의 관계식;tone-mapping-formula-02.png|WhitePoint를 반영한 톤 커브 식" %}
