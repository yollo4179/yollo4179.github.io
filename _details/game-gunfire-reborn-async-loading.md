---
layout: game-article
title: 작업 함수와 스레드로 리소스 로딩 나누기
project_slug: gunfire-reborn
game_portfolio: true
article_toc: true
game_order: 13
topic: 애니메이션과 리소스
summary: 리소스 등록 함수를 여러 로더에 전달하고 작업별 스레드와 완료 플래그로 로딩을 구성한다.
tags:
- UI
- 바이너리
- 로딩
permalink: /projects/gunfire-reborn/technical/async-loading/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 로딩 분리의 목적과 작업 완료 확인

모델·텍스처·게임 오브젝트 등록을 작업 단위로 나누어 각각의 스레드에서 실행한다. 로더는 구체적인 리소스 종류 대신 호출 가능한 작업 함수를 전달받고, 상위 로더는 개별 작업의 완료 상태를 모아 전체 로딩 완료를 판단한다. 작업을 실행하는 구조와 어떤 리소스를 등록할지 정하는 코드를 분리하는 방식이다.

## 구현 순서와 역할

리소스 등록 작업을 함수로 전달 → 작업별 스레드 시작 → 함수 실행 → 완료 플래그 검사 → 전체 로딩 완료.

## 등록 작업을 함수 객체로 전달

<span class="notice-yellow">CLoader</span>는 모델·텍스처·게임 오브젝트 등록을 람다로 묶어 여러 로더에 전달한다. <span class="notice-yellow">Begin_Thread()</span>는 전달받은 <span class="notice-yellow">std::function&lt;HRESULT()&gt;</span>를 저장하고 <span class="notice-yellow">_beginthreadex()</span>로 실행 진입점을 시작한다.

```cpp
HRESULT CAsyncLoader::Begin_Thread(std::function<HRESULT()> pEntryPoint)
{
    m_pFunction = std::bind(pEntryPoint);
    InitializeCriticalSection(&m_CriticalSection);
    m_hThread = (HANDLE)_beginthreadex(nullptr, 0, ALoadingMain, this, 0, nullptr);
    if (0 == m_hThread)
        return E_FAIL;
    return S_OK;
}
```

## 스레드 진입점에서 로딩 실행

진입점은 전달받은 로더의 <span class="notice-yellow">Loading()</span>을 호출한다. 로딩 함수가 리소스 등록 작업을 수행하고, 상위 로더는 각 작업의 <span class="notice-yellow">isFinished()</span>를 검사해 전체 완료 상태를 설정한다. 작업 함수의 반환값과 작업 종료 표시는 각각 <span class="notice-yellow">HRESULT</span>와 완료 플래그로 표현한다.

```cpp
_uint APIENTRY ALoadingMain(void* pArg)
{
    CAsyncLoader* pLoader = static_cast<CAsyncLoader*>(pArg);
    if (FAILED(pLoader->Loading())) {
        return 1;
    }
    return 0;
}
```

모델 파일의 기록·읽기 순서는 [모델 바이너리]({{ '/projects/gunfire-reborn/technical/model-binary/' | relative_url }})에서 다룬다.

## 작업별 리소스 로딩 결과

모델·텍스처·게임 오브젝트 등록 작업을 여러 로더에 전달하고 작업별 완료 상태로 전체 로딩 상태를 구성한다. 개별 작업의 실행은 작업별 스레드가 담당하고, 전체 로딩의 완료 판단은 상위 로더가 담당한다.

{% include game-local-video.html slug="gunfire-reborn" file="async-loading" title="작업 단위로 나눈 리소스 로딩 시연" %}
