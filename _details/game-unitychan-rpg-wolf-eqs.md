---
layout: game-article
title: 늑대의 EQS 후보 평가와 위치 예약
project_slug: unitychan-rpg
game_portfolio: true
game_order: 4
topic: 전투와 행동
summary: 플레이어 주변 후보 지점을 평가하고 예약·점유 상태를 갱신하며 늑대의 이동 목적지를 정했다.
tags:
- AI
- EQS
- 늑대
permalink: /projects/unitychan-rpg/technical/wolf-eqs/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 플레이어 주변 후보 지점

늑대는 EQS 형태의 후보 평가 시스템으로 이동할 위치를 선택한다. `EQSManager`가 링별 후보 지점과 전체 목록을 관리하고, `EQSQuery`가 테스트 점수를 계산한다. `EQSQuerierBehaviour_Battle`은 선택한 지점의 예약과 실제 이동을 처리한다.

{% include game-video-embed.html id="609vL5vsOM8" title="Wolf EQS 모방 · 여러 늑대의 위치 선택과 전투" %}

`EQSPoint`에는 위치, 링 번호, 링 안의 인덱스, 예약자와 점유자를 저장한다. 이동 중 예약과 도착 후 점유를 별도 필드로 표현한다.

`Assets/04.Scripts/Managers/SlotManager/EQSManager.cs` 발췌

```csharp
public class EQSPoint
{
    public Vector3 pos { get; set; }
    public Vector3 toTargetDir { get; set; }
    public EQSQuerier occupant { get; set; }
    public EQSQuerier reserver { get; set; }
    public int ringIndex { get; set; }
    public int pointIndexInRing { get; set; }
    public bool isAvailable => (null == occupant && null ==reserver);
    public bool isOccupied => (null !=occupant);
    public bool isDifferntPointInSameRing(EQSPoint other) =>
        (other.ringIndex ==this.ringIndex)&&(other.pointIndexInRing !=this.pointIndexInRing);
    public float DeltaTheta(EQSTarget target)
    {
        var vecDir = this.pos -  target.transform.position;
        vecDir.y=0;
        return Mathf.Atan2(vecDir.z, vecDir.x);
    }
}
```

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Managers/SlotManager/EQSManager.cs
├─ CommonScrips/EQSSystem/EQSQuery.cs
└─ CommonScrips/EQSSystem/EQSBehavior/EQSQuerierBehaviour_Battle.cs
```

```text
플레이어 주변 후보 → 테스트 점수 합산 → 후보 선택
  → 구역 검사 → 위치 예약 → NavMesh 이동 → 위치 점유
```

## 테스트 조합으로 점수 계산

각 테스트는 `IEQSTest.Execute(point, querier, context)`로 후보를 평가한다. 이상적 거리, 시야, 점유, 간격, 방향 성향 등을 SO로 정의하고 `EQSQuery`의 테스트 목록에 연결한다. 테스트 원본은 `ScriptableObject.Instantiate`로 복사해 쿼리에 보관한다.

가중합 정책은 각 점수에 `Weight / totalWeight`를 곱해 합산한다. 쿼리는 가중 곱과 최솟값 정책도 제공한다. 평가 결과는 내림차순으로 정렬하고 `_topResultCount`개 중 무작위로 하나를 고른다. 기본 후보 수가 1이면 가장 높은 점수의 지점을 고른다.

`Assets/04.Scripts/CommonScrips/EQSSystem/EQSQuery.cs` 발췌

```csharp
case SCORING_POLICY.eWeightedSum:
{
        float sum = 0f;
        foreach(var testWrapped in _dicTestConfig)
        {
            var test = testWrapped.Value.GetTest();
            float score = test.Execute(point, querier, context);
            sum+= score* (test.Weight / totalWeight);
        }
        return sum;
}
```

점유 테스트는 자신의 점유 지점에 1을 반환하고 다른 늑대가 점유하거나 예약한 지점에는 음의 무한대를 반환한다. 비어 있는 지점에는 늑대와의 거리와 점수 곡선을 적용한다.

`Assets/04.Scripts/CommonScrips/EQSSystem/EQSTests/OccupancyTest/EQSOccupancyTestSO.cs` 발췌

```csharp
public float Execute(EQSPoint point, EQSQuerier querier, EQSContext context)
{
    if (point.occupant == querier)
        return 1.0f;
    if (point.occupant != null && point.occupant != querier)
        return float.NegativeInfinity;
    if (point.reserver != null && point.reserver != querier)
        return false ? 0f : float.NegativeInfinity;
    Vector3 vector = point.pos - querier.transform.position;
    vector.y=0;
    float distXZ = Vector3.Magnitude(vector);
    float score = distXZ/_maxDistance;
    return _scoreCurve.Evaluate(Mathf.Clamp01(1-score));
}
```

## 후보 점수의 Gizmo 표시

`EQSQuery.OnDrawGizmos()`는 평가 결과를 보관한 `scoredPoints`를 순회하며 후보 위치에 반지름 0.1의 와이어 구를 그린다. 점수가 0 이하이면 파란색으로 표시하고, 양수이면 `1 - score`를 빨간 채널에, `score`를 초록 채널에 적용한다. 후보 지점의 배치와 평가 점수를 Scene 뷰에서 함께 확인하는 구조다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/wolf-eqs-debug.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/wolf-eqs-debug.webp' | relative_url }}" alt="Unity Scene 뷰에서 플레이어 주변의 EQS 후보 지점을 와이어 구로 표시하고 여러 늑대의 배치를 확인하는 디버그 화면" width="2879" height="1530" loading="lazy"></a>
  <figcaption>플레이어 주변의 EQS 후보 지점과 늑대 배치를 표시한 디버그 화면</figcaption>
</figure>

`Assets/04.Scripts/CommonScrips/EQSSystem/EQSQuery.cs` 발췌

```csharp
float score = point.score;
if (0f >=score)
    Gizmos.color = new Color(0f, 0f, 1f);
else
    Gizmos.color = new Color(Mathf.Clamp01(1 - score), Mathf.Clamp01(score), 0);
Gizmos.DrawWireSphere(point.point.pos, 0.1f);
```

## 예약에서 점유로 전환

`QueryNewPoint`는 타깃, 전체 늑대 목록, 후보 지점으로 `EQSContext`를 구성한다. 선택한 지점의 NavMesh 구역이 몬스터의 구역과 같은지 확인하고 기존 점유·예약을 갱신한다. 새 지점은 `_goalPoint`로 저장하며 `MoveToGoal`이 `NavMeshAgent.SetDestination`에 전달한다.

`Assets/04.Scripts/CommonScrips/EQSSystem/EQSBehavior/EQSQuerierBehaviour_Battle.cs` 발췌

```csharp
private void ReservePoint(EQSPoint point)
{
    if(null!= _reservedPoint && _reservedPoint != point )
    {
        _reservedPoint.reserver = null;
    }
    point.reserver = _querier;
    _reservedPoint=  point;
    _lastReservationTime =Time.time;
}
```

목표 지점까지의 거리가 `_stoppingDistance`보다 작아지면 `OccupyPoint`가 점유자를 등록한다. 이때 예약자와 `_goalPoint`를 비우고 `OccupingPoint`에 도착 지점을 보관한다. 전투 이동 클래스에는 방향별 관심도·위험도 계산과 벽 주변 이동 처리도 함께 들어 있다.

`Assets/04.Scripts/CommonScrips/EQSSystem/EQSBehavior/EQSQuerierBehaviour_Battle.cs` 발췌

```csharp
private void OccupyPoint(EQSPoint point)
{
    if (_querier == point.occupant) return;
    ReleaseOccupyingPoint();
    if (null!= _querier?.OccupingPoint)
    {
        _querier.OccupingPoint.occupant =null;
    }
    point.occupant= _querier;
    point.reserver = null;
    _querier.OccupingPoint = point;
    _reservedPoint = null;
    _goalPoint = null;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/wolf-eqs-gameplay.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/wolf-eqs-gameplay.webp' | relative_url }}" alt="플레이어 주변에서 서로 다른 위치를 차지하는 늑대들" width="1920" height="1080" loading="lazy"></a>
  <figcaption>플레이어 주변에서 서로 다른 위치를 차지하는 늑대들</figcaption>
</figure>
