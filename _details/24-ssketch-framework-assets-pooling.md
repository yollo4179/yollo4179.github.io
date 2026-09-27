---
layout: ssketch-article
ssketch_styles: true
featured: true
project_slug: ssketch
number: '10'
order: 10
learning_order: 10
title: 프리팹 조회·생성·재사용의 책임을 나눈 자산 관리 구조
short_title: Catalog와 오브젝트 풀링
short_category: 자산과 객체 수명
series_category: Client Framework
detail_category: 게임 클라이언트
permalink: /projects/ssketch/technical/framework-assets-pooling/
summary: ScriptableObject Catalog로 프리팹을 조회하고 생성 공장에서 인스턴스를 만들었다. 풀은 객체를 대여·반납하고 씬별 범위에서 함께 정리하도록 구성했다.
result_label: Catalog 조회 · 생성 공장 · 씬별 풀 범위
tags: [Architecture, Unity, ObjectPool, Prototype]
nav_context: projects
---

## 조회·생성·재사용을 각각의 책임으로 나눴다

프리팹 경로와 이름을 기능 코드마다 관리하는 대신 식별자로 원본을 찾도록 구성했다. 원본 조회, 인스턴스 생성, 풀에서의 재사용은 각각 다른 객체가 맡는다.

## 디렉터리와 파일 구조

```text
Client/Assets/Game/Infrastructure/AssetManagement/
├─ AssetManager.cs                 # 원본 프리팹 조회
├─ PrefabFactory.cs                # 프리팹 인스턴스 생성
├─ Catalogs/
│  ├─ PrefabCatalog.cs             # 식별자 → 프리팹 매핑
│  ├─ PrefabCatalogEntry.cs        # 매핑 항목
│  └─ PrefabCatalog.asset          # ScriptableObject 데이터
└─ Pooling/
   ├─ PoolManager.cs               # 풀 범위 생성·관리
   ├─ PoolScope.cs                 # 씬 범위의 풀 등록·정리
   ├─ ObjectPool.cs                # 프리팹별 대여·반납
   ├─ PoolableObject.cs            # 객체의 풀 소유·대여 상태
   ├─ PoolRegistrationInfo.cs      # 풀 등록 설정
   └─ PoolInfo.cs                  # 풀 상태 정보
```

## Catalog는 식별자와 원본을 연결한다

ScriptableObject Catalog에 프리팹 식별자와 GameObject 참조를 정의했다. Catalog는 런타임 조회용 Dictionary를 구성하고 빈 식별자, 중복 정의, 누락된 프리팹을 검사한다.

```text
ePrefabId
  → AssetManager
  → PrefabCatalog의 Dictionary 조회
  → 원본 프리팹
```

여기서 Dictionary는 **식별자와 프리팹을 연결하는 Map**이다. 게임 월드의 지형 설정을 담는 MapLayoutConfig와는 역할이 다르다. 자산 접근은 직접 프리팹 참조를 사용한다.

## 생성 공장은 복제를 담당한다

PrefabFactory는 자산 관리자에서 원본을 받아 위치·회전·부모 조건에 따라 복제한다. 원본을 바꾸는 작업은 Catalog에서, 생성 동작을 바꾸는 작업은 공장에서 처리한다.

프리팹 원본으로 인스턴스를 복제하는 동작은 <span class="notice-pink">Prototype의 성격</span>을 갖는다. 구현은 Unity의 복제 API를 사용한다. 생성 책임을 공장에 모았으며, 하위 클래스가 생성 메서드를 재정의하는 Factory Method 구성과는 구분된다.

## 풀은 대여·반납을 담당한다

반복적인 객체 생성·제거와 메모리 할당 부담을 줄이고, <span class="notice-pink">GC가 누적된 회수 대상을 한꺼번에 정리하면서 화면이 멈추는 현상을 예방하기 위해</span> 오브젝트 풀링을 적용했다. 사용이 끝난 객체는 보관 한도 안에서 비활성화해 반납하고, 다음 요청에서 재사용하도록 구성했다.

### 재사용으로 GC 부담을 줄인다

객체 생성 과정에서 관리 메모리 할당이 반복되면 GC가 회수할 대상도 늘어날 수 있다. GC가 많은 작업을 한 번에 수행하면 프레임이 지연되어 화면이 잠시 멈춘 것처럼 보일 수 있다. 풀링은 기존 객체를 재사용해 반복 할당과 생성·제거 부담을 줄이는 방법이다. [Unity 오브젝트 재사용 문서](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/optimization/performance-optimizing-code-managed-memory/reusable-code)

```text
생성·제거를 반복하는 방식
  → 사용할 때 생성
  → 사용이 끝나면 제거
  → 다음 사용에서 다시 생성

풀링 방식
  → 풀에서 대여
  → 사용이 끝나면 비활성화해 반납
  → 다음 사용에서 같은 객체 재사용
```

**객체 제거 비용과 C# GC의 메모리 회수 비용은 구분된다.** 풀링은 두 부담을 줄이는 데 도움이 되지만, 사용 중 생성하는 문자열·임시 컬렉션 등의 할당까지 없애지는 않는다.

### 대여와 반납 흐름

```text
씬 EntryPoint
  → PoolManager에서 PoolScope 생성
  → 프리팹별 ObjectPool 등록
  → 객체 대여
     ├─ 대기 객체가 있으면 재사용
     └─ 필요하면 PrefabFactory로 생성
  → 객체 사용
  → 원래 풀로 반납
```

| 동작 | 처리 |
| --- | --- |
| 대여 | 대기 객체 선택 또는 확장, 부모·Transform 정리, 활성화, 대여 알림 |
| 반납 | 풀 소유·대여 상태 확인, 반납 알림, 대기 객체로 보관 |
| 보관 한도 초과 | 초과한 반납 객체 제거 |
| 범위 종료 | 범위에 속한 풀과 추적 객체 정리 |

ObjectPool은 사용 가능한 객체를 Queue에 보관하고 자신이 생성한 전체 객체를 따로 추적한다. 다른 풀의 객체를 반납하거나 같은 객체를 두 번 반납하는 동작은 소유·대여 상태로 검사한다.

**최대 보관 수는 대기 객체의 한도**다. 동시에 대여할 수 있는 객체 수의 절대 상한을 뜻하지 않는다.

## 씬별 범위에서 정리한다

PoolScope는 씬 범위의 프리팹별 풀과 공통 부모 객체를 소유한다. 씬 종료 시 진입점이 범위를 종료하고, 범위는 대기 객체와 대여 객체를 포함해 자신이 추적하는 객체를 정리한다. 앱 종료 시 PoolManager가 남은 범위를 종료한다.

평소 반납에서는 객체를 재사용하지만, 보관 한도를 넘거나 씬의 풀 범위를 종료할 때는 객체를 제거한다. **많은 객체를 한꺼번에 정리하는 시점에는 제거 비용이 집중될 수 있다.** 풀링은 반복 생성·제거를 줄이는 구조이며, 일괄 정리 비용까지 자동으로 분산하는 구조는 아니다.

| 변경할 내용 | 담당 파일 |
| --- | --- |
| 식별자에 연결할 프리팹 | PrefabCatalog와 데이터 |
| 원본 조회 규칙 | AssetManager |
| 복제 생성 조건 | PrefabFactory |
| 대여·반납과 확장 규칙 | ObjectPool |
| 씬 단위 등록과 종료 | PoolScope |
| 전체 풀 범위 관리 | PoolManager |

**조회·생성·재사용·종료의 변경 지점을 나눈 것**이 이 구조의 핵심이다.
