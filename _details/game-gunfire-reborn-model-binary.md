---
layout: game-article
title: FBX 모델과 애니메이션을 실행용 바이너리로 변환하기
project_slug: gunfire-reborn
game_portfolio: true
game_order: 9
topic: 애니메이션과 리소스
summary: Assimp가 읽은 정적·애니메이션 모델의 메시, 재질, 뼈와 키 데이터를 정해진 순서로 쓰고 런타임 로더가 다시 조립한다.
tags: [모델, 바이너리, 애니메이션]
permalink: /projects/gunfire-reborn/technical/model-binary/
nav_context: GAME PORTFOLIO / GUNFIRE REBORN
---

## 모델에서 실행에 필요한 데이터를 꺼내기

맵과 몬스터의 모델에는 메시·재질·텍스처 경로가 들어 있고, 움직이는 모델에는 뼈와 애니메이션 정보도 들어 있다. 실행할 때마다 원본 FBX의 구조를 해석하는 과정을 줄이기 위해, 필요한 데이터를 바이너리 파일로 기록하는 코드를 작성했다.

변환은 `CModel::Make_Binary_NonAnim()`과 `CModel::Make_Binary_Anim()`에서 수행한다. 두 함수는 입력 모델 경로와 출력 파일 경로를 받아 Assimp가 읽은 데이터를 `WriteFile()`로 기록한다. 런타임의 `AI_Info`는 `ReadFile()`로 같은 순서의 데이터를 읽어 메시·재질·애니메이션 구조를 구성한다.

## Assimp로 읽고 출력 파일 열기

정적 모델 변환 함수는 좌수 좌표계 변환과 실시간 처리용 플래그를 설정한다. `TYPE_NONANIM`에는 `aiProcess_PreTransformVertices`를 추가한다. 원본 모델 읽기가 실패하면 파일 기록으로 넘어가지 않는다.

```cpp
_uint iFlag = {
    aiProcess_ConvertToLeftHanded | aiProcessPreset_TargetRealtime_Fast
};

if (eModelType == TYPE_NONANIM)
    iFlag |= aiProcess_PreTransformVertices;

pAIScene = Importer.ReadFile(pModelFilePath, iFlag);
if (0 == pAIScene)
    return E_FAIL;

HANDLE hFile = CreateFile(OutputFilePath, GENERIC_WRITE, 0, 0,
    CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
```

출력 파일은 `CREATE_ALWAYS`로 연다. 같은 출력 경로로 다시 변환하면 파일 내용도 새로 기록된다. 변환 함수는 출력 핸들을 확인한 뒤 메시 개수부터 순서대로 쓴다.

## 정적 메시: 개수와 데이터 순서를 맞추기

파일 앞에 메시 개수를 쓰고, 각 메시마다 재질 인덱스·정점 수·면 수를 기록한다. 읽는 코드는 이 개수로 배열 크기와 반복 횟수를 정한다.

| 파일 영역 | 기록하는 데이터 | 읽는 쪽의 역할 |
| --- | --- | --- |
| 메시 개수 | `mNumMeshes` | 메시 배열 크기 설정 |
| 메시별 정보 | 재질 인덱스, 정점 수, 면 수, 이름 길이와 이름 영역 | 메시 구성과 반복 횟수 설정 |
| 정점 | 위치, 노멀, UV, 탄젠트 | 각 정점 속성 배열 구성 |
| 면 | 삼각형의 정점 인덱스 3개 | 삼각형 연결 정보 구성 |
| 재질 | 재질 수, 텍스처 타입별 개수, 경로 길이와 경로 | 재질별 텍스처 경로 구성 |

정적 모델의 위치에는 `XMVector3TransformCoord()`로 `PreTransformMatrix`를 적용한다. 노멀과 탄젠트에는 `XMVector3TransformNormal()`을 사용한다. 위치와 방향을 구분해 변환한 뒤 파일에 쓴다.

정점 하나를 쓰는 순서는 다음과 같다.

```cpp
WriteFile(hFile, &vPosition, sizeof(_float3), &dwByte, nullptr);
WriteFile(hFile, &vNormal, sizeof(_float3), &dwByte, nullptr);
WriteFile(hFile, &vTexcoord, sizeof(_float2), &dwByte, nullptr);
WriteFile(hFile, &vTangent, sizeof(_float3), &dwByte, nullptr);
```

`AI_Info::Initialze_NonAnim()`도 같은 순서와 크기로 읽는다.

```cpp
ReadFile(hFile, &vPosition, sizeof(_float3), &dwByte, nullptr);
ReadFile(hFile, &vNormal, sizeof(_float3), &dwByte, nullptr);
ReadFile(hFile, &vTexcoord, sizeof(_float2), &dwByte, nullptr);
ReadFile(hFile, &vTangent, sizeof(_float3), &dwByte, nullptr);

MeshInfo.m_vecPositions[j] = vPosition;
MeshInfo.m_vecNormals[j] = vNormal;
MeshInfo.m_vecTexcoords[j] = vTexcoord;
MeshInfo.m_vecTangents[j] = vTangent;
```

파일 안에는 각 정점 필드의 이름이 따로 들어 있지 않다. 따라서 쓰기 함수와 읽기 함수가 순서와 자료형 크기를 함께 지켜야 한다. 한쪽에서 필드를 추가하면 뒤에 있는 데이터의 읽기 위치도 달라진다.

## 애니메이션 메시: 뼈와 정점의 관계 보존

움직이는 모델에는 정점 배열만으로 부족하다. 어떤 뼈가 어떤 정점에 얼마만큼 영향을 주는지도 남겨야 한다. `Make_Binary_Anim()`은 메시의 기본 정점 데이터 뒤에 뼈 개수와 뼈별 정보를 추가하고, 그다음 면 인덱스를 쓴다.

뼈마다 오프셋 행렬과 이름, 가중치 개수를 기록한다. 각 가중치는 영향을 받는 정점 ID와 가중치 값으로 구성된다.

```cpp
WriteFile(hFile, &ID, sizeof(_uint), &dwByte, nullptr);
WriteFile(hFile, &Weight, sizeof(_float), &dwByte, nullptr);
```

정점 ID는 메시 안에서 영향을 받는 정점을 지정하고, 가중치는 해당 뼈의 변환이 정점에 반영되는 비율을 지정한다. `AI_Info::Initialize_Anim()`은 이 데이터를 읽어 메시의 뼈 정보에 보관한다.

## 노드 계층: 자식 수와 재귀 순회로 구조 복원

메시가 참조하는 뼈 정보와 노드의 부모·자식 구조는 함께 필요하다. `Write_Bones_Anim()`은 루트 노드부터 이름, 변환 행렬, 자식 수를 기록하고 각 자식을 재귀적으로 방문한다. 노드의 변환 행렬은 전치한 뒤 저장한다.

```cpp
_int iNumChildren = pNode->mNumChildren;
WriteFile(hFile, &iNumChildren, sizeof(_int), &dwByte, nullptr);

for (int i = 0; i < iNumChildren; ++i)
{
    Write_Bones_Anim(hFile, pNode->mChildren[i]);
}
```

읽는 쪽의 `AI_Info::Read_Bones()`는 노드 하나를 만들고 이름과 행렬, 자식 수를 읽는다. 자식 배열을 그 수만큼 확보한 뒤 같은 순서로 재귀 호출한다. 노드마다 자식 수를 기록했기 때문에 다음 바이트가 자식 노드인지, 해당 하위 계층을 마친 다음 데이터인지 읽는 코드가 구분할 수 있다.

## 애니메이션 채널: 값과 시간을 함께 저장

노드 계층 다음에는 애니메이션 개수를 기록한다. 각 애니메이션은 이름, `Duration`, `TickPerSecond`, 채널 수를 가진다. 채널에는 대상 노드 이름과 위치·크기·회전 키 배열이 들어간다.

위치와 크기 키의 값은 `_float3`, 회전 키의 값은 `_float4`로 기록한다. 각 값 뒤에는 `_double` 시간값을 붙인다. 위치 키 기록 부분은 다음과 같다.

```cpp
_uint iNumPositionsKeys = pChannel->mNumPositionKeys;
WriteFile(hFile, &iNumPositionsKeys, sizeof(_uint), &dwSize, nullptr);
for (int k = 0; k < iNumPositionsKeys; ++k)
{
    _float3 vPos = {};
    _double mTime = { 0 };
    memcpy(&vPos, &(pChannel->mPositionKeys[k].mValue), sizeof(_float3));
    memcpy(&mTime, &(pChannel->mPositionKeys[k].mTime), sizeof(_double));
    WriteFile(hFile, &vPos, sizeof(_float3), &dwByte, nullptr);
    WriteFile(hFile, &mTime, sizeof(_double), &dwByte, nullptr);
}
```

값만 저장하면 어느 시점의 자세인지 알 수 없다. 시간값과 `TickPerSecond`를 함께 보관해야 런타임에서 재생 시점에 해당하는 키를 선택하고 보간할 수 있다. 읽어 들인 채널과 키는 [애니메이션 전환]({{ '/projects/gunfire-reborn/technical/animation-transition/' | relative_url }})에도 사용한다.

## 결과와 형식의 경계

변환 코드는 Assimp가 구성한 모델에서 실행에 필요한 데이터를 추출하고, 런타임 로더는 정해진 필드를 읽어 모델 구조를 조립한다. 정적 모델은 메시와 재질을, 애니메이션 모델은 여기에 뼈·노드 계층·채널 키를 더해 저장했다.

파일 형식은 C++ 자료형의 크기와 기록 순서에 의존한다. 이름과 텍스처 경로도 길이와 실제 데이터가 일치해야 한다. 형식을 바꾸려면 쓰기·읽기 함수를 함께 수정하고 기존 파일을 다시 생성해야 한다. 버전 식별과 읽은 바이트 수 검사는 형식 변경과 손상된 파일을 구분하기 위한 확장 과제다.
