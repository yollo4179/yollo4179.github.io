---
layout: game-article
title: 상점 목록과 아이템 구매·판매
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
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

## 상점 거래의 목적과 데이터 연결

상점에서 상품을 고르고 수량을 입력해 인벤토리와 소지금에 거래를 반영한다. 판매 목록은 아이템 ID로 공통 정의를 조회하며, 개별 장비를 판매할 때는 소유한 장비 객체를 지정한다. 같은 종류의 장비라도 강화 상태가 다를 수 있으므로 상품의 정의와 소유 인스턴스를 구분한다.

## 판매 목록과 아이템 정의 연결

<span class="notice-yellow">ShopManager</span>는 상인별 <span class="notice-yellow">ShopInfo</span>를 보관한다. 첫 상점의 파일 경로는 <span class="notice-yellow">Application.persistentDataPath + "/ShopInfo.json"</span>이다. <span class="notice-yellow">LoadInfo</span>는 JSON을 <span class="notice-yellow">ShopInfo</span>로 역직렬화한다.

판매 목록의 ID는 <span class="notice-yellow">DataManager.GetItemData</span>로 아이템 정의와 연결한다. <span class="notice-yellow">ShopGridScrollView</span>가 선택한 종류에 맞는 셀을 만들고 아이콘과 아이템 정보를 표시한다. 상점의 장비·소비 아이템 버튼은 <span class="notice-yellow">Refresh</span>에 다른 아이템 타입을 전달한다.

## 구현 순서와 역할

```text
ShopInfo → 아이템 ID 조회 → 상품 셀 → 상품 선택
  → 거래 수량 확인 → 인벤토리 변경 → 소지금 변경
```

## 상품 선택과 거래 확인

<span class="notice-yellow">ShopDirector</span>는 선택한 셀의 <span class="notice-yellow">ItemID</span>와 <span class="notice-yellow">ItemInfo</span>를 <span class="notice-yellow">ConfirmTrade</span>에 전달한다. 구매는 <span class="notice-yellow">POLICY_BUY</span>, 수량을 입력하는 판매는 <span class="notice-yellow">POLICY_SELL</span>로 처리한다. 아이템 선택 시에는 상세 팝업을 열어 정의 데이터를 표시한다.

```csharp
_btnBuy.onClick.AddListener(() =>
{
    ShopGridCellView nowCellView = m_ShopGridScrollView.CurrentCellView;
    if (null ==nowCellView) { _textAdvice.text="구매할 상품을 선택해주세요."; return; }
    int itemID = nowCellView.ItemID;
    _confirmTrade.OnOpen().Refresh(itemID,nowCellView.ItemInfo ,eTRADEPOLICY.POLICY_BUY);
});
```

<span class="notice-yellow">ConfirmTrade</span>는 입력 문자열을 정수로 변환한다. 구매 수량이 양수이고 보유 금액이 <span class="notice-yellow">수량 × 가격</span> 이상이면 <span class="notice-yellow">_allowTobuy</span>를 설정한다. 거래 버튼은 이 플래그를 확인한 뒤 인벤토리에 아이템을 추가하고 금액을 차감한다.

```csharp
case eTRADEPOLICY.POLICY_BUY:
    if (false ==_allowTobuy) return;
    Managers.Inventory.TryAddItem(itemType, _itemID, _resultInt);
    Managers.Player.AddMoney(-money);
    break;
```

## 판매와 인벤토리 반영

장비 판매는 선택한 <span class="notice-yellow">ItemInfo</span> 한 개를 제거하고 정의 데이터의 가격을 더한다. 소비 아이템 등 수량형 거래는 확인 창의 입력 수량을 사용한다. 상품 정의는 ID로 조회하고, 소유한 장비 객체는 <span class="notice-yellow">ItemInfo</span>로 구분한다.

## 상점 거래 화면과 처리 범위

상품 상세 정보, 거래 수량 확인, 인벤토리 반영 화면을 구성했다. 구매 코드는 수량과 소지금을 확인한 뒤 아이템 추가와 금액 차감을 순서대로 호출한다. 다만 구매 코드는 <span class="notice-yellow">TryAddItem</span>의 반환값을 확인하지 않으므로, 아이템 추가 실패 시의 금액 차감 방지는 별도 처리가 필요하다.

<div class="game-media-gallery" data-media-gallery>
<div class="game-media-gallery__grid">
<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-item-detail.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-item-detail.webp' | relative_url }}" alt="상점에서 룬 소드의 상세 정보와 가격을 표시한 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>상점에서 룬 소드의 상세 정보와 가격을 표시한 화면</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-purchase-confirm.webp' | relative_url }}" alt="거래 확인 팝업에서 구매 수량을 입력하는 장면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>거래 확인 팝업에서 구매 수량을 입력하는 장면</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/shop-inventory.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/shop-inventory.webp' | relative_url }}" alt="상점 거래 후 인벤토리에 표시한 아이템" width="1920" height="1080" loading="lazy"></a>
  <figcaption>상점 거래 후 인벤토리에 표시한 아이템</figcaption>
</figure>
</div>
</div>
