---
layout: game-article
title: JSON 정의 데이터와 플레이 진행 저장
project_slug: unitychan-rpg
game_portfolio: true
game_order: 10
topic: 데이터와 표현
summary: Resources의 JSON 정의와 persistentDataPath의 진행 정보를 구분하고 ID로 연결했다.
tags:
- JSON
- 저장
- 데이터
permalink: /projects/unitychan-rpg/technical/data-lifecycle/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## JSON 파일의 두 용도

아이템·몬스터·레벨처럼 공통으로 읽는 정의 데이터는 `Resources/Data/Json`에 둔다. 플레이 중 바뀌는 인벤토리와 플레이어 정보, 퀘스트 진행은 `Application.persistentDataPath`의 JSON으로 저장한다. 상점 판매 목록인 `ShopInfo.json`도 이 경로에서 읽는다.

| 데이터 | 저장 형태 | 사용하는 내용 |
| --- | --- | --- |
| EquipmentItemData·ConsumableItemData·IngrediantItemsData | Resources의 JSON | ID별 가격·아이콘·아이템 정의 |
| MonstersData·PlayerLevel 계열 데이터 | Resources의 JSON | 몬스터와 성장에 쓰는 정의 값 |
| QuestProcess.json | persistentDataPath의 JSON | 퀘스트 코드와 진행 상태 |
| QuestTaskProcess.json | persistentDataPath의 JSON | 목표 코드·진행량·상태 |
| ShopInfo.json | persistentDataPath의 JSON | 상점에서 판매할 아이템 목록 |

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/json-equipment.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/json-equipment.webp' | relative_url }}" alt="JSON으로 관리하는 장비 아이템 정의" width="1458" height="1400" loading="lazy"></a>
  <figcaption>JSON으로 관리하는 장비 아이템 정의</figcaption>
</figure>

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/json-monsters.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/json-monsters.webp' | relative_url }}" alt="JSON으로 관리하는 몬스터 정의 데이터" width="1458" height="1400" loading="lazy"></a>
  <figcaption>JSON으로 관리하는 몬스터 정의 데이터</figcaption>
</figure>

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Managers/DataManager.cs
├─ Managers/QuestManager.cs
└─ Managers/Shop/ShopManager.cs
```

```text
Resources JSON → 역직렬화 → ID Dictionary → 데이터 조회
진행 DTO → 직렬화 → persistentDataPath JSON
저장 JSON → 역직렬화 → 퀘스트·목표 코드로 런타임 결합
```

## 아이템 ID로 조회하는 Dictionary

`DataManager.LoadItemData`는 소비 아이템 JSON을 읽어 `ItemData[]`로 역직렬화한다. 이 배열을 `ItemID`를 키로 한 Dictionary로 만들고, 재료와 장비 데이터를 같은 Dictionary에 추가한다.

`Assets/04.Scripts/Managers/DataManager.cs` 발췌

```csharp
TextAsset asset = Resources.Load<TextAsset>("Data/Json/ConsumableItemData");
var json = asset.text;
Debug.Log(json);
ItemData[] arrItemData = JsonConvert.DeserializeObject<ItemData[]>(json);
this.m_ItemData =arrItemData.ToDictionary(x => x.ItemID);
```

상점과 인벤토리는 `GetItemData(ItemID)`로 이 Dictionary를 조회한다. 소유 수량과 강화 수치 등 개별 상태는 아이템 정의와 연결된 소유 정보에서 관리한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/json-player-level.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/json-player-level.webp' | relative_url }}" alt="플레이어 레벨별 성장 정보를 보관한 JSON" width="1458" height="1400" loading="lazy"></a>
  <figcaption>플레이어 레벨별 성장 정보를 보관한 JSON</figcaption>
</figure>

## 퀘스트와 하위 목표 저장

`SaveQuests`는 퀘스트 런타임 객체의 DTO들을 목록으로 모아 직렬화한다. `SaveTasks`는 퀘스트별 목표 Dictionary를 순회하면서 하위 목표 DTO를 한 목록으로 저장한다.

`Assets/04.Scripts/Managers/QuestManager.cs` 발췌

```csharp
public void SaveQuests()
{
    var all = new List<QuestProcessDTO>();
    foreach (var pair in _questRunTimeProcesses)
    {
        all.Add(pair.Value._runtimeProcess);
    }
    var json = JsonConvert.SerializeObject(all, Formatting.Indented);
    File.WriteAllText(_pathQuest, json);
}
```

로드할 때는 먼저 카탈로그에서 퀘스트 정의를 등록한다. `LoadQuests`가 저장한 퀘스트 상태를 읽고 `LoadAndJoinTasks`가 `QuestCODE`와 `SubTaskCODE`로 목표 진행을 연결한다. `ReconcileTaskStates`는 완료 목표와 활성 목표를 정리하고 진행 중인 목표의 이벤트 구독을 구성한다.
