---
layout: game-article
title: 맵툴의 몬스터·충돌체 배치와 실행 데이터 저장
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
game_order: 2
topic: 맵 제작과 이동
summary: 몬스터와 충돌체를 편집하고, 편집용 데이터와 클라이언트용 데이터를 서로 다른 바이너리 형식으로 저장한다.
tags: [맵툴, 몬스터, 바이너리]
permalink: /projects/gunfire-reborn/technical/map-tool-placement/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 배치 도구의 목적과 실행 데이터 분리

몬스터와 충돌체의 위치를 코드 수정 없이 맵툴에서 조절하고 게임에 전달한다. 편집용 파일은 도구에서 다시 작업할 정보를 보관하고, 클라이언트용 파일은 실행에 필요한 배치 값을 기록한다. 몬스터의 위치와 내비메시 셀 인덱스를 함께 저장해 이동 판정을 시작할 셀도 지정한다.

## 구현 순서와 역할

오브젝트 종류 선택 → 위치·크기·회전 편집 → 내비메시 인덱스 지정 → 편집용·클라이언트용 저장.

## 종류별 몬스터 배치 데이터

맵툴은 몬스터 종류별로 배치 목록을 관리한다. 클라이언트용 저장은 종류 수와 종류별 개수를 먼저 기록하고, 각 객체의 크기·회전각·위치·내비메시 인덱스를 순서대로 쓴다. 실행 시 배치에 필요한 값이 하나의 레코드가 된다.

```cpp
if (ImGui::Button("Save Monsters For Client Data"))
{
    HANDLE hFile = CreateFile(m_iNowMapPaths_Client[(_int)m_eCurStage][(_int)CREATE_OBJECT_MODE::OBJECT], GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
    if (INVALID_HANDLE_VALUE == hFile) {
        MSG_BOX("File Open :Failed");
        return;
    }
    _ulong  dwByte(0);
    _ulong   dwSize(0);
    WriteFile(hFile, &m_iMonsterNum, sizeof(_int), &dwByte, 0);
    for (_int i = 1; i <= m_iMonsterNum; ++i)
    {
        _int iNowMonsterNum = m_Monsters[i].size();
        WriteFile(hFile, &iNowMonsterNum, sizeof(_int), &dwByte, 0);
    }
    for (int i = 1; i <= m_iMonsterNum; ++i)
        for (int j = 0; j < m_Monsters[i].size(); ++j)
        {
            WriteFile(hFile, &(m_Monsters[i][j]->m_Desc.vScale), sizeof(_float3), &dwByte, 0);
            WriteFile(hFile, &(m_Monsters[i][j]->m_Desc.fAngle), sizeof(_float), &dwByte, 0);
            WriteFile(hFile, &(m_Monsters[i][j]->m_Desc.vPosition), sizeof(_float4), &dwByte, 0);
            WriteFile(hFile, &(m_Monsters[i][j]->m_Desc.iNaviIndex), sizeof(_int), &dwByte, 0);
        }
    MSG_BOX("Completed Save!");
    CloseHandle(hFile);
}
```

## 편집 화면과 실행 파일의 역할

ImGui에서 위치와 크기, 회전을 바꾸면 해당 오브젝트의 트랜스폼에 반영한다. 몬스터는 배치 위치에 해당하는 내비메시 셀 인덱스도 보관한다. 충돌체는 <span class="notice-yellow">CUBE_DESC</span>로 관리하며, 편집용 몬스터 파일은 <span class="notice-yellow">MONSTER_DESC</span>를 기록한다.

| 데이터 | 역할 |
| --- | --- |
| <span class="notice-yellow">vScale</span> | 배치 크기 |
| <span class="notice-yellow">fAngle</span> | 회전각 |
| <span class="notice-yellow">vPosition</span> | 배치 위치 |
| <span class="notice-yellow">iNaviIndex</span> | 이동 판정을 시작할 셀 |

삼각형의 저장과 이웃 연결은 [내비메시 바이너리]({{ '/projects/gunfire-reborn/technical/map-tool-binary/' | relative_url }})에서 이어진다.

## 배치 데이터 저장 결과

몬스터 종류별 개수와 각 객체의 크기·회전·위치·내비메시 인덱스를 클라이언트용 파일에 기록한다. 맵툴은 편집용 몬스터 데이터와 충돌체 데이터를 별도로 관리한다.
