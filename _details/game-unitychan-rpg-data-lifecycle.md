---
layout: game-article
title: 변경 주기에 맞춰 JSON·CSV·ScriptableObject 나누기
project_slug: unitychan-rpg
game_portfolio: true
game_order: 5
topic: 데이터와 표현
summary: 진행 상태와 정의 데이터의 변경 주기를 기준으로 저장 형식을 구분한다.
tags:
- JSON
- CSV
- ScriptableObject
permalink: /projects/unitychan-rpg/technical/data-lifecycle/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 문제와 구현

모든 데이터를 한 파일 형식에 넣으면 플레이 중 바뀌는 상태와 콘텐츠 정의가 섞인다. 저장해야 할 값은 플레이어마다 달라지지만, 퀘스트 정의와 드롭 테이블은 실행 중 같은 기준으로 읽는다. 변경 주기를 기준으로 형식을 나눴다.

플레이어 상태, 아이템 인스턴스, 퀘스트 진행처럼 플레이 중 바뀌는 값은 JSON으로 저장한다. 몬스터·다이얼로그 데이터는 CSV로 읽고, 퀘스트 정의·드롭 테이블·스킬 이펙트 설정처럼 플레이 중 바뀌지 않는 값은 ScriptableObject로 관리한다. 같은 종류의 아이템도 인스턴스 ID로 각각 구분한다. 수량을 쌓을 수 있는 아이템은 개수를 누적하고, 무기 인스턴스는 강화로 추가된 속성도 함께 저장한다.

## 아이템 단위의 저장

아이템 종류만 저장하면 강화된 무기와 강화되지 않은 무기를 구분할 수 없다. 무기는 각각의 인스턴스 ID와 강화로 생긴 추가 속성을 함께 보관한다. 수량을 쌓는 소비·기타 아이템은 `Stackable` 속성을 기준으로 개수를 누적한다. 플레이어 상태와 퀘스트 진행도 플레이 중 바뀌므로 JSON 저장 대상이다.

CSV는 대화의 연결 정보와 몬스터 데이터를 편집하기 위한 입력으로 사용한다. ScriptableObject는 퀘스트 내용, 드롭 테이블, 스킬 이펙트의 트랜스폼과 텍스트처럼 정의가 고정된 데이터를 담는다. 런타임 값이 정의 데이터를 덮어쓰지 않도록 데이터의 소유 범위를 나눴다.
