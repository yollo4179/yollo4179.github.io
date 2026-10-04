---
layout: game-article
title: UI 태그 등록과 팝업 Z 순서·이벤트 관리
project_slug: gunfire-reborn
game_portfolio: true
game_order: 11
topic: 애니메이션과 리소스
summary: UI 매니저가 활성 상태와 팝업 깊이를 관리하고, UI 객체가 입력 상태에 연결된 콜백을 실행한다.
tags:
- UI
- 바이너리
- 로딩
permalink: /projects/gunfire-reborn/technical/ui-model-data/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 구현 구조

```text
Engine/Private/UI_Manager.cpp
Engine/Private/UIObject.cpp
```

태그로 UI 등록 → 활성화와 팝업 깊이 갱신 → 깊이 순서 정리 → UI 상태별 이벤트 실행.


## 팝업 활성화와 Z 순서

UI 매니저는 태그로 객체를 찾고 활성화한다. 팝업은 현재 최대 깊이에 1을 더한 값을 받아 다른 팝업보다 앞쪽 순서로 이동한다. 고정 UI는 등록 시 깊이 10을 사용한다.

`Engine/Private/UI_Manager.cpp` 발췌

```cpp
HRESULT CUI_Manager::Set_Active_A_UI(const _wstring UI_Tag)
{
    CUIObject* pInstance = { nullptr };
    if (nullptr == (pInstance =Find_UIObject(UI_Tag)) )
    {
        MSG_BOX("There's no UI you named like that");
    }
    pInstance->Set_Active();
    if (UI_TYPE::UI_POP == pInstance->Get_Type())
    {
        pInstance->Set_SortDepth(++m_iMaxPopUpUIDepth);
    }
    return S_OK;
}
```

## 팝업 깊이를 연속된 값으로 정리

`Update_UIs()`는 깊이가 작은 UI부터 꺼내는 우선순위 큐를 만든다. 팝업의 상대 순서를 유지하면서 최소 팝업 깊이부터 번호를 다시 부여하고 최대 깊이를 갱신한다.

`Engine/Private/UI_Manager.cpp` 발췌

```cpp
void CUI_Manager::Update_UIs()
{
    _uint m_iCurIndex = m_iMinPopUpUIDepth;
    priority_queue< pair< _uint, CUIObject*> , vector<pair<_uint,CUIObject*>> , greater<pair<_uint, CUIObject*>>> pq;
    for (auto iter = m_mapUIs.begin(); iter != m_mapUIs.end(); ++iter)
    {
        pq.push({ iter->second->Get_SortDepth(), iter->second });
    }
    while (!pq.empty())
    {
        pair<_uint, CUIObject*> pObjectInfo =pq.top();
        if(pObjectInfo.second->Get_Type() == UI_TYPE::UI_POP)
        {
            if (pObjectInfo.first != m_iCurIndex)
            {
                pObjectInfo.second->Set_SortDepth(m_iCurIndex);
            }
            ++m_iCurIndex;
        }
        pq.pop();
    }
    if(m_iMinPopUpUIDepth != m_iCurIndex)
    m_iMaxPopUpUIDepth = m_iCurIndex - 1;
}
```

## 입력 상태와 콜백 연결

`CUIObject`는 마우스 좌표와 UI 사각형의 포함 여부를 검사한다. `Update_Event()`는 UI 상태에 해당하는 함수가 등록돼 있으면 호출한다. 버튼의 이벤트 동작을 상태별 함수 배열에 연결하는 구조다.

`Engine/Private/UIObject.cpp` 발췌

```cpp
void CUIObject::Update_Event()
{
    for (_uint i = 0; i < (_uint)UI_STATE::STATE_END; ++i)
    {
        if (i == (_uint)m_eUIState)
        {
            if (nullptr!=m_EventFunction[i])
            {
                m_EventFunction[(_uint)m_eUIState]();
            }
        }
    }
}
```

{% include game-local-video.html slug="gunfire-reborn" file="ui-interaction" title="NPC 상호작용과 무기 UI 열기·닫기" %}
