---
layout: game-article
title: 카메라 거리별 그림자 영역 분할
project_slug: zelda-breath-of-the-wild
game_portfolio: true
article_toc: true
game_order: 3
topic: 그림자
summary: 분할 프러스텀을 포함하는 그림자 카메라를 만들고 거리별 그림자 맵 깊이를 비교한다.
tags:
- 그림자
- CSM
- DirectX
permalink: /projects/zelda-breath-of-the-wild/technical/cascaded-shadows/
nav_context: GAME PORTFOLIO / ZELDA
---

## CSM의 목적과 거리별 분할 원리

CSM(Cascaded Shadow Maps)은 카메라 시야를 거리별 구간으로 나누고, 각 구간에 별도의 그림자 맵을 사용하는 방식이다. 하나의 그림자 맵으로 넓은 장면을 담으면 텍셀 하나가 담당하는 월드 영역이 커진다. 카메라 가까이에서 그림자를 보면 적은 수의 텍셀이 화면의 많은 픽셀에 대응해 경계가 거칠게 보일 수 있다.

CSM은 가까운 구간을 작은 범위의 그림자 맵으로 담아 더 세밀하게 표현한다. 먼 구간은 넓은 범위를 담되, 화면에서 차지하는 크기가 작다는 점을 이용해 상대적으로 적은 해상도를 배정한다. 이 구현은 <span class="notice-yellow">Near·Middle·Far 세 구간</span>으로 시야를 나누고, 구간마다 광원 뷰·투영 행렬과 그림자 맵을 구성한다.

<div data-media-gallery>
  <figure>
    <a href="{{ '/assets/images/projects/zelda-breath-of-the-wild/cascaded-shadow-implementation-05.png' | relative_url }}" aria-label="캐스케이드 분할 구조도 확대">
      <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/cascaded-shadow-implementation-05.png' | relative_url }}" alt="카메라 프러스텀을 Near, Middle, Far로 나누고 각 구간을 별도의 그림자 영역으로 감싼 구조도" loading="lazy">
    </a>
    <figcaption>거리별 프러스텀과 각 구간에 대응하는 그림자 영역</figcaption>
  </figure>
</div>

## 광원 기준 깊이 비교로 그림자 판정

그림자 맵은 광원에서 장면을 바라봤을 때 가장 먼저 보이는 표면의 깊이를 기록한다. 메인 카메라에 보이는 픽셀도 같은 광원 좌표계로 변환하면, 그림자 맵에 기록된 표면보다 광원에서 더 멀리 있는지 비교할 수 있다. 픽셀이 더 뒤에 있다면 광원과 픽셀 사이에 다른 표면이 있으므로 그림자로 판정한다.

카메라에서의 거리와 광원에서의 깊이는 기준이 다르다. <span class="notice-yellow">시야를 나누는 기준은 메인 카메라</span>이고, <span class="notice-yellow">그림자를 판정하는 깊이 비교 기준은 각 그림자 맵의 광원 뷰·투영 공간</span>이다. 광원에서 보이지 않는 표면도 메인 카메라에서는 보일 수 있기 때문에 두 관점을 연결해야 한다.

<div data-media-gallery>
  <figure>
    <a href="{{ '/assets/images/projects/zelda-breath-of-the-wild/cascaded-shadow-implementation-06.png' | relative_url }}" aria-label="광원 기준 깊이 비교 원리도 확대">
      <img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/cascaded-shadow-implementation-06.png' | relative_url }}" alt="광원에서 물체 표면이 먼저 보이고 그 뒤의 바닥은 가려지지만 메인 카메라에는 보이는 관계를 나타낸 그림" loading="lazy">
    </a>
    <figcaption>그림자 맵에 기록된 표면보다 광원에서 멀리 있는 바닥의 차폐</figcaption>
  </figure>
</div>

## 구현 순서와 좌표 공간

카메라 프러스텀 분할 → 분할 영역의 월드 경계 계산 → 광원 뷰·직교 투영 생성 → 구간별 그림자 맵 → 깊이 비교.

CSM 매니저는 메인 카메라의 시야를 월드 공간으로 복원하고 구간별 광원 행렬을 만든다. 렌더러는 각 구간의 렌더 타깃과 뷰포트를 설정해 그림자 맵을 그린다. 깊이를 비교할 때는 그림자 맵과 비교 대상 픽셀이 같은 광원 행렬을 기준으로 해야 한다.

| 단계 | 좌표 변환 또는 처리 | 목적 |
| --- | --- | --- |
| 프러스텀 복원 | NDC → 메인 카메라 뷰 공간 → 월드 공간 | 카메라가 보는 영역의 실제 위치 계산 |
| 구간 분할과 경계 계산 | 월드 공간에서 구간별 모서리·중심·반경 계산 | 각 그림자 카메라의 위치와 크기 결정 |
| 그림자 맵 생성 | 월드 공간 → 광원 뷰 공간 → 직교 투영 | 광원에서 보이는 표면의 깊이 기록 |
| 그림자 판정 | 같은 광원 행렬로 픽셀을 투영해 깊이 비교 | 광원과 픽셀 사이의 가림 판정 |

## 카메라 시야를 세 구간으로 나누기

<span class="notice-yellow">CCSM_Manager::Initialize()</span>는 NDC에서 X·Y가 -1~1, Z가 0~1인 영역의 여덟 모서리를 준비한다. 이 점들은 아직 월드 위치가 아니라 카메라 투영 이후의 시야 경계다.

<span class="notice-yellow">Compute_FrustumCorners_World()</span>는 각 모서리에 역투영 행렬을 적용해 메인 카메라의 뷰 공간 위치를 구하고, 역뷰 행렬을 적용해 월드 위치로 바꾼다. 이 순서로 카메라의 위치와 방향이 반영된 프러스텀을 얻는다.

```cpp
vCorner[i] = XMVectorSetW(XMLoadFloat3(&m_vPoints[i]), 1.f);
vCorner[i] = XMVector3TransformCoord(vCorner[i], ProjMatrixInverse);
vCorner[i] = XMVector3TransformCoord(vCorner[i], ViewMatrixInverse);
```

매니저는 전체 프러스텀의 가까운 모서리와 먼 모서리를 잇는 선을 구간별 near·far 값으로 보간한다. 같은 네 모서리 쌍에서 각 구간의 시작점과 끝점을 구하므로, Near·Middle·Far마다 여덟 개의 월드 경계점을 만들 수 있다. 보간 코드에는 0.1과 1000이라는 고정값이 사용되므로 카메라의 깊이 범위를 바꿀 때는 이 계산도 함께 맞춰야 한다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="NDC 모서리 생성과 월드 프러스텀 분할 코드" items="cascaded-shadow-implementation-01.png|NDC 프러스텀의 여덟 모서리 구성;cascaded-shadow-implementation-03.png|역투영·역뷰 변환과 구간별 월드 경계점 계산" %}

## 구간별 중심과 경계 크기 계산

<span class="notice-yellow">Compute_AABBFromCorners()</span>는 각 구간의 여덟 모서리를 평균 내 중심을 구한다. 이어서 중심에서 가장 먼 모서리까지의 거리를 반경으로 사용한다. 이렇게 얻은 구는 구간의 모든 모서리를 포함하며, 그 반경을 X·Y·Z의 동일한 반크기로 갖는 경계 상자를 만든다.

반경은 <span class="notice-yellow">ceil(fRadius * 16.f) / 16.f</span>로 1/16 단위 올림한다. 작은 반경 변화가 곧바로 투영 크기 변화로 이어지는 것을 줄이면서, 반경이 작아져 모서리가 제외되는 상황을 피하는 계산이다. 이 처리는 경계 크기의 양자화이며, 그림자 중심을 텍셀 격자에 맞추는 처리와는 구분된다.

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="구간별 중심과 반경 계산 코드" items="cascaded-shadow-implementation-02.png|여덟 모서리의 중심과 최대 거리로 경계 상자 구성" %}

## 광원 방향으로 뷰 행렬 만들기

광원 카메라는 분할 영역의 중심을 바라본다. 매니저는 중심에서 정규화한 광원 방향의 반대쪽으로 경계 반크기 Z의 두 배만큼 이동해 눈 위치를 정한다. 광원이 진행하는 방향으로 중심을 바라보도록 <span class="notice-yellow">XMMatrixLookAtLH()</span>로 뷰 행렬을 만든다. 월드 위치를 이 행렬로 변환하면 광원 카메라 기준의 위치가 된다.

```cpp
HRESULT CCSM_Manager::Compute_ViewMatrix()
{
    for (size_t i = 0; i <CSM_END; ++i)
    {
        _vector Center = XMVectorSet(
            m_BoundingAABBCorners[i].Center.x,
            m_BoundingAABBCorners[i].Center.y,
            m_BoundingAABBCorners[i].Center.z,
            1.f
        );
        _vector vEyePos = Center - 2 * XMVector3Normalize(XMVectorSetW(XMLoadFloat3(&m_vLightDir),0))*m_BoundingAABBCorners[i].Extents.z;
        _vector vUp = XMVectorSet(0.f, 1.f, 0.f, 0.f);
        XMStoreFloat4x4(&m_TransformMatrices[D3DTS_VIEW][i], XMMatrixLookAtLH(vEyePos, Center, vUp));
    }
    return S_OK;
}
```

## 영역 크기로 직교 투영 구성

방향성 광원은 빛이 평행하게 진행하는 것으로 다루므로, 원근에 따라 물체 크기가 달라지는 투영 대신 직교 투영을 사용한다. 매니저는 경계 상자의 X·Y 반크기로 좌우·상하 범위를 설정한다. 깊이 범위는 0부터 Z 반크기의 두 배까지로 설정한다.

분할 구간이 작으면 같은 텍스처 크기에서도 텍셀 하나가 담당하는 월드 범위가 작아진다. 따라서 프러스텀 분할과 직교 투영 범위 설정이 가까운 그림자의 해상도 배분에 직접 영향을 준다.

```cpp
HRESULT CCSM_Manager::Compute_ProjMatrix()
{
    for (size_t i = 0; i <CSM_END; ++i)
    {
        _float left = - m_BoundingAABBCorners[i].Extents.x;
        _float right = + m_BoundingAABBCorners[i].Extents.x;
        _float bottom = - m_BoundingAABBCorners[i].Extents.y;
        _float top =  m_BoundingAABBCorners[i].Extents.y;
        _float nearZ = - m_BoundingAABBCorners[i].Extents.z;
        _float farZ = + m_BoundingAABBCorners[i].Extents.z;
        XMStoreFloat4x4(&m_TransformMatrices[D3DTS_PROJ][i],XMMatrixOrthographicOffCenterLH(left, right, bottom, top,0.f, farZ- nearZ));
    }
    return S_OK;
}
```

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="광원 뷰·직교 투영 행렬 코드" items="cascaded-shadow-implementation-04.png|분할 영역의 중심과 반크기로 광원 뷰·투영 행렬 구성" %}

## 거리별 그림자 맵 해상도 {#shadow-resolution}

렌더러는 프러스텀의 커버 범위뿐 아니라 그림자 맵의 텍스처 크기도 구간별로 다르게 둔다. Near는 8192×8192, Middle은 2048×2048, Far는 1024×1024다. 각 구간의 렌더 타깃과 깊이·스텐실 뷰, 뷰포트에 같은 크기를 적용한다.

| 구간 | 그림자 맵 크기 | 배분 의도 |
| --- | --- | --- |
| Near | 8192×8192 | 가까이 보이는 그림자에 많은 텍셀 배정 |
| Middle | 2048×2048 | 중간 거리의 표현 범위와 해상도 조절 |
| Far | 1024×1024 | 먼 영역을 포함하면서 텍스처 크기 제한 |

모든 구간을 Near와 같은 해상도로 만들면 메모리와 그림자 렌더링 비용이 함께 커진다. 구간별 크기를 나누는 것은 가까운 그림자의 세부 표현에 자원을 집중하는 선택이다.

```cpp
_uint m_iShadowResolutionX[3] = { 8192,2048,1024 };
_uint m_iShadowResolutionY[3] = { 8192,2048,1024};
```

```cpp
if (FAILED(m_pGameInstance->Add_RenderTarget(TEXT("Target_Shadow_CSM_1"), m_iShadowResolutionX[0], m_iShadowResolutionY[0], DXGI_FORMAT_R32G32B32A32_FLOAT, _float4(1.F,1.F,1.F,1.F))))
    return E_FAIL;
if (FAILED(m_pGameInstance->Add_RenderTarget(TEXT("Target_Shadow_CSM_2"), m_iShadowResolutionX[1], m_iShadowResolutionY[1], DXGI_FORMAT_R32G32B32A32_FLOAT, _float4(1.F, 1.F, 1.F, 1.F))))
    return E_FAIL;
if (FAILED(m_pGameInstance->Add_RenderTarget(TEXT("Target_Shadow_CSM_3"), m_iShadowResolutionX[2], m_iShadowResolutionY[2], DXGI_FORMAT_R32G32B32A32_FLOAT, _float4(1.F, 1.F, 1.F, 1.F))))
    return E_FAIL;
```

렌더러의 <span class="notice-yellow">Shadow_CSM_Ready_DSV()</span>도 위 배열로 깊이·스텐실 뷰를 생성한다. <span class="notice-yellow">Render_Shadow_CSM_1()</span>·<span class="notice-yellow">2()</span>·<span class="notice-yellow">3()</span>은 각 인덱스의 크기로 <span class="notice-yellow">SetUp_Viewport()</span>를 호출한 뒤 해당 구간의 그림자를 그린다. 가까운 구간에는 더 많은 텍셀을 배정하고 먼 구간의 텍스처 크기는 줄이는 구성이다.

## CSM 적용 결과와 영상

시연 화면에는 렌더 타깃 디버그 표시와 라이넬·링크의 그림자가 함께 나타난다.

<figure class="game-media-feature">
  <a href="https://www.youtube.com/watch?v=66Sgophfmdo&amp;t=8s"><img src="{{ '/assets/images/projects/zelda-breath-of-the-wild/cascaded-shadow-targets.jpg' | relative_url }}" alt="캐스케이드 그림자 시연에서 왼쪽 렌더 타깃 디버그 표시와 라이넬·링크의 그림자가 함께 보이는 화면" loading="lazy"></a>
  <figcaption>캐스케이드 그림자 적용과 렌더 타깃 디버그 표시 · <a href="https://www.youtube.com/watch?v=66Sgophfmdo&amp;t=8s">시연 영상 8초</a></figcaption>
</figure>

{% include game-video-embed.html id="66Sgophfmdo" title="캐스케이드 그림자 적용 영상" start="1" %}
