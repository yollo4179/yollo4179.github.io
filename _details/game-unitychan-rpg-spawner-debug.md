---
layout: game-article
title: 스포너 셀 배치와 박스 Gizmo
project_slug: unitychan-rpg
game_portfolio: true
game_order: 11
topic: 전투와 행동
summary: NavMesh 영역을 셀로 나누고 지면·이동 가능 위치를 검사한 뒤 몬스터와 디버그 박스를 배치했다.
tags:
- Spawner
- NavMesh
- Gizmo
permalink: /projects/unitychan-rpg/technical/spawner-debug/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 몬스터별 스폰 영역 구성

씬은 몬스터 종류별 관리 오브젝트 아래에 `SpawnTile`, `NavMeshVolume`, `EnemySpawner`를 둔다. `NavMeshSurface`의 Volume 크기와 방향을 기준으로 셀 후보를 만든다. 관리 Inspector에는 NavMeshSurface, 구역 ID, NavMesh 유틸리티를 연결한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/spawner-hierarchy.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/spawner-hierarchy.webp' | relative_url }}" alt="몬스터별 관리 오브젝트와 스폰·NavMesh 하위 구성" width="585" height="628" loading="lazy"></a>
  <figcaption>몬스터별 관리 오브젝트와 스폰·NavMesh 하위 구성</figcaption>
</figure>

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/spawner-inspector.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/spawner-inspector.webp' | relative_url }}" alt="NavMesh Volume 크기와 미노타우르스 구역 ID 설정" width="704" height="1400" loading="lazy"></a>
  <figcaption>NavMesh Volume 크기와 미노타우르스 구역 ID 설정</figcaption>
</figure>

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Monsters/Enemies/EnemySpawner.cs
└─ Monsters/Enemies/SpawnTile.cs
```

```text
NavMesh Volume → 셀 후보 → 지면 Raycast → NavMesh 샘플 검사
  → 셀 등록 → 몬스터 배치·정보 주입 → 박스 Gizmo 표시
```

## Volume 안에 셀 배치

`EnemySpawner.SpawnMonsterCells`는 Volume의 X·Z 크기를 셀 크기로 나눠 행과 열을 계산한다. 표면의 회전과 좌상단 기준 위치를 `SpawnTile.TestValidityAndSet`에 넘긴다. 셀은 인덱스를 행·열 좌표로 바꾸어 중심 위치를 계산한다.

`Assets/04.Scripts/Monsters/Enemies/SpawnTile.cs` 발췌

```csharp
int row = (int)volumeSize.x / (int)_cellWidth;
int col = (int)volumeSize.y /(int)_cellDepth;
_cellIndex = nowIndex;
int idxX = _cellIndex/col;
int idxZ = _cellIndex%col;
_cellPosition =
    posLT
    +_cellWidth*(0.5f + idxX)* surface.transform.right.normalized
    +_cellDepth*(0.5f + idxZ)* surface.transform.forward.normalized;
_cellPosition.y+=_cellHeight;
transform.position= _cellPosition;
```

셀 위에서 아래로 Raycast를 쏘아 Terrain을 찾는다. 지면 근처 NavMesh 위치를 샘플링하고, 셀 안의 3×3 후보점도 검사한다. 후보 9개가 모두 확보되면 `_isCellFixed`를 켜고 스폰에 사용할 셀로 등록한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/spawner-cells.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/spawner-cells.webp' | relative_url }}" alt="NavMesh 위에 배치한 스폰 셀과 몬스터 주변 디버그 선" width="1920" height="962" loading="lazy"></a>
  <figcaption>NavMesh 위에 배치한 스폰 셀과 몬스터 주변 디버그 선</figcaption>
</figure>

## 몬스터에 스포너와 셀 인덱스 전달

`SetMonster`는 생성한 몬스터를 셀 위치에 두고 BehaviorGraphAgent의 Blackboard에 스포너, 셀 인덱스, Animator와 스킬 번호를 전달한다. `IIndexConsumer`, `ISpawnerConsumer` 구현 객체에도 같은 정보를 주입한다. 마지막으로 `NavMeshAgent.Warp`로 에이전트 위치를 맞춘다.

## 셀 상태를 네모 박스로 표시

`OnDrawGizmos`는 `Gizmos.matrix`를 셀의 `localToWorldMatrix`로 바꾸어 회전과 위치를 반영한다. 확정된 셀은 초록색, 나머지는 보라색으로 표시한다. 반투명 큐브와 WireCube를 그린 뒤 이전 행렬을 복원한다.

`Assets/04.Scripts/Monsters/Enemies/SpawnTile.cs` 발췌

```csharp
Gizmos.color = new Color(1f, 0f, 1f, 0.5f);
if (_isCellFixed)
    Gizmos.color = new Color(0f, 1f, 0f, 0.5f);
var prev = Gizmos.matrix;
Gizmos.matrix = transform.localToWorldMatrix;
Gizmos.DrawCube(Vector3.zero, new Vector3(_cellWidth, _cellHeight, _cellDepth) );
if (_isCellFixed)
    Gizmos.color = Color.green;
else
    Gizmos.color = Color.purple;
Gizmos.DrawWireCube(Vector3.zero, new Vector3(_cellWidth, _cellHeight, _cellDepth));
Gizmos.matrix = prev;
```

셀 인덱스는 TextMeshPro로 표시하고 카메라를 향하게 회전한다. 확정된 셀의 순찰 지점에는 WireSphere를 그린다. 가까운 화면에서는 셀과 후보점을, 원거리에서는 영역별 배치 범위를 볼 수 있다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/spawner-regions.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/spawner-regions.webp' | relative_url }}" alt="전체 맵에서 구분한 NavMesh 영역과 스폰 셀" width="1920" height="963" loading="lazy"></a>
  <figcaption>전체 맵에서 구분한 NavMesh 영역과 스폰 셀</figcaption>
</figure>

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/spawner-debug-view.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/spawner-debug-view.webp' | relative_url }}" alt="Debug Spawner 영상에서 확인할 수 있는 영역별 박스 배치" width="1920" height="1072" loading="lazy"></a>
  <figcaption>Debug Spawner 영상에서 확인할 수 있는 영역별 박스 배치</figcaption>
</figure>
