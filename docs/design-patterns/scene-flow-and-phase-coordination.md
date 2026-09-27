# 씬 전환과 게임 페이즈의 조정 구조

## 씬 전환

SceneFlowManager는 씬 전환 순서를 관리하고, `ISceneLoader`는 실제 로딩 동작을 제공한다. UnitySceneLoader가 Unity의 씬 API를 연결한다.

```text
목적 씬 요청
  → Loading 씬
  → 목적 씬 비동기 로딩
  → 로딩 진행률 전달
  → 씬 활성화
```

전환 중 같은 요청을 다시 받으면 중복 전환을 진행하지 않는다. 요청을 모두 저장하는 전환 큐 구조는 아니다. Loading 씬을 사용할 수 없을 때는 직접 로딩하는 경로가 있고, 긴급 복귀에는 Loading 씬을 거치지 않는 경로를 제공한다.

보관한 pending scene은 **다음에 이동할 씬**이다. 실행 중인 씬을 나타내는 필드로 설명하지 않는다.

## 게임 페이즈

InGamePhaseCoordinator는 서버가 보낸 게임 진행 상태를 씬의 PhaseController와 환경 전환에 연결한다. 페이즈 전환 중에는 이동 제한과 전환 작업을 조정하고, 종료 시 구독과 전환 작업을 정리한다.

MatchPhaseMap은 서버 페이즈와 클라이언트 표현을 연결한다. 서버의 더 세분화된 페이즈를 클라이언트의 Day·Night·Morning 표현으로 묶고, 그림 완료나 평가 시작처럼 경계에서 필요한 동작을 구분한다.

## 패턴 구분

카메라와 장비에는 교체 가능한 전략 객체가 있다. 분석 대상의 게임 페이즈는 enum 매핑과 이벤트 종류별 분기, 전환 조정기로 구성된다. 따라서 **페이즈별 전략 패턴**보다 **게임 진행과 씬 표현의 책임 분리**로 설명한다.

SceneFlowManager도 씬 전환 기능을 모은 클래스라는 이유만으로 GoF Facade나 Proxy라고 단정하지 않는다. 문서에서는 Loader 추상화와 전환 책임을 설명한다.

## 코드 근거

- `Client/Assets/Game/Infrastructure/SceneLoading/SceneFlowManager.cs`
- `Client/Assets/Game/Infrastructure/SceneLoading/UnitySceneLoader.cs`
- `Client/Assets/Game/Infrastructure/SceneLoading/SceneCatalog.cs`
- `Client/Assets/Game/Features/Match/Runtime/InGamePhaseCoordinator.cs`
- `Client/Assets/Game/Features/Match/Runtime/MatchPhaseMap.cs`
- `Client/Assets/Game/Features/Drawing/Runtime/PhaseController.cs`
