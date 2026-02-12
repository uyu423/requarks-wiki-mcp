# requarks-wiki-mcp

[Wiki.js](https://js.wiki/) 인스턴스를 지식 베이스처럼 사용할 수 있게 해주는 MCP 서버입니다.

주요 기능:

- 검색/목록 도구로 RAG 형태의 조회 워크플로우 지원
- 경로 또는 페이지 ID로 페이지 본문 조회
- 명시적 안전장치가 있는 선택적 페이지 생성/수정 도구

## 요구사항

- Node.js 20+
- 접근 가능한 Wiki.js 호스트
- 적절한 권한이 부여된 Wiki.js API 키(JWT)

## 설정

```bash
cp .env.example .env
npm install
```

`.env` 설정 예시:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# 기본값: 쓰기 비활성화
WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
# 쉼표로 구분된 경로 prefix (앞쪽 '/' 없이, 비우면 제한 없음)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

환경 변수 설명:

| 변수                                  | 필수   | 기본값           | 설명                                                      |
| ------------------------------------- | ------ | ---------------- | --------------------------------------------------------- |
| `WIKI_BASE_URL`                       | 예     | -                | Wiki.js 기본 URL (예: `https://wiki.example.com`)         |
| `WIKI_API_TOKEN`                      | 예     | -                | `Authorization: Bearer ...`에 사용되는 Wiki.js API 키 JWT |
| `WIKI_GRAPHQL_PATH`                   | 아니오 | `/graphql`       | `WIKI_BASE_URL` 뒤에 붙는 GraphQL 경로                    |
| `WIKI_DEFAULT_LOCALE`                 | 아니오 | `en`             | 도구 입력에 locale이 없을 때 사용할 기본 locale           |
| `WIKI_DEFAULT_EDITOR`                 | 아니오 | `markdown`       | 페이지 생성 시 editor 미지정일 때 기본 editor             |
| `WIKI_MUTATIONS_ENABLED`              | 아니오 | `false`          | `true`일 때 쓰기 도구 활성화                              |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | 아니오 | `CONFIRM_UPDATE` | 쓰기 호출 시 `confirm` 값으로 반드시 일치해야 하는 토큰   |
| `WIKI_MUTATION_DRY_RUN`               | 아니오 | `true`           | `true`면 실제 반영 없이 미리보기만 반환                   |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | 아니오 | `` (비어 있음)   | 쓰기를 허용할 경로 prefix 목록(쉼표 구분)                 |

Wiki.js 사전 조건 (GraphQL + API 키):

- 이 MCP는 내부적으로 Wiki.js GraphQL을 사용합니다.
- Wiki.js 관리자 화면 `Administration -> API`에서 API를 활성화하세요.
- API 키를 생성한 뒤 `WIKI_API_TOKEN`에 설정하세요.

## 빠른 시작 (체크리스트)

- Wiki.js에서 `Administration -> API` -> API 활성화
- API 키 생성 후 `WIKI_API_TOKEN` 준비
- 이 프로젝트에서 `npm install` -> `npm run build`
- MCP 클라이언트에 `~/.mcp.json` 설정 추가
- 첫 테스트: `wikijs_search_pages`로 키워드 검색 -> 결과 `path`로 `wikijs_get_page_by_path`

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
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

## 로컬 경로로 MCP 서버 등록 (npm 배포 없이 사용)

로컬 개발시, 로컬 프로젝트 경로를 직접 `mcpServers`에 등록해 사용할 수 있습니다.

1. 이 저장소에서 빌드

```bash
npm install
npm run build
```

2. MCP 클라이언트 `~/.mcp.json`에 로컬 `dist/index.js` 절대 경로 등록

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
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

참고:

- 경로는 반드시 절대 경로를 사용하세요.
- 코드를 수정한 뒤에는 다시 `npm run build`를 실행해야 변경 사항이 반영됩니다.

## 실행

개발 모드:

```bash
npm run dev
```

빌드 + 실행:

```bash
npm run build
npm start
```

## MCP 도구

읽기 도구:

- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

쓰기 도구 (`WIKI_MUTATIONS_ENABLED=true`일 때만 활성화):

- `wikijs_create_page`
- `wikijs_update_page`

쓰기 도구는 `confirm` 인자가 `WIKI_MUTATION_CONFIRM_TOKEN`과 일치해야 합니다.
`WIKI_MUTATION_DRY_RUN=true`이면 실제 수정 없이 미리보기만 반환합니다.
`WIKI_ALLOWED_MUTATION_PATH_PREFIXES`가 설정되어 있으면 해당 경로로만 쓰기가 허용됩니다.
쓰기 시도는 구조화된 audit 로그를 stderr에 남깁니다.

## 작업 샘플 (사용자 행동 시뮬레이션)

시나리오 1) 오류 원인 조사 (RAG 스타일)

- 사용자 요청: "Kotlin `CancellationException` 관련 문서 찾아서 핵심만 요약해줘"
- MCP 호출 순서: `wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=검색결과 path)`
- 결과: 관련 페이지를 찾고 본문을 가져와 요약/원인/해결 가이드를 답변에 사용

시나리오 2) 운영 문서 최신 변경 확인

- 사용자 요청: "최근 일주일 내 수정된 운영 문서 상위 20개 보여줘"
- MCP 호출 순서: `wikijs_list_pages(limit=20, locale="en")`
- 결과: 최신 문서 목록(path/title/updatedAt) 기반으로 변경 리포트 작성

시나리오 3) 특정 문서 직접 조회

- 사용자 요청: "페이지 ID 7283 내용 읽어서 TODO만 뽑아줘"
- MCP 호출 순서: `wikijs_get_page_by_id(id=7283)`
- 결과: 특정 문서 본문을 직접 읽고 필요한 항목만 추출

시나리오 4) 안전한 문서 생성 검토 -> 실제 반영

- 사용자 요청: "sandbox 경로에 배포 체크리스트 문서 만들어줘"
- MCP 호출 순서(검토): `wikijs_create_page(..., confirm=토큰)` with `WIKI_MUTATION_DRY_RUN=true`
- MCP 호출 순서(실행): 동일 호출 with `WIKI_MUTATION_DRY_RUN=false`
- 결과: 먼저 미리보기로 검토하고, 승인 후 실제 생성 (경로 제한은 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`로 통제)

## 운영 팁

- RAG 흐름에서는 `id`보다 `path` 기반 조회(`wikijs_get_page_by_path`)를 우선 사용하세요. (Wiki.js 검색 결과의 `id`가 페이지 ID와 다를 수 있음)
- 쓰기는 기본적으로 `WIKI_MUTATIONS_ENABLED=false` + `WIKI_MUTATION_DRY_RUN=true` 조합으로 시작하는 것을 권장합니다.
- 실제 반영이 필요해지면 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`로 쓰기 범위를 좁힌 뒤 `WIKI_MUTATION_DRY_RUN=false`로 전환하세요.
- 쓰기 시도는 stderr에 audit 로그가 남으므로, 운영에서는 로그 수집(예: systemd/journald, docker logs)을 붙여두는 편이 안전합니다.

## 문제 해결

- `Missing required environment variable: WIKI_*`: `.env` 또는 MCP 클라이언트의 `env` 설정 누락입니다.
- `PageViewForbidden 6013`: API 키 그룹 권한 + 페이지 규칙에서 `read:pages`/`read:source` 허용 여부를 확인하세요.
- 조회는 되는데 본문(`content`)만 실패: `read:source` 권한/페이지 규칙이 부족한 경우가 많습니다.
- `/graphql`가 아닌 경로를 쓰는 경우: `WIKI_GRAPHQL_PATH`를 Wiki.js 환경에 맞게 변경하세요.

## 권한 참고 (Wiki.js)

Wiki.js API 키 권한은 예상과 다를 수 있습니다.

- 일부 작업은 페이지 규칙 수준에서 `manage:pages`/`delete:pages`가 추가로 필요할 수 있습니다.
- `content` 읽기는 스키마/필드 체크에 따라 `read:source`가 필요할 수 있습니다.

읽기에서 6013 (`PageViewForbidden`)가 발생하면 API 키 그룹의 권한/페이지 규칙을 확인하세요.

## 권장 최소 API 키 권한

읽기 중심 KB 용도:

- `read:pages`
- `read:source`
- 대상 경로/locale에 대한 페이지 규칙 허용

쓰기 워크플로우:

- `write:pages` (작업에 따라 `manage:pages` 추가 필요)

## 보안 가이드

- API 토큰은 서버 측에만 보관하세요.
- 먼저 읽기 전용 권한으로 시작하세요.
- 쓰기가 필요할 때만 `WIKI_MUTATIONS_ENABLED=true`로 전환하세요.
- 기본 `WIKI_MUTATION_CONFIRM_TOKEN`은 운영에서 반드시 변경하세요.
- 실제 쓰기 전까지 `WIKI_MUTATION_DRY_RUN=true`를 유지하세요.
- `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`로 쓰기 범위를 제한하세요.
