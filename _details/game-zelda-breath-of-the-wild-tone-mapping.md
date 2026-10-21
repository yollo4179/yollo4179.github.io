---
layout: game-article
title: 평균 휘도 축소와 톤매핑
project_slug: zelda-breath-of-the-wild
game_portfolio: true
article_toc: true
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

## 톤매핑의 목적과 처리 원리

HDR 렌더링은 밝은 광원과 어두운 표면의 차이를 1보다 큰 색상값까지 사용해 표현한다. 이 값을 화면 출력 범위에 맞춰 단순히 잘라내면 밝은 영역의 서로 다른 값이 같은 흰색으로 표시돼 밝기 차이가 사라진다. <span class="notice-yellow">톤매핑은 넓은 밝기 범위를 비선형 곡선으로 조절해 화면에서 표현할 수 있는 밝기로 대응시키는 과정이다.</span>

이 구현은 화면의 평균 휘도로 노출 배율을 정한 뒤, 확장 Reinhard 톤 커브를 적용한다. 노출 조절은 <span class="notice-yellow">모든 픽셀의 휘도에 같은 배율을 곱해</span> 장면 전체를 밝게 하거나 어둡게 한다.
<br> 반면 톤 커브는 입력 휘도에 따라 서로 다른 배율을 적용한다. 화이트 포인트가 1보다 큰 조건에서는 낮은 휘도보다 높은 휘도의 증가 폭을 더 줄여, 밝은 영역의 넓은 휘도 범위를 압축한다.
<br><br>
(뒤의 <span class="notice-pink">[그래프 1. 노출 적용 휘도와 톤매핑 출력의 관계](#tone-curve-graph)</span>에서 첫 번째 곡선(wp>1)은 위로 볼록한 형태를 보인다. 입력 휘도가 커질수록 곡선의 기울기가 작아지므로, 같은 입력 증가량에 대한 출력 휘도의 증가량도 줄어든다.)
<br><br>
 화이트 포인트는 출력 휘도가 1이 되는 입력 기준값이다. 이보다 밝은 입력은 1보다 큰 값으로 출력되며, 톤매핑 식 자체가 출력을 1에서 잘라내지는 않는다.

셰이더는 RGB를 Yxy 색공간으로 변환해 <span class="notice-yellow">휘도 Y</span>와 <span class="notice-yellow">색도 x·y</span>를 분리한다. Y에는 노출 배율을 곱하고 톤 커브를 적용하며, 색의 비율을 나타내는 x·y는 유지한다. 이후 바뀐 Y와 기존 x·y를 RGB로 되돌려 출력한다. R·G·B 각각에 톤 커브를 적용하는 대신 밝기 성분만 조절하므로, 변환 과정에서 색도를 유지하며 밝기를 바꿀 수 있다.

화면의 평균 휘도가 갑자기 달라져도 노출이 즉시 바뀌지 않도록 이전 프레임의 휘도와 새 휘도를 시간에 따라 보간을 통해 섞는다. 따라서 처리 과정은 **장면의 대표 밝기 계산 → 시간에 따른 밝기 적응 → 노출 조절 → 톤 커브 적용**으로 나뉜다.

## 노출과 Reinhard 톤 커브의 변수 관계

### 용어 정리

| 용어 | 기호·식 | 역할 |
| --- | --- | --- |
| 픽셀 휘도 | $$L$$ | 톤 매핑 전 한 픽셀의 밝기 |
| 평균 휘도 | $$L_{\mathrm{avg}}$$ | 화면 전체의 밝기를 대표하는 값. 다른 픽셀의 밝기가 변하면 함께 달라진다. 로그 평균에 밝기 적응을 적용한다. |
| 노출 조절 | $$L_{\mathrm{Scaled}}(L)$$ | 픽셀 휘도에 노출 배율을 곱해 밝기를 조절한다. |
| 노출 배율 | $$\frac{V_{\mathrm{middleGray}}}{9.6L_{\mathrm{avg}}+0.0001}$$ | 픽셀 휘도에 곱하는 값. 2이면 두 배로, 0.5이면 절반으로 바꾼다. |
| Middle Gray | $$V_{\mathrm{middleGray}}$$ | 화면 전체의 밝기를 조절하는 값. 모든 픽셀에 공통으로 적용되며, 키우면 전체적으로 밝아지고 줄이면 어두워진다. |
| 노출 조절 결과 | $$s=L_{\mathrm{Scaled}}(L)$$ | 노출을 조절한 픽셀 휘도. 톤 커브에 입력한다. |
| 화이트 포인트 | $$wp$$ | 노출 보정 후 휘도 s에서 출력 1에 대응하는 기준값 |
| 톤 매핑 | $$L_{\mathrm{Out}}(L)=\frac{s(1+s/wp^2)}{1+s}$$ | 노출 조절 결과 s에 톤 커브를 적용해 출력 휘도를 계산한다. |

### 노출 스케일링과 톤 커브를 나눈다

**노출 스케일링:**

L은 한 픽셀의 휘도이고, L<sub>avg</sub>는 화면 전체의 밝기를 대표하는 평균 휘도다. **픽셀 자체의 밝기와 화면 전체의 밝기는 서로 다른 값이다.** 다른 픽셀들이 밝아지면 해당 픽셀의 L이 그대로여도 L<sub>avg</sub>는 높아질 수 있다.

V<sub>middleGray</sub>는 노출 배율을 조절하는 값이다. 아래 식에서는 V<sub>middleGray</sub>를 키우면 배율이 커지고, 분모의 L<sub>avg</sub>가 커지면 배율이 작아진다. 이 배율을 픽셀 휘도 L에 곱한 결과가 **s, 즉 노출을 적용한 휘도**다.

$$
s = L_{\mathrm{Scaled}}(L) = \frac{V_{\mathrm{middleGray}}}{9.6 L_{\mathrm{avg}} + 0.0001} \times L
$$

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="평균 휘도와 노출 배율의 관계식" items="tone-mapping-formula-01.png|MiddleGrey와 평균 휘도의 관계식" %}

따라서 같은 픽셀이라도 화면의 평균 휘도가 높아지면 s가 작아지고, 평균 휘도가 낮아지면 s가 커진다. 분모의 9.6과 0.0001은 구현에 사용한 상수다. s는 아직 톤 커브를 적용하기 전의 값이며, 1보다 클 수 있다.

**톤 매핑:**

앞에서 구한 s를 다음 식에 넣어 출력 휘도 L<sub>Out</sub>을 계산한다. **wp는 노출을 적용한 휘도 중 어느 값을 출력 1에 대응시킬지 정하는 화이트 포인트**다. 원래 픽셀 휘도 L이 아니라, 노출을 적용한 s와 비교하는 기준이다.

$$
L_{\mathrm{Out}}(L) = \frac{s \left(1 + \frac{s}{wp^{2}}\right)}{1+s}
$$

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="화이트 포인트를 반영한 톤 커브 식" items="tone-mapping-formula-02.png|WhitePoint를 반영한 톤 커브 식" %}

**wp를 양수로 고정하고 노출 보정 후 휘도 s를 가로축으로 두면, 톤매핑 함수는 s ≥ 0에서 단조 증가한다.** s = wp에서 출력은 1이므로, s < wp이면 출력은 1보다 작고 s > wp이면 출력은 1보다 크다.

### 그래프 1. 노출 적용 휘도와 톤매핑 출력의 관계 {#tone-curve-graph}

세 그래프의 가로축은 노출 적용 후 휘도 s, 세로축은 톤매핑 출력이다. 각 그래프는 화이트 포인트를 고정하고 입력 s에 따른 출력 변화를 나타낸다. 휘도 해석에는 s ≥ 0 구간만 사용한다.

<div class="tone-curve-comparison" data-media-gallery>
  <figure>
    <a href="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-two-point-two-green.png' | relative_url }}" aria-label="그래프 1: 화이트 포인트 2.2 확대">
      <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-two-point-two-green.png' | relative_url }}" alt="화이트 포인트 2.2에서 초록색 톤 커브의 기울기가 입력 증가에 따라 작아지고, 입력 2.2에서 출력 1을 지나는 그래프" loading="lazy">
    </a>
    <figcaption>그래프 1 · wp = 2.2: 입력이 커질수록 기울기가 작아진다. 초록색 곡선은 (2.2, 1)을 지난다.</figcaption>
  </figure>
  <figure>
    <a href="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-one.png' | relative_url }}" aria-label="그래프 2: 화이트 포인트 1 확대">
      <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-one.png' | relative_url }}" alt="화이트 포인트 1에서 초록색 톤 커브가 입력과 출력이 같은 직선이며 입력 1에서 출력 1을 지나는 그래프" loading="lazy">
    </a>
    <figcaption>그래프 2 · wp = 1: 출력이 입력 s와 같은 직선이다. 초록색 직선은 (1, 1)을 지난다.</figcaption>
  </figure>
  <figure>
    <a href="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-half.png' | relative_url }}" aria-label="그래프 3: 화이트 포인트 0.5 확대">
      <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/tone-mapping-white-point-half.png' | relative_url }}" alt="화이트 포인트 0.5에서 초록색 톤 커브의 기울기가 양수 입력 증가에 따라 커지고, 입력 0.5에서 출력 1을 지나는 그래프" loading="lazy">
    </a>
    <figcaption>그래프 3 · wp = 0.5: 입력이 커질수록 기울기가 커진다. 초록색 곡선은 (0.5, 1)을 지난다.</figcaption>
  </figure>
</div>

### 화이트 포인트가 곡선의 기울기를 바꾸는 이유

그래프 1의 wp = 2.2에서는 곡선이 위로 볼록하다. 같은 입력 휘도 차이를 비교하면 밝은 구간의 출력 차이가 어두운 구간보다 작다. 그래프 2의 wp = 1에서는 식이 출력 = s로 단순화돼 톤 커브가 입력을 그대로 통과시킨다. 그래프 3의 wp = 0.5에서는 곡선이 아래로 볼록해 밝은 구간의 출력 차이가 오히려 커진다.

이 차이는 톤 커브의 기울기를 나타내는 다음 식으로 구분할 수 있다.

$$
\frac{dL_{\mathrm{Out}}}{ds} = \frac{1}{wp^2} + \frac{1 - 1/wp^2}{(1+s)^2}
$$

| 화이트 포인트 조건 | s가 증가할 때 기울기 | 같은 입력 차이에 대한 출력 차이 |
| --- | --- | --- |
| wp > 1 · 그래프 1 | 1에서 시작해 1/wp²에 가까워지며 감소 | 밝은 구간일수록 작아진다. |
| wp = 1 · 그래프 2 | 1로 일정 | 입력 차이와 같다. |
| 0 < wp < 1 · 그래프 3 | 1에서 시작해 1/wp²에 가까워지며 증가 | 밝은 구간일수록 커진다. |

따라서 <span class="notice-yellow">입력이 커질수록 출력 증가 폭이 줄어든다는 설명은 wp > 1 조건에 해당한다.</span> 세 경우 모두 s = wp에서 출력은 1이며, s > wp에서는 출력이 1을 넘는다. 기울기의 감소와 출력값의 상한 제한은 서로 다른 성질이다.

같은 양수 s에서 wp를 키우면 s / wp² 항이 작아져 출력이 낮아지고, wp를 줄이면 출력이 높아진다. 즉 **V<sub>middleGray</sub>와 L<sub>avg</sub>는 톤 커브에 넣을 s를 결정하고, wp는 그 s를 출력 휘도로 바꾸는 곡선을 조절한다.**

## 구현 순서와 데이터 흐름

HDR 색 → 로그 휘도 → 2×2 평균 축소 → 이전 휘도와 시간 보간 → Yxy 톤 커브 → RGB 출력.

컴퓨트 셰이더는 HDR 색에서 로그 휘도를 구하고 텍스처를 단계적으로 축소한다. HDR 매니저는 각 단계의 입력·출력 텍스처를 연결한다. 밝기 적응 셰이더는 축소 결과와 이전 프레임의 휘도를 섞고, 톤매핑 셰이더는 이 값을 공통 노출 기준으로 사용한다.

<span class="notice-yellow">CHDRI_Manager::Render_Deffered()</span>가 이 순서를 관리한다. 매니저는 평균 휘도 계산, 밝기 적응, 적응 결과 복사를 차례로 호출한 뒤 톤매핑 패스를 실행한다.

| 매니저의 처리 | 전달하는 데이터 | 다음 단계에서의 용도 |
| --- | --- | --- |
| Compute_AveLum() | 단계적으로 축소한 로그 휘도 | 새 평균 휘도 계산 |
| Render_FilteredLuminance() | 이전 휘도와 새 휘도를 보간한 결과 | 이번 프레임의 노출 기준 |
| Render_CopyFilteredLuminance() | 적응 결과의 복사본 | 다음 프레임의 이전 휘도 |
| 톤매핑 패스 | 색상 텍스처·적응 휘도·노출 설정 | 최종 화면 색상 계산 |

휘도 계산에는 <span class="notice-yellow">Target_Final</span>을, 톤매핑의 기본 색상 입력에는 <span class="notice-yellow">Target_Water_Final</span>을 연결한다. 두 단계가 읽는 색상 텍스처를 구분하고, 계산된 휘도는 별도의 텍스처로 톤매핑에 전달한다.

## 로그 휘도를 2×2 평균으로 축소

<span class="notice-yellow">CS_Luminance()</span>는 각 픽셀의 RGB에 가중치 <span class="notice-yellow">(0.2126, 0.7152, 0.0722)</span>를 적용해 휘도를 구하고, <span class="notice-yellow">log(max(luminance, 1e-6))</span>를 기록한다. <span class="notice-yellow">CS_DownScale()</span>의 각 스레드는 입력 네 픽셀의 로그 휘도 평균을 출력한다. 매니저는 축소 단계마다 이전 SRV와 다음 UAV를 바인딩한다.

픽셀 휘도를 그대로 더해 나누는 산술 평균과 달리, 이 코드는 **로그로 변환한 휘도를 평균 낸다.** 이후 <span class="notice-yellow">exp()</span>로 복원하므로 로그 평균 휘도를 얻는다. 화면의 다른 픽셀이 밝아지거나 어두워지면 이 평균도 달라진다.

로그 변환은 큰 휘도값의 차이를 압축하므로, 소수의 매우 밝은 픽셀이 산술 평균을 크게 끌어올리는 영향을 줄인다. 2×2 축소를 반복하면 화면 전체를 대표하는 값을 작은 텍스처로 모을 수 있다. 각 스레드가 입력 네 픽셀을 처리하므로 축소 단계 안에서 병렬로 계산할 수 있다.

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

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="로그 휘도 축소 코드" items="tone-mapping-luminance-reduction.png|컴퓨트 셰이더의 휘도 병렬 리덕션 코드" %}

### 매니저에서 축소 단계의 입력과 출력 연결

<span class="notice-yellow">Ready_RenderTarts()</span>는 원본 뷰포트 크기에서 시작해 가로·세로를 정수 나눗셈으로 절반씩 줄인 텍스처를 만든다. 각 축의 최소 크기는 1이며, 두 축이 모두 1이 되면 생성을 끝낸다. 매니저는 각 단계의 크기를 <span class="notice-yellow">m_LumResolutionSizes</span>에 보관한다.

<span class="notice-yellow">Compute_AveLum()</span>은 먼저 원본 크기의 텍스처에 로그 휘도를 기록한다. 이후 매니저는 i번째 텍스처를 읽기용 SRV로, i+1번째 텍스처를 쓰기용 UAV로 연결해 축소 셰이더를 실행한다. 셰이더가 읽는 입력과 쓰는 출력을 분리하고, 한 단계의 출력이 다음 단계의 입력이 되도록 연결하는 구조다.

```cpp
m_pContext->CSSetShader(m_pComputeShader_DWScale, nullptr, 0);

m_pContext->CSSetShaderResources(0, 1, &m_pLumSRVs[i]);
m_pContext->CSSetUnorderedAccessViews(0, 1, &m_pLumUAVs[i + 1], nullptr);
_uint GroupX = (m_LumResolutionSizes[i].first + 16 - 1) / 16;
_uint GroupY = (m_LumResolutionSizes[i].second + 16 - 1) / 16;
m_pContext->Dispatch(GroupX, GroupY, 1);
```

매니저는 각 단계의 연결을 바꾸기 전에 기존 SRV·UAV 바인딩을 해제한다. 또한 GPU 완료 쿼리가 완료된 경우에 휘도 계산을 새로 제출한다. 따라서 밝기 적응에서 읽는 값은 가장 최근에 계산된 축소 결과다.

## 이전 프레임과 밝기 적응

한 프레임의 평균 휘도를 곧바로 노출 계산에 사용하면 밝은 물체가 화면에 들어오거나 사라질 때 화면 전체의 밝기가 급격히 바뀔 수 있다. 이전 휘도에서 새 휘도로 점진적으로 이동하도록 시간 보간을 적용한다.

<span class="notice-yellow">PS_MAIN_FILTER_LUM()</span>은 축소 결과를 <span class="notice-yellow">exp()</span>로 복원한다. 셰이더는 적응 속도와 프레임 시간으로 계산한 alpha를 사용해 이전 프레임의 필터 결과와 새 로그 평균 휘도를 섞는다. HDR 매니저는 필터 결과를 톤매핑에 전달하고, 다음 프레임에서도 사용할 수 있도록 복사한다. 따라서 톤매핑 식의 L<sub>avg</sub>는 한 프레임의 평균을 즉시 사용하는 값이 아니라 **시간에 따라 밝기 변화에 적응한 값**이다.

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

### 이번 프레임의 결과와 다음 프레임의 입력 분리

<span class="notice-yellow">Render_FilteredLuminance()</span>는 마지막 축소 텍스처를 새 휘도 입력으로, <span class="notice-yellow">Target_Copy_Filtered_Lum</span>을 이전 휘도 입력으로 연결한다. 매니저는 1×1 뷰포트에서 보간 결과를 <span class="notice-yellow">Target_Filtered_Lum</span>에 기록한다.

```cpp
if (FAILED(m_pShader->Bind_SRV("g_AvgLumNewTexture", m_pGameInstance->Get_SRV_ByName(szLumTag))))
    return E_FAIL;

if (FAILED(m_pShader->Bind_SRV("g_AvgLumPrevTexture", m_pGameInstance->Get_SRV_ByName(TEXT("Target_Copy_Filtered_Lum")))))
    return E_FAIL;
```

매니저는 프레임 시간 <span class="notice-yellow">m_fTimeDelta</span>를 셰이더의 <span class="notice-yellow">g_Time</span>으로, 적응 속도 <span class="notice-yellow">m_fAdaptationSpeed</span>를 <span class="notice-yellow">g_AdaptationSpeed</span>로 전달한다. 셰이더는 두 값으로 보간 비율 alpha를 계산한다.

보간이 끝나면 <span class="notice-yellow">Render_CopyFilteredLuminance()</span>가 이번 결과를 복사용 타깃에 그린다. 다음 프레임은 이 복사본을 이전 휘도로 읽는다. 보간 중에 읽는 값과 쓰는 값을 분리하고, 보간이 끝난 뒤에만 이전 휘도를 갱신하는 순서다.

| 텍스처 | 저장하는 값 | 읽는 단계 |
| --- | --- | --- |
| Target_Filtered_Lum | 이번 프레임의 적응 휘도 | 톤매핑·복사 패스 |
| Target_Copy_Filtered_Lum | 다음 프레임까지 유지할 적응 휘도 | 다음 밝기 적응 패스 |

## Yxy 휘도에 톤 커브 적용

RGB를 Yxy로 변환하고 밝기 Y에 평균 휘도와 MiddleGrey를 적용한다. Reinhard 커브에 WhitePoint 매개변수를 전달한 뒤 RGB로 되돌린다. 색좌표와 밝기를 분리해 노출과 톤 커브를 처리한다.

R·G·B 채널에 비선형 곡선을 각각 적용하면 채널 간 비율도 달라질 수 있다. Yxy에서는 색도 x·y를 유지한 채 휘도 Y만 조절할 수 있어, 밝기 조절과 색도 정보를 분리할 수 있다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="RGB와 Yxy 색공간 변환 코드" items="tone-mapping-code-02.png|Yxy 색공간 변환 코드" %}

<span class="notice-yellow">g_fLumWhiteSqr</span>라는 이름과 별개로, <span class="notice-yellow">reinhard2()</span>는 전달받은 값을 함수 안에서 제곱한다.

```hlsl
float reinhard2(float L, float whitePoint)
{
    float numerator = L * (1.0 + (L / (whitePoint * whitePoint)));
    float denominator = 1.0 + L;
    return numerator / denominator;
}
```

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

위 셰이더의 노출 배율은 <span class="notice-yellow">g_MiddleGrey / (AvgLuminance × 9.6 + 0.0001)</span>이다. 분모에 9.6과 0.0001이 포함되므로, 입력 휘도가 평균 휘도와 같아도 <span class="notice-yellow">lp</span>가 곧바로 MiddleGrey가 되지는 않는다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="노출 보정과 최종 색상 계산 코드" items="tone-mapping-code-01.png|평균 휘도를 이용한 밝기 보정 코드;tone-mapping-code-03.png|최종 색상을 계산하는 코드" %}

### 매니저에서 톤매핑 셰이더로 값 전달

매니저는 <span class="notice-yellow">Target_Filtered_Lum</span>을 셰이더의 <span class="notice-yellow">g_AvgLuminanceTexture</span>에 연결한다. 톤매핑 셰이더는 이 텍스처의 값을 읽어 <span class="notice-yellow">NewHDR2()</span>의 평균 휘도 인자로 사용한다.

노출과 화이트 포인트 설정은 매니저의 멤버 변수에서 셰이더로 전달한다. 매니저가 화이트 포인트를 미리 제곱하지 않으며, 제곱 연산은 앞의 <span class="notice-yellow">reinhard2()</span>에서 수행한다.

```cpp
if (FAILED(m_pShader->Bind_RawValue("g_fLumWhiteSqr", &m_fLumWhiteSqr, sizeof(m_fLumWhiteSqr))))
{
    return;
}
if (FAILED(m_pShader->Bind_RawValue("g_MiddleGrey", &m_fMiddleGrey, sizeof(m_fMiddleGrey))))
{
    return;
}
```

## ImGui HDR 설정과 장면별 JSON {#hdr-tool}

장면마다 밝기 분포가 다르므로 같은 노출·화이트 포인트 설정이 모든 장면에서 같은 인상을 만들지는 않는다. 도구에서 화면을 보며 값을 조절하고 장면별 JSON으로 저장하면, 다음 실행에서도 해당 설정을 다시 적용할 수 있다.

Debug 빌드의 <span class="notice-yellow">Minho_ImGui_HDRI()</span>는 HDR 매니저의 설정을 읽어 <span class="notice-yellow">MiddleGrey</span>와 <span class="notice-yellow">fLumWhiteSqr</span>를 슬라이더로 조정한다. 각 토글은 슬라이더 범위를 바꾸며, 수정한 설정은 <span class="notice-yellow">Set_HDRI_Desc()</span>로 매니저에 전달한다. HDR 켜기·끄기도 도구에서 전환한다.

```cpp
ImGui::SliderFloat("MiddleGrey", &desc.fMiddleGrey, 1.f, 100.f);
ImGui::SliderFloat("fLumWhiteSqr", &desc.fLumWhiteSqr, 1.f, 1000000.f);
```

매니저의 <span class="notice-yellow">Set_HDRI_Desc()</span>는 도구에서 받은 두 값을 멤버 변수에 저장한다. 다음 톤매핑 패스는 이 멤버 변수를 셰이더에 전달하므로, 도구에서 조절한 값이 화면 계산에 반영된다.

```cpp
m_fMiddleGrey = SettingDesc.fMiddleGrey;
m_fLumWhiteSqr = SettingDesc.fLumWhiteSqr;
```

낮은 값 범위는 각각 0.001~1과 0.1~1이다. 사용자가 경로를 입력하고 저장 버튼을 누르면 도구가 두 값을 JSON 파일로 기록한다.

```cpp
ImGui::InputText("PathToSaveNowData", m_BaseBuf,sizeof(_char)*MAX_PATH);
if (ImGui::Button("Save_Now Data", ImVec2(100, 20)))
{
    m_pHDRI_Manager->SaveAsJson(m_BaseBuf,desc);
}
```

<span class="notice-yellow">Client/Bin/Resources/CMH/Json/HDR/Town.json</span> 저장 값

```json
{
    "LumWhite": 46681.19140625,
    "MiddleGrey": 2.275100040435791
}
```

장면 초기화에서 <span class="notice-yellow">SetInfo_ByJson()</span>이 파일을 읽고 <span class="notice-yellow">Read_From_Json()</span>으로 매니저의 값을 복원한다. Town과 Maze_Ganon의 설정 파일을 각 장면에 적용한다.

```cpp
m_fLumWhiteSqr = jFile["LumWhite"].get<float>();
m_fMiddleGrey = jFile["MiddleGrey"].get<float>();
```

## 톤매핑 결과 영상

다음 영상은 게임 장면에 톤매핑을 적용한 화면이다. 평균 휘도에 따른 노출 보정과 톤 커브가 최종 화면의 밝기에 반영된다.

{% include game-video-embed.html id="Q9VEHbAQBt0" title="톤매핑 적용 영상 1" %}

{% include game-video-embed.html id="ycpSpUZEI10" title="톤매핑 적용 영상 2" %}
