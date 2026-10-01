---
layout: game-article
title: 맵툴에서 만든 내비메시를 바이너리로 넘기기
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

## 문제

플레이어와 몬스터가 이동할 수 있는 면을 게임 코드에 직접 박아 넣으면 지형을 고칠 때마다 셀 좌표도 다시 수정해야 했다. 맵툴에서 지형을 보며 삼각형을 만들고, 같은 데이터를 클라이언트가 읽도록 경로를 정했다.

## 삼각형 셀 제작

`CLevel_GamePlay::Creating_Vertex()`는 마우스 광선과 지형 삼각형의 교점을 구해 선택한 정점을 채운다. `IMGUI_NaviMesh()`에서 세 점이 채워지면 `Adjusting_Triangle()`이 외적의 Y 부호로 정점 순서를 검사하고 B·C를 교환해 방향을 맞춘다. 가까운 정점은 `Mapping_Points()`가 기존 점으로 치환한다. 이 함수의 비교 기준은 세 축의 거리 제곱 합 `<= 1.f`다. 이 보정은 이웃 셀의 공유 변이 미세한 좌표 차이 때문에 끊기는 상황을 줄이기 위한 것이다.

도구는 새 삼각형을 내비게이션에 추가하고, 같은 삼각형과 스테이지 번호를 저장용 배열에 함께 넣는다. 정점을 다시 수정하거나 마지막 셀을 제거하는 조작도 도구에 있다. 가상 지형에 셀을 생성하는 모드도 별도로 둬 평면이 아닌 위치에서 셀을 배치할 수 있게 했다.

{% include game-local-video.html slug="gunfire-reborn" file="navmesh-editing" title="맵툴에서 내비메시 삼각형을 만들고 클라이언트용·맵툴용 저장 메뉴를 사용하는 장면" %}

## 바이너리 파일의 두 용도

클라이언트용 `Client_NaviMesh_Stage01.dat`에는 셀 개수, 각 셀의 `TRIANGLE_VERTICES`, 해당 셀의 스테이지 번호를 `WriteFile`로 순서대로 기록한다. 맵툴용 `NaviMesh_Stage01.dat`에는 이 데이터 뒤에 스냅 기준점의 개수와 `_float3` 배열까지 더 저장한다. 맵툴은 기준점을 다시 읽어 편집을 이어가고, 클라이언트는 이동 판정에 필요한 셀 데이터만 읽는다.

`CNavigation::Initialize_Prototype()`는 클라이언트용 파일에서 세 정점과 스테이지 번호를 읽어 `CCell`을 생성한다. 모든 셀을 만든 뒤 `SetUp_Neighbors()`가 공유 변을 비교한다. 이 데이터는 구조체 크기를 기준으로 읽고 쓰는 `.dat` 바이너리다.

{% include game-media-gallery.html slug="gunfire-reborn" summary="맵툴의 삼각형 셀 생성과 바이너리 저장 코드 이미지 5장" items="navigation-mesh-implementation-01.png|삼각형 셀 정점과 방향 정의;navigation-mesh-implementation-02.png|마우스 광선과 지형의 교점 계산;navigation-mesh-implementation-03.png|정점 순서 조정;navigation-mesh-implementation-04.png|인접 정점 위치 보정;navigation-mesh-implementation-05.png|클라이언트용 내비메시 바이너리 저장" %}

## 결과와 한계

맵 제작 데이터와 런타임 이동 데이터를 같은 삼각형 형식으로 연결했다. 바이너리는 구조체 크기와 필드 순서가 읽는 쪽과 쓰는 쪽에서 일치해야 한다. 파일 버전 정보나 길이 검증이 없는 형식이므로 형식 변경 시 두 프로그램의 읽기·쓰기 코드를 함께 수정해야 한다.
