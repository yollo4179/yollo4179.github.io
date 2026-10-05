---
layout: game-article
title: 맵툴의 삼각형 편집과 내비메시 바이너리 저장
project_slug: gunfire-reborn
game_portfolio: true
game_order: 1
topic: 맵 제작과 이동
summary: 지형을 찍어 만든 삼각형 셀을 두 종류의 .dat 파일로 저장하고, 클라이언트가 셀과 스테이지 번호를 읽도록 구성했다.
tags:
- 맵툴
- 내비게이션
- 바이너리
permalink: /projects/gunfire-reborn/technical/map-tool-binary/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
MapTool/Private/Level_GamePlay.cpp
Engine/Private/Navigation.cpp
Engine/Private/Cell.cpp
```

지형 선택 → 정점 스냅 → 삼각형 방향 정리 → 셀·스테이지 저장 → 런타임 셀 생성과 이웃 연결.


## 정점을 스냅하고 삼각형 방향 맞추기

맵툴은 선택한 점이 기존 점의 범위 안에 들어오면 같은 좌표를 사용한다. 삼각형의 AB와 BC를 외적하고 Y 성분의 부호로 B·C 순서를 정리한다. 셀의 변 방향이 정해져야 런타임에서도 같은 기준으로 안쪽과 바깥쪽을 판정할 수 있다.

`MapTool/Private/Level_GamePlay.cpp` 발췌

```cpp
void CLevel_GamePlay::Adjusting_Triangle(TRIANGLE_VERTICES& Triangle)
{
    _vector vectorAB = XMLoadFloat3(&(Triangle.vPointB)) - XMLoadFloat3(&(Triangle.vPointA));
    _vector vectorBC = XMLoadFloat3(&(Triangle.vPointC)) - XMLoadFloat3(&(Triangle.vPointB));
    _vector vecCross = XMVector3Cross(vectorAB, vectorBC);
    if (XMVectorGetY(vecCross) < 0)
    {
        _float3 vTempPoint;
        vTempPoint = Triangle.vPointB;
        Triangle.vPointB = Triangle.vPointC;
        Triangle.vPointC = vTempPoint;
    }
}
```

## 편집 데이터와 실행 데이터 저장

클라이언트용 내비메시 파일에는 셀 수, 세 정점, 스테이지 번호를 기록한다. 맵툴용 파일은 편집할 때 다시 사용할 점 목록도 함께 기록한다. 런타임은 삼각형을 `CCell`로 만들고 공통 변을 찾아 이웃 인덱스를 연결한다.

| 구분 | 저장 정보 | 사용처 |
| --- | --- | --- |
| 클라이언트 | 셀 수·삼각형 좌표·스테이지 | 셀 생성과 이동 판정 |
| 맵툴 | 셀 데이터·편집 점 목록 | 삼각형 편집 재개 |

`Engine/Private/Navigation.cpp` 발췌

파일 열기 실패 처리는 보완이 필요하다. 아래 원본의 `0 == hFile`은 `CreateFile`의
실패 반환값을 검사하지 못한다. 실패 분기는 `hFile == INVALID_HANDLE_VALUE`로
수정해야 하며, 다음 발췌에는 원본 구현을 그대로 표시했다.

```cpp
HRESULT CNavigation::Initialize_Prototype(const _tchar* pNavigationDataFile)
{
    _ulong          dwByte = {};
    HANDLE          hFile = CreateFile(pNavigationDataFile, GENERIC_READ, 0, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, 0);
    if (0 == hFile)
        return E_FAIL;
    int iNum = { 0 };
    ReadFile(hFile, &iNum, sizeof(_int), &dwByte, nullptr);
    while (true)
    {
        _float3     vPoints[3] = {};
        int iStage = { 0 };
        ReadFile(hFile, vPoints, sizeof(_float3) * 3, &dwByte, nullptr);
        ReadFile(hFile, &iStage, sizeof(_int), &dwByte, nullptr);
        if (0 == dwByte)
            break;
        CCell* pCell = CCell::Create(m_pDevice, m_pContext, vPoints, m_Cells.size(),iStage);
        if (nullptr == pCell)
            return E_FAIL;
        m_Cells.push_back(pCell);
    }
    CloseHandle(hFile);
    if (FAILED(SetUp_Neighbors()))
        return E_FAIL;
#ifdef _DEBUG
    m_pShader =CShader::Create(m_pDevice , m_pContext, TEXT("../../EngineSDK/hlsl/Shader_Cell.hlsl"), VTXPOS::Elements, VTXPOS::iNumElements);
    if (nullptr == m_pShader)
        return E_FAIL;
#endif
    return S_OK;
}
```

## 편집 장면과 저장 자료

{% include game-local-video.html slug="gunfire-reborn" file="navmesh-editing" title="맵툴에서 내비메시 삼각형을 만들고 클라이언트용·맵툴용 저장 메뉴를 사용하는 장면" %}

{% include game-media-gallery.html slug="gunfire-reborn" summary="맵툴의 삼각형 셀 생성과 바이너리 저장 코드 이미지 5장" items="navigation-mesh-implementation-01.png|삼각형 셀 정점과 방향 정의;navigation-mesh-implementation-02.png|마우스 광선과 지형의 교점 계산;navigation-mesh-implementation-03.png|정점 순서 조정;navigation-mesh-implementation-04.png|인접 정점 위치 보정;navigation-mesh-implementation-05.png|클라이언트용 내비메시 바이너리 저장" %}
