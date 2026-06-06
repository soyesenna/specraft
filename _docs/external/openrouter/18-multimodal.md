# OpenRouter 멀티모달 가이드

> 원문: https://openrouter.ai/docs/guides/overview/multimodal/overview
> https://openrouter.ai/docs/guides/overview/multimodal/image-understanding
> https://openrouter.ai/docs/guides/overview/multimodal/image-generation
> https://openrouter.ai/docs/guides/overview/multimodal/pdfs
> https://openrouter.ai/docs/guides/overview/multimodal/audio
> https://openrouter.ai/docs/guides/overview/multimodal/videos
> https://openrouter.ai/docs/guides/overview/multimodal/video-generation
> https://openrouter.ai/docs/guides/overview/multimodal/tts
> https://openrouter.ai/docs/guides/overview/multimodal/stt
> https://openrouter.ai/docs/requests

OpenRouter는 텍스트를 넘어 이미지, PDF, 오디오, 비디오 등 다양한 입력/출력 모달리티를 지원합니다. 통합 API를 통해 시각 분석, 음성 합성, 음성 인식, 이미지 생성, 비디오 생성 등 풍부한 멀티모달 상호작용이 가능합니다.

---

## 목차

- [지원 모달리티 요약](#지원-모달리티-요약)
- [이미지 입력](#이미지-입력)
- [PDF 처리](#pdf-처리)
- [오디오 입력](#오디오-입력)
- [오디오 출력 (채팅)](#오디오-출력-채팅)
- [이미지 생성](#이미지-생성)
- [비디오 입력](#비디오-입력)
- [비디오 생성](#비디오-생성)
- [Text-to-Speech (TTS)](#text-to-speech-tts)
- [Speech-to-Text (STT)](#speech-to-text-stt)
- [응답 Usage에서 미디어 토큰 추적](#응답-usage에서-미디어-토큰-추적)
- [모델 호환성 확인](#모델-호환성-확인)
- [관련 문서](#관련-문서)

---

## 지원 모달리티 요약

| 모달리티 | 입력 방식 | 출력 방식 | 엔드포인트 |
| --- | --- | --- | --- |
| **이미지** | `image_url` 콘텐츠 타입 (URL/base64) | `modalities` + `image_config` | `/api/v1/chat/completions` |
| **PDF** | `file` 콘텐츠 타입 (URL/base64) + `file-parser` 플러그인 | - | `/api/v1/chat/completions` |
| **오디오 입력** | `input_audio` 콘텐츠 타입 (base64 전용) | `modalities: ["text", "audio"]` | `/api/v1/chat/completions` |
| **비디오 입력** | `video_url` 콘텐츠 타입 (URL/base64) | - | `/api/v1/chat/completions` |
| **비디오 생성** | 프롬프트 텍스트 | 비디오 파일 (비동기) | `POST /api/v1/videos` |
| **TTS** | 텍스트 | 오디오 바이트 스트림 | `/api/v1/audio/speech` |
| **STT** | base64 오디오 | 텍스트 JSON | `/api/v1/audio/transcriptions` |

### 입력 포맷 지원

| 모달리티 | URL | base64 | 비고 |
| --- | --- | --- | --- |
| 이미지 | 지원 | `data:image/jpeg;base64,...` | 공개 URL 권장 |
| PDF | 지원 | `data:application/pdf;base64,...` | 공개 URL 권장 |
| 오디오 | 미지원 | raw base64 + format 필드 | 반드시 base64 사용 |
| 비디오 | 프로바이더별 | `data:video/mp4;base64,...` | Gemini AI Studio: YouTube만 |

---

## 이미지 입력

비전 지원 모델에 이미지를 전송하여 분석, 설명, OCR 등의 작업을 수행할 수 있습니다. `/api/v1/chat/completions` 엔드포인트의 `messages` 파라미터에 `image_url` 콘텐츠 타입을 사용합니다.

### ImageContentPart 타입

```typescript
type ImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string;       // URL 또는 base64 인코딩 이미지 데이터
    detail?: string;   // 선택, 기본값 "auto"
  };
};

type ContentPart = TextContent | ImageContentPart;
```

### 지원 이미지 포맷

| 포맷 | MIME 타입 |
| --- | --- |
| PNG | `image/png` |
| JPEG | `image/jpeg` |
| WebP | `image/webp` |
| GIF | `image/gif` |

> **팁**: 텍스트 프롬프트를 먼저 배치하고 그 뒤에 이미지를 배치하는 것이 권장됩니다. 이미지가 반드시 먼저 와야 한다면 시스템 프롬프트에 넣는 것을 권장합니다.

### 이미지 URL 사용 예제

```python
import requests
import json

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer <YOUR_API_KEY>",
    "Content-Type": "application/json"
}

messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "이 이미지에 무엇이 있나요?"
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": "https://example.com/photo.jpg"
                }
            }
        ]
    }
]

payload = {
    "model": "anthropic/claude-sonnet-4",
    "messages": messages
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

### Base64 인코딩 이미지 사용 예제

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '이 이미지에 무엇이 있나요?' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQSkZJR...',
            },
          },
        ],
      },
    ],
  }),
});

const data = await response.json();
console.log(data);
```

---

## PDF 처리

OpenRouter의 `file-parser` 플러그인을 통해 **모든 모델**에서 PDF 처리가 가능합니다. PDF를 URL 또는 base64로 전송할 수 있으며, 모델이 네이티브로 파일 입력을 지원하면 직접 전달되고, 그렇지 않으면 OpenRouter가 파싱하여 결과를 모델에 전달합니다.

### 플러그인 설정

```json
{
  "plugins": [
    {
      "id": "file-parser",
      "pdf": {
        "engine": "cloudflare-ai"
      }
    }
  ]
}
```

### PDF 처리 엔진

| 엔진 | 설명 | 가격 |
| --- | --- | --- |
| `mistral-ocr` | 스캔 문서나 이미지가 포함된 PDF에 적합 | $2 / 1,000페이지 |
| `cloudflare-ai` | Cloudflare Workers AI를 사용하여 PDF를 마크다운으로 변환 | 무료 |
| `native` | 모델이 네이티브로 파일 입력을 지원하는 경우만 사용 가능 | 입력 토큰으로 과금 |

> `pdf-text` 엔진은 더 이상 사용되지 않으며 `cloudflare-ai`로 자동 리디렉션됩니다.

엔진을 명시하지 않으면 OpenRouter가 먼저 모델의 네이티브 파일 처리 기능을 사용하고, 사용할 수 없으면 `mistral-ocr` 엔진을 기본값으로 사용합니다.

OCR 비용은 BYOK 요청을 포함한 모든 요청에 적용됩니다. OpenRouter는 OCR에 자체 Mistral 키를 사용하므로 BYOK 키가 아닌 OpenRouter 계정으로 청구됩니다.

### OCR 이미지 한도

`mistral-ocr` 엔진이 PDF에서 이미지를 추출할 때, Mistral의 OCR API `image_limit` 파라미터를 통해 PDF당 **최대 8개의 이미지만** 요청하고, 다운스트림 모델에도 요청당 8개 이하의 이미지만 전달합니다. 초과 이미지는 삭제되며 텍스트는 전부 보존됩니다.

이 제한은 프로바이더마다 프롬프트당 이미지 한도가 크게 다르기 때문입니다. 일부 프로바이더는 8개 이상의 이미지가 포함된 요청을 즉시 거부합니다. 하위 모델이 이미지 입력을 지원하지 않으면 OCR 추출 이미지는 완전히 제거되고 파싱된 텍스트만 전달됩니다.

### PDF URL 사용

```typescript
const result = await openRouter.chat.send({
  model: 'anthropic/claude-sonnet-4',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '이 문서의 주요 내용은 무엇인가요?' },
        {
          type: 'file',
          file: {
            filename: 'document.pdf',
            fileData: 'https://example.com/document.pdf',
          },
        },
      ],
    },
  ],
  plugins: [{ id: 'file-parser', pdf: { engine: 'mistral-ocr' } }],
  stream: false,
});
```

### Base64 인코딩 PDF 사용

```python
import requests
import base64

def encode_pdf_to_base64(pdf_path):
    with open(pdf_path, "rb") as pdf_file:
        return base64.b64encode(pdf_file.read()).decode('utf-8')

base64_pdf = encode_pdf_to_base64("document.pdf")
data_url = f"data:application/pdf;base64,{base64_pdf}"

response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json"
    },
    json={
        "model": "google/gemma-3-27b-it",
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": "이 문서의 주요 내용은 무엇인가요?" },
                { "type": "file", "file": { "filename": "document.pdf", "file_data": data_url } }
            ]
        }],
        "plugins": [{ "id": "file-parser", "pdf": { "engine": "cloudflare-ai" } }]
    }
)
print(response.json())
```

### FileAnnotation (파싱 결과 재사용)

PDF를 전송하면 응답의 assistant 메시지에 `annotations` 필드가 포함됩니다. 이를 후속 요청에 포함하면 PDF를 다시 파싱하지 않아 처리 시간과 비용을 절약할 수 있습니다.

```typescript
type FileAnnotation = {
  type: 'file';
  file: {
    hash: string;           // 파싱된 파일을 식별하는 고유 해시
    name?: string;          // 원본 파일명 (선택)
    content: ContentPart[]; // 파일에서 파싱된 콘텐츠
  };
};
```

`hash` 필드는 파싱된 파일 콘텐츠를 고유하게 식별하며, 후속 요청에 annotation을 포함할 때 재파싱을 건너뛰는 데 사용됩니다.

> **오류 응답에서도** OpenRouter가 PDF 파싱에 성공했지만 모든 추론 프로바이더가 실패한 경우, `error.metadata.file_annotations`에 파싱된 annotation이 포함됩니다. 동일한 `FileAnnotation` 형태이므로 재시도 시 그대로 전달하면 됩니다.

---

## 오디오 입력

오디오 파일을 호환 모델에 전송하여 전사, 분석, 처리를 수행할 수 있습니다. 오디오 입력은 `/api/v1/chat/completions` API의 `input_audio` 콘텐츠 타입을 사용합니다.

> **중요**: 오디오는 반드시 **base64로 인코딩**해야 합니다. URL 직접 전송은 지원되지 않습니다.

### 지원 오디오 포맷

| 포맷 | 설명 |
| --- | --- |
| `wav` | WAV 오디오 |
| `mp3` | MP3 오디오 |
| `aiff` | AIFF 오디오 |
| `aac` | AAC 오디오 |
| `ogg` | OGG Vorbis 오디오 |
| `flac` | FLAC 오디오 |
| `m4a` | M4A 오디오 |
| `pcm16` | PCM16 오디오 |
| `pcm24` | PCM24 오디오 |

> 프로바이더에 따라 지원 포맷이 다릅니다. 모델 문서에서 지원 포맷을 확인하세요.

### 오디오 입력 예제

```python
import requests
import base64

# 오디오 파일 base64 인코딩
with open("audio.wav", "rb") as f:
    base64_audio = base64.b64encode(f.read()).decode('utf-8')

response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json"
    },
    json={
        "model": "anthropic/claude-sonnet-4",
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": "이 오디오 파일을 전사해주세요." },
                {
                    "type": "input_audio",
                    "input_audio": {
                        "data": base64_audio,
                        "format": "wav"
                    }
                }
            ]
        }]
    }
)
print(response.json())
```

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '이 오디오 파일을 전사해주세요.' },
          {
            type: 'input_audio',
            input_audio: { data: base64Audio, format: 'wav' },
          },
        ],
      },
    ],
  }),
});
```

---

## 오디오 출력 (채팅)

오디오 출력 기능이 있는 모델에서 오디오 응답을 받을 수 있습니다. `modalities`와 `audio` 파라미터를 설정합니다.

### 요청 설정

```python
payload = {
    "model": "openai/gpt-audio",
    "messages": [
        { "role": "user", "content": "친절한 톤으로 인사해주세요." }
    ],
    "modalities": ["text", "audio"],
    "audio": {
        "voice": "alloy",
        "format": "wav"
    },
    "stream": True
}
```

| 옵션 | 설명 |
| --- | --- |
| `audio.voice` | 음성 식별자 (예: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`). 모델마다 사용 가능한 음성이 다름 |
| `audio.format` | 출력 오디오 포맷 (예: `wav`, `mp3`, `flac`, `opus`, `pcm16`). 모델마다 지원 포맷이 다름 |

> 오디오 출력은 스트리밍(`stream: true`)이 필요합니다. 오디오 데이터와 텍스트는 `delta.audio` 필드를 통해 점진적으로 전달됩니다.

### 스트리밍 청크 형식

```json
{
  "choices": [
    {
      "delta": {
        "audio": {
          "data": "<base64-encoded audio chunk>",
          "transcript": "Hello"
        }
      }
    }
  ]
}
```

---

## 이미지 생성

텍스트 프롬프트로 AI 이미지를 생성할 수 있습니다. `/api/v1/chat/completions` 엔드포인트에서 `modalities` 파라미터를 사용합니다.

### 모델 발견

```bash
# 이미지 생성 모델만 조회
curl "https://openrouter.ai/api/v1/models?output_modalities=image"
```

### 기본 이미지 생성

```python
payload = {
    "model": "google/gemini-2.5-flash-image",
    "messages": [
        {
            "role": "user",
            "content": "산 위로 지는 아름다운 일몰을 생성해주세요"
        }
    ],
    "modalities": ["image", "text"]
}
```

- 텍스트와 이미지를 모두 출력하는 모델 (예: Gemini): `modalities: ["image", "text"]`
- 이미지만 출력하는 모델 (예: Flux): `modalities: ["image"]`

### 응답 형식

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "아름다운 일몰 이미지를 생성했습니다.",
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgo..."
            }
          }
        ]
      }
    }
  ]
}
```

### 이미지 설정 옵션

`image_config` 파라미터로 생성된 이미지의 비율과 크기를 설정할 수 있습니다.

#### aspect_ratio (가로세로 비율)

| 비율 | 해상도 | 비고 |
| --- | --- | --- |
| `1:1` | 1024x1024 | 기본값 |
| `2:3` | 832x1248 | |
| `3:2` | 1248x832 | |
| `3:4` | 864x1184 | |
| `4:3` | 1184x864 | |
| `4:5` | 896x1152 | |
| `5:4` | 1152x896 | |
| `9:16` | 768x1344 | |
| `16:9` | 1344x768 | |
| `21:9` | 1536x672 | |

#### image_size (이미지 크기)

| 크기 | 설명 |
| --- | --- |
| `1K` | 표준 해상도 (기본값) |
| `2K` | 고해상도 |
| `4K` | 최고 해상도 |
| `0.5K` | 저해상도 (일부 모델만) |

```python
payload = {
    "model": "google/gemini-2.5-flash-image",
    "messages": [
        { "role": "user", "content": "미래 도시의 이미지를 생성해주세요" }
    ],
    "modalities": ["image", "text"],
    "image_config": {
        "aspect_ratio": "16:9",
        "image_size": "4K"
    }
}
```

---

## 비디오 입력

비디오 파일을 호환 모델에 전송하여 분석, 설명, 객체 탐지 등의 작업을 수행할 수 있습니다. `video_url` 콘텐츠 타입을 사용합니다.

### 지원 비디오 포맷

| 포맷 | MIME 타입 |
| --- | --- |
| MP4 | `video/mp4` |
| MPEG | `video/mpeg` |
| MOV | `video/mov` |
| WebM | `video/webm` |

### 비디오 URL 사용

```python
messages = [
    {
        "role": "user",
        "content": [
            { "type": "text", "text": "이 비디오에서 무슨 일이 일어나고 있나요?" },
            {
                "type": "video_url",
                "video_url": {
                    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                }
            }
        ]
    }
]
```

### Base64 인코딩 비디오 사용

```python
import base64

with open("video.mp4", "rb") as f:
    base64_video = base64.b64encode(f.read()).decode('utf-8')

data_url = f"data:video/mp4;base64,{base64_video}"
```

> **프로바이더별 URL 지원**: Google Gemini (AI Studio)는 YouTube 링크만 지원합니다. Google Gemini (Vertex AI)는 비디오 URL을 지원하지 않으므로 base64를 사용해야 합니다.

---

## 비디오 생성

텍스트 프롬프트로 비디오를 생성하는 전용 **비동기 API**입니다. Chat Completions와 별개의 워크플로우를 사용합니다.

### 워크플로우

1. **제출**: `POST /api/v1/videos`에 생성 요청
2. **폴링**: `GET /api/v1/videos/{jobId}`로 상태 확인
3. **다운로드**: `GET /api/v1/videos/{jobId}/content`에서 비디오 다운로드

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `model` | string | 필수 | 비디오 생성 모델 (예: `google/veo-3.1`) |
| `prompt` | string | 필수 | 생성할 비디오 설명 |
| `duration` | integer | 선택 | 비디오 길이 (초) |
| `resolution` | string | 선택 | 해상도 (예: `720p`, `1080p`) |
| `aspect_ratio` | string | 선택 | 가로세로 비율 (예: `16:9`, `9:16`) |
| `size` | string | 선택 | 정확한 픽셀 크기 `WIDTHxHEIGHT` 형식 |
| `frame_images` | array | 선택 | 첫/마지막 프레임 이미지 (이미지→비디오) |
| `input_references` | array | 선택 | 스타일 참조 이미지 |
| `generate_audio` | boolean | 선택 | 오디오 함께 생성 여부 |
| `seed` | integer | 선택 | 결정적 생성을 위한 시드 |
| `callback_url` | string | 선택 | 완료 시 웹훅 알림 URL (HTTPS 필수) |

### 지원 가로세로 비율

| 비율 | 설명 |
| --- | --- |
| `16:9` | 와이드스크린 가로 |
| `9:16` | 세로/초상 |
| `1:1` | 정사각 |
| `4:3` | 표준 가로 |
| `3:4` | 표준 세로 |
| `3:2` | 사진 가로 |
| `2:3` | 사진 세로 |
| `21:9` | 울트라 와이드 |
| `9:21` | 울트라 톨 |

### 제출 및 폴링 예제

```python
import requests
import time

headers = {
    "Authorization": "Bearer <YOUR_API_KEY>",
    "Content-Type": "application/json"
}

# 1단계: 생성 요청 제출
response = requests.post(
    "https://openrouter.ai/api/v1/videos",
    headers=headers,
    json={
        "model": "google/veo-3.1",
        "prompt": "해변에서 공놀이하는 골든 리트리버",
        "aspect_ratio": "16:9"
    }
)
result = response.json()
job_id = result["id"]
polling_url = result["polling_url"]

# 2단계: 완료까지 폴링
while True:
    time.sleep(30)
    poll = requests.get(polling_url, headers=headers).json()
    print(f"상태: {poll['status']}")

    if poll["status"] == "completed":
        content_url = poll["unsigned_urls"][0]
        video = requests.get(content_url)
        with open("output.mp4", "wb") as f:
            f.write(video.content)
        break
    elif poll["status"] == "failed":
        print(f"실패: {poll.get('error')}")
        break
```

### 작업 상태

| 상태 | 설명 |
| --- | --- |
| `pending` | 작업이 제출되어 대기 중 |
| `in_progress` | 비디오 생성 중 |
| `completed` | 다운로드 준비 완료 |
| `failed` | 생성 실패 (`error` 필드 확인) |
| `cancelled` | 작업 취소됨 |
| `expired` | 최대 대기 시간 초과 |

> 비디오 생성은 Zero Data Retention (ZDR) 대상이 아닙니다. 비동기 처리를 위해 생성된 비디오 출력이 프로바이더에 일시적으로 보관되어야 합니다.

---

## Text-to-Speech (TTS)

전용 `/api/v1/audio/speech` 엔드포인트에서 텍스트를 음성으로 변환합니다. OpenAI Audio Speech API와 호환됩니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `model` | string | 필수 | TTS 모델 식별자 |
| `input` | string | 필수 | 합성할 텍스트 |
| `voice` | string | 필수 | 음성 식별자 (모델/프로바이더별 상이) |
| `response_format` | string | 선택 | 출력 포맷: `mp3` 또는 `pcm` (기본값: `pcm`) |
| `speed` | number | 선택 | 재생 속도 배율 (일부 프로바이더만 지원) |

### TTS 예제

```python
import requests

response = requests.post(
    "https://openrouter.ai/api/v1/audio/speech",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json"
    },
    json={
        "model": "microsoft/mai-voice-2",
        "input": "안녕하세요! 텍스트 음성 변환 테스트입니다.",
        "voice": "en-US-Harper:MAI-Voice-2",
        "response_format": "mp3"
    }
)

with open("output.mp3", "wb") as f:
    f.write(response.content)

generation_id = response.headers.get("X-Generation-Id")
print(f"저장 완료. Generation ID: {generation_id}")
```

### 응답 형식

TTS 엔드포인트는 JSON이 아닌 **원시 오디오 바이트 스트림**을 반환합니다.

| 포맷 | Content-Type | 설명 |
| --- | --- | --- |
| `mp3` | `audio/mpeg` | 압축 오디오, 저장/재생에 적합 |
| `pcm` | `audio/pcm` | 비압축 원시 오디오, 실시간 스트리밍에 적합 |

---

## Speech-to-Text (STT)

전용 `/api/v1/audio/transcriptions` 엔드포인트에서 오디오를 텍스트로 변환합니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `model` | string | 필수 | STT 모델 식별자 |
| `input_audio` | object | 필수 | 오디오 데이터 |
| `input_audio.data` | string | 필수 | base64 인코딩 오디오 (data URI 아님) |
| `input_audio.format` | string | 필수 | 오디오 포맷 (예: `wav`, `mp3`) |
| `language` | string | 선택 | ISO-639-1 언어 코드 (예: `"ko"`, `"en"`) |
| `temperature` | number | 선택 | 샘플링 온도 (0~1) |

### STT 예제

```python
import requests
import base64

with open("audio.wav", "rb") as f:
    base64_audio = base64.b64encode(f.read()).decode("utf-8")

response = requests.post(
    "https://openrouter.ai/api/v1/audio/transcriptions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json"
    },
    json={
        "model": "openai/whisper-large-v3",
        "input_audio": {
            "data": base64_audio,
            "format": "wav"
        },
        "language": "ko"
    }
)

result = response.json()
print(result["text"])
# 출력: "안녕하세요, 이것은 음성 인식 테스트입니다."
```

### 응답 형식

```json
{
  "text": "안녕하세요, 이것은 음성 인식 테스트입니다.",
  "usage": {
    "seconds": 9.2,
    "total_tokens": 113,
    "input_tokens": 83,
    "output_tokens": 30,
    "cost": 0.000508
  }
}
```

---

## 응답 Usage에서 미디어 토큰 추적

OpenRouter 응답의 `usage` 필드는 미디어 토큰에 대한 상세한 내역을 제공합니다.

```typescript
type ResponseUsage = {
  prompt_tokens: number;          // 이미지, 오디오 입력, 툴 등 포함
  completion_tokens: number;      // 생성된 토큰
  total_tokens: number;           // 위 두 값의 합

  prompt_tokens_details?: {
    cached_tokens: number;            // 엔드포인트에서 캐시된 토큰
    cache_write_tokens?: number;      // 캐시에 기록된 토큰
    audio_tokens?: number;            // 오디오 입력에 사용된 토큰
    video_tokens?: number;            // 비디오 입력에 사용된 토큰
  };

  completion_tokens_details?: {
    reasoning_tokens?: number;        // 추론에 사용된 토큰
    audio_tokens?: number;            // 오디오 출력에 생성된 토큰
    image_tokens?: number;            // 이미지 출력에 생성된 토큰
  };

  cost?: number;                   // 크레딧 비용
  is_byok?: boolean;               // BYOK 사용 여부
};
```

| 필드 | 설명 |
| --- | --- |
| `prompt_tokens_details.audio_tokens` | 오디오 입력에 사용된 토큰 |
| `prompt_tokens_details.video_tokens` | 비디오 입력에 사용된 토큰 |
| `completion_tokens_details.audio_tokens` | 오디오 출력에 생성된 토큰 |
| `completion_tokens_details.image_tokens` | 이미지 출력에 생성된 토큰 |

---

## 모델 호환성 확인

모든 모델이 모든 모달리티를 지원하는 것은 아닙니다. Models API를 사용해 필터링할 수 있습니다.

```bash
# 이미지 출력 지원 모델
curl "https://openrouter.ai/api/v1/models?output_modalities=image"

# 비디오 출력 지원 모델
curl "https://openrouter.ai/api/v1/models?output_modalities=video"

# 텍스트 + 이미지 출력 모델
curl "https://openrouter.ai/api/v1/models?output_modalities=text,image"

# 모든 모델 (모달리티 필터링 없이)
curl "https://openrouter.ai/api/v1/models?output_modalities=all"
```

### output_modalities 필터 값

| 값 | 설명 |
| --- | --- |
| `text` | 텍스트 출력 모델 (기본값) |
| `image` | 이미지 생성 모델 |
| `audio` | 오디오 출력 모델 |
| `video` | 비디오 생성 모델 |
| `speech` | TTS 모델 |
| `transcription` | STT 모델 |
| `embeddings` | 임베딩 모델 |
| `all` | 모든 모델 포함 |

---

## 관련 문서

- [01-quickstart.md](./01-quickstart.md) - OpenRouter 빠른 시작 가이드
- [02-api-reference.md](./02-api-reference.md) - API 요청/응답 레퍼런스
- [09-plugins.md](./09-plugins.md) - 플러그인 가이드 (file-parser 포함)
- [13-models-api.md](./13-models-api.md) - Models API 레퍼런스
