---
title: 순찰 구역 좌표와 SVG Overlay 정합성 복구
order: 10
number: "10"
domain: PATROL AREA · MAP INTERACTION
detail_category: 트러블슈팅
category_slug: troubleshooting
category_url: /projects/gilbom/troubleshooting/
permalink: /projects/gilbom/troubleshooting/10-patrol-area-coordinate-overlay/
summary: 지도 드래그·확대 뒤에도 클릭 GPS와 Polygon·Marker가 일치하도록 OverlayView 투영을 기준으로 사용하고 CSP 안전 SVG로 렌더링했습니다.
verified_at: 2026-08-04
validation_scope: 로컬 Naver SDK 좌표 변환·Frontend 단위 테스트 · 운영 EC2 미배포
result_label: Frontend 단위 44 PASS · Naver SDK 좌표 일치
tags:
  - Naver Maps
  - GeoJSON
  - SVG Overlay
  - CSP
previous_title: Robot 등록과 Credential 수명주기 분리
previous_url: /projects/gilbom/maintainability/09-robot-credential-lifecycle/
next_title: Robot과 Mission 상태 불일치 해결
next_url: /projects/gilbom/troubleshooting/11-mission-lifecycle-consistency/
nav_context: GILBOM / TROUBLESHOOTING 10
---

<nav class="project-toc" aria-label="순찰 구역 좌표 글 목차">
  <p>이 글에서 다루는 내용</p>
  <ol>
    <li><a href="#problem">화면과 GPS가 어긋난 문제</a></li>
    <li><a href="#polygon">Polygon 입력 정규화</a></li>
    <li><a href="#overlay">Overlay 투영과 표시 복구</a></li>
    <li><a href="#sources">근거 문서</a></li>
  </ol>
</nav>

<h2 id="problem">화면과 GPS가 어긋난 문제</h2>

순찰 구역 등록 지도에서는 경계점을 임의 순서로 찍어도 유효한 GeoJSON Polygon을
만들어야 합니다. 첫 번째 구현은 Naver SDK의 Polygon과 HTML `content`로 만든 번호
Marker를 사용했습니다. 번호 Marker의 HTML에는 크기·색상·배치를 지정하는 `style`
속성이 들어 있었고, CSP가 이 속성을 차단하자 Marker가 왼쪽 위로 밀렸습니다. 같은
환경에서 Polygon이 검게 보이는 현상도 관측됐지만, Polygon 렌더링 경로를 가리키는
CSP 거부 로그는 보존되지 않아 직접적인 원인으로 단정하지 않았습니다.

Naver SDK 도형을 지도 바깥의 React SVG로 교체한 뒤에는 별도의 드래그 문제가
발생했습니다. 저장된 GPS는 정상이었지만, Naver 지도가 화면을 갱신하는 시점과
지도 바깥의 React SVG가 좌표를 갱신하는 시점이 달랐습니다. 이 단계에서 지도를
드래그한 직후 경계점을 추가하거나 다시 드래그하면 타일과 점·Polygon의 위치가
어긋났습니다.

GPS 값과 SVG `cx·cy`가 정상이어도 Naver `overlayLayer` 높이가 `0px`인 상태에서
CSS `height: 100%`가 적용돼 실제 SVG 높이가 0이 되는 표시 문제도 따로 있었습니다.

<figure class="verification-shot verification-shot--media-crop">
  <img src="{{ '/VEDEOS/gilbom-patrol-area.gif' | relative_url }}" alt="지도에서 순찰 구역의 경계점을 선택해 등록하고 등록된 구역을 수정하는 과정" width="1920" height="1080" loading="lazy">
  <figcaption>
    <span>PATROL AREA REGISTRATION</span>
    <strong>순찰 구역 경계점 등록과 수정</strong>
    <p>지도에서 경계점을 선택해 구역을 등록하고, 목록에 반영된 구역의 경계를 다시 수정합니다.</p>
  </figcaption>
</figure>

<h2 id="polygon">Polygon 입력 정규화</h2>

| 파일·함수 | 역할 |
| --- | --- |
| `patrolAreaBoundary.ts · orderBoundaryPointsForPolygon()` | 중복 제거, 최근접 순회, 2-opt, 반시계 방향·시작점 정규화 |
| `patrolAreaBoundary.ts · createPolygonBoundary()` | 정렬된 좌표의 첫 점을 끝에 추가해 GeoJSON Ring 생성 |
| `PatrolAreaBoundaryEditor · MapAttachedBoundaryOverlay` | 저장 GPS를 Naver 화면 좌표로 투영해 SVG 도형 생성 |
| `PatrolAreaBoundaryEditor` | 지도 클릭 GPS 저장과 Viewport Event 재투영 예약 |
| `PatrolAreaManagePage` | 점 개수·면적·자체 교차·GPS 범위를 검증한 뒤 API 요청 |
| `patrolAreaBoundary.test.ts` | 입력 순열 불변성·교차 제거·점 보존·Ring 닫힘 회귀 검증 |

- 지도 클릭 좌표는 GeoJSON 순서인 `[longitude, latitude]`로 저장합니다.
- 서로 다른 점 3개 미만, 면적 0, 자체 교차가 남은 입력은 등록하지 않습니다.
- 최근접 순회로 초기 경계를 만들고 2-opt로 교차 간선을 제거합니다.
- 결과는 반시계 방향과 같은 시작점으로 정규화합니다.
- API 전송 시 첫 좌표를 마지막에 한 번 추가해 Ring을 닫습니다.

전역 최단 TSP보다 모든 점 보존, 교차 제거와 입력 순서에 무관한 결정성을 우선한
휴리스틱입니다. 복잡한 오목 구역의 업무 의미까지 자동 판단하는 알고리즘으로
표현하지 않습니다.

정렬 함수는 먼저 같은 `[longitude, latitude]`를 제거하고 사전순으로 가장 작은 점을
시작점으로 삼습니다. 최근접 이웃으로 초기 순회를 만든 뒤 교차하거나 더 짧아지는 두
간선을 찾으면 중간 구간을 뒤집는 2-opt를 적용합니다. 마지막에는 Polygon 방향과
시작점을 다시 고정해 같은 좌표 집합이 항상 같은 요청 Body가 되게 합니다.

```typescript
/* patrolAreaBoundary.ts · orderBoundaryPointsForPolygon() */
export function orderBoundaryPointsForPolygon(
  points: GeoJsonCoordinate[],
): GeoJsonCoordinate[] {
  const uniquePoints = removeDuplicatePoints(points)
  const improvedTour = improveTourWithTwoOpt(
    createNearestNeighborTour(uniquePoints),
  )
  const counterClockwiseTour = polygonSignedArea(improvedTour) < 0
    ? [...improvedTour].reverse()
    : improvedTour
  return rotateToSmallestCoordinate(counterClockwiseTour)
}

export function createPolygonBoundary(
  points: GeoJsonCoordinate[],
): GeoJsonPolygon {
  const ring = orderBoundaryPointsForPolygon(points).map(
    ([longitude, latitude]): GeoJsonCoordinate => [longitude, latitude],
  )
  ring.push([...ring[0]])
  return {
    type: 'Polygon',
    coordinates: [ring],
  }
}
```

2-opt는 모든 조합을 탐색하는 TSP Solver가 아닙니다. 이 기능에서 필요한 것은 최단
순찰 Route가 아니라, 사용자가 찍은 모든 경계점을 잃지 않으면서 교차하지 않는
Polygon Ring을 결정적으로 만드는 것입니다.

<h2 id="overlay">Overlay 투영과 표시 복구</h2>

Nginx는 응답 헤더에 CSP의 `style-src 'self'` 정책을 적용했습니다. 이 정책은 길봄
서비스가 제공하는 CSS만 허용하고, HTML의 `style` 속성·`<style>` 요소와 다른 출처의
외부 CSS는 별도 허용 조건이 없으면 차단합니다.[^csp-style-src] 네이버 지도는 HTTPS로
정상 호출됐지만, 기존 번호 Marker가 HTML `content`에 넣은 `style` 속성은 이 정책과
충돌했습니다. Polygon이 검게 보인 현상은 같은 CSP 환경에서 관측된 사실로만 남기고,
보존되지 않은 Polygon 전용 CSP 오류를 원인처럼 작성하지 않았습니다.
카카오 지도 SDK에서도 `style-src`에서 `unsafe-inline`을 제거한 뒤 CSP 오류와 UI 깨짐이
발생한 사례가 있습니다.[^map-sdk-csp-breakage]

CSP는 번호 Marker의 HTML 스타일이 적용되지 않은 문제와 관련됐습니다. 지도 드래그 후
발생한 위치 불일치는 별개의 문제였습니다. 저장된 GPS 좌표는 정상적으로 유지됐지만,
지도 화면이 이동한 뒤 SVG 좌표가 제때 갱신되지 않아 이전 화면 위치에 남았습니다.
따라서 드래그 문제는 좌표 저장 방식이 아니라 현재 지도 기준으로 SVG 좌표를 다시
계산하는 호출 시점을 수정했습니다.

CSP를 완화하지 않고 Naver `OverlayView`의 `overlayLayer` 안에 SVG DOM을 직접
부착했습니다. 네이버 지도는 배경 지도와 좌표 변환을 담당하고, 경계점·선·면은
저장된 GPS를 기준으로 그렸습니다. `draw()`는 `fromCoordToOffset()`으로 변환한 화면
좌표를 SVG에 적용하고, 도형의 색상과 크기는 길봄 서비스의 외부 CSS에서
불러옵니다.

드래그·확대 중 연속 Event는 `requestAnimationFrame`으로 Frame당 한 번만 합치고,
`dragend`와 `idle`에서 최종 좌표를 보정했습니다. 오른쪽 `+ / −` 버튼만 확대 입력으로
허용하고 휠·핀치·키보드·더블클릭 확대는 차단했습니다. `+ / −`는 직접 만든 버튼이
아니라 `zoomControl: true`와 `ZoomControlStyle.SMALL`로 활성화한 Naver SDK 기본
컨트롤입니다. SVG의 백분율 크기는 제거했습니다. 대신 `draw()`가 지도 컨테이너의
`clientWidth·clientHeight`를 읽어 SVG의 `width·height·viewBox` 속성에 현재 픽셀
크기를 적용합니다.

`MapAttachedBoundaryOverlay`는 Naver가 관리하는 `overlayLayer`에 SVG를 직접 붙입니다.
`overlayLayer`는 SVG가 지도와 같은 투영 정보를 사용하는 부착 위치를 제공합니다. 다만
SVG 요소 자체에 GPS를 자동으로 연결해 주지는 않습니다. SVG의 지리적 위치는
`draw()`가 현재 지도 투영을 다시 조회해 화면 좌표를 갱신함으로써 유지됩니다.

`draw()`라는 생명주기 메서드와 `getProjection()`은 Naver `OverlayView`가 제공합니다.
하지만 저장된 GPS를 읽고 Polygon·Circle·번호 Label에 좌표를 적용하는 `draw()`의
본문은 직접 작성했습니다. Naver SDK가 GPS를 받아 SVG를 자동으로 그리는 구조가
아닙니다.

```typescript
/* PatrolAreaBoundaryEditor.tsx · MapAttachedBoundaryOverlay */
class MapAttachedBoundaryOverlay extends maps.OverlayView {
  private points = initialPoints
  private readonly element = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  )
  private shape: SVGPolygonElement | SVGPolylineElement | null = null
  private pointGroups: SVGGElement[] = []
  private pointCircles: SVGCircleElement[] = []
  private pointLabels: SVGTextElement[] = []

  onAdd() {
    this.getPanes().overlayLayer.appendChild(this.element)
    this.draw()
  }

  draw() {
    if (this.getMap() === null) {
      return
    }
    const projection = this.getProjection()
    const width = mapElement.clientWidth
    const height = mapElement.clientHeight
    this.element.setAttribute('width', String(width))
    this.element.setAttribute('height', String(height))
    this.element.setAttribute('viewBox', `0 0 ${width} ${height}`)

    const projectedPoints = this.points.map(([longitude, latitude]) => {
      const offset = projection.fromCoordToOffset(
        new maps.LatLng(latitude, longitude),
      )
      return {
        x: Number(offset.x.toFixed(2)),
        y: Number(offset.y.toFixed(2)),
      }
    })

    this.shape?.setAttribute(
      'points',
      projectedPoints.map(({ x, y }) => `${x},${y}`).join(' '),
    )
    projectedPoints.forEach(({ x, y }, index) => {
      const [longitude, latitude] = this.points[index]
      this.pointGroups[index].setAttribute(
        'data-longitude',
        String(longitude),
      )
      this.pointGroups[index].setAttribute(
        'data-latitude',
        String(latitude),
      )
      this.pointCircles[index].setAttribute('cx', String(x))
      this.pointCircles[index].setAttribute('cy', String(y))
      this.pointLabels[index].setAttribute('x', String(x))
      this.pointLabels[index].setAttribute('y', String(y))
      this.pointLabels[index].textContent = String(index + 1)
    })
  }

  onRemove() {
    this.element.remove()
  }
}
```

`onAdd()`는 이미 만든 SVG를 `overlayLayer`에 부착하고 첫 `draw()`를 실행합니다.
`draw()`는 먼저 지도 영역의 크기를 SVG의 `width·height·viewBox`에 반영합니다. 그다음
저장된 `[경도, 위도]`를 Naver `LatLng(위도, 경도)`로 넘기고,
`fromCoordToOffset()`이 반환한 현재 화면의 `x·y`를 Polygon과 각 Marker에 적용합니다.
따라서 지도 조작 중 저장된 GPS는 바뀌지 않고 `points·cx·cy·x·y`만 달라집니다.

`createElementNS()`는 Overlay를 처음 만들거나 경계점 개수에 맞춰 SVG 요소를 추가할
때 실행됩니다. 드래그·확대·축소 때는 SVG를 다시 만들지 않고 기존 요소의 화면 좌표만
`draw()`에서 변경합니다. `onRemove()`는 Overlay가 지도에서 분리될 때 SVG를 제거합니다.

지도 Click Event에서는 클릭한 화면 위치를 직접 GPS 좌표로 변환하지 않고 Naver SDK가
제공한 `event.coord`를 GeoJSON 순서로 저장합니다. 드래그와 확대 중 연속 Event는 한
Frame에 한 번만 그리고, `dragend·idle`도 같은 예약 함수에 연결해 마지막 좌표를
보정합니다.

```typescript
/* PatrolAreaBoundaryEditor.tsx · Click·Viewport Event 처리 */
clickListener = maps.Event.addListener(map, 'click', (event) => {
  const nextPoint: GeoJsonCoordinate = [
    roundCoordinate(event.coord.lng()),
    roundCoordinate(event.coord.lat()),
  ]
  const nextPoints = [...pointsRef.current, nextPoint]
  pointsRef.current = nextPoints
  boundaryOverlayRef.current?.setPoints(
    orderBoundaryPointsForPolygon(nextPoints),
  )
  onChangeRef.current(nextPoints)
})

const scheduleProjection = () => {
  if (projectionFrame !== null) {
    return
  }
  projectionFrame = window.requestAnimationFrame(() => {
    projectionFrame = null
    boundaryOverlayRef.current?.draw()
  })
}

const viewportEvents = [
  'drag',
  'panning',
  'zooming',
  'bounds_changed',
  'size_changed',
  'zoom_changed',
  'dragend',
  'idle',
] as const
```

API 호출 직전에는 표시가 정상이라는 사실과 별개로 유효한 Geometry인지 다시
검증합니다. 세 점 미만, 면적 0, 남은 자체 교차와 GPS 범위 초과는 Backend로 보내지
않습니다.

```typescript
/* PatrolAreaManagePage.tsx · 순찰 구역 등록 검증 */
const uniquePointCount = new Set(
  boundaryPoints.map(([longitude, latitude]) => (
    `${longitude}:${latitude}`
  )),
).size
const orderedPoints = orderBoundaryPointsForPolygon(boundaryPoints)

if (uniquePointCount < 3 || !polygonHasArea(orderedPoints)) {
  setFormError(new Error(
    '서로 다른 위치의 경계점으로 면적이 있는 구역을 만들어주세요.',
  ))
  return
}
if (hasBoundarySelfIntersections(orderedPoints)) {
  setFormError(new Error(
    '경계점 연결에서 교차를 제거하지 못했습니다.',
  ))
  return
}

const boundary: GeoJsonPolygon = createPolygonBoundary(orderedPoints)
```

[^csp-style-src]: `style-src`는 브라우저가 불러오고 실행할 수 있는 CSS의 출처를 제한합니다. `'self'`는 같은 출처의 CSS 파일을 허용합니다. `<style>` 요소와 HTML `style` 속성은 정책에서 별도로 허용하지 않으면 차단되며, `setAttribute('style', ...)`도 `style` 속성을 설정하므로 같은 검사를 받습니다. 반면 `element.style.display = ...`, `style.setProperty()`와 `style.cssText`처럼 CSSOM을 통해 스타일을 변경하는 방식은 이 인라인 검사 대상과 구분됩니다. [CSP `style-src` 참고 문서](https://content-security-policy.com/style-src/), [W3C CSP Level 3](https://www.w3.org/TR/CSP3/#directive-style-src)

[^map-sdk-csp-breakage]: 카카오 지도 개발자 포럼에는 `style-src`에서 `unsafe-inline`을 제거한 뒤 오류와 UI 깨짐이 발생한 사례가 기록돼 있습니다. 네이버 지도의 직접 근거가 아니라, 외부 지도 SDK와 CSP 스타일 정책이 충돌할 수 있음을 보여주는 유사 사례입니다. [카카오 데브톡: CSP 설정 후 Style 깨짐 문제](https://devtalk.kakao.com/t/csp-style/112718)

<h2 id="sources">근거 문서</h2>

- `CHANGLOGS/2026-07-30_2006_patrol-area-page-mission-selection.md`
- `CHANGLOGS/2026-07-30_2025_mission-area-selection-preview.md`
- `CHANGLOGS/2026-07-30_2049_patrol-area-polygon-ordering.md`
- `CHANGLOGS/2026-07-30_2105_patrol-area-map-zoom-lock.md`
- `CHANGLOGS/2026-07-30_2122_patrol-area-csp-safe-overlay.md`
- `CHANGLOGS/2026-07-30_2139_mission-create-idle-robot-preview.md`
- `CHANGLOGS/2026-08-02_1452_zone-id-format-and-availability.md`
- `CHANGLOGS/2026-08-02_1545_patrol-area-code-placeholder.md`
- `CHANGLOGS/2026-08-04_1807_patrol-area-drag-coordinate.md`
- `CHANGLOGS/2026-08-04_1823_patrol-area-marker-visibility-zoom-control.md`
