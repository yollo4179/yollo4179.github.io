# 그림 평가기의 순차 대체 처리

## 적용 상황

그림 평가기 하나가 요청을 판단하지 못하면 다음 평가기를 시도한다. 호출자는 평가기의 순서와 실패 처리를 매번 구현하지 않고 공통 평가 계약을 사용한다.

```text
평가 요청
  → 첫 평가기
  → Failure이면 다음 평가기
  → Success이면 결과 반환
```

## 적용 방식

`FallbackArtworkEvaluationService`는 같은 `IArtworkEvaluationService` 계약을 가진 평가기들을 순서대로 보관한다. 각 평가기를 호출하고 결과에 따라 다음 평가기로 넘긴다. 배열 순회로 구현한 Chain of Responsibility 성격의 구조다.

**실패와 0점은 다르다.** 평가기가 판단하지 못한 Failure는 다음 평가기로 넘긴다. 평가기가 정상적으로 판단한 0점은 성공 결과이므로 해당 결과로 끝낸다.

서비스는 어느 평가기가 답했는지 기록한다. 하위 서비스의 수명을 소유하도록 설정한 경우 종료 시 하위 평가기도 정리한다.

## 책임 분리

개별 평가기는 자신의 평가 방법을 담당한다. 대체 처리 서비스는 시도 순서와 실패에 따른 전달을 담당한다. 평가기 교체와 순서 변경은 구성 단계에서 처리한다.

## 코드 근거

- `Client/Assets/Game/Infrastructure/AI/FallbackArtworkEvaluationService.cs`
- `Client/Assets/Game/Infrastructure/AI/OnDeviceArtworkEvaluationService.cs`
- `Client/Assets/Game/Infrastructure/AI/BackendArtworkEvaluationService.cs`
