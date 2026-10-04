---
layout: game-article
title: 파티클을 인스턴스 버퍼로 묶기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 5
topic: 트레일과 화면 효과
summary: 파티클별 제어값을 인스턴스 데이터로 전달하고 기하 셰이더에서 쿼드를 생성한다.
tags:
- 파티클
- 인스턴싱
- HLSL
permalink: /projects/gunfire-reborn/technical/particle-instancing/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Engine/Private/VIBuffer_Particle_Instance.cpp
Client/Bin/ShaderFiles/Shader_VtxPointInstance.hlsl
```

개별 인스턴스 위치·수명 갱신 → 기본 정점과 인스턴스 버퍼 바인딩 → 인스턴스 드로우 → 셰이더에서 파티클 전개.


## 정점 버퍼와 인스턴스 버퍼 분리

기본 점을 담은 버퍼와 파티클마다 달라지는 행렬·수명 정보를 담은 버퍼를 입력 조립기에 함께 바인딩한다. 인스턴스 수를 드로우 호출에 전달해 같은 기본 형상을 반복해서 그린다.

`Engine/Private/VIBuffer_Particle_Instance.cpp` 발췌

```cpp
HRESULT CVIBuffer_Particle_Instance::Render()
{
    m_pContext->DrawIndexedInstanced(m_iNumIndexPerInstance, m_iNumInstances, 0, 0, 0);
    return S_OK;
}
```

## 파티클 수명에 따라 위치 갱신

낙하형 파티클은 개별 속도로 Y 위치를 낮추고 경과 시간을 누적한다. 수명이 끝난 인스턴스는 반복 설정에 따라 초기 위치와 시간을 다시 사용한다. 갱신한 값은 인스턴스 버퍼에 기록한다.

`Engine/Private/VIBuffer_Particle_Instance.cpp` 발췌

```cpp
void CVIBuffer_Particle_Instance::Drop(_float fTimeDelta)
{
    D3D11_MAPPED_SUBRESOURCE SubResource{};
    m_pContext->Map(m_pVBInstance, 0, D3D11_MAP_WRITE_NO_OVERWRITE, 0, &SubResource);
    VTXINSTANCE* pVertices = static_cast<VTXINSTANCE*>(SubResource.pData);
    for (size_t i = 0; i < m_iNumInstances; ++i)
    {
        pVertices[i].vTranslation.y -= m_pSpeeds[i] * fTimeDelta;
        pVertices[i].vLifeTime.y += fTimeDelta;
        if (pVertices[i].vLifeTime.y >= pVertices[i].vLifeTime.x)
        {
            if (true == m_isLoop) {
                pVertices[i].vTranslation = m_pInstanceVertices[i].vTranslation;
                pVertices[i].vLifeTime.y = 0.f;
            }
        }
    }
    m_pContext->Unmap(m_pVBInstance, 0);
}
```

## 셰이더에서 화면에 표시

포인트 인스턴스 셰이더는 입력된 위치와 축을 이용해 파티클 면을 만든다. 빌보드 경로와 비빌보드 경로를 구분하고, 픽셀 셰이더는 텍스처와 수명을 사용해 최종 표시를 결정한다.

## 파티클 실행과 버퍼 자료

{% include game-media-gallery.html slug="gunfire-reborn" summary="파티클 인스턴싱 코드 이미지 4장" items="particle-instancing-01.png|인스턴스 제어 정보를 월드 공간으로 옮기는 코드;particle-instancing-02.png|정점을 클립 공간으로 보내는 코드;particle-instancing-03.png|기하 셰이더에서 파티클 쿼드 생성;particle-instancing-04.png|파티클에 중력을 적용하는 코드" %}

{% include game-local-video.html slug="gunfire-reborn" file="particle-instancing" title="보스 공격 구체가 사라지며 파티클로 흩어지는 장면" %}
