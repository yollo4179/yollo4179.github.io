---
layout: game-article
title: 이웃 셀 이동과 경계 슬라이딩
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
game_order: 3
topic: 맵 제작과 이동
summary: 현재 셀과 이웃 셀을 따라 최종 위치를 검사하고, 연결이 없는 경계에서는 이동 벡터를 투영한다.
tags:
- 내비게이션
- 이동
- 벡터
permalink: /projects/gunfire-reborn/technical/navigation-sliding/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 이동 제한과 경계 슬라이딩의 원리

캐릭터가 내비메시 밖으로 벗어나지 않으면서 경계에 비스듬히 닿았을 때 경계를 따라 이동하도록 한다. 내비메시는 이동 후보 위치를 포함하는 셀을 찾고, 연결된 셀이 없는 방향의 이동을 막는다. 슬라이딩은 이동 벡터에서 경계를 가로지르는 성분을 제거하고 경계와 평행한 성분을 사용한다. 셀 포함 검사는 월드 위치를 내비메시 로컬 공간으로 바꾸어 수행한다.

## 구현 순서와 역할

이동 후보 위치 → 현재 셀 검사 → 이웃 셀 탐색 → 경계 방향으로 이동 벡터 투영 → 이동 가능 여부 재검사.

## 현재 셀에서 이웃 셀로 이동하기

<span class="notice-yellow">isMove()</span>는 월드 위치를 내비메시 로컬 공간으로 변환한다. 현재 셀 밖이면 변에 연결된 이웃을 따라가고, 위치를 포함한 셀을 찾았을 때 현재 인덱스를 갱신한다. 이웃 인덱스가 -1이면 이동을 허용하지 않는다.

```cpp
_bool CNavigation::isMove(_fvector vWorldPos)
{
    _vector         vLocalPos = XMVector3TransformCoord(vWorldPos, XMMatrixInverse(nullptr, XMLoadFloat4x4(&m_WorldMatrix)));
    _int            iNeighborIndex = { -1 };
    if (true == m_Cells[m_iCurrentIndex]->isIn(vLocalPos,iNeighborIndex))
    {
        return true;
    }
    else
    {
        if(-1 ==iNeighborIndex)
            return false;
        while (true)
        {
            if (-1 == iNeighborIndex)
                return false;
            if (true == m_Cells[iNeighborIndex]->isIn(vLocalPos, iNeighborIndex))
            {
                m_iCurrentIndex = iNeighborIndex;
                return true;
            }
        }
        return true;
    }
}
```

{% include game-media-gallery.html slug="gunfire-reborn" summary="공유 변과 이웃 셀 연결" items="navigation-mesh-implementation-06.png|공유 변을 기준으로 이웃 셀 등록" %}

## 경계 방향으로 슬라이딩하기

<span class="notice-yellow">Get_Elements_For_Sliding()</span>은 현재 위치를 기준으로 변의 시작점과 방향을 반환한다. 트랜스폼은 변에 대한 투영점과 셀 중심 방향을 구한 뒤 이동 벡터의 경계 성분을 계산한다. 마지막에는 새 위치에 <span class="notice-yellow">isMove()</span>를 다시 적용한다.

```cpp
pair<_vector , _vector> SlidingPairs = pNavigation->Get_Elements_For_Sliding_FromCurCell(vPosition);
_vector vLineAB = SlidingPairs.second;
_vector vPointA= SlidingPairs.first;
_vector vCenter = (XMLoadFloat3(&(pNavigation->Get_A_Point_From_CurCell(CCell::POINT_A))) +
    XMLoadFloat3(&(pNavigation->Get_A_Point_From_CurCell(CCell::POINT_B))) +
    XMLoadFloat3(&(pNavigation->Get_A_Point_From_CurCell(CCell::POINT_C)))
    ) / 3.f;
vCenter = XMVectorSetW(vCenter, 1.f);
_vector vLineAC = vCenter -vPointA;
_vector vLineAD = XMVector3Normalize(vLineAB) * XMVector3Dot(XMVector3Normalize(vLineAB),vLineAC);
_vector vPointD = vPointA + vLineAD;
_vector vNormalForSliding = XMVector3Normalize(vCenter - vPointD);
_vector vSlidingVector = {};
_vector vRes = XMVector3Dot(vNormalForSliding, vLineAB);
if (!XMVectorEqual(vLineAB, _vector()).m128_f32[0]) {
    vSlidingVector = vLook + vNormalForSliding * (XMVector3Dot(vNormalForSliding, -vLook));
    vSlidingVector = XMVector3Normalize(vLineAB) * XMVector3Dot(XMVector3Normalize(vLineAB), vSlidingVector);
}
vPositionBySliding =
    vPosition + XMVector3Normalize(vSlidingVector) * fTimeDelta * 10;
```

{% include game-media-gallery.html slug="gunfire-reborn" summary="경계 방향으로 이동 벡터 투영" items="sliding-vector-01.png|셀 경계와 캐릭터 이동 방향;sliding-vector-02.png|경계 방향에 이동 벡터를 투영하는 계산" %}

## 경계 슬라이딩 결과

이웃 셀이 있는 영역에서는 셀을 옮겨 이동하고, 연결이 없는 경계에서는 경계 방향의 이동 후보를 다시 검사한다. 시연은 내비메시 경계와 캐릭터의 이동 방향을 함께 표시한다.

{% include game-local-video.html slug="gunfire-reborn" file="navigation-sliding" title="내비메시 경계와 이동 방향을 표시한 슬라이딩 시연" %}
