---
layout: game-article
title: 미노타우르스의 Context Based Steering
project_slug: unitychan-rpg
game_portfolio: true
game_order: 3
topic: 전투와 행동
summary: 목표 거리로 이동 상태를 정하고 방향별 관심도와 장애물 감쇠를 합산해 이동 벡터를 계산했다.
tags:
- AI
- CBS
- 미노타우르스
permalink: /projects/unitychan-rpg/technical/events-monster-ai/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 전투 중 방향 계산

미노타우르스의 전투 이동은 `MonsterBattleScript.UpdateBattle`에서 갱신한다. 플레이어까지의 벡터를 XZ 평면으로 투영하고 거리와 방향을 계산한다. `CalculateInterests`가 이동 방향을 반환하면 `UpdateMovement`가 이동과 회전을 적용하고, `ChooseAnimation`이 이동 상태에 맞는 Animator 값을 정한다.

{% include game-video-embed.html id="Cx4fI0WBYAw" title="Cow CBS · 미노타우르스의 접근과 전투 이동" %}

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Monsters/Minotaur/MonsterBattleScript.cs
└─ Monsters/MonsterWolf/TreeNodes/MonsterBattleAction.cs
```

```text
목표 거리 → 전진·후퇴·횡이동 선택 → 방향별 관심도
  → Raycast 감쇠 → 이동 벡터 → 위치·회전·애니메이션
```

## 거리로 전진·후퇴·횡이동 선택

`_rangeOffset`보다 가까우면 `MoveB`, 그 값에서 2만큼 더 먼 범위까지는 `Strafe`, 바깥은 `MoveF`를 선택한다. 한 번 선택한 상태를 모든 방향 샘플에 적용한다.

기본 방향 수는 16이다. 각 방향은 `transform.forward`를 Y축으로 회전해 만든다. 목표 방향과 샘플 방향의 내적을 `d`라고 하면 전진 관심도는 `0.5 × (1 + d)`, 후퇴 관심도는 `0.5 × (1 - d)`, 횡이동 관심도는 `2 × (1 - |d|)`로 계산한다.

`Assets/04.Scripts/Monsters/Minotaur/MonsterBattleScript.cs` 발췌

```csharp
_nowState = lengthToTargetOnXZ < _rangeOffset ? eNowState.MoveB
    : lengthToTargetOnXZ <= _rangeOffset + 2f ? eNowState.Strafe
    : eNowState.MoveF;
if (isFirst) _nowLookDir = transform.forward;
Vector3 interestSum = Vector3.zero;
for (int i = 0; i < _numRays; i++)
{
    Vector3 axis = Quaternion.Euler(0, i * 360f / _numRays, 0) * transform.forward;
    float dotProduct = Vector3.Dot(toTarget, axis);
    float interest = _nowState == eNowState.MoveB ? 0.5f * (1f - dotProduct)
        : _nowState == eNowState.Strafe ? 2f * (1f - Mathf.Abs(dotProduct))
        : 0.5f * (1f + dotProduct);
```

## 장애물 감쇠와 벡터 합산

각 방향으로 Raycast를 쏘고 `Enemies`, `Obstacles` 레이어를 검사한다. 충돌 지점까지의 거리에서 캡슐 반지름을 뺀 비율을 안전도에 사용한다. 관심도에 안전도를 곱한 뒤 방향 벡터에 가중치를 주어 합산한다.

`Assets/04.Scripts/Monsters/Minotaur/MonsterBattleScript.cs` 발췌

```csharp
Ray ray = new Ray(transform.position + _offset, axis);
    _dangerMap[i] = 0f;
    if (Physics.Raycast(ray, out RaycastHit hit, _lengthRay, _obstacleMask,
        QueryTriggerInteraction.Ignore) && !hit.transform.IsChildOf(transform))
    {
        float safety = Mathf.Clamp01((hit.distance - _capsuleR)
            / Mathf.Max(0.001f, _lengthRay - _capsuleR));
        interest *= safety;
        _dangerMap[i] = 1f - safety;
    }
    _interestMap[i] = Mathf.Max(0f, interest);
    _debugLines[i].ray = new Ray(ray.origin, _interestMap[i] * axis);
    _debugLines[i].isInterested = _dangerMap[i] <= 0f;
    interestSum += _interestMap[i] * axis;
}
```

전진과 후퇴는 합산 벡터를 정규화해 사용한다. `Strafe` 상태에서는 `Strafe(toTarget)`가 목표 방향을 ±90도 회전한 좌우 방향 중 하나를 반환한다. 이 경로는 전진·후퇴의 합산 결과와 구분된다. 속도는 횡이동 때 기본 속도의 0.3배, 후퇴 때 0.5배로 조정한다.

## 이동 방향과 바라보는 방향

`UpdateBattle`은 플레이어를 향하는 `_nowLookDir`를 `Vector3.RotateTowards`로 갱신한다. `UpdateMovement`는 이동 벡터를 위치에 더하고 바라보는 방향에는 `Quaternion.Slerp`를 적용한다. 횡이동하면서도 회전 목표는 플레이어 방향으로 유지한다.

`Assets/04.Scripts/Monsters/Minotaur/MonsterBattleScript.cs` 발췌

```csharp
public virtual void UpdateMovement(Vector3 direction, Vector3 lookDir)
{
    if (direction.sqrMagnitude < 0.01f) return;
    {
        transform.position += direction * _monsterSpeed * Time.deltaTime;
        if (direction != Vector3.zero)
        {
            Quaternion targetRotation = Quaternion.LookRotation(lookDir);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * 5f);
        }
    }
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/minotaur-cbs-gameplay.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/minotaur-cbs-gameplay.webp' | relative_url }}" alt="미노타우르스의 플레이어 주변 전투 장면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>미노타우르스의 플레이어 주변 전투 장면</figcaption>
</figure>
