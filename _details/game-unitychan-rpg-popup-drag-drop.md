---
layout: game-article
title: 드래그 앤 드롭과 퀵 슬롯 교환
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
game_order: 1
topic: UI와 상호작용
summary: 드래그 좌표 변환, 아이콘 복사, 슬롯 교환과 SkillSO 핸들 등록 과정을 구현했다.
tags:
- UI
- 드래그 앤 드롭
- 퀵 슬롯
permalink: /projects/unitychan-rpg/technical/popup-drag-drop/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 드래그 앤 드롭의 목적과 좌표 변환

플레이어가 인벤토리와 스킬북의 아이콘을 퀵 슬롯에 등록하고, 등록한 위치를 바꿀 수 있도록 한다. 화면에서 아이콘을 옮기는 동작과 실제 슬롯의 데이터·입력 키를 함께 갱신해야 한다. 포인터는 화면 좌표로 전달되므로 드래그 Canvas의 로컬 좌표로 변환해 아이콘을 배치한다.

## 아이콘 이동과 슬롯 배치

<span class="notice-yellow">UI_Draggable_Move</span>는 포인터 이동을 처리하고, <span class="notice-yellow">UI_Droppable</span>은 놓인 아이콘을 슬롯에 배치한다. 인벤토리·스킬북의 원본 위치는 <span class="notice-yellow">OriginTransform</span>, 직전에 배치된 슬롯은 <span class="notice-yellow">PreviousTransform</span>으로 보관한다. <span class="notice-yellow">IsPrevOriginal</span>은 원본에서 가져온 아이콘인지 슬롯 사이에서 옮기는 아이콘인지 구분한다.

## 구현 순서와 역할

```text
포인터 누름 → 드래그 Canvas로 이동 → 슬롯 OnDrop
  → 아이콘 데이터 복사·교환 → 슬롯 키 갱신
```

## 드래그 Canvas에서 좌표 계산

드래그를 시작하면 오브젝트의 부모를 <span class="notice-yellow">Draggable_Canvas</span>로 바꾸고 마지막 자식으로 배치한다. <span class="notice-yellow">CanvasGroup.alpha</span>를 0.6으로 낮추고 <span class="notice-yellow">blocksRaycasts</span>를 끈다. 이동 중인 아이콘 아래의 슬롯이 드롭 이벤트를 받을 수 있도록 하는 설정이다.

화면 좌표는 <span class="notice-yellow">ScreenPointToLocalPointInRectangle</span>로 드래그 Canvas의 로컬 좌표로 변환한다. Overlay Canvas에는 카메라로 <span class="notice-yellow">null</span>을 전달한다. 아이콘의 오프셋은 0이고, 팝업을 움직일 때는 눌렀던 지점과 팝업 위치의 차이를 더한다.

```csharp
public void OnDrag(PointerEventData eventData)
{
    if (_dragPlane != null && RectTransformUtility.ScreenPointToLocalPointInRectangle(
        _dragPlane, eventData.position, _dragCamera, out Vector2 pointerPoint))
    {
        rect.localPosition = (Vector3)pointerPoint + _pointerOffset;
    }
}
```

## 원본 복사와 슬롯 교환

<span class="notice-yellow">OnDrop</span>은 <span class="notice-yellow">ItemIcon_Prefab</span>을 대상으로 동작한다. 풀에서 아이콘을 빌린 다음 일반 아이템은 <span class="notice-yellow">UpdateItemData</span>, 스킬은 <span class="notice-yellow">UpdateSkillSOData</span>로 데이터를 넘긴다. 원본 아이콘은 원래 부모로 돌려놓고, 새 아이콘에 드래그 상태를 복사한다.

```csharp
ItemDataStorage copyTargetIDS = eventData.pointerDrag.GetComponentInChildren<ItemDataStorage>();
eITEMTYPE type = copyTargetIDS.GetItemType();
switch(type)
{
    case eITEMTYPE.SKILL:
        itemGO.GetComponentInChildren<ItemDataStorage>().UpdateSkillSOData(copyTargetIDS.GetSkillSO());
        break;
    default:
        itemGO.GetComponentInChildren<ItemDataStorage>().UpdateItemData(copyTargetIDS);
        break;
}
```

목적지 슬롯에 아이콘이 있으면 <span class="notice-yellow">IsPrevOriginal</span>로 처리 경로를 나눈다. 원본에서 새로 등록하는 경우 기존 슬롯 아이콘을 풀에 돌려준다. 다른 슬롯에서 옮기는 경우 목적지의 기존 아이콘을 <span class="notice-yellow">PreviousTransform</span>으로 보내 두 슬롯의 내용을 교환한다.

배치가 끝나면 <span class="notice-yellow">FixDropItem</span>으로 아이콘 크기와 위치를 맞춘다. 이어서 <span class="notice-yellow">EmptySlotKey</span>와 <span class="notice-yellow">SetSlotKey</span>를 호출해 화면 배치와 입력 키 등록을 함께 갱신한다. 슬롯 밖에 놓으면 <span class="notice-yellow">OnEndDrag</span>가 복귀와 <span class="notice-yellow">DropEvent</span> 정리를 처리한다.

## 스킬북에서 퀵 슬롯으로 등록

퀵 슬롯은 <span class="notice-yellow">SkillSO.handle</span>과 슬롯 번호를 연결한다. 스킬 아이콘에 저장한 SO 참조에서 핸들을 읽고 <span class="notice-yellow">UI_DisplayQuickSlots.AddKey</span>에 전달한다. 일반 아이템은 <span class="notice-yellow">ItemInfo</span>를 키로 전달한다.

```csharp
public override void SetSlotKey(ItemDataStorage ids)
{
    switch(ids.GetItemType())
    {
        case eITEMTYPE.SKILL:
            GetComponentInParent<UI_DisplayQuickSlots>()?.AddKey(ids.GetSkillSO().handle, _slotNO);
            break;
        default:
            GetComponentInChildren<UI_DisplayQuickSlots>()?.AddKey(ids.ItemInfo, _slotNO);
            break;
    }
}
```

## 퀵 슬롯 등록과 교환 결과

스킬북의 원본 아이콘을 유지하면서 퀵 슬롯에 스킬을 등록한다. 슬롯 사이의 교환은 아이콘 배치와 입력 키 연결을 함께 변경한다.

<div class="game-media-gallery" data-media-gallery>
<div class="game-media-gallery__grid">
<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/quickslot-swap.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quickslot-swap.webp' | relative_url }}" alt="퀵 슬롯에 등록한 아이콘의 위치를 교환하는 장면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>퀵 슬롯에 등록한 아이콘의 위치를 교환하는 장면</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/skill-quickslot.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/skill-quickslot.webp' | relative_url }}" alt="스킬북과 퀵 슬롯을 함께 표시한 등록 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>스킬북과 퀵 슬롯을 함께 표시한 등록 화면</figcaption>
</figure>
</div>
</div>

{% include game-video-embed.html id="efsC1hOnR6E" title="Drag and Drop Swap · 퀵 슬롯 사이의 아이콘 교환" %}

{% include game-video-embed.html id="jSHGNqbV-VE" title="Skill2QuickSlot · 스킬북에서 퀵 슬롯으로 등록" %}
