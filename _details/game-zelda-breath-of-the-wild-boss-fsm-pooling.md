---
layout: game-article
title: 라이넬·가논의 내부 도메인 풀링과 공격 수명 관리
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 4
topic: 보스 전투
summary: 보스가 전용 공격 객체를 자식으로 보관하고, 종류별 순환 풀로 공격 실행과 후속 패턴을 연결했다.
tags:
- 보스
- FSM
- 풀링
permalink: /projects/zelda-breath-of-the-wild/technical/boss-fsm-pooling/
nav_context: GAME PORTFOLIO / ZELDA
---

## 문제와 목표

보스의 대기, 이동, 공격, 경직을 한 업데이트 함수에서 조건문으로 처리하면 공격 종류가 늘어날수록 상태 전환과 연출 실행 시점이 엉킨다. 라이넬과 가논은 각각의 상태 흐름을 두고, 공격에 쓰는 오브젝트는 전투 도중 매번 새로 만들지 않도록 준비했다.

## 상태별 진입·유지·종료

`CBossLynelFSM`과 `CGanonFSM`은 상태마다 진입·유지·종료 함수를 연결한다. 상태가 바뀌면 `ChangeState()` 경로에서 이전 상태를 빠져나가고 새 상태에 들어간다. 라이넬 객체는 몸체, 무기, 공격 범위와 FSM을 자식·컴포넌트로 연결한다. 몸체의 최종 월드 행렬과 무기 소켓 행렬을 전달해 공격 오브젝트가 보스의 자세를 따라가게 한다.

가논 FSM에는 대기, 전후좌우 이동, 방향 전환과 여러 공격 상태가 정의돼 있다. 천장·지상 위치 조건에 따라 사용할 수 있는 공격 경로도 달라진다. FSM은 상태에 따라 보스의 공격 활성화 함수를 호출한다.

## 라이넬·가논의 내부 도메인 풀링

라이넬과 가논은 전용 공격 객체를 보스 내부 도메인의 풀로 관리한다. 각 보스의 `m_Skills`가 공격 태그별 객체 배열을 보관하고, `m_SkillIndices`가 다음에 사용할 인덱스를 보관한다. 보스는 공격 객체를 자식으로 연결해 자신의 전투 흐름 안에서 재사용한다.

`CBossLynel::Ready_Skiils()`는 화염, 검기, 영역 공격과 2페이즈의 후속 폭발·화염 장판·화염 기둥을 준비한다. `Register_Skill_Fire()`는 프로토타입을 복제하고 `Add_Child()`로 라이넬에 연결한 뒤 `m_Skills[TEXT("Pooling_S_Fire")]`에 보관한다. 등록 직후에는 공격 객체를 비활성화하고 해당 종류의 인덱스를 0으로 둔다.

화염 등록 시에는 라이넬 몸체의 최종 월드 행렬, 머리 소켓 행렬, `m_SkillSigns`의 주소를 전달한다. 공격 객체가 필요한 보스의 자세와 전투 신호를 보스 내부에서 연결하는 구조다. 공격 객체를 미리 구성해 두므로 공격 시점에는 프로토타입 복제와 자식 등록을 반복하지 않는다.

## 공격 종류별 순환 재사용과 실행 정보

라이넬의 정보 전달용 `Active_Skill()`은 다음 순서로 동작한다.

```cpp
void CBossLynel::Active_Skill(_wstring SkillTag, int NumMaxSkills, void* pArg)
{
    _uint iIndex = m_SkillIndices.find(SkillTag)->second;
    static_cast<CBossSkill_Base*>(m_Skills[SkillTag][iIndex])->Set_Info(pArg);

    ACTIVE_OBJ(m_Skills[SkillTag][iIndex], true);
    m_SkillIndices[SkillTag] = (iIndex + 1) % NumMaxSkills;
}
```

보스는 공격 종류의 현재 슬롯에 실행 정보를 전달한 뒤 활성화한다. 다음 슬롯은 나머지 연산으로 순환한다. 위치와 크기처럼 공격마다 달라지는 값은 `Set_Info()`에 전달하는 descriptor로 갱신한다. 가논도 종류별 배열과 순환 인덱스로 전용 공격을 활성화한다.

이 함수는 비활성 슬롯을 검색하거나 풀이 부족할 때 배열을 늘리지 않는다. 따라서 종류별 준비 수량과 재사용 간격은 동시에 유지되는 공격 수에 맞아야 한다. 슬롯을 다시 사용하는 시점의 안전성은 공격 수명과 패턴 호출 간격까지 함께 봐야 한다.

## 풀을 통해 이어지는 보스 패턴

라이넬의 화염은 지면 충돌 시 `Sign_Lynel_2Phase`를 확인한다. 2페이즈라면 화염 객체가 자신의 위치와 크기를 descriptor에 담고 부모 라이넬의 `Active_Skill()`을 호출한다. 라이넬은 내부 풀의 `Pooling_FireArea`와 `Pooling_FirePhillar`를 활성화한다. 화염 객체는 후속 공격을 연결한 뒤 자신을 비활성화한다.

영역 공격인 `CLynel_S_Field`도 수명이 끝날 때 2페이즈 여부를 검사한다. 2페이즈에서는 영역 공격이 부모 라이넬의 `Pooling_AfterBomb`을 활성화하고 종료한다. 보스의 풀은 공격 객체의 재사용과 함께 페이즈에 따른 후속 공격 연결을 담당한다.

가논은 `AreSkillsAllInActive()`로 특정 종류의 공격이 모두 비활성화됐는지 검사한다. 얼음 공격 FSM은 누적 발사 수와 얼음 객체들의 비활성 상태를 조건에 포함한다. FSM의 진행 조건에 내부 풀의 실행 상태가 연결된 사례다.

피격이나 착지 효과에는 `ACTIVE_POOLING`을 통한 엔진 공통 풀 호출도 사용한다. 전용 공격은 보스 내부의 배열과 인덱스로 관리하고, 개별 효과의 활성화는 해당 효과가 등록된 풀을 사용한다.

패턴별 실행 장면과 조건은 [가논의 거리·페이즈 전환]({{ '/projects/zelda-breath-of-the-wild/technical/ganon-combat/' | relative_url }})과 [라이넬의 순차 패턴·기절 처리]({{ '/projects/zelda-breath-of-the-wild/technical/lynel-combat/' | relative_url }})에서 이어진다.

## 결과와 확장 범위

보스는 전용 공격의 보관과 활성화를 담당하고, FSM은 패턴의 실행 조건을 결정한다. 공격 객체는 충돌이나 수명 종료에 따라 자신을 비활성화하고, 필요한 경우 부모 보스의 풀을 통해 다음 공격을 연결한다. 재사용 시에는 위치·크기·타이머 등 공격별 상태를 다시 설정해야 하며, 순환 슬롯 수와 공격 수명도 함께 관리해야 한다.
