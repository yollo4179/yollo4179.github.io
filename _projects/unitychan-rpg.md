---
layout: game-project
title: UnityChan RPG
order: 7
game_order: 3
game_portfolio: true
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
hero_image: /assets/images/projects/unitychan-rpg/quest-dialogue-gameplay.webp
hero_alt: NPC 대화와 플레이어 HUD를 표시한 UnityChan RPG 화면
hero_caption: 퀘스트와 대화가 연결되는 플레이 화면
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

## 플레이 영상

{% include game-video-embed.html id="GEVGb2bt7bU" title="Quest And Dialogue · UnityChan RPG 퀘스트와 대화" %}

## 기능별 구현 글

- [드래그 앤 드롭과 퀵 슬롯 교환]({{ '/projects/unitychan-rpg/technical/popup-drag-drop/' | relative_url }})
- [UI 관리와 팝업 z-order]({{ '/projects/unitychan-rpg/technical/ui-management/' | relative_url }})
- [미노타우르스의 Context Based Steering]({{ '/projects/unitychan-rpg/technical/events-monster-ai/' | relative_url }})
- [늑대의 EQS 후보 평가와 위치 예약]({{ '/projects/unitychan-rpg/technical/wolf-eqs/' | relative_url }})
- [CSV 관리와 대화 노드 연결]({{ '/projects/unitychan-rpg/technical/csv-management/' | relative_url }})
- [퀘스트·다이얼로그와 지역 방문 이벤트]({{ '/projects/unitychan-rpg/technical/dialogue-quests/' | relative_url }})
- [상점 목록과 아이템 구매·판매]({{ '/projects/unitychan-rpg/technical/shop-upgrade-combat/' | relative_url }})
- [무기 강화 수치와 속성 이펙트]({{ '/projects/unitychan-rpg/technical/weapon-reinforce/' | relative_url }})
- [ScriptableObject로 스킬·퀘스트·이펙트 관리]({{ '/projects/unitychan-rpg/technical/scriptable-object-management/' | relative_url }})
- [JSON 정의 데이터와 플레이 진행 저장]({{ '/projects/unitychan-rpg/technical/data-lifecycle/' | relative_url }})
- [스포너 셀 배치와 박스 Gizmo]({{ '/projects/unitychan-rpg/technical/spawner-debug/' | relative_url }})
- [Shader Graph 디졸브와 C# 제어]({{ '/projects/unitychan-rpg/technical/monster-dissolve/' | relative_url }})
