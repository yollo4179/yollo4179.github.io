---
layout: game-project
title: 건파이어 리본
order: 8
game_order: 5
game_portfolio: true
game_tracks: [client]
team_project: false
category: 게임 개발
project_type: 개인 프로젝트
summary: DirectX 11 개인 FPS에서 맵툴·내비메시 바이너리 저장, 트레일·파티클·후처리, 애니메이션과 전투 시스템을 구현했다.
cover_image: /assets/images/projects/gunfire-reborn/project-cover.jpg
cover_alt: 건파이어 리본 원작 표지 이미지
status: 구현 기록
period: 입력 예정
role: 렌더링 효과, 내비게이션 메시, 애니메이션, UI, 게임플레이 로직
team: 개인 프로젝트
stack: C++, DirectX 11, HLSL, ImGui, JSON, FMOD
domains:
- 게임
technologies:
- C++
- DirectX
- HLSL
tags:
- 게임
- DirectX
- C++
- HLSL
- FPS
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
game_slug: gunfire-reborn
hero_image: /assets/images/projects/gunfire-reborn/effect-result.png
hero_alt: 건파이어 리본 FPS 전투 화면에서 보스, 트레일, UI가 보이는 장면
hero_caption: FPS 전투 장면 · 렌더링 효과와 UI
topics:
- id: map
  name: 맵 제작과 이동
  description: 맵툴의 삼각형 셀 편집, 바이너리 저장, 런타임의 이웃 셀 판정과 슬라이딩을 연결했다.
- id: rendering
  name: 트레일과 화면 효과
  description: 객체별 동적 버퍼, 파티클 인스턴싱, 노멀·깊이 기반 외곽선과 글로우를 다뤘다.
- id: runtime
  name: 애니메이션과 리소스
  description: 애니메이션 전환, UI 관리, 모델 바이너리 로딩을 전투 흐름에 맞춰 구성했다.
---

## 프로젝트 소개 {#overview}

DirectX 11로 만든 개인 FPS 프로젝트다. 플레이어가 이동하며 원거리·근거리 몬스터와 보스를 상대하는 전투를 구성했다. 전투 화면을 만드는 렌더링 효과뿐 아니라 맵툴, 내비게이션 메시, 애니메이션 전환, UI, 리소스 로딩까지 한 흐름으로 구현했다.

맵툴은 셀과 배치 데이터를 바이너리로 저장한다. 런타임은 저장한 셀로 이동을 판정하고, 객체별 동적 버퍼로 트레일과 파티클을 갱신한다. 애니메이션·UI·로딩은 각각의 매니저와 데이터 구조로 연결했다.

## 담당 구현 {#contribution}

- **맵툴과 이동:** 지형 광선 선택, 삼각형 셀·몬스터·충돌체 배치, 클라이언트용·맵툴용 바이너리 저장, 셀 이웃 연결, 이동 판정과 경계 슬라이딩.
- **렌더링:** 객체별 트레일 버퍼와 Catmull–Rom 보간, 파티클 인스턴싱, 카툰 외곽선, 글로우, 디졸브, 물 디스토션.
- **게임 런타임:** 애니메이션 전환과 보간, UI 관리, 몬스터·보스 전투, 오브젝트 풀링, 로딩 스레드, 바이너리 모델 데이터 읽기.

## 구현 장면

![몬스터 공격을 따라 곡선 트레일이 이어지는 전투 장면]({{ '/assets/images/projects/gunfire-reborn/trail-demo.gif' | relative_url }})

트레일의 동적 버퍼, 파티클 인스턴싱, 외곽선·글로우·디졸브·물 효과는 [트레일과 화면 효과 목록]({{ '/projects/gunfire-reborn/details/rendering/' | relative_url }})에서 기능별로 다룬다.

{% include game-local-video.html slug="gunfire-reborn" file="navmesh-editing" title="맵툴의 삼각형 내비메시 편집과 저장" %}

맵툴에서 만든 셀은 클라이언트용과 편집용 `.dat` 파일로 저장한다. 파일 구조와 셀 생성 과정은 [맵 제작과 이동 목록]({{ '/projects/gunfire-reborn/details/map/' | relative_url }})에서 다룬다.

## 코드로 읽는 구현 흐름

맵 제작과 이동 3편, 트레일과 화면 효과 6편, 애니메이션과 리소스 4편으로 구성했다. 각 글은 소스 파일의 역할, 데이터 흐름, 실제 C++·HLSL 발췌와 실행 자료를 연결한다.

- [애니메이션 전환]({{ '/projects/gunfire-reborn/technical/animation-transition/' | relative_url }}): 뼈별 SRT 보간.
- [UI 관리]({{ '/projects/gunfire-reborn/technical/ui-model-data/' | relative_url }}): 태그 등록, 팝업 깊이와 이벤트.
- [모델 바이너리]({{ '/projects/gunfire-reborn/technical/model-binary/' | relative_url }}): 메시·재질·뼈·애니메이션 직렬화.
- [비동기 로딩]({{ '/projects/gunfire-reborn/technical/async-loading/' | relative_url }}): 작업 함수와 스레드 연결.
