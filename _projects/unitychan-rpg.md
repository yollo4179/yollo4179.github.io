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
hero_image: null
hero_alt: '필요한 화면: UnityChan RPG 전투 플레이 화면'
hero_caption: null
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

Unity로 만든 개인 RPG 프로젝트다. 플레이어의 전투와 성장에 따라 몬스터 행동, 퀘스트, 인벤토리, 상점, 무기 강화, 대화가 함께 움직인다. 이 기능들이 서로 직접 얽히지 않도록 사건 전달, UI 표시 순서, 데이터 저장 방식을 나눴다.

몬스터는 Behavior Tree로 행동 단계를 고르고 Context Based Steering으로 장애물을 피하는 이동 방향을 계산한다. 대화는 CSV 노드와 선택지 연결을 따라 진행한다. 플레이 중 바뀌는 값은 JSON으로, 정의 데이터는 CSV와 ScriptableObject로 구분했다.

## 담당 구현 {#contribution}

- **전투와 행동:** 캐릭터 상태, 몬스터 추적, 연속 공격과 스킬·소비 아이템 사용.
- **UI:** 팝업 스택, 드래그 앤 드롭, 인벤토리·퀵 슬롯·상점·무기 강화.
- **시스템:** 이벤트 매니저, 퀘스트, CSV 대화 노드, JSON 저장, ScriptableObject 정의 데이터.
- **표현:** Shader Graph의 등장·사망 디졸브와 발광 경계.

## 구현 장면

![UnityChan RPG 몬스터의 등장과 퇴장에 쓰인 Shader Graph 구성]({{ '/assets/images/projects/unitychan-rpg/monster-dissolve-shader.png' | relative_url }})

`SplitValue`와 `GlowOffset`을 기준으로 같은 노이즈 텍스처에서 알파 영역과 발광 경계를 따로 만든다.

각 기술 글은 기능이 필요한 이유, 상태가 이동하는 경로, 실제 구현에서 맡는 객체의 책임 순서로 적었다.
