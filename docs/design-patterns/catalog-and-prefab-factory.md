# Catalog 조회와 프리팹 생성 책임 분리

## 적용 상황

기능 코드마다 Resources 경로와 프리팹 이름을 사용하면 자산 접근 규칙이 흩어진다. 조회, 생성, 재사용을 각각의 구성 요소에 둔다.

```text
ePrefabId
  → AssetManager
  → PrefabCatalog의 프리팹 참조
  → PrefabFactory의 복제 생성
  → Pool의 재사용
```

## Catalog의 구성

```text
Client/Assets/Game/Infrastructure/AssetManagement/
├─ AssetManager.cs
├─ PrefabFactory.cs
├─ Catalogs/
│  ├─ PrefabCatalog.cs
│  ├─ PrefabCatalogEntry.cs
│  └─ PrefabCatalog.asset
└─ Pooling/
   ├─ PoolManager.cs
   ├─ PoolScope.cs
   ├─ ObjectPool.cs
   ├─ PoolableObject.cs
   ├─ PoolRegistrationInfo.cs
   └─ PoolInfo.cs
```

ScriptableObject Catalog는 프리팹 식별자와 원본 GameObject를 연결한다. 런타임 조회에는 Dictionary를 사용한다. Catalog는 빈 식별자, 누락된 프리팹, 중복 정의를 검사하고 편집·활성화 시 조회 캐시를 다시 구성할 수 있도록 처리한다.

여기서 Dictionary는 **식별자와 프리팹의 매핑**이다. 게임 월드의 지형 설정을 담는 `MapLayoutConfig`와는 다른 역할이다.

## 공장과 복제

AssetManager는 원본 프리팹을 조회한다. PrefabFactory는 원본을 받아 위치·회전·부모 조건에 따라 `Object.Instantiate`를 수행한다. 풀은 생성 방법을 직접 구현하지 않고 공장을 사용한다.

프리팹 원본을 복제해 인스턴스를 만드는 부분은 Prototype의 성격을 갖는다. 구현은 Unity의 복제 API를 사용한다. PrefabFactory는 생성 책임을 모은 공장이며, 하위 클래스의 생성 메서드 재정의를 전제로 하는 GoF Factory Method 구조와 구분한다.

## 책임 분리

| 변경 | 담당 |
| --- | --- |
| 식별자와 프리팹 연결 | PrefabCatalog |
| 원본 조회 | AssetManager |
| 인스턴스 생성 | PrefabFactory |
| 인스턴스 보관과 재사용 | Pool |

이 경로의 자산 관리는 직접 프리팹 참조를 사용한다. 비동기 자산 다운로드나 참조 카운트 기반 해제 기능으로 설명하지 않는다.

## 코드와 설계 근거

- `Client/Assets/Game/Infrastructure/AssetManagement/Catalogs/PrefabCatalog.cs`
- `Client/Assets/Game/Infrastructure/AssetManagement/AssetManager.cs`
- `Client/Assets/Game/Infrastructure/AssetManagement/PrefabFactory.cs`
- `Client/Docs/ASSET_MANAGEMENT_IMPLEMENTATION.md`
