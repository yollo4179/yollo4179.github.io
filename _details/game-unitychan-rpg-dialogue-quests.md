---
layout: game-article
title: 퀘스트·다이얼로그와 지역 방문 이벤트
project_slug: unitychan-rpg
game_portfolio: true
article_toc: true
game_order: 6
topic: UI와 상호작용
summary: 대화와 지역 방문 이벤트를 목표 평가기에 전달하고 완료 보상과 다음 퀘스트 활성화를 처리했다.
tags:
- 퀘스트
- 다이얼로그
- 이벤트
permalink: /projects/unitychan-rpg/technical/dialogue-quests/
nav_context: GAME PORTFOLIO / UNITYCHAN RPG
---

## 퀘스트 진행의 목적과 이벤트 기반 평가

대화에서 수락한 퀘스트가 처치·방문 등의 플레이 행동에 따라 진행되도록 한다. 퀘스트 정의는 목표와 보상을 보관하고, 런타임 객체는 수락 상태와 달성량을 보관한다. 목표 평가기는 관련 이벤트를 구독해 진행량을 변경하고, 목표 완료와 퀘스트 완료 조건을 차례로 검사한다.

## 대화에서 퀘스트 진행으로 연결

다이얼로그는 CSV의 대사와 선택지 연결을 읽어 표시한다. 퀘스트 정의는 <span class="notice-yellow">QuestData</span>, 진행 상태는 <span class="notice-yellow">QuestRuntimeProcess</span>와 <span class="notice-yellow">SubTaskRuntimeProcess</span>로 관리한다. 퀘스트 안의 목표는 대화, 장착, 소비, 지역 방문, 스킬 학습, 처치, 수집, 강화 타입으로 구분한다.

## 구현 순서와 역할

```text
퀘스트 수락 → 목표 이벤트 구독 → 진행량 갱신 → 다음 목표
  → 전체 목표 완료 → 보상 지급 → 완료 이벤트 → 다음 퀘스트 조건 평가
```

## 퀘스트 수락과 목표 평가기

<span class="notice-yellow">QuestManager.ActivateQuest</span>는 선행 조건과 <span class="notice-yellow">QUEST_READY</span> 상태를 검사한다. 수락하면 상태를 <span class="notice-yellow">QUEST_ACCEPTED</span>로 바꾸고 목표 진행 객체를 구성한다. <span class="notice-yellow">ReconcileTaskStates</span>가 처음으로 끝나지 않은 목표를 활성화하고 평가기의 이벤트 구독을 시작한다.

대화 목표의 <span class="notice-yellow">Task_TalkToNPC</span>는 NPC ID, 퀘스트 코드, 목표 코드, 목표 타입과 수락 상태를 검사한다. 조건이 맞으면 진행량을 증가시킨다. 목표가 끝나면 구독을 해제하고 다음 목표를 활성화한다.

```csharp
public void justCheckNowAndCheckNext()
{
    if (_subTaskRunTimeProcess._runTimeProcess.TaskState != eQuestTaskState.ACCEPTED) return;
    if (_goalAmount <= _subTaskRunTimeProcess._runTimeProcess.CurrentAmount)
    {
        _subTaskRunTimeProcess._runTimeProcess.TaskState = eQuestTaskState.COMPLETED;
        ReadyUnsubscribe();
        Managers.Quest.ActivateNextTask(_questtCode, _taskCode);
    }
    Managers.Event.Publish(new Event_TaskUpdated(_questtCode, _taskCode));
}
```

## 완료 처리와 보상 지급

<span class="notice-yellow">CheckAndCallCompleteEvent</span>는 모든 하위 목표의 완료 상태를 확인한다. 퀘스트를 완료 상태로 바꾸고 <span class="notice-yellow">QuestData.GiveReward</span>를 호출한 다음 <span class="notice-yellow">Event_QuestCompleted</span>를 발행한다. <span class="notice-yellow">GiveReward</span>는 아이템을 인벤토리에 추가하고 골드와 경험치를 플레이어에 전달한다.

```csharp
public void CheckAndCallCompleteEvent()
{
    if (_questRunTimeProcess._runtimeProcess.State != QUEST_STATE.QUEST_ACCEPTED) return;
    List<SubTask> subTasks = _questData.tasks;
    foreach (SubTask subTask in subTasks)
    {
        if (Managers.Quest.GetTaskRunTimeProcess(_questtCode, subTask.SubTaskCODE)
                ._runTimeProcess.TaskState != eQuestTaskState.COMPLETED)
            return;
    }
    foreach (SubTask subTask in subTasks)
        Managers.Quest.GetTaskRunTimeProcess(_questtCode, subTask.SubTaskCODE)
            ._taskEvaluator.ReadyUnsubscribe();
    _questRunTimeProcess._runtimeProcess.State = QUEST_STATE.QUEST_COMPLETED;
    var completed = new Event_QuestCompleted(_questtCode);
    _questData.GiveReward(completed);
    Managers.Event.Publish(completed);
}
```

<span class="notice-yellow">QuestManager</span>는 퀘스트 완료와 레벨 상승 이벤트를 구독한다. 이벤트를 받으면 <span class="notice-yellow">UpdateReadyQuests</span>가 선행 조건을 다시 평가한다. 조건을 충족한 퀘스트는 준비 상태가 되고 <span class="notice-yellow">useAutoAcception</span>이 켜져 있으면 수락까지 진행한다.

## 순찰 퀘스트의 지역 방문

<span class="notice-yellow">Task_VisitArea</span>는 수신한 지역 ID와 목표 ID가 같고 목표가 수락 상태일 때 진행량을 증가시킨다. 이후 공통 평가기의 목표 완료와 퀘스트 완료 검사를 호출한다. 대화와 지역 방문은 서로 다른 사건을 받지만 같은 목표 진행 구조를 사용한다.

지역 방문 이벤트를 받더라도 목표 지역이 다르거나 수락하지 않은 목표라면 진행량을 바꾸지 않는다. 평가기는 조건을 통과한 이벤트만 진행량에 반영한다.

```csharp
public void Execute(Event_EnterArea evt)
{
    if (null==evt) return;
    if (_targetID !=evt.AreaID) return;
    if (_subTaskRunTimeProcess._runTimeProcess.TaskState != eQuestTaskState.ACCEPTED) return;

    ++_subTaskRunTimeProcess._runTimeProcess.CurrentAmount;
    justCheckNowAndCheckNext();
    CheckAndCallCompleteEvent();
}
```

## 진행 상태별 퀘스트 목록

퀘스트 UI의 목록은 <span class="notice-yellow">GetReadyQuests</span>, <span class="notice-yellow">GetOnQuests</span>, <span class="notice-yellow">GetCompletedQuests</span>로 나눈다. 각 메서드는 런타임 객체의 상태를 기준으로 준비·진행·완료 목록을 반환한다.

```csharp
public List<QuestRuntimeProcess> GetReadyQuests()
{
    return _questRunTimeProcesses.Values.Where(x => x._runtimeProcess.State == QUEST_STATE.QUEST_READY).ToList();
}
public List<QuestRuntimeProcess>GetCompletedQuests()
{
    return _questRunTimeProcesses.Values.Where(x => x._runtimeProcess.State == QUEST_STATE.QUEST_COMPLETED).ToList();
}
public List<QuestRuntimeProcess>GetOnQuests()
{
    return _questRunTimeProcesses.Values.Where(x => x._runtimeProcess.State == QUEST_STATE.QUEST_ACCEPTED).ToList();
}
```

## 대화와 퀘스트 진행 결과

대화에서 퀘스트를 수락한 뒤 목표를 진행하고 완료 보상을 받는다. 퀘스트 UI는 수락 가능·진행 중·완료 목록을 나누어 표시한다.

<div class="game-media-gallery" data-media-gallery>
<div class="game-media-gallery__grid">
<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-ready.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-ready.webp' | relative_url }}" alt="퀘스트 UI의 수락 가능한 목록" width="1920" height="1080" loading="lazy"></a>
  <figcaption>퀘스트 UI의 수락 가능한 목록</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-in-progress.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-in-progress.webp' | relative_url }}" alt="퀘스트 UI의 진행 중인 목표 목록" width="1920" height="1080" loading="lazy"></a>
  <figcaption>퀘스트 UI의 진행 중인 목표 목록</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-completed.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-completed.webp' | relative_url }}" alt="퀘스트 UI의 완료 목록" width="1920" height="1080" loading="lazy"></a>
  <figcaption>퀘스트 UI의 완료 목록</figcaption>
</figure>

<figure>
  <a href="{{ '/assets/images/projects/unitychan-rpg/quest-dialogue-gameplay.webp' | relative_url }}"><img src="{{ '/assets/images/projects/unitychan-rpg/quest-dialogue-gameplay.webp' | relative_url }}" alt="NPC 대화와 퀘스트 진행을 연결한 플레이 화면" width="1920" height="1080" loading="lazy"></a>
  <figcaption>NPC 대화와 퀘스트 진행을 연결한 플레이 화면</figcaption>
</figure>
</div>
</div>

{% include game-video-embed.html id="GEVGb2bt7bU" title="Quest And Dialogue · 대화, 보상 지급과 퀘스트 진행" %}

{% include game-video-embed.html id="a67ecsEgQEM" title="Patrol Event By Quest · 순찰 지역 방문과 목표 진행" %}
