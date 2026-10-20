---
layout: game-article
title: 객체별 동적 버퍼와 Catmull–Rom 트레일
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
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

## 무기 궤적의 목적과 곡선 보간

무기가 지나간 자리를 띠 형태로 남겨 공격의 방향과 범위를 표현한다. 시간에 따라 수집한 위·아래 끝점 쌍을 이어 띠를 만들고, Catmull–Rom 보간으로 제어점 사이에 중간 정점을 추가한다. 각 트레일은 서로 다른 궤적을 갱신하므로 복제 객체마다 CPU 정점 목록과 동적 GPU 버퍼를 관리한다.

## 구현 순서와 역할

복제 인스턴스의 버퍼 생성 → 끝점 두 개 변환 → 제어점 보관 → Catmull–Rom 보간 → UV·GPU 버퍼 갱신.

## 트레일마다 동적 정점 버퍼 생성

### 공유 버퍼에서 서로 다른 궤적이 섞인 문제

여러 객체에 트레일을 적용했을 때 궤적이 원점으로 튀거나 다른 객체 쪽으로 이동했다. 같은 형상을 사용하는 객체가 정점 버퍼를 공유하던 구조를, 객체마다 매 프레임 정점이 바뀌는 트레일에도 적용한 것이 원인이었다. 한 객체가 자신의 궤적을 쓰면 같은 버퍼를 참조하는 다른 객체의 렌더링에도 그 정점이 사용될 수 있었다.

트레일은 공통 형상을 읽기만 하는 모델과 달리 각 객체의 이동 이력을 기록한다. 따라서 프로토타입에서 복제한 뒤 <span class="notice-yellow">Initialize()</span>에서 인스턴스별 동적 정점 버퍼를 생성하고, CPU의 <span class="notice-yellow">m_TrailVertices</span>도 객체별 궤적을 보관하도록 분리했다.

| 구분 | 공유 구조 | 객체별 소유 구조 |
| --- | --- | --- |
| GPU 정점 버퍼 | 여러 객체가 같은 가변 버퍼 참조 | 복제 인스턴스마다 동적 버퍼 생성 |
| 궤적 갱신 | 다른 객체의 정점 갱신이 렌더링에 영향 | 자기 정점 목록을 자기 버퍼에 기록 |
| 결과 | 원점 또는 다른 객체 위치에 궤적 표시 | 각 객체의 이동 이력에 따라 독립적으로 표시 |

### 복제 인스턴스에서 버퍼 생성

<span class="notice-yellow">Clone()</span>은 복제본의 <span class="notice-yellow">Initialize()</span>를 호출한다. 초기화에서는 <span class="notice-yellow">TRAIL_DESC</span>의 최대 정점 수로 버퍼 크기를 정하고 CPU 쓰기가 가능한 동적 정점 버퍼를 만든다. 각 트레일의 <span class="notice-yellow">m_TrailVertices</span>가 해당 객체의 궤적을 보관한다.

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

<span class="notice-yellow">Add_Points_CatMullRom()</span>은 위·아래 끝점을 각각 보간한다. 네 제어점 사이에 중간 정점 쌍을 넣고, 쌓인 정점 수에 맞춰 UV와 삼각형 인덱스 수를 갱신한다. 정점 한도를 넘으면 앞부분을 정리하고 새 궤적을 이어 쓴다.

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

{% include game-media-gallery.html slug="gunfire-reborn" summary="트레일 제어점과 곡선 보간" items="trail-implementation-01.png|트레일 제어점과 보간 대상 설정;trail-implementation-02.png|보간에 필요한 정점 수 확인;trail-implementation-03.png|최대 정점 수와 오래된 정점 처리;trail-implementation-04.png|Catmull–Rom 중간 정점 삽입" %}

## 정점의 좌표와 렌더 행렬 연결

입력 행렬로 변환한 끝점을 정점 버퍼에 기록한다. <span class="notice-yellow">CTrail_Monster02::Bind_ShaderResources()</span>의 기본 렌더 경로는 단위 월드 행렬을 바인딩해 정점에 기록된 위치를 사용한다. 위치 갱신은 <span class="notice-yellow">Map()</span>과 <span class="notice-yellow">Unmap()</span>으로 GPU 버퍼에 전달한다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="UV와 정점 버퍼 갱신" items="trail-implementation-05.png|UV와 버텍스 버퍼 갱신" %}

## 무기 트레일 적용 결과

무기 소켓의 이동을 따라 끝점 쌍을 누적하고 중간 정점을 보간해 궤적을 이어 그린다. 정점 한도에 도달하면 오래된 구간을 정리하면서 새 궤적을 기록한다.

<figure class="game-media-feature">
  <img src="{{ '/assets/images/projects/gunfire-reborn/trail-demo.gif' | relative_url }}" alt="무기 이동에 따라 곡선 트레일이 생성되는 게임 장면" loading="lazy">
  <figcaption>무기 소켓의 이동을 따라 트레일 정점이 이어지는 장면</figcaption>
</figure>
