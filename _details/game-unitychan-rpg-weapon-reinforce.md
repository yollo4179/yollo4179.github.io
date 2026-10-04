---
layout: game-article
title: 무기 강화 수치와 속성 이펙트
project_slug: unitychan-rpg
game_portfolio: true
game_order: 8
topic: UI와 상호작용
summary: 장비 인스턴스의 추가 능력치를 계산하고 강화 이벤트와 단계별 파티클을 연결했다.
tags:
- 무기 강화
- ScriptableObject
- 파티클
permalink: /projects/unitychan-rpg/technical/weapon-reinforce/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 강화 대상은 장비 인스턴스

`UI_ReinforceDirector.OnDrop`은 드래그한 아이콘의 데이터를 풀에서 빌린 아이콘에 복사한다. 아이템 타입이 장비인지 확인하고 강화 슬롯에 배치한다. `_nowIDS`가 선택한 장비 데이터를 보관하며, 강화 버튼은 `InstanceItemInfo`로 변환해 개별 장비의 강화 수치를 변경한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/weapon-reinforce-result.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/weapon-reinforce-result.webp' | relative_url }}" alt="무기 강화 슬롯과 능력치 증가 결과" width="1920" height="1080" loading="lazy"></a>
  <figcaption>무기 강화 슬롯과 능력치 증가 결과</figcaption>
</figure>

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ UI/Reinforce/UI_ReinforceDirector.cs
├─ Effects/ReinforceEffect/ReinforceEffect.cs
└─ Managers/WeaponEffectManager/WeaponEffectManager.cs
```

```text
장비 드롭 → InstanceItemInfo → 강화 수치 계산
  → Event_Reinforce → 결과 표시
속성·강화 단계 → ReinforceEffect → 풀의 파티클 → 무기 MeshRenderer
```

## 비용과 증가량 계산

강화 버튼은 연출 코루틴이 실행 중이거나 최대 강화 횟수에 도달한 경우 반환한다. 비용은 `instance.Level × 60`이며 증가량의 기준은 장비 레벨에 1~3의 정수 난수를 곱해 정한다.

`Assets/04.Scripts/UI/Reinforce/UI_ReinforceDirector.cs` 발췌

```csharp
int reinforceIntensity = instance.Level;
int randomVar = UnityEngine.Random.Range(1, 4);
reinforceIntensity *= randomVar;
```

장비 부위별로 `ReinforceResult`의 능력치를 채운다. 무기는 기준 증가량을 공격력·치명타 확률·치명타 피해에 더하고, 방어력에는 2배, 최대 체력과 마나에는 5배를 사용한다.

`Assets/04.Scripts/UI/Reinforce/UI_ReinforceDirector.cs` 발췌

```csharp
case eEQUIPMENTTYPE.WEAPON:
    result.Defense +=reinforceIntensity*2;
    result.Damage +=reinforceIntensity;
    result.CriChance +=reinforceIntensity;
    result.CriDamage +=reinforceIntensity;
    result.MaxHP +=reinforceIntensity*5;
    result.MaxMP +=reinforceIntensity*5;
    break;
```

0~8의 정수 난수가 6 이하일 때 계산한 추가 능력치를 장비 인스턴스에 반영한다. 그 외에는 빈 결과를 사용한다. `CurrentReinforce`는 시도 후 증가하며, `Event_Reinforce`를 발행하고 결과 표시기를 갱신한다.

`Assets/04.Scripts/UI/Reinforce/UI_ReinforceDirector.cs` 발췌

```csharp
if(UnityEngine.Random.Range(0,9)<=6)
{
    instance.ExtraCriChance +=result.CriChance;
    instance.ExtraCriDamage +=result.CriDamage;
    instance.ExtraDamage +=result.Damage;
    instance.ExtraDefense +=result.Defense;
    instance.ExtraHealth +=result.MaxHP;
    instance.ExtraMana +=result.MaxMP;
    result.bReinforceResult = true;
}
else
    result = new ReinforceResult();
++instance.CurrentReinforce;
Managers.Event.Publish<Event_Reinforce>(new Event_Reinforce(itemInfo));
_resultDisplayer.SetResult(result);
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/weapon-reinforce-level.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/weapon-reinforce-level.webp' | relative_url }}" alt="강화한 무기의 아이콘과 강화 결과 표시" width="1920" height="1080" loading="lazy"></a>
  <figcaption>강화한 무기의 아이콘과 강화 결과 표시</figcaption>
</figure>

## 강화 단계에 맞는 파티클 선택

`ReinforceEffect` SO는 속성과 `ReinforceInfo` 목록을 가진다. 각 항목은 적용 단계와 이펙트 프리팹을 저장한다. `WeaponEffectManager`는 속성별 SO를 읽어 프리팹 풀을 준비한다.

`ActivateEffect`는 목록을 앞에서부터 순회하면서 장비 강화 단계 이하인 마지막 항목을 선택한다. 이 순회는 단계가 오름차순인 목록을 사용한다. 선택한 프리팹을 풀에서 가져오고 장비 인스턴스 ID로 핸들을 보관한다.

`Assets/04.Scripts/Managers/WeaponEffectManager/WeaponEffectManager.cs` 발췌

```csharp
public void ActivateEffect(ELEMENT element,int level,string instanceID ,MeshRenderer mr ,Transform parent)
{
    var effects = _dicEffect[element].ReinforceEffectPrefabs;
    _nowEffect =null;
    foreach (var effect in effects) {
        if (effect == null) continue;
        if (effect.Level > level) break;
        _nowEffect=effect;
    }
    if (null ==_nowEffect) return;
    Poolable handle=  Managers.Pool.LendPoolableTo(_nowEffect.EffectPrefab.name,null);
    SetWeaponMesh(handle,mr);
    handle.transform.SetParent(parent);
    _reinforceEffects.Add(instanceID, handle);
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/reinforce-effect-so.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/reinforce-effect-so.webp' | relative_url }}" alt="강화 단계별 이펙트 프리팹을 지정한 SO Inspector" width="1458" height="1400" loading="lazy"></a>
  <figcaption>강화 단계별 이펙트 프리팹을 지정한 SO Inspector</figcaption>
</figure>

`SetWeaponMesh`는 파티클 Shape을 `MeshRenderer`로 설정하고 무기의 렌더러를 연결한다. 무기 메시를 파티클 발생 영역으로 사용하며, 비활성화할 때는 메시 참조를 비우고 이펙트를 풀에 반환한다.

`Assets/04.Scripts/Managers/WeaponEffectManager/WeaponEffectManager.cs` 발췌

```csharp
public void SetWeaponMesh(Poolable handle ,MeshRenderer meshRenderer)
{
    var particleSystems = handle.GetComponentsInChildren<ParticleSystem>(true);
    foreach (var particleSystem in particleSystems)
    {
        var shape = particleSystem.shape;
        shape.enabled = true;
        shape.shapeType = ParticleSystemShapeType.MeshRenderer;
        shape.meshRenderer = meshRenderer;
        shape.skinnedMeshRenderer = null;
    }
}
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/weapon-equipment-stats.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/weapon-equipment-stats.webp' | relative_url }}" alt="강화한 무기를 장착한 상태의 장비·능력치 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>강화한 무기를 장착한 상태의 장비·능력치 화면</figcaption>
</figure>
