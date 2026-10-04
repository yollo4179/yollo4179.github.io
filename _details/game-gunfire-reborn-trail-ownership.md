---
layout: game-article
title: 객체별 동적 버퍼와 Catmull–Rom 트레일
project_slug: gunfire-reborn
game_portfolio: true
game_order: 4
topic: 트레일과 화면 효과
summary: 복제 인스턴스마다 동적 정점 버퍼를 만들고, 끝점 쌍을 Catmull–Rom으로 보간해 무기의 궤적을 그린다.
tags:
- 트레일
- 프로토타입
- 버퍼
permalink: /projects/gunfire-reborn/technical/trail-ownership/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Engine/Private/VIBuffer_Trail.cpp
Client/Private/Trail_Monster02.cpp
```

복제 인스턴스의 버퍼 생성 → 끝점 두 개 변환 → 제어점 보관 → Catmull–Rom 보간 → UV·GPU 버퍼 갱신.


## 트레일마다 동적 정점 버퍼 생성

`Clone()`은 복제본의 `Initialize()`를 호출한다. 초기화에서는 `TRAIL_DESC`의 최대 정점 수로 버퍼 크기를 정하고 CPU 쓰기가 가능한 동적 정점 버퍼를 만든다. 각 트레일의 `m_TrailVertices`가 해당 객체의 궤적을 보관한다.

`Engine/Private/VIBuffer_Trail.cpp` 발췌

```cpp
ZeroMemory(&m_BufferDesc, sizeof m_BufferDesc);
m_BufferDesc.ByteWidth = m_iVertexStride * m_iNumVertices;
m_BufferDesc.BindFlags = D3D11_BIND_VERTEX_BUFFER;
m_BufferDesc.Usage = D3D11_USAGE_DYNAMIC;
m_BufferDesc.StructureByteStride = m_iVertexStride;
m_BufferDesc.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
m_BufferDesc.MiscFlags = 0;
VTXPOSTEX* pVertices = new VTXPOSTEX[m_iNumVertices];
ZeroMemory(pVertices, sizeof(VTXPOSTEX) * m_iNumVertices);
ZeroMemory(&m_SubResourceDesc, sizeof m_SubResourceDesc);
m_SubResourceDesc.pSysMem = pVertices;
if (FAILED(__super::Create_Buffer(&(this->m_pVB))))
    return E_FAIL;
```

## 두 줄의 정점을 곡선으로 연결

`Add_Points_CatMullRom()`은 위·아래 끝점을 각각 보간한다. 네 제어점 사이에 중간 정점 쌍을 넣고, 쌓인 정점 수에 맞춰 UV와 삼각형 인덱스 수를 갱신한다. 정점 한도를 넘으면 앞부분을 정리하고 새 궤적을 이어 쓴다.

`Engine/Private/VIBuffer_Trail.cpp` 발췌

```cpp
for (_uint i = 0; i < m_iCatmullRomCnt; ++i)
{
    _uint index = i * 2 +m_iVerticesCnt- 2;
    _float fWeight = (_float)(i + 1) / (m_iCatmullRomCnt + 1);
    _vector vPosHigh = XMVectorCatmullRom
    (
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[0]].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[1]].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[2]].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[3]].vPosition), 1.f),
        fWeight
    );
    XMStoreFloat3(&m_TrailVertices[index].vPosition, vPosHigh);
    _vector vPosLow = XMVectorCatmullRom
    (
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[0] + 1].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[1] + 1].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[2] + 1].vPosition), 1.f),
        XMVectorSetW(XMLoadFloat3(&m_TrailVertices[m_iCatmullRomIndex[3] + 1].vPosition), 1.f),
        fWeight
    );
    XMStoreFloat3(&m_TrailVertices[index + 1].vPosition, vPosLow);
}
```

## 정점의 좌표와 렌더 행렬 연결

입력 행렬로 변환한 끝점을 정점 버퍼에 기록한다. `CTrail_Monster02::Bind_ShaderResources()`의 기본 렌더 경로는 단위 월드 행렬을 바인딩해 정점에 기록된 위치를 사용한다. 위치 갱신은 `Map()`과 `Unmap()`으로 GPU 버퍼에 전달한다.

## 트레일 실행과 보간 자료

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/gunfire-reborn/trail-demo.gif' | relative_url }}" alt="무기 이동에 따라 곡선 트레일이 생성되는 게임 장면" loading="lazy">
  <figcaption>무기 소켓의 이동을 따라 트레일 정점이 이어지는 장면</figcaption>
</figure>

{% include game-media-gallery.html slug="gunfire-reborn" summary="트레일 버퍼 구성과 보간 코드 이미지 5장" items="trail-implementation-01.png|트레일 제어점과 보간 대상 설정;trail-implementation-02.png|보간에 필요한 정점 수 확인;trail-implementation-03.png|최대 정점 수와 오래된 정점 처리;trail-implementation-04.png|Catmull–Rom 중간 정점 삽입;trail-implementation-05.png|UV와 버텍스 버퍼 갱신" %}
