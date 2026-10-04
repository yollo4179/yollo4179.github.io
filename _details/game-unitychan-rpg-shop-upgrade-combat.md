---
layout: game-article
title: 상점 목록과 아이템 구매·판매
project_slug: unitychan-rpg
game_portfolio: true
game_order: 7
topic: UI와 상호작용
summary: ShopInfo의 판매 목록을 아이템 정의와 연결하고 거래 확인 UI에서 수량과 금액을 처리했다.
tags:
- 상점
- JSON
- 인벤토리
permalink: /projects/unitychan-rpg/technical/shop-upgrade-combat/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 판매 목록과 아이템 정의 연결

`ShopManager`는 상인별 `ShopInfo`를 보관한다. 첫 상점의 파일 경로는 `Application.persistentDataPath + "/ShopInfo.json"`이다. `LoadInfo`는 JSON을 `ShopInfo`로 역직렬화한다.

판매 목록의 ID는 `DataManager.GetItemData`로 아이템 정의와 연결한다. `ShopGridScrollView`가 선택한 종류에 맞는 셀을 만들고 아이콘과 아이템 정보를 표시한다. 상점의 장비·소비 아이템 버튼은 `Refresh`에 다른 아이템 타입을 전달한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-item-detail.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-item-detail.webp' | relative_url }}" alt="상점에서 룬 소드의 상세 정보와 가격을 표시한 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>상점에서 룬 소드의 상세 정보와 가격을 표시한 화면</figcaption>
</figure>

## 디렉터리와 실행 흐름

```text
Assets/04.Scripts/
├─ Managers/Shop/ShopManager.cs
├─ UI/Shop/ShopDirector.cs
├─ UI/Shop/ShopGridScrollView.cs
└─ UI/ConfirmMassage/ConfirmTrade.cs
```

```text
ShopInfo → 아이템 ID 조회 → 상품 셀 → 상품 선택
  → 거래 수량 확인 → 인벤토리 변경 → 소지금 변경
```

## 상품 선택과 거래 확인

`ShopDirector`는 선택한 셀의 `ItemID`와 `ItemInfo`를 `ConfirmTrade`에 전달한다. 구매는 `POLICY_BUY`, 수량을 입력하는 판매는 `POLICY_SELL`로 처리한다. 아이템 선택 시에는 상세 팝업을 열어 정의 데이터를 표시한다.

`Assets/04.Scripts/UI/Shop/ShopDirector.cs` 발췌

```csharp
_btnBuy.onClick.AddListener(() =>
{
    ShopGridCellView nowCellView = m_ShopGridScrollView.CurrentCellView;
    if (null ==nowCellView) { _textAdvice.text="구매할 상품을 선택해주세요."; return; }
    int itemID = nowCellView.ItemID;
    _confirmTrade.OnOpen().Refresh(itemID,nowCellView.ItemInfo ,eTRADEPOLICY.POLICY_BUY);
});
```

`ConfirmTrade`는 입력 문자열을 정수로 변환한다. 구매 수량이 양수이고 보유 금액이 `수량 × 가격` 이상이면 `_allowTobuy`를 설정한다. 거래 버튼은 이 플래그를 확인한 뒤 인벤토리에 아이템을 추가하고 금액을 차감한다.

`Assets/04.Scripts/UI/ConfirmMassage/ConfirmTrade.cs` 발췌

```csharp
case eTRADEPOLICY.POLICY_BUY:
    if (false ==_allowTobuy) return;
    Managers.Inventory.TryAddItem(itemType, _itemID, _resultInt);
    Managers.Player.AddMoney(-money);
    break;
```

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}" alt="거래 확인 팝업에서 구매 수량을 입력하는 장면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>거래 확인 팝업에서 구매 수량을 입력하는 장면</figcaption>
</figure>

## 판매와 인벤토리 반영

장비 판매는 선택한 `ItemInfo` 한 개를 제거하고 정의 데이터의 가격을 더한다. 소비 아이템 등 수량형 거래는 확인 창의 입력 수량을 사용한다. 상품 정의는 ID로 조회하고, 소유한 장비 객체는 `ItemInfo`로 구분한다.

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-inventory.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-inventory.webp' | relative_url }}" alt="상점 거래 후 인벤토리에 표시한 아이템" width="1920" height="1080" loading="lazy"></a>
  <figcaption>상점 거래 후 인벤토리에 표시한 아이템</figcaption>
</figure>
