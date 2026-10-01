---
layout: game-article
title: UI와 모델 데이터를 게임 런타임에 연결하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 8
topic: 애니메이션과 리소스
summary: UI 활성·표시 순서와 월드 UI 투영을 관리하고, 모델·애니메이션 데이터는 바이너리 읽기 경로로 조립한다.
tags:
- UI
- 바이너리
- 로딩
permalink: /projects/gunfire-reborn/technical/ui-model-data/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 문제와 구현

UI 매니저는 각 UI를 키로 등록하고 활성 상태와 Z 순서를 갱신한다. 월드 UI는 3D 위치를 화면 좌표로 투영한 뒤 카메라 시야 안에 들어올 때만 그린다. 버튼은 마우스 상태별 처리 함수를 배열에 연결해 `Up`, `On`, `Pressing` 등의 입력에 대응한다.

모델과 애니메이션은 가져온 FBX를 매번 직접 파싱하는 대신 필요한 데이터를 바이너리 파일로 읽는 경로를 구성했다. 맵·애니메이션 편집 도구와 로딩 스레드도 작업 범위에 포함된다. 무기 교체 동작은 전략 패턴으로 나누고, 객체 생성에는 프로토타입·팩토리 구조를 사용했다.

{% include game-local-video.html slug="gunfire-reborn" file="ui-interaction" title="NPC 상호작용과 무기 UI 열기·닫기" %}

## 데이터 로딩 경로

모델 로더의 `AI_Info`는 `CreateFile`과 `ReadFile`로 바이너리 파일을 읽는다. 정적 메시에서는 메시 수와 재질 인덱스, 정점의 위치·노멀·UV·탄젠트, 면 인덱스와 재질별 텍스처 경로를 읽는다. 애니메이션 메시에서는 뼈 오프셋과 가중치, 애니메이션의 채널·키 값을 추가로 읽어 모델 구조에 연결한다. 따라서 실행 경로의 모델 데이터는 FBX 텍스트를 매번 분석하는 방식과 다르다.

이 바이너리 형식은 필드 순서와 자료형 크기가 로더 코드에 묶여 있다. 모델 데이터를 다시 내보낼 때 로더가 기대하는 순서를 맞춰야 한다. UI는 이와 별도로 등록 키·활성 상태·Z 순서를 관리하고, 월드 UI는 카메라의 뷰·투영 결과가 화면 범위에 들어왔을 때 표시한다.


## 작업 단위로 나눈 비동기 로딩

`CLoader`는 리소스 등록 작업을 여러 `CAsyncLoader`에 나눠 전달한다. `CAsyncLoader::Begin_Thread()`는 `std::function<HRESULT()>`로 받은 작업을 저장하고 `_beginthreadex()`로 실행한다. 작업에는 모델·텍스처·게임 오브젝트의 프로토타입 등록이 포함된다.

각 작업은 실행을 마친 뒤 완료 상태를 표시한다. 상위 로더는 작업별 `isFinished()`를 검사하고 모든 작업이 끝나면 전체 로딩 완료 상태를 설정한다. 이 완료 표시는 작업 종료 여부이며, 개별 리소스 등록의 성공 여부까지 같은 뜻으로 해석해서는 안 된다.

리소스 바이너리는 읽을 데이터의 형식을 정하고, 비동기 로더는 등록 작업을 실행할 스레드를 나눈다. 파일 형식과 작업 실행 구조가 함께 로딩 과정에 연결된다.

{% include game-local-video.html slug="gunfire-reborn" file="async-loading" title="여러 실행 창에서 진행되는 메뉴 진입과 리소스 로딩 시연" %}
