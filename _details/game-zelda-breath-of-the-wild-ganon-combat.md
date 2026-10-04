---
layout: game-article
title: 가논 — 거리 기반 공격과 벽·천장 전환의 행렬 회전
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 5
topic: 보스 전투
summary: 거리와 공격 횟수로 패턴을 선택하고, 체력에 따라 PhysX 중력과 몸체 행렬을 제어해 지상·벽·천장 전투를 연결했다.
tags: [보스, FSM, 행렬, PhysX, 벡터]
permalink: /projects/zelda-breath-of-the-wild/technical/ganon-combat/
nav_context: GAME PORTFOLIO / ZELDA
---

## 구현 구조

```text
Client/Private/Ganon_FSM.cpp
Client/Private/Ganon.cpp
Client/Private/Ganon_Tornado.cpp
```

거리·공격 횟수·체력 검사 → 패턴 선택 → 지상·벽·천장 자세 전환 → 공격 풀 활성화.



{% include game-local-video.html file="ganon-intro" title="가논 등장 컷신" %}

## 거리, 공격 횟수, 체력으로 전투 흐름 나누기

가논은 플레이어와의 거리로 공격을 고른다. 근접 공격을 일정 횟수 수행하면 플레이어에게서 멀어져 원거리 공격으로 넘어간다. 체력이 줄면 벽과 천장으로 이동하면서 전투 위치도 바뀐다. 공격 선택에는 거리와 누적 횟수가, 전투 공간 전환에는 체력과 자세 상태가 필요했다.

`CGanonFSM`에는 상태별 진입·유지·종료 함수를 연결했다. 전용 공격 객체는 가논 내부의 풀에 준비하고, FSM이 패턴에 맞춰 활성화한다. 객체 등록과 순환 재사용은 [보스 내부 도메인 풀링]({{ '/projects/zelda-breath-of-the-wild/technical/boss-fsm-pooling/' | relative_url }})에서 다룬다.


## 지상: 거리와 좌우 방향으로 공격 선택하기

### 가까운 거리에서는 등 뒤의 칼로 순차 공격

플레이어가 가까우면 가논 등 뒤의 세 손에 달린 칼로 순서대로 공격한다. 가까운 거리의 연속 공격과 조금 떨어진 거리의 횡베기를 구분해, 같은 지상 상태에서도 거리에 따라 다른 공격을 선택하도록 했다.


### 거리가 벌어지면 횡베기와 세 갈래 공격

플레이어가 조금 더 멀어지면 횡베기를 수행하고 가논 앞에 세 개의 공격을 배치한다. `CGanon::Register_LSS_Phillar()`에서는 Y축 기준 `20도`, `-20도`, `0도`의 회전 행렬을 만들어 각 공격의 `_Rotation_Float4x4`에 전달한다. 하나의 방향을 그대로 복제하지 않고 각 공격에 방향 차이를 준 구성이다.


### 원거리에서는 외적으로 플레이어의 좌우 판별

플레이어가 가논 기준 오른쪽에 있으면 종베기를, 왼쪽에 있으면 레이저를 사용한다. 두 위치 사이의 거리만으로는 어느 쪽에 플레이어가 있는지 구분할 수 없어 방향 벡터의 외적을 이용했다.



### 근접 공격 후에는 가장 먼 지정 구역으로 이동

근접 공격 횟수가 기준을 넘으면 미리 지정한 구역 중 가장 먼 곳을 향해 이동하고 일정 거리에서 멈춘다. `Ganon_MovB_PlacePosition()`은 지정 위치들과 가논 몸체 위치의 차이를 구한 뒤 Y 성분을 제외한다. 이 함수는 수평 거리가 가장 큰 위치를 `m_vDest`에 넣는다. 목적지 선택 기준은 가논 자신의 위치이며, 이후 이동으로 플레이어와의 거리를 벌려 원거리 패턴을 이어간다.

{% include game-local-video.html file="ganon-retreat" title="근접 공격을 마친 뒤 지정 구역으로 거리를 벌리는 가논" %}

## 체력 2/3 이하: 중력을 끄고 벽에 맞춰 몸체 회전

가논의 체력이 2/3 이하가 되면 벽으로 이동한다. 벽에 붙어 있는 동안에는 PhysX 중력을 끄고, 벽의 노멀 반대 방향이 몸체의 Up이 되도록 회전 보간한다. 이 단계에서는 위치 이동과 몸체의 방향 전환을 함께 다뤄야 한다.

`Ready_LerpUL()`은 기존 몸체 행렬의 Up·Look을 시작 벡터로 보관한다. 목표 Up에는 전달받은 레이 노멀의 반대 방향을, 목표 Look에는 `(0, 1, 0)`을 설정한다. `Lerp_Rotation_UL()`은 두 축을 보간·정규화한 뒤 외적으로 Right를 만든다.

```cpp
_vector UpLerp = XMVectorLerp(XMVector3Normalize(m_vSrcNormal),
    XMVector3Normalize(m_vDstNormal), t);
_vector LookLerp = XMVectorLerp(XMVector3Normalize(m_vSrcLook),
    XMVector3Normalize(m_vDstLook), t);
UpLerp = XMVector3Normalize(UpLerp);
LookLerp = XMVector3Normalize(LookLerp);
_vector RightNew = XMVector3Normalize(XMVector3Cross(UpLerp, LookLerp));
```

이 세 축을 몸체 행렬의 Right·Up·Look에 기록한다. 몸체 방향을 만드는 행렬의 이동 행은 `(0, 0, 0, 1)`로 두고, 가논 전체의 위치는 별도로 처리한다. FSM이 받는 `m_pBodyTransFloat4x4`는 가논의 `Body` 자식 트랜스폼을 가리킨다.

{% include game-local-video.html file="ganon-wall-transition" title="PhysX 중력을 끄고 벽 노멀에 맞춰 회전하는 가논" %}

벽에서 스킬 패턴을 세 번 사용하면 지상으로 내려온다. 내려오는 전환에서는 `(0, 1, 0)`이 다시 Up이 되도록 자세를 보간해 지상 전투 자세로 돌아간다.

{% include game-local-video.html file="ganon-wall-fall" title="벽 패턴 종료 후 지상 자세로 돌아오는 가논" %}

## 체력 1/3 이하: 벽에서 천장으로 전투 공간 확장

가논의 체력이 1/3 이하가 되면 벽에 붙은 상태에서 천장으로 이동한다. 천장 자세로 전환할 때도 몸체 행렬을 회전시키며, 전환을 마친 몸체의 Up은 다시 `(0, 1, 0)` 방향을 향하도록 구성했다.

`Ready_LerpRU_Ceiling()`은 몸체의 Look을 축으로 -90도 회전 행렬을 만들고, 기존 Right·Up을 그 행렬로 변환해 목표 벡터를 구한다. `Ready_LerpRL_Ceiling()`은 몸체의 Up을 축으로 -90도 회전해 목표 Right·Look을 구한다. 전환에 필요한 축 조합에 따라 보간 함수를 나눴다.


`Client/Private/Ganon_FSM.cpp` 발췌

```cpp
void CGanonFSM::Ready_LerpRU_Ceiling(_float fLerpSpeed)
{
    if (true == m_IsLerping) return;
    m_fAccLerpingTime = 0.f;
    m_fLerpSpeed = fLerpSpeed;
    _matrix MatRot = XMMatrixRotationAxis(XMLoadFloat3((_float3*)m_pBodyTransFloat4x4->m[2]), XMConvertToRadians(-90.f ));
    m_vSrcRight = XMLoadFloat3((_float3*)m_pBodyTransFloat4x4->m[0]);
    m_vDstRight = XMVector3Normalize(XMVector3TransformNormal(m_vSrcRight, MatRot));
    m_vSrcNormal = XMLoadFloat3((_float3*)m_pBodyTransFloat4x4->m[1]);
    m_vDstNormal = XMVector3Normalize(XMVector3TransformNormal(m_vSrcNormal, MatRot));
    m_IsLerping = true;
}
```

| 함수 | 보간하는 두 축 | 외적으로 구하는 축 |
| --- | --- | --- |
| `Lerp_Rotation_UL()` | Up, Look | Right = Up × Look |
| `Lerp_Rotation_RU()` | Right, Up | Look = Right × Up |
| `Lerp_Rotation_RL()` | Right, Look | Up = Look × Right |

FSM은 전환 과정에서 `m_IsCeiling`과 `Ganon_OnCeiling`을 갱신한다. 천장에서 스킬을 세 번 사용한 뒤에는 PhysX 중력을 다시 적용해 떨어지도록 했다.

{% include game-local-video.html file="ganon-ceiling-transition" title="벽에서 천장으로 이동하며 몸체 행렬을 회전하는 가논" %}

{% include game-local-video.html file="ganon-ceiling-fall" title="천장 공격 종료 후 중력을 다시 적용한 낙하" %}

## 얼음: 생성 예고와 메시 활성화 시점 연결

얼음 생성 영역은 가논 Up의 반대 방향에 배치한다. 가논이 지상·벽·천장 중 어디에 있는지에 따라 몸체의 축이 달라지므로, 생성 위치도 가논의 자세를 기준으로 정한다.

일정 시간이 지나면 얼음을 생성하고, 마법진이 페이드아웃되는 순간에 얼음 메시를 렌더링하는 컴포넌트를 활성화한다. 이어서 얼음을 플레이어에게 던진다. 공격의 예고, 메시 표시, 발사를 각각의 시점에 연결한 흐름이다. 가논 FSM은 누적 발사 수와 `AreSkillsAllInActive()`의 결과를 함께 사용해 얼음 공격 진행 상태를 판단한다.

{% include game-local-video.html file="ganon-ice" title="마법진의 페이드아웃에 이어 얼음이 나타나고 발사되는 공격" %}

## 구체: 소켓 위치와 목표 방향에 오프셋 적용

보라색 구체는 소켓 행렬로 생성 위치를 정한다. 가논에서 플레이어를 향하는 Look에 오프셋 벡터를 더해 여러 구체의 발사 방향을 만든다. 소켓은 공격이 출발하는 위치를, 목표 방향과 오프셋은 구체들이 퍼지는 방향을 결정한다.

{% include game-local-video.html file="ganon-fire-orbs" title="소켓 위치에서 방향 오프셋을 주어 발사하는 구체" %}

## 토네이도: 전진과 좌우 이동을 함께 적용

토네이도는 가논의 Look 방향으로 전진하면서 좌우 이동을 함께 수행한다. 좌우 방향은 sin 값의 부호로 바꾼다. `CGanon_Tornado`의 이동 계산에서는 초기 방향과 sin 값을 곱한 부호에 따라 방향을 선택하므로, 시작 방향을 달리한 토네이도도 같은 이동 계산을 사용할 수 있다.

sin 값은 좌우 전환 시점을 결정한다. 전진 성분에 부호로 선택한 횡이동 성분을 더해 공격이 좌우로 움직이며 다가오게 했다.

{% include game-local-video.html file="ganon-tornado" title="전진하면서 sin 부호에 따라 좌우로 움직이는 토네이도" %}
