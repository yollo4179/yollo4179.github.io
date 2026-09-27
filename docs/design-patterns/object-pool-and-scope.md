# 오브젝트 풀링과 씬 범위 정리

## 적용 상황

반복해서 사용하는 객체는 빌려 쓰고 반납한다. 씬이 끝나면 해당 씬의 풀과 객체를 함께 정리한다.

```text
PoolManager
  → 씬별 PoolScope
  → 프리팹별 ObjectPool
  → Rent / Return
```

## 객체 재사용

```text
Client/Assets/Game/Infrastructure/AssetManagement/Pooling/
├─ PoolManager.cs               # 범위 관리
├─ PoolScope.cs                 # 씬 범위의 등록·정리
├─ ObjectPool.cs                # 대여·반납·확장
├─ PoolableObject.cs            # 소유·대여 상태
├─ PoolRegistrationInfo.cs      # 등록 설정
└─ PoolInfo.cs                  # 풀 상태 정보
```

풀은 사용할 수 있는 객체를 Queue에 보관하고, 자신이 생성한 전체 객체를 별도로 추적한다. 대여 시 대기 객체를 꺼내거나 설정에 따라 확장한다. 부모와 Transform을 정리하고 객체를 활성화한 뒤 대여 알림을 전달한다.

반납 시 풀은 소유 관계와 대여 여부를 확인한다. 다른 풀의 객체를 반납하거나 같은 객체를 두 번 반납하는 동작을 막는다. 반납 알림을 전달한 뒤 객체를 보관하거나 보관 한도를 넘으면 제거한다.

**최대 보관 수는 대기 객체의 보관 한도**다. 동시에 대여할 수 있는 객체 수의 절대 상한과 동일한 뜻으로 사용하지 않는다.

## 풀링을 적용한 목적과 GC

반복적인 객체 생성·제거와 메모리 할당 부담을 줄이고, GC가 누적된 회수 대상을 한꺼번에 정리하면서 화면이 멈추는 현상을 예방하기 위해 풀링을 적용했다. 사용이 끝난 객체는 보관 한도 안에서 비활성화해 반납하고 다음 요청에서 재사용한다.

반복 할당은 GC가 회수할 대상을 늘릴 수 있고, GC 작업이 한 프레임에 집중되면 화면이 잠시 멈춘 것처럼 보일 수 있다. 기존 객체를 재사용하면 반복 할당과 생성·제거 부담을 줄일 수 있다. [Unity 오브젝트 재사용 문서](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/optimization/performance-optimizing-code-managed-memory/reusable-code)

객체 제거 비용과 C# GC 비용은 구분된다. 풀링을 사용해도 객체 내부의 문자열·임시 컬렉션 할당은 별도로 발생할 수 있다. 보관 한도를 넘거나 풀 범위를 종료할 때 많은 객체를 제거하면 정리 비용도 집중될 수 있다. 일괄 제거 비용을 여러 프레임으로 분산하는 기능과 풀링은 별개의 책임이다.

## Scope의 수명

씬 진입점은 씬의 풀 범위를 만들고 프리팹별 풀 설정을 등록한다. 게임 씬은 캐릭터도 이 범위에서 대여한다. 씬 종료 시 진입점이 범위를 정리한다. 앱 종료 시 PoolManager가 남아 있는 범위를 정리한다.

범위 정리는 대기 객체뿐 아니라 풀에서 추적하는 대여 객체도 포함한다. 개별 객체의 반납 누락이 씬 밖으로 수명을 늘리지 않도록 소유 범위를 둔다.

## 구조를 나눈 효과

- 생성은 PrefabFactory, 재사용은 ObjectPool이 맡는다.
- 씬 단위 정리는 PoolScope가 맡는다.
- 전체 범위의 종료는 PoolManager가 맡는다.

Object Pool은 재사용을, Scope는 소유와 종료 책임을 담당한다.

## 코드 근거

- `Client/Assets/Game/Infrastructure/AssetManagement/Pooling/PoolManager.cs`
- `Client/Assets/Game/Infrastructure/AssetManagement/Pooling/PoolScope.cs`
- `Client/Assets/Game/Infrastructure/AssetManagement/Pooling/ObjectPool.cs`
- `Client/Assets/Game/Infrastructure/AssetManagement/Pooling/PoolableObject.cs`
- `Client/Assets/Game/App/Runtime/EntryPoints/InGameEntryPoint.cs`
