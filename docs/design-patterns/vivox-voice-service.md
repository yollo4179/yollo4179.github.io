# Vivox 음성 채팅의 서비스와 UI 경계

## 적용 상황

게임 로그인과 방 입장·이탈에 음성 채팅을 연결한다. 씬 전환과 방 이탈은 서로 다른 동작이므로 음성 서비스는 앱 수명으로 유지하고 방 상태를 구독한다.

```text
게임 로그인 → Vivox 로그인
방 입장 → room_ + 방 ID 채널 참가
다른 방 이동 → 기존 채널 퇴장 후 새 채널 참가
방 이탈 → 채널 퇴장
게임 로그아웃 → Vivox 로그아웃
```

## 구성과 디렉터리

```text
Client/Assets/Game/
├─ Features/VoiceChat/Runtime/
│  ├─ VoiceChatService.cs
│  ├─ VivoxSdkGateway.cs
│  └─ VoiceChatContracts.cs
└─ UI/Derived/
   ├─ UI_RoomVoice.cs
   └─ UI_RoomVoiceAccountRow.cs
```

서비스는 로그인·채널 전환을 직렬화하고 같은 채널의 중복 입장을 건너뛴다. SDK Gateway는 SDK 호출과 참가자 이벤트를 게임용 상태로 변환한다. 서비스는 연결 상태와 참가자 상태를 보관하고 변경 이벤트를 발행한다.

UI는 서비스의 변경 이벤트를 구독해 연결·발언·음소거 상태를 표시한다. 마이크 음소거 요청은 서비스에서 SDK로 전달한다. 화면은 Vivox 참가자 객체 대신 게임용 Snapshot을 사용한다.

## 적용한 구조

| 구조 | 적용 |
| --- | --- |
| SDK 어댑터 경계 | VivoxSdkGateway가 SDK 호출·이벤트를 감쌈 |
| 발행·구독 | 로그인·방 변경을 서비스가 구독하고 서비스 변경을 UI가 구독 |
| 수명 분리 | 서비스는 앱 수명, 채널은 방 연결, UI 구독은 화면 수명 |
| 생성자 주입 | SDK Gateway·로그인 세션·Room 서비스를 음성 서비스에 전달 |

서비스 종료 시 이벤트 구독을 해제하고 작업을 취소한다. UI 종료 시 화면의 서비스 구독을 해제한다.

## 해결 과제: 음성 입력의 배경음 유입

상대방 마이크를 통해 배경 음악이 함께 들리는 문제가 있다. 에코 제거·노이즈 억제·자동 게인 제어는 적용하지 않았다.

| 적용할 항목 | 목적 |
| --- | --- |
| AEC | 각 참가자의 스피커 재생음이 마이크로 재입력되어 되돌아가는 에코 감소 |
| Noise Suppression | 지속적인 배경 소음 감소 |
| AGC | 마이크 입력 음량 자동 조절 |

배경 음악 유입에는 노이즈 억제를 우선 적용한다. 음악의 완전 제거를 전제하지 않고 말소리 손상 여부를 확인하며 에코 제거·음량 조절도 함께 조정한다.

## 코드 근거

- `Client/Assets/Game/Features/VoiceChat/Runtime/VoiceChatService.cs`
- `Client/Assets/Game/Features/VoiceChat/Runtime/VivoxSdkGateway.cs`
- `Client/Assets/Game/Features/VoiceChat/Runtime/VoiceChatContracts.cs`
- `Client/Assets/Game/UI/Derived/UI_RoomVoice.cs`
- `Client/Assets/Game/UI/Derived/UI_RoomVoiceAccountRow.cs`
- `Client/Assets/Game/App/Runtime/EntryPoints/WaitingRoomEntryPoint.cs`
