---
layout: game-article
title: UI 관리와 팝업 z-order
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
game_order: 2
topic: UI와 상호작용
summary: 팝업 스택과 Canvas.sortingOrder를 연결하고 클릭 포커스와 드래그 상대 좌표를 관리했다.
tags:
- UI
- Canvas
- z-order
permalink: /projects/unitychan-rpg/technical/ui-management/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 팝업 관리의 목적과 표시 순서

여러 창을 함께 열어도 플레이어가 선택한 창을 앞에서 조작할 수 있도록 한다. 팝업의 표시 순서는 Canvas 정렬값으로 관리하고, 클릭한 팝업을 열린 목록의 마지막으로 옮겨 정렬값을 다시 부여한다. UI를 조작하는 동안에는 UI 포커스를 확인해 공격 입력을 제한한다.

## UI 객체와 열린 순서 관리

<span class="notice-yellow">UIManager</span>는 <span class="notice-yellow">@UI_Root</span> 아래에 UI를 배치한다. <span class="notice-yellow">_cachedUIObjects</span>에는 이름으로 다시 찾을 UI를, <span class="notice-yellow">_openUIObjects</span>에는 열린 UI를 등록한다. 팝업의 앞뒤 순서는 <span class="notice-yellow">Stack&lt;UI_Popup&gt;</span>에 보관한다.

<span class="notice-yellow">ShowPopupUI</span>는 풀에서 팝업을 가져와 열린 목록과 스택에 추가한다. 팝업의 Canvas에 <span class="notice-yellow">_zOrder</span>를 할당한 뒤 값을 증가시킨다. 순서 기준은 enum으로 구분한다.

```csharp
public enum UI_SortOrder
{
    WorldUIBase =0,
    SceneUIBase = 1,
    PopUpUIBase =10,
    DraggableUIBase =1000
}
```

## 구현 순서와 역할

```text
팝업 열기 → 열린 UI 등록 → 스택 Push → sortingOrder 할당
팝업 클릭 → Raycast 판정 → 스택 재배치 → 최상단 Canvas 순서 반영
```

## 클릭한 팝업을 가장 앞으로 이동

<span class="notice-yellow">UpdateInputFocus</span>는 한 프레임의 왼쪽 클릭을 한 번 판정한다. <span class="notice-yellow">EventSystem.RaycastAll</span> 결과 중 첫 <span class="notice-yellow">GraphicRaycaster</span> 결과에서 부모 <span class="notice-yellow">UI_Popup</span>을 찾는다. 팝업을 클릭하면 <span class="notice-yellow">BringPopupToFront</span>를 호출한다. 드래그 컴포넌트의 <span class="notice-yellow">OnPointerDown</span>도 같은 메서드를 사용한다.

```csharp
public void OnPointerDown(PointerEventData eventData)
{
    if (eventData.button == PointerEventData.InputButton.Left)
        Managers.UI.BringPopupToFront(GetComponentInParent<UI_Popup>());
}
```

<span class="notice-yellow">BringPopupToFront</span>는 선택한 팝업을 제외하고 기존 팝업을 아래부터 다시 쌓는다. <span class="notice-yellow">sortingOrder</span>를 <span class="notice-yellow">PopUpUIBase</span>부터 순서대로 할당한 다음 선택한 팝업에 가장 큰 값을 지정한다. 마지막으로 스택의 맨 위와 형제 순서의 마지막에 배치한다.

```csharp
public void BringPopupToFront(UI_Popup popup)
{
    if (popup == null || !popup.gameObject.activeInHierarchy || !_popupStack.Contains(popup)) return;
    _focusedPopup = popup;
    if (_popupStack.Peek() == popup) return;
    UI_Popup[] popups = _popupStack.ToArray();
    _popupStack.Clear();
    _zOrder = (int)UI_SortOrder.PopUpUIBase;
    for (int i = popups.Length - 1; i >= 0; i--)
    {
        UI_Popup current = popups[i];
        if (current == null || current == popup) continue;
        current.GetComponent<UnityEngine.Canvas>().sortingOrder = _zOrder++;
        _popupStack.Push(current);
    }
    popup.GetComponent<UnityEngine.Canvas>().sortingOrder = _zOrder++;
    _popupStack.Push(popup);
    popup.transform.SetAsLastSibling();
}
```

## 마우스와 팝업 사이의 상대 위치 유지

팝업은 드래그 시작 지점과 RectTransform 위치의 차이를 <span class="notice-yellow">_pointerOffset</span>에 저장한다. 드래그 중에는 변환한 포인터 위치에 이 차이를 더한다. 따라서 제목 표시줄의 어느 지점을 잡았는지에 따라 팝업과 마우스의 상대 위치가 유지된다.

```csharp
public void OnBeginDrag(PointerEventData eventData)
{
    Canvas dragCanvas = Managers.UI.GetCachedUIByName("Draggable_Canvas").GetComponentInParent<Canvas>();
    canvas = dragCanvas.transform;
    _dragPlane = canvas as RectTransform;
    _dragCamera = dragCanvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : dragCanvas.worldCamera;
    Managers.UI.SetDragging(this, true);
    transform.SetParent(canvas);
    transform.SetAsLastSibling();
    canvasGroup.alpha= 0.6F;
    canvasGroup.blocksRaycasts = false;
    _pointerOffset = Vector3.zero;
    if (_isPopupUI && RectTransformUtility.ScreenPointToLocalPointInRectangle(
        _dragPlane, eventData.pressPosition, _dragCamera, out Vector2 pressPoint))
    {
        _pointerOffset = rect.localPosition - (Vector3)pressPoint;
    }
    OnDrag(eventData);
}
```

드래그가 끝나면 팝업을 원래 부모로 옮기고 투명도와 Raycast 설정을 복원한다. <span class="notice-yellow">BringPopupToFront</span>를 다시 호출해 팝업 스택의 순서도 맞춘다.

## UI 포커스와 게임 입력

<span class="notice-yellow">_activeDrags</span>는 진행 중인 드래그를 집합으로 보관한다. <span class="notice-yellow">BlocksGameplayInput</span>, <span class="notice-yellow">BlocksAttackInput</span>, <span class="notice-yellow">BlocksCameraInput</span>은 모달 팝업, 포커스, 드래그, 텍스트 입력 여부를 조합한다. UI에서 시작한 왼쪽 클릭은 버튼을 놓을 때까지 소비하도록 기록한다.

```csharp
public bool BlocksAttackInput
{
    get
    {
        UpdateInputFocus();
        return HasModalPopup || IsFocusedPopupActive || IsDragging ||
            HasTextInputFocus() || _consumeLeftClickUntilRelease;
    }
}
```

## 팝업 표시 결과

상점, 아이템 상세, 거래 확인 창을 함께 표시한다. 각 팝업의 열림 상태와 정렬 순서를 관리하고 클릭한 창을 앞으로 이동시킨다.

<div class="game-media-gallery" data-media-gallery>
<div class="game-media-gallery__grid">
<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}" alt="상점·아이템 상세·거래 확인 팝업이 함께 열린 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>상점·아이템 상세·거래 확인 팝업이 함께 열린 화면</figcaption>
</figure>
</div>
</div>
