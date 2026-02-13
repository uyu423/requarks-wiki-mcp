# requarks-wiki-mcp

[Wiki.js](https://js.wiki/) 인스턴스를 지식 베이스처럼 사용할 수 있게 해주는 MCP 서버입니다.

주요 기능:

- **29개 도구** (읽기 19개 + 쓰기 10개): 페이지, 댓글, 태그, 에셋, 사용자, 네비게이션, 시스템 정보를 포괄합니다.
- 검색, 목록 조회, 페이지 탐색으로 조회 워크플로우 지원 (RAG 형태 사용).
- 경로 또는 페이지 ID로 페이지 본문 조회, 버전 히스토리 확인 및 이전 버전 복원.
- 페이지 트리, 페이지 링크 그래프, 네비게이션 구조로 사이트 계층 탐색.
- 완전한 댓글 시스템: 댓글 목록 조회, 읽기, 생성, 수정, 삭제.
- 미디어 파일 검색을 위한 에셋 및 폴더 탐색.
- 사용자 컨텍스트: 현재 사용자 프로필 및 사용자 검색.
- 시스템 진단: 버전 정보, 사이트 설정, 네비게이션 트리.
- 태그 관리: 태그 목록 조회, 검색, 수정, 삭제.
- 명시적 안전장치가 있는 선택적 페이지 생성/수정/삭제/이동/복원 도구.
- 내장 리소스: 마크다운 문법 가이드 및 API 권한 가이드.
- LLM 친화적 에러 메시지를 갖춘 타입 기반 에러 분류.
- 타임아웃, 지수 백오프 재시도, 요청 상관관계를 갖춘 GraphQL 클라이언트.
- 보안 강화: 민감 필드 필터링, URL 검증, 입력 길이 제한.

## 요구사항

- Node.js 20+
- 접근 가능한 Wiki.js 호스트
- 적절한 권한이 부여된 Wiki.js API 키(JWT)

## 설정

```bash
cp .env.example .env
npm install
```

`.env` 설정:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# 쓰기 작업은 기본적으로 비활성화됨
WIKI_MUTATIONS_ENABLED=false
# 쓰기를 위한 선택적 추가 안전장치. 설정 시 쓰기 도구는 일치하는 confirm을 전달해야 함.
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# 쉼표로 구분된 경로 prefix (앞쪽 '/' 없이, 비우면 prefix 제한 없음)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# HTTP 복원력
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

환경 변수 설명:

| 변수                                  | 필수   | 기본값     | 설명                                                                                    |
| ------------------------------------- | ------ | ---------- | --------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | 예     | -          | Wiki.js 기본 URL (예: `https://wiki.example.com`)                                       |
| `WIKI_API_TOKEN`                      | 예     | -          | `Authorization: Bearer ...`에 사용되는 Wiki.js API 키 JWT                               |
| `WIKI_GRAPHQL_PATH`                   | 아니오 | `/graphql` | `WIKI_BASE_URL` 뒤에 붙는 GraphQL 엔드포인트 경로                                       |
| `WIKI_DEFAULT_LOCALE`                 | 아니오 | `en`       | 도구 입력에 locale이 없을 때 사용할 기본 locale                                         |
| `WIKI_DEFAULT_EDITOR`                 | 아니오 | `markdown` | 페이지 생성 시 지정되지 않았을 때 사용할 기본 에디터                                    |
| `WIKI_MUTATIONS_ENABLED`              | 아니오 | `false`    | `true`로 설정 시 모든 쓰기 도구 활성화 (페이지, 댓글, 태그 쓰기)                        |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | 아니오 | `` (비어 있음) | 선택적 추가 안전장치. 설정 시 쓰기 도구 호출은 일치하는 `confirm`을 제공해야 함         |
| `WIKI_MUTATION_DRY_RUN`               | 아니오 | `true`     | `true`일 때 쓰기 도구는 미리보기만 반환하고 Wiki.js에 쓰지 않음                         |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | 아니오 | `` (비어 있음) | 쓰기를 허용할 경로 prefix 목록 (쉼표 구분, 앞쪽 슬래시 없이). 비어 있으면 prefix 제한 없음 |
| `WIKI_HTTP_TIMEOUT_MS`                | 아니오 | `15000`    | HTTP 요청 타임아웃 (밀리초, 본문 읽기 포함). 최소 1                                     |
| `WIKI_HTTP_MAX_RETRIES`               | 아니오 | `2`        | 일시적 읽기 실패에 대한 최대 재시도 횟수 (408, 502-504). 쓰기는 재시도하지 않음. 최소 0 |

Wiki.js 사전 조건 (GraphQL + API 키):

- 이 MCP는 내부적으로 Wiki.js GraphQL을 사용합니다.
- Wiki.js 관리자 화면에서 `Administration -> API`로 이동하여 API 액세스를 활성화하세요.
- API 키를 생성하고 `WIKI_API_TOKEN`으로 설정하세요.

## MCP 클라이언트 설정 예시 (`~/.mcp.json`)

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "@yowu-dev/requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

## 로컬 경로로 MCP 등록 (npm 배포 없이)

npm 배포/설치 없이 로컬 프로젝트 경로에서 직접 이 MCP 서버를 등록할 수 있습니다.

1. 이 저장소에서 빌드

```bash
npm install
npm run build
```

2. `~/.mcp.json`에 로컬 절대 경로 등록

```json
{
  "mcpServers": {
    "requarks-wiki-local": {
      "command": "node",
      "args": ["/absolute/path/to/requarks-wiki-mcp/dist/index.js"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

참고:

- 항상 절대 경로를 사용하세요.
- 코드를 변경한 후에는 `dist/index.js`가 최신 상태로 유지되도록 `npm run build`를 다시 실행하세요.

## 실행

개발:

```bash
npm run dev
```

빌드 + 실행:

```bash
npm run build
npm start
```

## MCP 도구

### 읽기 도구 (19개)

**페이지:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_search_pages` | 위키 페이지 전체 텍스트 검색 |
| `wikijs_list_pages` | 선택적 locale 필터 및 제한으로 페이지 목록 조회 |
| `wikijs_get_page_by_path` | 경로 + locale로 전체 페이지 본문 가져오기 |
| `wikijs_get_page_by_id` | 숫자 ID로 전체 페이지 본문 가져오기 |
| `wikijs_get_page_tree` | 사이트 계층 탐색 (폴더, 페이지, 또는 둘 다) |
| `wikijs_get_page_history` | 페이지의 편집 히스토리 조회 |
| `wikijs_get_page_version` | 특정 버전의 전체 본문 가져오기 |
| `wikijs_get_page_links` | 페이지 링크 관계 가져오기 (지식 그래프) |

**태그:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_list_tags` | 콘텐츠 분류 탐색을 위한 모든 태그 목록 조회 |
| `wikijs_search_tags` | 쿼리 문자열과 일치하는 태그 검색 |

**댓글:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_list_comments` | 경로와 locale로 페이지의 모든 댓글 목록 조회 |
| `wikijs_get_comment` | ID로 단일 댓글 가져오기 |

**시스템 및 네비게이션:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_get_system_info` | Wiki.js 버전, 데이터베이스 유형, 사용 통계 |
| `wikijs_get_navigation` | 네비게이션 트리 구조 |
| `wikijs_get_site_config` | 사이트 설정 (민감하지 않은 필드) |

**에셋:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_list_assets` | 선택적 폴더 및 종류 필터로 에셋 목록 조회 |
| `wikijs_list_asset_folders` | 에셋 폴더 목록 조회 |

**사용자:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_get_current_user` | 현재 인증된 API 사용자의 프로필 가져오기 |
| `wikijs_search_users` | 이름 또는 이메일로 사용자 검색 |

### 쓰기 도구 (10개, `WIKI_MUTATIONS_ENABLED=true`일 때만 활성화됨)

**페이지 쓰기:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_create_page` | 본문, 태그, 메타데이터로 새 페이지 생성 |
| `wikijs_update_page` | ID로 기존 페이지 수정 |
| `wikijs_delete_page` | ID로 페이지 삭제. `manage:pages` 또는 `delete:pages` 필요할 수 있음 |
| `wikijs_move_page` | 페이지를 새 경로 또는 locale로 이동/이름 변경 |
| `wikijs_restore_page` | 페이지를 이전 버전으로 복원 |

**댓글 쓰기:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_create_comment` | 페이지에 댓글 생성 |
| `wikijs_update_comment` | ID로 기존 댓글 수정 |
| `wikijs_delete_comment` | ID로 댓글 삭제 |

**태그 쓰기:**

| 도구 | 설명 |
| --- | --- |
| `wikijs_update_tag` | 태그의 slug와 title 수정 |
| `wikijs_delete_tag` | 모든 페이지에서 태그 삭제 |

### 쓰기 안전장치

- `WIKI_MUTATION_CONFIRM_TOKEN`이 설정된 경우, 쓰기 도구는 일치하는 `confirm` 인자가 필요합니다.
- `WIKI_MUTATION_DRY_RUN=true`일 때 쓰기 도구는 미리보기를 반환하고 Wiki.js를 수정하지 않습니다.
- `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`가 설정된 경우, 페이지 및 댓글 생성 쓰기는 해당 경로 prefix로 제한됩니다.
- 모든 쓰기 시도는 구조화된 audit 라인을 stderr에 기록합니다.

## MCP 리소스

| 리소스 URI                       | 설명                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide`        | 페이지 작성 및 수정을 위한 Wiki.js 마크다운 문법 가이드 (CommonMark/GFM + Wiki.js 전용 확장)        |
| `wikijs://api-permissions-guide` | 권한 오류 자가 진단을 위한 Wiki.js API 권한 모델, 에러 코드, API 키 설정 가이드                     |

## 권한 참고 (Wiki.js)

Wiki.js 권한 동작은 API 키에 대해 예상과 다를 수 있습니다. 특히:

- 일부 작업은 페이지 규칙 수준에서 `manage:pages`/`delete:pages` 규칙이 필요할 수 있습니다.
- `content` 읽기는 스키마/필드 수준 확인에 따라 `read:source`가 필요할 수 있습니다.
- 댓글 작업은 `read:comments`, `write:comments`, 또는 `manage:comments`가 필요합니다.
- 시스템 정보 및 네비게이션은 관리자 수준 API 키 권한이 필요합니다.

일반적인 에러 코드:

| 코드 | 의미 |
| --- | --- |
| 6013 | `PageViewForbidden` — `read:pages`/`read:source`에 대한 그룹 권한 + 페이지 규칙 확인 |
| 6003 | 페이지가 존재하지 않음 |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

자세한 내용은 `wikijs://api-permissions-guide` 리소스를 참조하세요.

## 권장 최소 API 키 권한

읽기 중심 KB 사용:

- `read:pages`, `read:source`
- `read:comments` (댓글 탐색용)
- 의도된 경로/locale에 대해 해당 권한을 허용하는 페이지 규칙

쓰기 워크플로우:

- `write:pages` (생성 및 수정)
- `manage:pages` 또는 `delete:pages` (삭제/이동 작업용)
- `write:comments`, `manage:comments` (댓글 쓰기용)
- `manage:system` (태그 관리용)

## 보안 가이드

- API 토큰은 서버 측에만 보관하세요.
- 읽기 전용 권한으로 시작하세요.
- 업데이트가 필요할 때까지 `WIKI_MUTATIONS_ENABLED=false`를 유지하세요.
- 선택적 강화: 강력한 무작위 `WIKI_MUTATION_CONFIRM_TOKEN`을 설정하고 쓰기 호출에 일치하는 `confirm`을 전달하세요.
- 실제 쓰기 준비가 될 때까지 `WIKI_MUTATION_DRY_RUN=true`를 유지하세요.
- `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`를 사용하여 쓰기 범위를 제한하세요.
- `wikijs_get_system_info`는 기본적으로 민감한 인프라 필드(dbHost, configFile 등)를 필터링합니다.
- 페이지 생성/수정의 `scriptJs`/`scriptCss` 필드는 길이 제한(10,000자)이 있으며 브라우저 실행 경고가 포함됩니다.
