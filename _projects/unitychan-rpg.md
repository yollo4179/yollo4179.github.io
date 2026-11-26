---
layout: game-project
title: UnityChan RPG
order: 7
game_order: 3
game_portfolio: true
game_tracks: [client]
source_url: https://github.com/yollo4179/UnityChanRPG
team_project: false
category: 게임 개발
project_type: 개인 프로젝트
summary: Unity로 전투·몬스터 행동·퀘스트·상점·인벤토리를 구현하고 UI와 데이터의 책임을 나눠 관리한 개인 RPG 프로젝트다.
cover_image: /assets/images/projects/unitychan-rpg/project-cover.png
cover_alt: UnityChan 캐릭터 소개 이미지
status: 구현 기록
period: 2025.08.04 ~ 2025.11.11
role: UI 관리, 전투와 몬스터 행동, 퀘스트·상점·강화, 데이터 관리
team: 개인 프로젝트
stack: Unity, C#, JSON, CSV, ScriptableObject, Shader Graph
domains:
- 게임
technologies:
- Unity
- C#
tags:
- 게임
- Unity
- C#
- RPG
- UI
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
game_slug: unitychan-rpg
project_sidebar: true
article_cards: individual
hero_image: /assets/images/projects/unitychan-rpg/wolf-eqs-debug.webp
hero_alt: Unity Scene 뷰에서 EQS 후보 지점과 늑대 배치를 표시한 디버그 화면
hero_caption: EQS 후보 지점과 늑대 배치를 표시한 디버그 화면
showcase:
- title: 늑대의 EQS 후보 평가와 위치 예약
  youtube_id: 609vL5vsOM8
  caption: 늑대 EQS · 후보 평가와 위치 예약
  article_url: /projects/unitychan-rpg/technical/wolf-eqs/
  article_label: EQS 후보 평가와 위치 예약 구현 읽기
- title: 미노타우르스의 전투 이동
  youtube_id: Cx4fI0WBYAw
  caption: 미노타우르스 CBS · 접근과 전투 이동
  article_url: /projects/unitychan-rpg/technical/events-monster-ai/
  article_label: CBS 관심도와 전투 이동 구현 읽기
- title: 퀘스트와 대화
  youtube_id: GEVGb2bt7bU
  caption: Quest And Dialogue · UnityChan RPG 퀘스트와 대화
  article_url: /projects/unitychan-rpg/technical/dialogue-quests/
  article_label: 퀘스트와 다이얼로그 구현 읽기
topics:
- id: play
  name: 전투와 행동
  description: 사건 전달과 몬스터 행동을 분리해 전투 중 상태 변화를 처리했다.
- id: ui
  name: UI와 상호작용
  description: 겹치는 팝업, 드래그 앤 드롭, 선택지와 상점·강화 흐름을 구성했다.
- id: data
  name: 데이터와 표현
  description: 변경 주기에 따라 데이터를 나누고 Shader Graph로 몬스터 등장·퇴장을 표현했다.
---

## 프로젝트 소개 {#overview}

Unity로 만든 개인 RPG 프로젝트다. 플레이어 전투, 미노타우르스와 늑대의 이동, 퀘스트·대화, 상점·강화와 UI를 구현했다. 미노타우르스는 방향별 관심도를 사용하는 CBS로, 늑대는 후보 지점 평가와 예약을 사용하는 EQS 형태로 이동을 구성한다.

대사는 CSV의 노드와 연결 표로 관리한다. 아이템 정의와 플레이 진행 정보는 JSON으로 읽고 저장하며 스킬·퀘스트·강화 이펙트는 ScriptableObject 에셋을 실행 코드에 연결한다.

## 담당 구현 {#contribution}

- **UI:** 팝업 스택과 z-order, 클릭 포커스, 상대 좌표 드래그, 아이콘 교환과 퀵 슬롯 등록.
- **게임 시스템:** 퀘스트 목표 평가, 다이얼로그 연결, 상점 거래와 장비 강화.
- **몬스터:** 미노타우르스 CBS, 늑대 EQS, NavMesh 기반 스폰 셀과 박스 Gizmo.
- **데이터와 표현:** CSV 파싱, JSON 직렬화, SO 정의와 이벤트 실행, Shader Graph 디졸브.

## 구현 장면 {#showcase}

{% include game-showcase.html items=page.showcase %}
