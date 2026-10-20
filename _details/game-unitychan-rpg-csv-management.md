---
layout: game-article
title: CSV 관리와 대화 노드 연결
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
game_order: 5
topic: 데이터와 표현
summary: DialogueNodes와 DialogueEdges를 읽어 대사 목록과 선택지의 다음 노드 연결을 구성했다.
tags:
- CSV
- 대화
- 데이터
permalink: /projects/unitychan-rpg/technical/csv-management/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 대화 데이터 분리의 목적과 노드 연결

대사와 선택지 연결을 코드의 조건문에 직접 작성하지 않고 표에서 관리한다. 하나의 대화 노드는 연속 대사를 담고, 연결 정보는 선택 이후 이동할 노드를 지정한다. 대사 내용과 이동 경로를 나누면 같은 노드에 여러 선택지를 연결할 수 있으며, 파서는 이벤트 이름과 NodeID를 기준으로 두 표를 결합한다.

## 대사와 연결을 두 표로 관리

대화 데이터는 <span class="notice-yellow">Assets/Resources/Data/CSV</span> 아래의 <span class="notice-yellow">DialogueNodes.csv</span>와 <span class="notice-yellow">DialogueEdges.csv</span>에 저장한다. Nodes는 대사와 연출을, Edges는 다음 노드와 선택지 정보를 담는다.

| 파일 | 주요 필드 | 사용하는 정보 |
| --- | --- | --- |
| DialogueNodes | EventName, SpeakerName, NodeID, IsBranch | 대화 묶음·화자·노드·분기 여부 |
| DialogueNodes | Animation, Script, DialogueEffect, EffectAmount | 애니메이션·대사·효과·수치 |
| DialogueEdges | EventName, FromNodeID, ToNodeID | 대화 묶음 안에서의 노드 연결 |
| DialogueEdges | ButtonLabel, Type | 선택지 문구와 응답 타입 |

<figure class="game-media-feature">
  <a href="{{ '/assets/images/projects/unitychan-rpg/dialogue-csv-tables.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/dialogue-csv-tables.webp' | relative_url }}" alt="DialogueNodes의 대사 표와 DialogueEdges의 선택지 연결 표" width="1920" height="942" loading="lazy"></a>
  <figcaption>DialogueNodes의 대사 표와 DialogueEdges의 선택지 연결 표</figcaption>
</figure>

## 구현 순서와 역할

```text
DialogueEdges → 이벤트·출발 노드별 연결 목록
DialogueNodes → 대사·연출 목록
  → NodeID로 결합 → 선택지와 다음 대사
```

## TextAsset을 읽어 이벤트별로 구성

<span class="notice-yellow">CSVDialogueParser</span>는 두 파일을 <span class="notice-yellow">Resources.Load&lt;TextAsset&gt;</span>로 읽는다. 줄바꿈을 LF로 통일하고 빈 행을 제외한다. 첫 행은 헤더이므로 인덱스 1부터 해석한다. 행의 열은 쉼표로 나눈다.

```csharp
TextAsset EdgeAsset = Resources.Load<TextAsset>("Data/CSV/" + _EdgeFileName);
TextAsset NodeAsset = Resources.Load<TextAsset>("Data/CSV/" + _NodeFileName);
Dictionary<string, Dialogues> DailogueDictionary = new Dictionary<string, Dialogues>();
if (NodeAsset == null || EdgeAsset == null)
{
    Debug.LogError("Dialogue CSV files not found.");
    return DailogueDictionary;
}
var Lines = EdgeAsset.text.Replace("\r\n", "\n").Replace("\r", "\n");
var EdgeRows = Lines.Split('\n', StringSplitOptions.RemoveEmptyEntries);
```

Edges는 <span class="notice-yellow">대화 이벤트 이름 → 출발 NodeID → 도착 NodeID와 EdgeData 목록</span>의 중첩 Dictionary로 구성한다. <span class="notice-yellow">EdgeData</span>에는 버튼 문구와 응답 타입을 보관한다. EventName이 비어 있는 다음 행들은 이전 이벤트 이름을 사용한다.

```csharp
int ToNodeID = int.Parse(EdgeRowElements[(int)DIALOGUE_EDGE.TO_NODEID].Trim());
    int FromNodeID = int.Parse(EdgeRowElements[(int)DIALOGUE_EDGE.FROM_NODEID].Trim());
    EdgeData NowEdgeData = new EdgeData();
    if(!EdgeDataDictionary[NowEventName].ContainsKey(FromNodeID))
        EdgeDataDictionary[NowEventName][FromNodeID] =new List<Tuple<int, EdgeData>>();
    NowEdgeData.ButtonLabel = EdgeRowElements[(int)DIALOGUE_EDGE.BUTTON_LABEL].Trim();
    NowEdgeData.myResponse = EdgeRowElements[(int)DIALOGUE_EDGE.MY_RESPONSE].Trim();
    EdgeDataDictionary[NowEventName][FromNodeID].Add(new Tuple<int,EdgeData> (ToNodeID, NowEdgeData ) );
```

## 연속 대사와 선택지 구성

Nodes에서 NodeID가 있는 행을 만나면 새 <span class="notice-yellow">Dialogue</span>를 만들고 <span class="notice-yellow">NodeIDToIndex</span>에 등록한다. 다음 NodeID가 나올 때까지 대사, 애니메이션, 효과 수치를 같은 객체의 목록에 넣는다. 대사 안의 작은따옴표는 쉼표로, <span class="notice-yellow">&amp;</span>는 줄바꿈으로 바꾼다.

```csharp
NowDialogue.Scripts.Add(NodeElements[(int)DIALOGUE_NODE.SCRIPT].ToString().Replace("'", ",").Replace("&","\n"));
NowDialogue.AnimationName.Add(NodeElements[(int)DIALOGUE_NODE.ANIMATION_NAME].ToString().Trim());
{
    isBranch = NodeElements[(int)DIALOGUE_NODE.IS_BRANCH].ToString().Trim() == "TRUE";
}
```

마지막으로 해당 NodeID의 Edge 목록을 읽어 <span class="notice-yellow">NextBranchNodeID</span>, <span class="notice-yellow">Labels</span>, <span class="notice-yellow">ResponseTypes</span>를 채운다. 대화 UI는 이 연결 정보를 사용해 선택지 버튼과 다음 대사를 표시한다.

CSV 파일의 저장 인코딩은 UTF-8 BOM을 사용한다. 헤더를 건너뛰는 파서는 본문 행을 그대로 읽고, Excel에서는 UTF-8 텍스트로 표를 열 수 있다.

## 대화 구성 결과와 입력 형식

파서는 대사 목록과 선택지의 목적지 ID를 하나의 대화 구조로 결합한다. 대화 UI는 노드의 대사를 순서대로 표시하고 선택지에 연결된 다음 노드로 이동한다.

열을 쉼표로 나누는 파서이므로 대사 안의 쉼표와 줄바꿈은 각각 작은따옴표와 &로 표기한다. 일반적인 CSV의 따옴표 이스케이프 처리와는 구분되는 입력 규칙이다.
