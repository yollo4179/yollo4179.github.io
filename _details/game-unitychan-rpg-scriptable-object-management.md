---
layout: game-article
title: ScriptableObject로 스킬·퀘스트·이펙트 관리
project_slug: unitychan-rpg
game_portfolio: true
game_order: 9
topic: 데이터와 표현
summary: SO의 직렬화 필드와 에셋 목록을 정의하고 스킬 이벤트, 퀘스트 카탈로그, 강화 이펙트에서 읽어 사용했다.
tags:
- ScriptableObject
- 스킬
- 에디터
permalink: /projects/unitychan-rpg/technical/scriptable-object-management/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## SO 에셋과 실행 코드 연결

SO 에셋은 `Assets/Resources/Data/ScriptableObjects`에 둔다. C# 클래스에 `CreateAssetMenu`를 선언해 에디터에서 생성하고 `SerializeField`로 Inspector에 설정값을 노출한다. 스킬은 수치와 애니메이션 이벤트, 퀘스트는 목표와 보상, 강화 효과는 속성과 단계별 프리팹을 저장한다.

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Quest/ScriptableObject/QuestData.cs
├─ Quest/QuestCatalog/QuestCatalog.cs
└─ Effects/ReinforceEffect/ReinforceEffect.cs

Assets/Resources/Data/ScriptableObjects/SkillData/
├─ SkillSO.cs
└─ SkillSOEditor.cs
```

```text
SO 클래스의 직렬화 필드 → Inspector에서 에셋 설정
  → Resources 조회 또는 SO 참조 전달 → 실행 코드에서 필드 사용
```

## SkillSO의 직렬화 필드

스킬 실행 코드와 UI는 SO의 프로퍼티로 수치와 아이콘을 읽는다. `handle`은 퀵 슬롯에 연결하는 정수 식별자다.

`Assets/Resources/Data/ScriptableObjects/SkillData/SkillSO.cs` 발췌

```csharp
[System.Serializable, CreateAssetMenu(fileName = "SkillSO", menuName = "Scriptable Objects/SkillSO")]
public class SkillSO : ScriptableObject
{
    [SerializeField] EventSequence stateNodeEvents;
    [SerializeField] Sprite skillIcon;
    [SerializeField, TextArea(2, 5)] string skillName;
    [SerializeField, TextArea(2, 5)] string skillDesc;
    [SerializeField, TextArea(2, 5)] string skillClass;
    [SerializeField] float coolTime;
    [SerializeField] float manaCost;
    [SerializeField] float range;
    [SerializeField] float damage;
    [SerializeField] float damageIncreasePercentPoint;
    [Header("Buff")]
    [SerializeField] BuffInfo[] buffInfo;
    [SerializeField] int skillNO;
    [SerializeField] int skillLevel;
    [SerializeField] int openLevel;
    [SerializeField] eSkillType skillType;
    [Header("Handle")]
    [SerializeField] public int handle;
    [SerializeField] public string alias;
    public EventSequence EventSequence => stateNodeEvents;
    public Sprite SkillIcon => skillIcon;
    public string SkillName => skillName;
    public string SkillDesc => skillDesc;
    public string SkillClass => skillClass;
    public float CoolTime => coolTime;
    public float ManaCost => manaCost;
    public float Range => range;
    public float Damage => damage;
    public int SkillNO => skillNO;
    public int OpenLevel => openLevel;
    public float DamageIncreasePercentPoint { get=> damageIncreasePercentPoint; set=> damageIncreasePercentPoint =value; }
    public eSkillType SkillType { get => skillType; }
    public BuffInfo[] BuffInfo { get => buffInfo; set => buffInfo = value; }
    public int SkillLevel { get=> skillLevel; set=> skillLevel =value; }
}
```

## SkillSO의 이벤트 구조

`SkillSO`는 아이콘, 이름, 설명, 쿨타임, 마나 비용, 사거리, 피해량, 스킬 종류와 핸들을 보관한다. 애니메이션 설정은 `EventSequence → EventClipInfo → AnimEventDesc`로 구성한다. 각 클립에 애니메이션 전체 경로와 타격 부위를 지정하고 이벤트 목록을 연결한다.

`Assets/Resources/Data/ScriptableObjects/SkillData/SkillSO.cs` 발췌

```csharp
[System.Serializable]public struct EventClipInfo
{
    [SerializeField] public string clipName;
    [SerializeField] public List<AnimEventDesc> events;
    [SerializeField] public string animFullPath;
    [SerializeField] public eHitAreaMarker hitArea;
}
[System.Serializable]public struct EventSequence
{
    [SerializeField] public List<EventClipInfo> eventClips;
}
```

`Assets/Resources/Data/ScriptableObjects/SkillData/SkillSO.cs` 발췌

```csharp
[System.Serializable]public struct AnimEventDesc
{
    [SerializeField] public eAnimEvent eventName;
    [SerializeField] public float startTime;
    [SerializeField] public float endTime;
    [SerializeField] public string  poolingEffectName;
    [Header("EffectOptions")]
    [SerializeField] public EffectSetting effectSetting;
    [Header("Projectiles")]
    [SerializeField] public string poolingProjectileKey;
    [SerializeField] public int numProjectiles;
    [SerializeField] public string[] spawnSocket;
    [Header("Collider")]
    [SerializeField]  public Vector3 colCenter;
    [SerializeField] public Vector3 colSize;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/skill-event-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/skill-event-so.webp' | relative_url }}" alt="SkillSO의 클립별 이벤트 목록과 시간 설정" width="1460" height="1400" loading="lazy"></a>
  <figcaption>SkillSO의 클립별 이벤트 목록과 시간 설정</figcaption>
</figure>

`AnimEventDesc`는 이벤트 종류와 시작·종료 시간, 풀링 키, 소켓, 충돌체 범위를 가진다. `EffectSetting`에는 로컬 위치·회전·스케일과 무기 부착 여부 등의 옵션을 저장한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/skill-properties-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/skill-properties-so.webp' | relative_url }}" alt="SkillSO의 아이콘·이름·수치·종류를 설정하는 Inspector" width="1460" height="1400" loading="lazy"></a>
  <figcaption>SkillSO의 아이콘·이름·수치·종류를 설정하는 Inspector</figcaption>
</figure>

## 애니메이션 시간으로 이벤트 실행

`PlayerMeleeSkillState`는 SO의 `animFullPath`를 Animator 해시로 변환한다. 해당 애니메이션에 진입하면 `normalizedTime`과 이벤트의 시작·종료 시간을 비교한다. 이전 프레임의 활성 여부와 달라진 이벤트만 `FireEvents`로 ON 또는 OFF를 전달한다.

`Assets/04.Scripts/PlayerScrips/PlayerState/PlayerMeleeSkillState.cs` 발췌

```csharp
for (int i = 0; i<events.Count; ++i)
{
    nowEventOn = IsPointInRange(tNow, events[i].startTime, events[i].endTime);
    if (nowEventOn!=isPrevEventOns[i])
    {
        if (nowEventOn)
            FireEvents(events[i].eventName, true, events[i]);
        else
            FireEvents(events[i].eventName, false, events[i]);
    }
    isPrevEventOns[i]= nowEventOn;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/skill-upper-slash-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/skill-upper-slash-so.webp' | relative_url }}" alt="어퍼 슬래시의 애니메이션 이벤트와 효과 설정" width="1460" height="1400" loading="lazy"></a>
  <figcaption>어퍼 슬래시의 애니메이션 이벤트와 효과 설정</figcaption>
</figure>

`COLLIDER`, `EFFECT`, `SUMMON_PROJECTILES` 같은 종류별로 실행 코드가 나뉜다. 스킬 데이터에 저장한 시간과 소켓 정보를 읽어 히트박스, 파티클, 투사체를 제어한다.

## QuestData와 QuestCatalog

퀘스트 정의 클래스에는 목표 목록, 보상, 선행 조건과 자동 수락 설정을 함께 둔다.

`Assets/04.Scripts/Quest/ScriptableObject/QuestData.cs` 발췌

```csharp
[CreateAssetMenu(fileName = "QuestData", menuName = "Scriptable Objects/QuestData")]
public class QuestData : ScriptableObject
{
    [Header("Quest Description")]
    [SerializeField]public  string QuestTitle;
    [TextArea(5,5)]
    [SerializeField]public  string QuestDescription;
    [Header("Contents")]
    [SerializeField] public List<SubTask> tasks ;
    [Header("Reward")]
    [SerializeField]public QuestRewards QuestReward;
    [Header("Condition")]
    [SerializeField] public QuestPrerequisite AcceptionCondition;
    [Header("NPC ")]
    [SerializeField] public string QuestCODE;
    [SerializeField] public int NPC_ID;
    public bool useAutoComplete = false;
    public bool useAutoAcception = false;
    public bool CheckPreRequisites()
    {
        Debug.Assert(null !=AcceptionCondition);
        return  AcceptionCondition.CheckCondition();
    }
    public void GiveReward(Event_QuestCompleted evt)
    {
        int gold = QuestReward.Gold;
        int exp = QuestReward.Exp;
       foreach(var Reward in QuestReward.RewardItemSets)
        {
            eITEMTYPE type =  Managers.Data.GetItemData(Reward.ItemID).Type;
            Managers.Inventory.TryAddItem(type, Reward.ItemID,Reward.ItemAmount);
        }
        Managers.Player.AddMoney(gold);
        if (exp > 0) Managers.Player.AddEXP(exp);
    }
}
```


`QuestData`는 퀘스트 제목·목표·보상·수락 조건을 정의한다. 목표 목록의 원소인 `SubTask`에는 식별 코드, 대상 ID, 요구량, 대화 키와 목표 타입이 들어간다.

`Assets/04.Scripts/Quest/ScriptableObject/QuestData.cs` 발췌

```csharp
[System.Serializable] public class SubTask
{
    [SerializeField] public string       SubTaskCODE;
    [SerializeField] public int          TargetID;
    [SerializeField] public string       TaskExplantion;
    [SerializeField] public int          GoalAmount;
    [SerializeField] public string       DialogKey;
    [SerializeField] public int          NPCID;
    [SerializeField] public eTASK_TYPE   Type;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-definition-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-definition-so.webp' | relative_url }}" alt="퀘스트 목표와 보상·수락 조건을 설정한 QuestData" width="1460" height="1400" loading="lazy"></a>
  <figcaption>퀘스트 목표와 보상·수락 조건을 설정한 QuestData</figcaption>
</figure>

`QuestCatalog`는 여러 `QuestData` 에셋을 목록으로 묶는다. `QuestManager.Init`는 `Resources.LoadAll<QuestCatalog>`로 카탈로그를 읽고 `SelectMany`와 `Distinct`로 퀘스트를 모은 뒤 `QuestCODE`를 키로 등록한다. 진행량과 완료 상태는 런타임 DTO에 저장한다.

`Assets/04.Scripts/Quest/QuestCatalog/QuestCatalog.cs` 발췌

```csharp
[CreateAssetMenu(fileName = "QuestCatalog", menuName = "Scriptable Objects/QuestCatalog")]
public class QuestCatalog:ScriptableObject
{
 [SerializeField]public List<QuestData> _quests;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-catalog-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-catalog-so.webp' | relative_url }}" alt="QuestCatalog에 퀘스트 에셋들을 등록한 목록" width="1460" height="1400" loading="lazy"></a>
  <figcaption>QuestCatalog에 퀘스트 에셋들을 등록한 목록</figcaption>
</figure>

## 속성별 강화 이펙트 SO

`ReinforceEffect`는 `BASE`, `FIRE`, `ICE` 속성 중 하나와 단계별 프리팹 목록을 갖는다. Inspector에서 프리팹과 적용 레벨을 지정하면 `WeaponEffectManager`가 속성과 강화 단계로 사용할 이펙트를 선택한다.

`Assets/04.Scripts/Effects/ReinforceEffect/ReinforceEffect.cs` 발췌

```csharp
[CreateAssetMenu(fileName = "ReinforceEffect", menuName = "Scriptable Objects/ReinforceEffect")]
public class ReinforceEffect : ScriptableObject
{
    [SerializeField] public List<ReinforceInfo> ReinforceEffectPrefabs;
    [SerializeField] public ELEMENT Element;
}
```

`Assets/04.Scripts/Effects/ReinforceEffect/ReinforceEffect.cs` 발췌

```csharp
[System.Serializable] public class ReinforceInfo
{
    [SerializeField]                    public GameObject EffectPrefab;
    [SerializeField, TextArea(5, 1)]    public string Description;
    [SerializeField]                    public int Level;
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/reinforce-element-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/reinforce-element-so.webp' | relative_url }}" alt="속성별 강화 이펙트의 프리팹 참조와 레벨 설정" width="1458" height="1400" loading="lazy"></a>
  <figcaption>속성별 강화 이펙트의 프리팹 참조와 레벨 설정</figcaption>
</figure>

## 스킬 아이콘 미리보기

`SkillSOEditor.cs`의 `ItemSOEditor`는 `CustomEditor(typeof(SkillSO))`로 연결한다. 기본 Inspector를 그린 뒤 `AssetPreview.GetAssetPreview`로 스킬 아이콘을 가져와 100×100 영역에 표시한다. 변경이 생기면 `EditorUtility.SetDirty(skillSO)`를 호출한다.
