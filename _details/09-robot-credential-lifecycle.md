---
title: Robot 등록과 Credential 수명주기 분리
order: 9
number: "09"
domain: ROBOT · PROVISIONING
detail_category: 유지보수,확장성
category_slug: maintainability
category_url: /projects/gilbom/maintainability/
permalink: /projects/gilbom/maintainability/09-robot-credential-lifecycle/
summary: Robot 등록, 최초 MQTT Credential 발급, Registry 복구와 회전을 서로 다른 수명주기로 나누고 Jetson 전달값을 한 번만 제공하도록 구성했습니다.
verified_at: 2026-08-03
validation_scope: Backend Credential 단위 테스트 · 2026-08-03 PostGIS 통합 보존 기록 · 실제 Jetson Secret 주입 미검증
result_label: 현재 단위 10 PASS · 보존 통합 14 PASS
tags:
  - Provisioning
  - MQTT Credential
  - Secret
  - Idempotency
previous_title: Telemetry 통계를 SSE와 5초 단위로 갱신
previous_url: /projects/gilbom/performance/08-telemetry-statistics-refresh/
next_title: 순찰 구역 좌표와 SVG Overlay 정합성 복구
next_url: /projects/gilbom/troubleshooting/10-patrol-area-coordinate-overlay/
nav_context: GILBOM / MAINTAINABILITY 09
---

<nav class="project-toc" aria-label="Robot Credential 글 목차">
  <p>이 글에서 다루는 내용</p>
  <ol>
    <li><a href="#problem">등록과 Secret 발급의 경계</a></li>
    <li><a href="#lifecycle">Credential 수명주기</a></li>
    <li><a href="#issuance">발급 Transaction과 1회 응답</a></li>
    <li><a href="#reconcile">Broker Registry 정합성 복구</a></li>
    <li><a href="#integration">통합 Provisioning 경계</a></li>
    <li><a href="#verification">검증과 실제 장비 범위</a></li>
    <li><a href="#sources">근거 문서</a></li>
  </ol>
</nav>

<h2 id="problem">등록과 Secret 발급의 경계</h2>

Robot Identity를 만들자마자 Broker 비밀번호를 자동 발급하면 값을 받을 관리자가
준비되지 않은 상태에서 1회 Secret이 소실될 수 있습니다. 반대로 Mission 생성
화면에서 Credential을 발급·회전하면 임무마다 바뀌는 Token처럼 오해해 기존 Robot
연결을 끊을 수 있습니다.

Frontend가 예상한 응답 필드와 실제 DTO가 달라 비밀번호가 빈칸으로 보인 문제,
DB에는 활성 Credential이 없지만 Mosquitto Password Registry에는 계정이 남아
최초 발급이 충돌한 문제도 같은 수명주기 안에서 해결해야 했습니다.

<h2 id="lifecycle">Credential 수명주기</h2>

```text
Robot 등록
→ PROVISIONING + mqttId 생성
→ 관리자가 최초 발급 확인
→ Broker 반영 + Robot ACTIVE
→ Secret 1회 표시
→ Jetson 보호 설정에 주입
→ 노출·분실·정책 변경 때만 회전
```

- 등록은 `POST /api/v1/robots`, 최초 발급은 별도 Credential API로 분리했습니다.
- 발급·재시도는 Idempotency-Key로 같은 사용자 시도를 식별합니다.
- 비밀번호 원문은 성공 응답에서 한 번만 보이고 조회·로그·감사에 남기지 않습니다.
- Registry 충돌은 Password File을 직접 편집하지 않고 DB 정본 기반 Reconcile API로
  복구한 뒤 같은 발급 시도를 이어갑니다.
- 회전은 새 Idempotency-Key를 사용하며 기존 비밀번호를 즉시 폐기합니다.

| 클래스·컴포넌트 | 역할 |
| --- | --- |
| `MqttCredentialIssuanceController` | 권한·Idempotency-Key를 받고 1회 발급 응답에 `no-store` 적용 |
| `MqttCredentialIssuanceService` | Robot 잠금, 멱등 선점, MQTT 발급·회전, DB 상태와 감사 로그 Transaction |
| `PasswordFileMqttCredentialProvisioner` | Mosquitto Password Registry에 계정 생성·교체·복구 |
| `RobotImageApiKeyIssuanceService` | 기존 이미지 Key 회수와 새 SHA-256 Hash 저장 |
| `MqttCredentialRegistryService` | DB 활성 Credential과 Broker Registry Drift 판정·복구 |
| `RobotCredentialManager` | 성공 응답의 두 Secret을 Modal에서 한 번만 표시 |
| `robotCredentialApi.ts` | CSRF 재시도 정책과 Idempotency-Key를 포함한 API 호출 |

<h2 id="issuance">발급 Transaction과 1회 응답</h2>

발급 Service는 먼저 Robot 행을 `FOR UPDATE`로 읽고 사용자의 Robot 접근 범위를 함께
검사합니다. 같은 Idempotency-Key를 선점한 뒤 기존 활성 Credential 유무에 따라 최초
발급과 회전을 나눕니다. 회전이면 이전 DB Credential을 `REVOKED`로 바꾸고 Broker의
비밀번호도 교체합니다.

```java
/* MqttCredentialIssuanceService.java · MqttCredentialIssuanceService */
@Transactional
public IssuedMqttCredential issue(
        UUID robotId,
        UUID actorUserId,
        UUID idempotencyKey,
        UUID requestId
) {
    RobotCredentialTarget robot = findRobotForUpdate(
            robotId,
            actorUserId);
    if (robot == null) {
        throw new BusinessException(ErrorCode.ROBOT_NOT_FOUND);
    }

    claimIdempotency(
            principalKeyHash,
            idempotencyKeyHash,
            requestFingerprint,
            requestPath);

    StoredCredential previousCredential =
            findActiveCredential(robotId);
    String password = secretGenerator.generate();

    if (previousCredential == null) {
        provisioned = provisioner.provision(robot.mqttId(), password);
        registerRollbackCleanup(robot.mqttId());
    } else {
        provisioned = provisioner.rotate(
                robot.mqttId(),
                previousCredential.secretHash(),
                password);
        registerRollbackRestore(
                robot.mqttId(),
                previousCredential.secretHash());
        revokeActiveCredential(
                previousCredential.credentialId(),
                actorUserId,
                "ROTATED");
    }

    // ... MQTT Credential Hash 저장과 Robot ACTIVE 전환 ...
    IssuedRobotImageApiKey imageApiKey =
            imageApiKeyIssuanceService.rotate(robotId);
    // ... Secret을 제외한 감사·멱등 응답 저장 ...

    return new IssuedMqttCredential(
            robotId,
            robot.mqttId(),
            credentialId,
            CREDENTIAL_TYPE,
            brokerUri,
            robot.mqttId(),
            password,
            robot.mqttId(),
            times.expiresAt(),
            imageApiKey.uploadUrl(),
            imageApiKey.apiKey());
}
```

Broker 변경은 DB Commit보다 먼저 일어날 수 있으므로 Transaction Rollback만으로
원복되지 않습니다. 최초 발급 실패에는 Broker 계정 제거를, 회전 실패에는 이전
Verifier 복원을 Transaction Synchronization에 등록해 DB와 Registry가 서로 다른
Credential을 가리키지 않게 했습니다.

이미지 API Key도 같은 Transaction에서 회전합니다. 기존 ACTIVE Key를 먼저
`REVOKED`로 바꾸고 새 원문의 SHA-256만 저장합니다. 원문은 반환 객체를 통해 그 요청의
응답으로만 전달합니다.

```java
/* RobotImageApiKeyIssuanceService.java · RobotImageApiKeyIssuanceService */
@Transactional
public IssuedRobotImageApiKey rotate(UUID robotId) {
    jdbcTemplate.update("""
            UPDATE storage.robot_image_api_key
            SET key_status = 'REVOKED',
                revoked_at = clock_timestamp()
            WHERE robot_id = ?
              AND key_status = 'ACTIVE'
            """,
            robotId);

    for (int attempt = 0; attempt < COLLISION_RETRY_LIMIT; attempt++) {
        String apiKey = secretGenerator.generate();
        String keyPrefix = apiKey.substring(
                0,
                Math.min(PREFIX_LENGTH, apiKey.length()));
        UUID apiKeyId = UUID.randomUUID();
        int inserted = jdbcTemplate.update("""
                INSERT INTO storage.robot_image_api_key (
                    api_key_id,
                    robot_id,
                    key_prefix,
                    key_hash
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """,
                apiKeyId,
                robotId,
                keyPrefix,
                sha256Hex(apiKey));
        if (inserted == 1) {
            return new IssuedRobotImageApiKey(
                    apiKeyId,
                    storageProperties.getUploadUrl(),
                    apiKey,
                    keyPrefix);
        }
    }
    throw new IllegalStateException(
            "Could not generate a unique robot image API Key");
}
```

핵심은 DB에 MQTT 비밀번호 원문이나 이미지 API Key 원문을 저장하지 않는다는 점입니다.
멱등 응답 저장소와 감사 Snapshot에도 Credential ID·Version·만료시각 같은 재구성
불가능한 정보만 남깁니다. 따라서 같은 Idempotency-Key를 다시 보내도 이미 노출한
Secret 원문을 재조회하는 API로 사용되지 않습니다.

Controller는 성공 응답을 `201 Created`로 반환하면서 Browser와 중간 Cache가 응답을
보관하지 않도록 `Cache-Control: no-store`와 `Pragma: no-cache`를 함께 지정합니다.

```java
/* MqttCredentialIssuanceController.java · issue() */
@PostMapping
@PreAuthorize("hasAuthority('ROBOT_REGISTER')")
public ResponseEntity<MqttCredentialIssuanceResponse> issue(
        @PathVariable UUID robotId,
        @RequestHeader("Idempotency-Key") UUID idempotencyKey,
        Authentication authentication,
        HttpServletRequest servletRequest
) {
    IssuedMqttCredential credential = issuanceService.issue(
            robotId,
            userIdResolver.require(authentication),
            idempotencyKey,
            requestId);

    // ... MQTT·Image Upload 1회 응답 DTO 조립 ...
    return ResponseEntity
            .created(location)
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .body(response);
}
```

<h2 id="reconcile">Broker Registry 정합성 복구</h2>

DB에 ACTIVE Credential이 없는데 Broker Password Registry에 같은 `mqtt_id`가 남으면
최초 발급은 계정 충돌로 실패합니다. 반대의 경우에는 DB가 가진 활성 Hash를 Broker가
잃어버린 상태입니다. `MqttCredentialRegistryService`는 DB를 정본으로 두고 두 경우를
서로 다르게 복구합니다.

```java
/* MqttCredentialRegistryService.java · reconcile() */
@Transactional
public MqttCredentialRegistryStatusResponse reconcile(
        UUID robotId,
        UUID actorUserId,
        String reason,
        UUID requestId
) {
    RegistryTarget target = findScopedTarget(
            robotId,
            actorUserId,
            true);
    MqttCredentialProvisioner.CredentialRegistrySnapshot beforeBroker =
            provisioner.inspect(target.mqttId());
    RegistryCheck before = evaluate(
            target,
            beforeBroker,
            clock.instant());

    if (!before.status().driftDetected()) {
        return toResponse(before);
    }

    if (target.activePasswordHash() == null) {
        provisioner.revoke(
                target.mqttId(),
                beforeBroker.passwordHash());
    } else {
        provisioner.restore(
                target.mqttId(),
                target.activePasswordHash());
    }
    registerRollback(target, beforeBroker);

    RegistryCheck after = evaluate(target, clock.instant());
    if (after.status().driftDetected()) {
        throw new BusinessException(
                ErrorCode.MQTT_CREDENTIAL_REGISTRY_DRIFT);
    }
    // ... 복구 전후 감사 로그 ...
    return toResponse(after);
}
```

Frontend는 `ROBOT_CREDENTIAL_CONFLICT`일 때만 이 복구 동작을 제시합니다. 복구 뒤에는
최초 발급에 사용했던 같은 Idempotency-Key로 다시 요청해 사용자가 한 번 누른 발급
의도를 별개의 회전 요청으로 만들지 않습니다.

<h2 id="integration">통합 Provisioning 경계</h2>

2026년 8월 3일에는 한 번의 발급 응답으로 Jetson 설정에 필요한 `ROBOT_UUID`,
`MQTT_ID`, Broker·Username·Client ID·MQTT 비밀번호와 이미지 업로드 URL·API Key를
함께 전달하도록 통합했습니다. 두 Secret은 서버에 원문을 보관하지 않고
`Cache-Control: no-store` 응답에서만 제공합니다.

이미지 저장·Incident 판정은 역할 B의 구현 범위가 아닙니다. 이 디테일은 역할 B가
담당한 Robot/MQTT Credential 발급 흐름에 이미지 업로드 접속값을 함께 전달하고
회전시키는 Provisioning 경계까지만 다룹니다.

<figure class="verification-shot verification-shot--bottom">
  <a href="{{ '/assets/images/projects/gilbom/robot-credential-management-2026-08-15.png' | relative_url }}" aria-label="Robot Credential 관리 영역 크게 보기">
    <img src="{{ '/assets/images/projects/gilbom/robot-credential-management-2026-08-15.png' | relative_url }}" alt="로봇별 온라인 상태와 Credential 관리 목록 및 회전 버튼이 표시된 길봄 로봇 상태 관리 화면" width="1642" height="958" loading="lazy">
  </a>
  <figcaption>
    <span>ROBOT / CREDENTIAL</span>
    <strong>로봇 상태와 분리한 Credential 관리</strong>
    <p>2026-08-15 촬영. 로봇별 상태와 Credential 회전 진입점을 함께 확인한 화면입니다. 게시용 사본에서는 브라우저 주소와 사용자 계정을 가렸습니다.</p>
  </figcaption>
</figure>

<h2 id="verification">검증과 실제 장비 범위</h2>

현재 HEAD의 Credential 단위 테스트 10건에서 1회 비밀번호 응답과 이미지 API Key
회전 규칙을 확인했습니다. PostGIS가 필요한 통합 테스트 14건은 2026년 8월 3일의
보존 기록이며, 현재 실행 결과와 구분합니다.

실제 운영 Robot의 회전은 기존 연결과 두 Secret을 즉시 무효화하므로 자동 실행하지
않았습니다. 실제 Jetson 보호 설정 주입, EC2 Broker 재연결과 HTTPS 이미지 업로드는
별도 장비 검증 범위입니다.

<h2 id="sources">근거 문서</h2>

- `CHANGLOGS/2026-07-30_1602_robot-registration-ui.md`
- `CHANGLOGS/2026-07-30_2156_mission-robot-credential-activation.md`
- `CHANGLOGS/2026-07-30_2203_mqtt-credential-registry-conflict-recovery.md`
- `CHANGLOGS/2026-07-30_2223_credential-response-and-map-bounds.md`
- `CHANGLOGS/2026-07-30_2238_robot-credential-management-placement.md`
- `CHANGLOGS/2026-08-03_1645_integrated-robot-provisioning.md`
- `CHANGLOGS/2026-08-03_1739_integrated-provisioning-runtime.md`
- `CHANGLOGS/2026-08-03_1935_ec2-upload-url-preparation.md`
