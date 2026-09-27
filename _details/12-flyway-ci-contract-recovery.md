---
title: Flyway 번호와 CI 계약을 묶음 단위로 복구
order: 12
number: "12"
domain: DATABASE · CI CONTRACT
detail_category: 유지보수,확장성
category_slug: maintainability
category_url: /projects/gilbom/maintainability/
permalink: /projects/gilbom/maintainability/12-flyway-ci-contract-recovery/
summary: 병렬 개발로 충돌한 Flyway 번호와 뒤처진 Jenkins·Release 검증 범위를 함께 대조해 DB 이력과 배포 Gate가 다른 버전을 보지 않도록 복구했습니다.
verified_at: 2026-08-04
validation_scope: 로컬 Migration·Testcontainers·Compose·CI 정적 계약 · 원격 Jenkins 전체 Pipeline 미실행
result_label: V1–V42 연속 · CI 계약 PASS
status_tone: warning
tags:
  - Flyway
  - PostgreSQL
  - Jenkins
  - CI Contract
previous_title: Robot과 Mission 상태 불일치 해결
previous_url: /projects/gilbom/troubleshooting/11-mission-lifecycle-consistency/
nav_context: GILBOM / MAINTAINABILITY 12
---

<nav class="project-toc" aria-label="Flyway와 CI 계약 글 목차">
  <p>이 글에서 다루는 내용</p>
  <ol>
    <li><a href="#problem">병렬 변경의 충돌</a></li>
    <li><a href="#migration">Migration 정본 복구</a></li>
    <li><a href="#runtime">이미 적용된 DB를 따로 다루는 이유</a></li>
    <li><a href="#ci">CI·Release 계약 동기화</a></li>
    <li><a href="#verification">검증과 운영 주의사항</a></li>
    <li><a href="#sources">근거 문서</a></li>
  </ol>
</nav>

<h2 id="problem">병렬 변경의 충돌</h2>

여러 브랜치가 같은 Flyway 번호를 선점하면 SQL 내용이 정상이어도 병합 후
Migration 정본이 둘이 됩니다. 이미 적용한 로컬 DB는 파일명을 바꾸는 것만으로
복구되지 않고 checksum·description 불일치로 Backend 시작이 막힙니다.

Migration 파일은 늘었는데 Jenkins, 운영 DB 검증 SQL, Release Metadata가 이전
최신 버전을 계속 보는 문제도 있었습니다. Compose에 새 필수 환경변수를 추가한 뒤
운영·Smoke Fixture가 함께 갱신되지 않아 다음 Gate에서 렌더링이 실패한 사례도 같은
묶음 변경 문제였습니다.

| 파일·검증기 | 역할 |
| --- | --- |
| `db/migration/V*__*.sql` | 실행 순서와 Checksum을 가진 DB 변경 정본 |
| `Jenkinsfile · Flyway V1-V45 Stage` | 실행 DB의 성공 이력 개수·최소·최대 Version 검사 |
| `verify-empty-database.sql` | 빈 Volume에 전체 Migration과 필수 Schema가 생성됐는지 검사 |
| `verify-production-database.sql` | 운영 DB를 수정하지 않고 Flyway·PostGIS·권한 구조 검사 |
| `generate-build-metadata.py` | Migration 파일명·설명·SHA-256을 Release Metadata로 생성 |
| `verify-ci-release-contract.sh` | Jenkins Stage와 Script가 같은 Flyway Version을 보는지 정적 검사 |

<h2 id="migration">Migration 정본 복구</h2>

먼저 확정된 공통 Migration을 유지하고 역할 B의 Mission Migration 번호를 뒤로
이동했습니다. 이후 충돌에서는 정본 순서를 `V36 결함 유형 → V37 Zone 제약 해제 →
V38 Mission 종료 이력`으로 다시 고정했습니다.

이미 적용된 DB는 즉시 `repair`하거나 이력 Table을 임의 수정하지 않았습니다.
물리 Schema 효과와 현재 SQL을 대조하고, 데이터 보존이 필요한 환경은 백업과 별도
교정 절차를 먼저 두었습니다. 새 빈 DB에서는 전체 Migration 연속 적용과 중복 번호
0건을 확인했습니다.

Source 단계에서는 파일 개수만 세지 않습니다. `V숫자__설명.sql`에서 Version을
추출해 1부터 최신 번호까지 빠짐없이 한 번씩 존재하는지 검사합니다. 현재 Release
Metadata 생성기는 이 조건을 만족하지 않으면 Metadata 자체를 만들지 않습니다.

```python
/* generate-build-metadata.py · migration_evidence() */
def migration_evidence() -> dict[str, object]:
    entries = []
    directory = ROOT / "backend/src/main/resources/db/migration"
    for path in directory.iterdir():
        match = MIGRATION.fullmatch(path.name)
        if match:
            entries.append({
                "version": int(match.group(1)),
                "file": path.name,
                "description": match.group(2).replace("_", " "),
                "sha256": sha256(path),
            })

    entries.sort(key=lambda entry: entry["version"])
    versions = [entry["version"] for entry in entries]
    if versions != list(range(1, 46)):
        raise SystemExit(
            "Flyway migrations must be contiguous from V1 through V45"
        )
    return {"latestVersion": "V45", "migrations": entries}
```

이 검사는 `V12`와 `V12`가 두 번 있는 경우뿐 아니라 V12가 빠지고 V46이 추가돼 파일
개수만 같은 경우도 실패시킵니다. Metadata에는 각 SQL의 SHA-256도 넣어 같은 Version과
파일명인데 내용이 달라진 산출물을 구분합니다.

<h2 id="runtime">이미 적용된 DB를 따로 다루는 이유</h2>

Source에서 파일명을 V36에서 V37로 바꿔도, 기존 DB의
`flyway_schema_history`에는 이전 Version·Description·Checksum이 남습니다. 따라서
다음 Backend 기동의 Flyway Validate는 Source와 DB가 다른 이력을 가진 것으로
판정합니다.

| 환경 | 처리 기준 |
| --- | --- |
| 새 빈 DB | 정본 V1부터 최신까지 그대로 적용하고 연속성 검사 |
| 데이터가 필요 없는 로컬 DB | 명시적으로 Volume을 재생성한 뒤 정본 재적용 |
| 데이터 보존 DB | 전체 백업 후 물리 Schema 효과와 각 SQL을 대조하고 별도 교정 계획 수립 |
| 운영 DB | 읽기 전용 검증부터 수행하며 자동 `repair`나 History 직접 UPDATE 금지 |

운영 검증 SQL은 Schema를 변경하지 않고 성공 Migration 수, 실패 이력, PostGIS와
필수 Table·권한을 함께 확인합니다. 파일 연속성 통과와 실행 DB 정합성 통과는 서로
다른 Gate입니다.

```sql
/* verify-production-database.sql · Flyway Read-only Gate */
SELECT (
    :'flyway_role' <> :'application_role'
    AND EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'postgis'
    )
    AND (
        SELECT COUNT(*) = 45
               AND COUNT(*) FILTER (WHERE NOT success) = 0
        FROM flyway_history.flyway_schema_history
    )
    /* ... 승인된 Seed·Table·Role 최소 권한 검사 ... */
)::int;
```

<h2 id="ci">CI·Release 계약 동기화</h2>

Migration 최신 번호를 바꿀 때 다음 항목을 같은 변경 단위로 맞췄습니다.

- Jenkins Flyway Gate의 개수·최소·최대 버전
- 빈 DB와 운영 DB 읽기 전용 검증 SQL
- Release Metadata와 결과 Artifact ID
- Compose 운영·Smoke 환경 Fixture
- Infrastructure·Release 계약 검사 Script

필수 이미지 업로드 URL은 제약을 완화하지 않고 운영 Fixture에는 실제 HTTPS 주소,
Smoke Fixture에는 외부 요청이 발생하지 않는 `.invalid` 주소를 넣었습니다. URL의
존재뿐 아니라 HTTPS와 localhost 금지도 검사했습니다.

Jenkins의 Flyway Stage는 실제 기동 DB의 History를 조회합니다. 전체 수, 최소·최대
Version과 `success`를 함께 확인한 뒤에만 `flyway-v1-v45` 결과를 PASS로 기록합니다.

```groovy
/* Jenkinsfile · Flyway V1-V45 Stage */
stage('Flyway V1-V45') {
    steps {
        dir(env.APP_DIR) {
            sh '''
                set -eu
                docker compose exec -T db sh -ec '
                    export PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE")"
                    psql --username "$POSTGRES_USER" \
                        --dbname "$POSTGRES_DB" \
                        --no-password --tuples-only --no-align \
                        --command "
                            SELECT (
                                COUNT(*) = 45
                                AND MIN(version::INTEGER) = 1
                                AND MAX(version::INTEGER) = 45
                                AND BOOL_AND(success)
                            )::int
                            FROM flyway_history.flyway_schema_history;
                        "
                ' | grep -qx 1
                sh scripts/record-ci-result.sh flyway-v1-v45
            '''
        }
    }
}
```

정적 계약 Script는 Stage 이름만 찾지 않고 Jenkins Query에 `COUNT(*) = 45`와
`MAX(version::INTEGER) = 45`가 실제로 들어 있는지도 검사합니다. Migration을 추가하고
Jenkins만 이전 번호로 남겨 두면 원격 Pipeline을 실행하기 전에 이 Gate가 실패합니다.

```sh
/* verify-ci-release-contract.sh · Flyway 계약 검사 */
assert_contains Jenkinsfile \
  "stage('Flyway V1-V45')" \
  "missing Jenkins Flyway stage"

assert_contains Jenkinsfile \
  'COUNT(*) = 45' \
  "Flyway history gate must require all 45 migrations"

assert_contains Jenkinsfile \
  'MAX(version::INTEGER) = 45' \
  "Flyway history gate must require V45 as the maximum migration"
```

이렇게 Source Migration, 실행 DB History, CI Stage, Release Metadata의 네 값이 모두
같아야 배포 가능한 상태로 판정합니다. 번호 충돌을 SQL 파일 하나의 이름 문제로만
처리하지 않은 이유입니다.

<h2 id="verification">검증과 운영 주의사항</h2>

2026년 8월 4일 복구 기록에서는 당시 정본 V1부터 V42까지 연속이며 중복 번호와 충돌
Marker가 없는 상태를 확인했습니다. 이후 Migration이 추가돼 2026년 8월 16일 현재
소스와 CI 계약은 V1부터 V45를 기준으로 합니다. 과거 V42 복구 결과와 현재 V45 정적
검사는 서로 다른 시점의 근거입니다.

원격 Jenkins 전체 Pipeline과 운영 DB 적용은 실행하지 않았습니다. 이미 다른 번호로
적용된 DB는 파일 재번호화만으로 안전해지지 않으며, 운영 이력을 자동 `repair`한
사례로 표현하지 않습니다.

<h2 id="sources">근거 문서</h2>

- `CHANGLOGS/2026-07-30_1408_frontend-package-script-conflict.md`
- `CHANGLOGS/2026-07-30_1413_mission-migration-version.md`
- `CHANGLOGS/2026-08-02_0034_compressed-docker-layer-verification.md`
- `CHANGLOGS/2026-08-02_1955_flyway-artifact-merge-resolution.md`
- `CHANGLOGS/2026-08-03_1804_ci-upload-url-compose-fixture.md`
- `CHANGLOGS/2026-08-03_1812_flyway-v41-ci-contract.md`
- `CHANGLOGS/2026-08-03_1839_report-smoke-upload-url.md`
- `CHANGLOGS/2026-08-04_1855_master-rebase-conflict-resolution.md`
