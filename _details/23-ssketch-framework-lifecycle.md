---
layout: ssketch-article
ssketch_styles: true
featured: true
project_slug: ssketch
number: '09'
order: 9
learning_order: 9
title: 공통 서비스와 씬 객체의 수명을 나눈 클라이언트 구조
short_title: 앱과 씬의 수명 관리
short_category: 클라이언트 프레임워크
series_category: Client Framework
detail_category: 게임 클라이언트
permalink: /projects/ssketch/technical/framework-lifecycle/
summary: 앱 전체에서 유지할 서비스와 씬에서 생성·정리할 객체를 구분했다. 공통 서비스의 조립과 보관을 나누고 씬 진입점에서 필요한 객체를 연결했다.
result_label: 서비스 조립 · 앱과 씬 수명 분리
tags: [Architecture, Unity, Singleton, DependencyInjection]
nav_context: projects
---

## 공통 서비스와 씬 객체의 수명은 다르다

로그인 정보, 통신, 방 상태, UI 관리 기능은 씬 전환 이후에도 필요하다. 캐릭터, 씬의 UI, 카메라 연결과 이벤트 구독은 해당 씬이 끝나면 정리해야 한다. 이 두 수명을 구분하고, 객체를 만들고 정리할 주체를 정했다.

## 프레임워크 디렉터리 구조

아래는 클라이언트의 주요 디렉터리와 대표 파일이다.

```text
Client/Assets/
├─ Game/                    # 프로젝트 코드와 자체 구성 자산
├─ ThirdParty/              # 외부 에셋
└─ ThirdPartyUsed/          # 사용 외부 에셋
```

프로젝트 코드와 외부 에셋을 별도 디렉터리로 구분했다. Game 내부의 주요 구조는 다음과 같다.

```text
Client/Assets/Game/
├─ App/
│  └─ Runtime/
│     ├─ Bootstrap/
│     │  ├─ GameInstance.cs
│     │  ├─ AppCompositionRoot.cs
│     │  └─ AppServices.cs
│     └─ EntryPoints/
│        ├─ MainMenuEntryPoint.cs
│        ├─ WaitingRoomEntryPoint.cs
│        ├─ LoadingSceneEntryPoint.cs
│        └─ InGameEntryPoint.cs
├─ Core/
│  └─ StateMachines/
├─ Infrastructure/
│  ├─ AssetManagement/
│  │  ├─ AssetManager.cs
│  │  ├─ PrefabFactory.cs
│  │  ├─ Catalogs/
│  │  └─ Pooling/
│  ├─ SceneLoading/
│  ├─ Input/
│  └─ Network/
├─ Features/
│  ├─ Room/
│  ├─ Match/
│  ├─ Player/
│  └─ PlayerMovement/
└─ UI/
   └─ Runtime/Core/
      ├─ Base/
      ├─ Layers/
      └─ Management/
```

| 영역 | 책임 |
| --- | --- |
| App | 앱 초기화, 서비스 연결, 씬 진입·종료 처리 |
| Core | 캐릭터 상태 계약과 공통 상태 머신 |
| Infrastructure | 자산 접근, 객체 생성·풀링, 씬 로딩, 입력과 통신 기반 |
| Features | 방, 게임 진행, 캐릭터와 이동 등 기능별 상태와 동작 |
| UI | 화면의 공통 수명과 표시 계층 관리 |

## 조립과 보관을 분리했다

```text
GameInstance
  → AppCompositionRoot에서 서비스 조립
  → AppServices에 서비스 참조 보관
  → 씬 EntryPoint에서 씬 객체와 연결
```

| 구성 요소 | 맡은 일 |
| --- | --- |
| GameInstance | 공통 진입점, 초기화, 프레임 갱신, 앱 종료 |
| AppCompositionRoot | 의존 관계에 맞춰 서비스를 만들고 생성자로 연결 |
| AppServices | 공통 서비스 참조 보관과 종료 관리 |
| 씬 EntryPoint | UI 등록, 캐릭터·카메라 연결, 씬 구독과 풀 범위 정리 |

GameInstance에는 <span class="notice-pink">싱글턴</span>을 적용했다. 중복 인스턴스를 제거하고 씬 전환 후에도 유지한다. 초기화 가드는 초기화 중 재접근으로 서비스가 중복 생성되는 것을 막는다.

서비스 조립부는 필요한 객체를 생성자로 전달한다. **어떤 서비스가 무엇에 의존하는지 조립 코드에 드러나는 수동 의존성 주입 구조**다. 일부 서비스는 서비스 컨테이너의 생성자에서도 생성한다.

GameInstance가 서비스를 조회하는 진입점이고 AppServices가 서비스 참조를 보관한다. 두 객체는 개별 서비스와 동일한 인터페이스로 요청을 대신 처리하는 프록시 구조로 구성하지 않았다.

## 씬 진입점이 씬의 연결과 정리를 맡는다

게임 씬 진입점은 풀 범위를 만들고 캐릭터를 대여한 뒤 카메라와 게임 기능을 연결한다. 씬 종료 시 진입점이 이벤트 구독과 전환 작업을 정리하고, 캐릭터를 반납한 뒤 풀 범위를 종료한다.

```text
씬 진입
  → 씬 UI 등록
  → 풀 범위 생성과 캐릭터 대여
  → 기능 연결과 이벤트 구독

씬 종료
  → 구독과 전환 작업 정리
  → 씬 UI 등록 해제
  → 캐릭터 반납과 풀 범위 종료
```

앱 종료와 씬 파괴 순서는 달라질 수 있다. 씬 진입점은 풀 범위가 이미 종료됐는지 확인해 정리한다. 앱 종료 시 서비스 컨테이너는 남은 서비스와 풀을 정리한다.

## 씬 전환은 로딩 기능과 나눴다

```text
Infrastructure/SceneLoading/
├─ ISceneLoader.cs
├─ UnitySceneLoader.cs
├─ SceneFlowManager.cs
└─ SceneCatalog.cs
```

씬 전환 관리자는 목적 씬과 전환 진행 상태를 보관한다. 실제 Unity 로딩 API는 Loader 구현이 맡는다. Loading 씬을 거쳐 목적 씬을 비동기로 로딩하고 진행률을 전달한 뒤 활성화한다. 전환 중 중복 요청을 받으면 다시 전환하지 않는다.

## Vivox 음성 채팅을 방과 로그인 수명에 연결했다

Vivox 음성 채팅을 연동하고, 음성 서비스가 게임 로그인과 방 상태 변경을 구독하도록 구성했다. 게임 서버 로그인 이후 플레이어 ID로 음성 로그인을 진행하고, 방 ID에 대응하는 음성 채널에 참가한다.

```text
게임 로그인
  → Vivox 초기화·로그인
  → 방 입장
  → room_ + 방 ID에 대응하는 음성 채널 참가
  → 방 이탈 시 채널 퇴장
  → 게임 로그아웃 시 음성 로그아웃
```

| 구성 | 책임 |
| --- | --- |
| VoiceChatService | 로그인·방 변경과 음성 연결 수명 조정 |
| VivoxSdkGateway | Vivox SDK 호출과 참가자 이벤트 변환 |
| VoiceChatSnapshot | 음성 연결 상태, 채널, 마이크 음소거 상태 전달 |
| VoiceParticipantSnapshot | 참가자 ID, 발언·음소거 상태 전달 |
| UI_RoomVoice | 음성 상태와 방 참가자 표시 |

```text
Client/Assets/Game/
├─ Features/VoiceChat/Runtime/
│  ├─ VoiceChatService.cs
│  ├─ VivoxSdkGateway.cs
│  └─ VoiceChatContracts.cs
└─ UI/Derived/
   ├─ UI_RoomVoice.cs
   └─ UI_RoomVoiceAccountRow.cs
```

음성 서비스는 비동기 로그인과 채널 전환을 한 번에 하나씩 진행하도록 조정한다. 같은 방 채널에 이미 참가했다면 다시 입장하지 않고, 다른 방으로 이동할 때는 기존 채널에서 나온 뒤 새 채널로 들어간다.

음성 서비스는 앱 수명으로 유지되므로 대기실에서 게임 씬으로 이동하는 것만으로 방 채널을 종료하지 않는다. 방 이탈은 채널을 정리하고, 서비스 종료는 로그인·방·SDK 이벤트 구독을 해제하고 진행 중 작업을 취소한다.

SDK의 참가자 정보는 게임에서 사용하는 상태 객체로 변환한다. 화면은 이 상태와 변경 이벤트를 사용해 표시하고, 마이크 음소거 요청은 음성 서비스를 통해 SDK에 전달한다.

### 음성 입력의 배경음 유입은 해결 과제로 남았다

상대방 마이크를 통해 배경 음악이 함께 들리는 문제가 있다. 음성 입력의 에코 제거·노이즈 억제·자동 게인 제어는 적용하지 않았으며, 다음 개선 과제로 정리했다.

| 개선 항목 | 목적 |
| --- | --- |
| AEC — 에코 제거 | 각 참가자의 스피커 재생음이 자신의 마이크로 다시 들어가 상대에게 되돌아가는 에코 감소 |
| Noise Suppression — 노이즈 억제 | 마이크에 섞이는 지속적인 배경 소음 감소 |
| AGC — 자동 게인 제어 | 참가자마다 다른 마이크 입력 음량 자동 조절 |

배경 음악 유입은 노이즈 억제를 우선 적용할 과제다. 음악은 음성과 섞여 들어올 수 있으므로 노이즈 억제로 완전히 제거된다고 전제하지 않는다. 에코 제거와 입력 음량 조절도 함께 조정하되, 말소리 손상 여부를 확인하며 적용한다.

## 구조를 나눈 결과

공통 객체의 조립은 조립부에, 앱 전체의 서비스 참조와 종료는 컨테이너에 모았다. 씬 진입점은 씬에서 사용하는 객체의 연결과 정리를 맡는다. **객체의 수명이 끝나는 시점과 정리 주체를 함께 정의한 구조**다.

자산·풀 범위 구성은 [프리팹 조회·생성·재사용]({{ '/projects/ssketch/technical/framework-assets-pooling/' | relative_url }})에서, 메시지와 구독 전달은 [이벤트 전달 구조]({{ '/projects/ssketch/technical/event-delivery/' | relative_url }})에서 이어서 설명한다.
