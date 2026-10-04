---
layout: game-article
title: 카메라 거리별 그림자 영역 분할
project_slug: zelda-breath-of-the-wild
game_portfolio: true
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

## 구현 구조

```text
Engine/Private/CSM_Manager.cpp
Engine/Private/Renderer.cpp
Engine/Bin/ShaderFiles/Shader_Deferred.hlsl
```

카메라 프러스텀 분할 → 분할 영역의 월드 경계 계산 → 광원 뷰·직교 투영 생성 → 구간별 그림자 맵 → 깊이 비교.


## 카메라 시야를 세 구간으로 나누기

NDC의 여덟 모서리에 역투영·역뷰 행렬을 적용해 월드 프러스텀을 구한다. 각 구간의 near·far 범위로 모서리를 보간하고 경계 상자의 중심과 크기를 계산한다. 렌더러는 Near·Middle·Far 그림자 타깃에 각 구간의 행렬을 전달한다.

## 광원 방향으로 뷰 행렬 만들기

광원 카메라는 분할 영역의 중심을 바라본다. 광원 방향과 경계 상자의 Z 크기로 눈 위치를 정하고 `XMMatrixLookAtLH()`로 뷰 행렬을 만든다.

`Engine/Private/CSM_Manager.cpp` 발췌

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

경계 상자의 X·Y 크기로 좌우·상하 범위를 설정하고, Z 크기로 깊이 범위를 만든다. 각 구간에 대응하는 직교 투영 행렬과 그림자 맵을 사용해 픽셀 깊이를 비교한다.

`Engine/Private/CSM_Manager.cpp` 발췌

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

## 그림자 영상과 행렬 자료

{% include game-media-gallery.html slug="zelda-breath-of-the-wild" summary="캐스케이드 그림자 프러스텀·깊이 비교 이미지 6장" items="cascaded-shadow-implementation-01.png|NDC 프러스텀 경계 정점 구성;cascaded-shadow-implementation-02.png|분할 프러스텀의 경계 상자 계산;cascaded-shadow-implementation-03.png|NDC 영역을 월드 프러스텀으로 변환;cascaded-shadow-implementation-04.png|그림자 카메라의 뷰·투영 행렬 설정;cascaded-shadow-implementation-05.png|픽셀 위치와 그림자 맵 깊이 비교 코드;cascaded-shadow-implementation-06.png|캐스케이드 그림자의 장면 출력" %}

{% include game-video-embed.html id="66Sgophfmdo" title="캐스케이드 그림자 적용 영상" start="1" %}
