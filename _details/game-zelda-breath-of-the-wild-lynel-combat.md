---
layout: game-article
title: 라이넬 — 패턴 순환과 소켓 전환, PhysX 이동과 기절 처리
project_slug: zelda-breath-of-the-wild
game_portfolio: true
game_order: 6
topic: 보스 전투
summary: 기본 공격과 순차 스킬을 연결하고, 소켓 행렬·애니메이션 이벤트·PhysX·충돌 판정으로 돌진과 점프, 기절, 2페이즈 후속 공격을 구현했다.
tags: [보스, FSM, 행렬, PhysX, 충돌, 애니메이션]
permalink: /projects/zelda-breath-of-the-wild/technical/lynel-combat/
nav_context: GAME PORTFOLIO / ZELDA
---

## 구현 구조

```text
Client/Private/Boss_Lynel_FSM.cpp
Client/Private/Boss_Lynel.cpp
Client/Private/Lynel_Fire.cpp
```

패턴 순환 → 애니메이션 이벤트 → 소켓·물리 이동·공격 활성화 → 충돌과 착지 판정 → 2페이즈 후속 공격.



{% include game-local-video.html file="lynel-intro" title="라이넬 등장 컷신" %}

## 기본 공격 시간과 순차 스킬 패턴

라이넬은 스킬 패턴을 순서대로 사용하고, 일정량의 스킬을 사용한 뒤에는 기본 공격만 하는 시간을 갖는다. 같은 공격을 계속 반복하지 않도록 스킬 순서와 기본 공격 구간을 나눴다. 체력이 절반 이하가 되면 2페이즈로 전환해 기존 공격에 후속 공격을 연결한다.

`CBossLynelFSM`은 상태별 진입·유지·종료를 처리한다. 공격 객체는 라이넬 내부에 종류별로 준비하고 재사용한다. 이 글은 각 패턴이 어떤 위치·방향·충돌 조건을 사용하는지 다룬다. 풀의 등록과 활성화는 [보스 내부 도메인 풀링]({{ '/projects/zelda-breath-of-the-wild/technical/boss-fsm-pooling/' | relative_url }})으로 이어진다.


## 돌진: 칼을 휘두를 위치로 접근하기

칼을 들고 뛰어오는 공격에서는 플레이어 위치에서 라이넬 Right의 반대 방향으로 이동시킨 점을 접근 위치로 사용한다. 라이넬은 그 위치를 향해 달리고, 거리가 기준 이하가 되면 공격한다. 플레이어의 위치와 칼을 휘두르기 위한 접근 위치를 구분한 것이다.

라이넬의 Right는 몸체 자세에 따라 달라진다. 따라서 이 오프셋은 고정된 월드 X축이 아니라 공격하는 라이넬의 좌우 방향을 기준으로 계산한다.

{% include game-local-video.html file="lynel-dash" title="플레이어 옆의 접근 위치로 달려와 칼을 휘두르는 라이넬" %}

## 점프: 물리 이동과 착지 공격의 시점 나누기

점프 공격에는 PhysX Impulse와 거리 기반 속도를 부여한다. 출발 시 힘을 주고 목표까지의 거리에 맞춰 이동 속도를 설정해 점프 이동을 만든다.

칼의 공격 활성화는 아래로 쏜 Ray가 지면과 충돌하는 시점에 연결했다. 점프를 시작한 시점과 실제로 내려찍는 시점은 다르므로, 지면 검출 결과로 착지 공격을 활성화한다.

{% include game-local-video.html file="lynel-jump" title="PhysX로 점프한 뒤 지면 Ray 판정으로 내려찍기 공격을 활성화하는 라이넬" %}


`Client/Private/Boss_Lynel_FSM.cpp` 발췌

```cpp
void CBossLynelFSM::OnJump_Stay()
{
    if (true == m_bJumpState[LYNEL_JUMP_IMPULSE])
    {
        m_bJumpState[LYNEL_JUMP_IMPULSE] = false;
            _float Length = {};
            _float4x4 PlayyerFloat4x4 =(m_pTarget)->Get_FinalWorldMatrix();
            _vector vTargetPos = { PlayyerFloat4x4._41,0.f,PlayyerFloat4x4._43,1.f };
            _float4x4 vMyFloat4x4 = m_pOwner->Get_FinalWorldMatrix();
            _vector vMyPos = { vMyFloat4x4._41,0.f,vMyFloat4x4._43,1.f };
            Length = XMVectorGetX(XMVector3Length(vTargetPos - vMyPos));
            m_pMovement->Move_Forward(Length*0.7f);
            m_pRigid_Owner->Add_Force(_float3(0.f,2000.f, 0.f), PxForceMode::eIMPULSE);
            m_bJumpState[LYNEL_JUMP_START] = false;
    }
        _float4x4 Myfloat4x4 = m_pOwner->Get_FinalWorldMatrix();
        _float3 MyPos = { Myfloat4x4._41 ,Myfloat4x4._42  -.5f, Myfloat4x4._43 };
        RaycastHit Out = {};
        m_pGameInstance->Raycast(MyPos, _float3(0.f, -1.f, 0.f), Out, 1.5f , 1<<FLD_COLL |1 << GROUND_COLL);
        if (nullptr != Out.pObj)
        {
            m_pAnimController_Owner->Set_Trigger(TEXT("tAttack"));
        }
    if (true == m_bJumpState[LYNEL_JUMP_START] ||true == m_bJumpState[LYNEL_JUMP_LAND])
    {
        m_pMovement->Stop_XZ();
    }
    if (m_bJumpState[LYNEL_JUMP_CMPL])
    {
        m_Lynel_PreCond = m_Lynel_Cond;
        m_Lynel_Cond.iAct = LYNEL_AC_WAIT;
        ChangeState(m_Lynel_Cond.iAct);
    }
}
```

## 기어 달리기: 이벤트로 무기 소켓 바꾸기

라이넬이 기어서 달리는 패턴에서는 칼의 장착 위치가 바뀐다. 애니메이션 이벤트 콜이 발생하면 칼이 참조하는 소켓 행렬을 변경해 장착 부위를 전환한다. 같은 칼 객체가 패턴 중 다른 부위를 따라가도록 만든 구성이다.

추적 방향은 플레이어 위치를 외적으로 판별해 정한다. 이동 중 목표가 좌우로 바뀌면 라이넬도 그 방향을 따라 회전하며 접근한다.

{% include game-local-video.html file="lynel-horn-charge" title="무기 장착 소켓을 바꾸고 플레이어를 추적하는 돌진" %}

## 화염 투사체: 머리 위치에서 준비하고 이벤트로 발사

화염 투사체의 출발점은 라이넬 머리 위치다. 투사체의 Look은 그 위치에서 플레이어를 향하도록 설정한다. 이후 애니메이션 이벤트 콜이 발생하면 투사체가 이동한다.

투사체를 준비하는 순간과 발사하는 순간을 나눠, 머리 앞에서 공격을 준비하는 동작과 실제 발사 시점을 연결했다. 공격 객체 등록 시에는 몸체의 최종 월드 행렬과 `Head` 소켓 행렬을 전달한다.

{% include game-local-video.html file="lynel-fireball" title="라이넬 머리에서 플레이어를 조준한 뒤 이벤트에 맞춰 발사하는 화염" %}

## 회전: Look과 목표 방향의 외적으로 좌우 판별

라이넬에서 플레이어를 향하는 방향과 라이넬의 Look을 외적한다. 이 구현의 판정 기준에서는 값이 양수면 시계 방향, 음수면 반시계 방향으로 회전한다. 플레이어가 어느 쪽에 있는지에 따라 회전 방향을 선택하는 계산이다.

외적은 두 벡터의 순서를 바꾸면 부호가 반대로 바뀐다. 따라서 이 부호 규칙은 벡터 순서와 좌표계가 함께 정해진 판정으로 사용한다.

{% include game-local-video.html file="lynel-turn" title="플레이어 방향과 Look의 외적으로 회전 방향을 정하는 라이넬" %}

## 거리를 벌리는 두 가지 이동

백스텝은 PhysX Impulse와 Look 반대 방향의 속도를 부여해 순간적으로 뒤로 이동시킨다. 몸체가 플레이어를 바라보는 상태에서 빠르게 거리를 벌리는 동작이다.


뒤로 돌아 뛰어가는 패턴에서는 라이넬 Look을 플레이어를 바라보는 방향의 반대로 서서히 회전시킨다. 라이넬은 회전하면서 앞으로 이동해 플레이어에게서 멀어진다. 순간적인 후방 이동과 몸을 돌려 달리는 이동에 서로 다른 처리 방식을 적용했다.


## 체력 절반 이하: 이벤트로 2페이즈 연출 연결

라이넬의 HP가 절반 이하가 되면 2페이즈를 시작한다. 전환 동작의 이벤트 콜에 맞춰 사운드와 이펙트 함수를 호출한다. 체력 조건은 페이즈 전환을 결정하고, 애니메이션 이벤트는 전환 동작 안에서 연출이 실행될 시점을 결정한다.


## 머리 피격 기절과 중복 기절 방지

라이넬 머리와 플레이어 화살이 충돌하면 라이넬의 행동을 멈춘다. 기절 상태에서 TimeDelta를 누적하고 기준 시간을 넘으면 전투를 재개한다. 진입은 충돌 사건으로, 종료는 누적 시간으로 판단한다.

기절 중에는 다시 기절하지 않도록 기절 판정에 쓰는 콜라이더를 비활성화한다. 머리의 재피격을 계속 기절 진입으로 처리하면 기절 상태가 반복될 수 있으므로, 기절 상태 자체가 다음 기절 판정을 제한하게 했다.

{% include game-local-video.html file="lynel-stun" title="머리 화살 피격에 따른 기절과 콜라이더 비활성화" %}


`Client/Private/Boss_Lynel_FSM.cpp` 발췌

```cpp
void CBossLynelFSM::OnStun_Begin()
{
    if (true == m_IsSwordDrawn)
        Event_DrawSword();
    ACTIVE_OBJ(m_pOwner->Find_Child(TEXT("Body"))->Find_Child(TEXT("Head")), false);
    m_pAnimController_Owner->Set_Integer(TEXT("iAct"), LYNEL_AC_STUN);
    m_pAnimController_Owner->Set_Trigger(TEXT("tNxtAnim"));
    m_pGameInstance->Start_SFX(TEXT("Lynel_Vo_Down_01"), false);
}
```

## 2페이즈 점프: 칼의 월드 행렬로 후속 구체 배치

2페이즈에서는 점프 내려찍기를 마친 뒤 불꽃 구체가 생긴다. 구체에 칼의 월드 행렬을 전달하고, 구체 자체의 트랜스폼을 조절해 최종 위치를 정한다. 공격 기준 위치는 칼이 제공하고 구체의 개별 배치는 구체 트랜스폼이 담당한다.

점프의 착지 판정, 칼의 공격 활성화, 후속 구체 배치가 순서대로 이어진다.

{% include game-local-video.html file="lynel-phase-two-jump" title="점프 내려찍기 후 칼의 위치를 기준으로 생성되는 불꽃 구체" %}

## 2페이즈 화염: 충돌 위치에 불기둥 활성화

화염 투사체가 땅에 닿으면 그 투사체의 월드 위치를 기준으로 불기둥을 활성화한다. `CLynel_Fire::CheckRays()`는 지면 충돌과 `Sign_Lynel_2Phase`를 확인한다. 이어서 투사체 트랜스폼의 위치를 `InitialPos`에 담고 부모 라이넬의 `Active_Skill()`에 전달한다.

라이넬은 내부 풀에서 `Pooling_FireArea`와 `Pooling_FirePhillar`를 활성화한다. 투사체는 월드 위치와 필요한 크기를 descriptor로 전달하고, 후속 공격은 이 정보로 배치된다. 화염 투사체는 후속 공격을 연결한 뒤 비활성화된다.

{% include game-local-video.html file="lynel-phase-two-fireball" title="화염 투사체의 지면 충돌 위치에서 이어지는 불기둥" %}

## 2페이즈 기본 공격: Look을 회전축으로 검기 방향 만들기

검기 객체에는 공격에 맞는 회전 각도를 전달한다. 검기는 라이넬 Look을 축으로 그 각도만큼 회전한 뒤 이동한다. 보스의 전방 방향을 유지하면서 베기 각도에 맞춰 검기의 자세를 바꾸는 처리다.

{% include game-local-video.html file="lynel-sword-aura" title="라이넬 Look을 축으로 회전한 뒤 이동하는 검기" %}
