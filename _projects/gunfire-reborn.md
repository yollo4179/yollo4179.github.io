---
layout: game-project
title: 건파이어 리본
order: 8
game_order: 5
game_portfolio: true
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

이 프로젝트에서 가장 오래 붙잡은 문제는 움직이는 데이터를 누가 소유하느냐였다. 트레일은 객체마다 다른 정점 배열이 필요했고, 내비게이션 메시는 맵툴에서 만든 셀을 게임 클라이언트가 같은 형식으로 읽어야 했다. 애니메이션은 입력이 들어온 순간의 자세를 다음 동작의 시작점으로 넘겨야 했다.

## 담당 구현 {#contribution}

- **맵툴과 이동:** 지형 광선 선택, 삼각형 셀·몬스터·충돌체 배치, 클라이언트용·맵툴용 바이너리 저장, 셀 이웃 연결, 이동 판정과 경계 슬라이딩.
- **렌더링:** 객체별 트레일 버퍼와 Catmull–Rom 보간, 파티클 인스턴싱, 카툰 외곽선, 글로우, 디졸브, 물 디스토션.
- **게임 런타임:** 애니메이션 전환과 보간, UI 관리, 몬스터·보스 전투, 오브젝트 풀링, 로딩 스레드, 바이너리 모델 데이터 읽기.

## 구현 장면

![몬스터 공격을 따라 곡선 트레일이 이어지는 전투 장면]({{ '/assets/images/projects/gunfire-reborn/trail-demo.gif' | relative_url }})

트레일은 객체마다 움직임과 정점 배열이 달라 독립된 버퍼를 사용한다. 버퍼 공유로 궤적이 원점 `(0, 0, 0)`이나 다른 객체 쪽으로 튀던 문제와 좌표계 계약은 [트레일과 화면 효과 목록]({{ '/projects/gunfire-reborn/details/#topic-rendering' | relative_url }})에서 이어진다.

{% include game-local-video.html slug="gunfire-reborn" file="navmesh-editing" title="맵툴의 삼각형 내비메시 편집과 저장" %}

맵툴에서 만든 셀은 클라이언트용과 편집용 `.dat` 파일로 저장한다. 파일 구조와 셀 생성 과정은 [맵 제작과 이동 목록]({{ '/projects/gunfire-reborn/details/#topic-map' | relative_url }})에서 다룬다.

기술 글은 맵 제작과 런타임 이동부터 읽어도 되고, 트레일의 공유 버퍼 문제처럼 전투 화면에서 발견한 현상부터 읽어도 된다. 각 글에는 선택한 구조의 이유와 실제 구현 흐름을 함께 적었다.
