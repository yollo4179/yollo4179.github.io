# SSketch 디자인 패턴과 프레임워크 구조

분석 대상: `C:\ssafy\S15P21D204`의 Unity 클라이언트와 C++ 서버 소스. 아래 근거 경로는 해당 저장소 기준이다. 문서는 구현 구조를 설명하며, 클래스의 존재만으로 개인의 담당 범위를 판단하지 않는다.

## 적용 상황별 문서

공개 상세 글은 연결된 구조끼리 다음 네 편으로 묶는다.

| 공개 글 | 원고 |
| --- | --- |
| 공통 서비스와 씬 객체의 수명 | [framework-lifecycle](../../_details/23-ssketch-framework-lifecycle.md) |
| 프리팹 조회·생성·재사용 | [framework-assets-pooling](../../_details/24-ssketch-framework-assets-pooling.md) |
| UI 표시 순서와 공통 수명 | [framework-ui](../../_details/25-ssketch-framework-ui.md) |
| 캐릭터·애니메이션·카메라 | [framework-character-camera](../../_details/26-ssketch-framework-character-camera.md) |

## 주요 디렉터리 구조

```text
Client/Assets/
├─ Game/                    # 프로젝트 코드와 자체 구성 자산
├─ ThirdParty/              # 외부 에셋
└─ ThirdPartyUsed/          # 사용 외부 에셋
```

Game 내부의 주요 구조는 다음과 같다.

```text
Client/Assets/Game/
├─ App/Runtime/
│  ├─ Bootstrap/
│  │  ├─ GameInstance.cs
│  │  ├─ AppCompositionRoot.cs
│  │  └─ AppServices.cs
│  └─ EntryPoints/
├─ Core/StateMachines/
├─ Infrastructure/
│  ├─ AssetManagement/
│  │  ├─ AssetManager.cs
│  │  ├─ PrefabFactory.cs
│  │  ├─ Catalogs/
│  │  └─ Pooling/
│  ├─ SceneLoading/
│  └─ Network/
├─ Features/
│  ├─ Room/
│  ├─ Match/
│  ├─ Player/
│  └─ PlayerMovement/
└─ UI/Runtime/Core/
   ├─ Base/
   ├─ Layers/
   └─ Management/
```

## 패턴별 분석 문서

| 적용 상황 | 패턴 또는 구조 | 문서 |
| --- | --- | --- |
| 씬이 바뀌어도 공통 서비스를 유지하고 종료 순서를 관리 | Singleton, Composition Root, 의존성 주입, 서비스 컨테이너 | [앱 진입점과 서비스 수명](./app-bootstrap-and-services.md) |
| 1인칭·3인칭·조준 카메라 계산 교체 | Strategy | [카메라 전략](./camera-strategy.md) |
| 장비에 따라 공격 동작과 Animator Controller 교체 | Strategy + 상태 전환 수명 | [장비와 애니메이션 전략](./equipment-animation-strategy.md) |
| 접지·공중·공격 상태별 행동 분리 | State | [캐릭터 상태](./character-state.md) |
| 게임 상태를 Animator 파라미터로 변환 | Adapter | [애니메이션 어댑터](./animation-adapter.md) |
| 게임 규칙의 결과를 네트워크 전송에 연결 | Adapter, variant 방문과 오버로딩 | [서버 이벤트 어댑터](./server-event-adapter.md) |
| 수신 메시지를 서비스로 전달하고 상태 변경을 UI에 알림 | Publish–Subscribe / Observer | [메시지와 구독 수명](./message-publish-subscribe.md) |
| 게임 로그인·방 상태에 음성 채팅 연결 | SDK 어댑터, 발행·구독, 서비스 수명 | [Vivox 음성 서비스](./vivox-voice-service.md) |
| UI 초기화·열기·닫기의 공통 순서 유지 | Template Method | [UI 수명과 Layer 관리](./ui-template-method-and-layers.md) |
| 프리팹 조회와 생성 책임 분리 | 생성 공장, 프리팹 복제의 Prototype 성격 | [Catalog와 프리팹 생성](./catalog-and-prefab-factory.md) |
| 인스턴스를 빌리고 반납하며 씬 종료 시 일괄 정리 | Object Pool, Scope 수명 관리 | [오브젝트 풀링](./object-pool-and-scope.md) |
| Room 변경 작업을 실행 가능한 객체로 전달하고 직렬화 | 함수 객체를 이용한 Command 성격, Job Queue | [Room 작업 큐](./room-job-queue.md) |
| 그림 평가기가 판단하지 못하면 다음 평가기로 전달 | Chain of Responsibility 성격 | [평가기의 순차 대체 처리](./evaluation-fallback-chain.md) |
| 씬 전환과 게임 페이즈의 표현을 조정 | Loader 추상화, Coordinator, 데이터 매핑 | [씬 전환과 페이즈 조정](./scene-flow-and-phase-coordination.md) |

## 패턴 이름을 구분하는 기준

- **GameInstance / AppServices:** 전역 진입점과 서비스 소유 컨테이너. 실제 객체와 같은 계약으로 요청을 대신 수행하는 GoF Proxy 구조로 분류하지 않는다.
- **PrefabFactory:** 생성 책임을 모은 공장. 생성 메서드를 하위 클래스가 재정의하는 GoF Factory Method 구조와 구분한다.
- **CompositeSubscription:** 여러 구독의 해제를 묶는 도구. 이름의 `Composite`만으로 GoF Composite 패턴을 뜻하지 않는다.
- **게임 페이즈:** 분석 대상 코드는 페이즈별 전략 객체 대신 enum 매핑과 전환 조정기를 사용한다.
- **ScriptableObject Catalog:** 데이터 정의와 조회 구조. ScriptableObject 사용 자체가 특정 GoF 패턴을 뜻하지 않는다.
- **Builder 이름의 클래스:** 이름만으로 단계별 생성 계약을 갖춘 GoF Builder로 분류하지 않는다.

## 프레임워크를 설명하는 핵심

공통 서비스를 조립하는 책임, 씬에서 사용하는 객체의 수명, 게임 행동의 변경 지점, 화면과 네트워크의 변환 책임을 나눴다. 각 기능은 필요한 서비스를 전달받고, 씬 종료 시 구독과 풀 객체를 정리한다.

포트폴리오에서는 패턴 개수보다 **어떤 변경을 어느 클래스에 모았는지**, **누가 객체를 만들고 정리하는지**를 구현 흐름과 함께 설명한다.
