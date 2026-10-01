---
layout: game-article
title: 맵툴에서 몬스터와 충돌체를 배치하고 클라이언트 데이터로 내보내기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 2
topic: 맵 제작과 이동
summary: 몬스터와 충돌체를 편집하고, 편집용 데이터와 클라이언트용 데이터를 서로 다른 바이너리 형식으로 저장한다.
tags: [맵툴, 몬스터, 바이너리]
permalink: /projects/gunfire-reborn/technical/map-tool-placement/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제

전투 지형을 바꿀 때마다 몬스터의 좌표와 충돌체를 코드로 다시 입력하면 배치 결과를 확인하기 어렵다. 몬스터가 내비메시 바깥에 놓이면 게임이 읽는 시작 셀 인덱스도 맞지 않는다. 그래서 맵툴 안에서 선택·이동·삭제·저장을 끝내고, 몬스터의 위치와 내비메시 셀을 함께 맞추도록 했다.

## 몬스터 배치와 셀 인덱스

`CLevel_GamePlay::IMGUI_Createing_Monsters()`는 몬스터 종류와 개체를 선택해 위치·크기·회전을 조정한다. 마우스로 이미 배치한 몬스터를 다시 고르는 모드와 선택 개체 삭제, 전체 삭제도 제공한다. 도구는 몬스터의 `MONSTER_DESC`를 바꾸고 `Update_Transform_By_Desc()`로 화면에 반영한다.

`Check_NowMonster_NaviIndex()`는 저장해 둔 삼각형 셀을 순회한다. 각 변의 법선과 몬스터 위치의 방향을 내적해 점이 셀 안에 있는지 검사한다. 셀을 찾으면 `iNaviIndex`를 그 셀 번호로 설정하고, 세 정점이 만드는 평면식에서 Y를 구해 몬스터를 지형 면 위에 놓는다. 몬스터를 배치하는 도구와 런타임 이동 데이터가 같은 내비메시를 기준으로 연결되는 지점이다.

## 편집용과 클라이언트용 바이너리

`Save Monsters Data`는 몬스터 종류 수, 종류별 개수, 각 몬스터의 `MONSTER_DESC` 전체를 `WriteFile`로 기록한다. 맵툴은 이 파일을 다시 읽어 개체를 편집할 수 있다. `Save Monsters For Client Data`는 같은 종류 수와 개수 뒤에 크기, 회전각, 위치, 내비메시 시작 인덱스만 순서대로 기록한다. 클라이언트는 배치에 필요한 필드만 읽는다.

충돌체도 도구에서 크기와 위치를 조정하고 `Save ALL Colliders`로 개수와 `CUBE_DESC` 배열을 저장한다. 따라서 맵툴에는 내비메시뿐 아니라 몬스터와 충돌체를 포함한 스테이지 데이터의 제작 경로가 있다.

## 결과와 한계

몬스터의 배치 좌표와 시작 셀 인덱스를 도구에서 함께 정할 수 있게 했다. 편집용 구조체 전체와 클라이언트용 필드 목록이 다르므로 두 파일을 같은 형식으로 읽으면 안 된다. 바이너리 형식에 버전이나 필드 검증 정보가 없어 구조체가 바뀌면 저장·로드 코드를 함께 맞춰야 한다.
