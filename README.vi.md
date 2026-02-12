# requarks-wiki-mcp

Máy chủ MCP cho [Wiki.js](https://js.wiki/), cho phép dùng Wiki.js như một kho tri thức.

Tính năng:
- Tìm kiếm và liệt kê trang cho luồng truy xuất kiểu RAG
- Lấy nội dung theo path hoặc page ID
- Tạo/cập nhật trang (tùy chọn) với cơ chế an toàn rõ ràng

## Yêu cầu

- Node.js 20+
- Wiki.js hostname có thể truy cập
- API key (JWT) của Wiki.js với quyền phù hợp

## Thiết lập

```bash
cp .env.example .env
npm install
```

Ví dụ `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

Mô tả biến môi trường:

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `WIKI_BASE_URL` | Có | - | URL gốc của Wiki.js |
| `WIKI_API_TOKEN` | Có | - | JWT dùng cho `Authorization: Bearer ...` |
| `WIKI_GRAPHQL_PATH` | Không | `/graphql` | Đường dẫn GraphQL ghép với base URL |
| `WIKI_DEFAULT_LOCALE` | Không | `en` | Locale mặc định khi không truyền locale |
| `WIKI_DEFAULT_EDITOR` | Không | `markdown` | Editor mặc định khi tạo trang |
| `WIKI_MUTATIONS_ENABLED` | Không | `false` | Bật tool ghi khi đặt `true` |
| `WIKI_MUTATION_CONFIRM_TOKEN` | Không | `CONFIRM_UPDATE` | Giá trị `confirm` bắt buộc cho thao tác ghi |
| `WIKI_MUTATION_DRY_RUN` | Không | `true` | `true` thì chỉ trả về preview, không ghi thật |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | Không | `` (rỗng) | Danh sách prefix path được phép ghi (phân tách bằng dấu phẩy) |

Điều kiện tiên quyết trong Wiki.js (GraphQL + API key):
- MCP này dùng GraphQL của Wiki.js ở bên trong.
- Trong Wiki.js admin, vào `Administration -> API` và bật API.
- Tạo API key và gán vào `WIKI_API_TOKEN`.

## Bắt đầu nhanh (checklist)

- Trong Wiki.js: `Administration -> API` -> bật API
- Tạo API key và chuẩn bị `WIKI_API_TOKEN`
- Trong project này: `npm install` -> `npm run build`
- Thêm cấu hình vào client MCP (`~/.mcp.json`)
- Test đầu tiên: `wikijs_search_pages` -> dùng `path` cho `wikijs_get_page_by_path`

## Ví dụ cấu hình MCP (`~/.mcp.json`)

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
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

Ví dụ cho local/phát triển (chạy `dist` trực tiếp, không cần cài package):

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
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

## Chạy

Phát triển:

```bash
npm run dev
```

Build + chạy:

```bash
npm run build
npm start
```

## MCP Tools

Tool đọc:
- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

Tool ghi (chỉ khi `WIKI_MUTATIONS_ENABLED=true`):
- `wikijs_create_page`
- `wikijs_update_page`

Thao tác ghi yêu cầu `confirm` khớp `WIKI_MUTATION_CONFIRM_TOKEN`.

## Kịch bản sử dụng (mô phỏng hành vi người dùng)

Kịch bản 1) Điều tra nguyên nhân lỗi (kiểu RAG)
- Yêu cầu người dùng: "Tìm tài liệu về Kotlin `CancellationException` và tóm tắt ngắn giúp tôi"
- Chuỗi gọi MCP: `wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=ket_qua.path)`
- Kết quả: tìm đúng trang liên quan và lấy nội dung để tóm tắt nguyên nhân/cách xử lý.

Kịch bản 2) Xem tài liệu mới cập nhật
- Yêu cầu người dùng: "Cho tôi 20 trang cập nhật gần nhất"
- Chuỗi gọi MCP: `wikijs_list_pages(limit=20, locale="en")`
- Kết quả: trả về `path/title/updatedAt` để lập báo cáo thay đổi nhanh.

Kịch bản 3) Đọc trực tiếp theo ID
- Yêu cầu người dùng: "Đọc trang ID 7283 và trích riêng phần TODO"
- Chuỗi gọi MCP: `wikijs_get_page_by_id(id=7283)`
- Kết quả: lấy đúng nội dung trang và trích thông tin cần thiết.

Kịch bản 4) Tạo nội dung với bước xem trước an toàn
- Yêu cầu người dùng: "Tạo checklist deploy trong `sandbox`"
- Chuỗi gọi MCP (xem trước): `wikijs_create_page(..., confirm=token)` với `WIKI_MUTATION_DRY_RUN=true`
- Chuỗi gọi MCP (ghi thật): cùng lệnh với `WIKI_MUTATION_DRY_RUN=false`
- Kết quả: xem trước trước, sau đó ghi thật trong phạm vi path được phép bởi `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`.

## Gợi ý vận hành

- Với RAG, ưu tiên đọc theo `path` (`wikijs_get_page_by_path`). (Trường `id` từ kết quả search có thể không trùng với page ID thực)
- Khi ghi, nên bắt đầu với `WIKI_MUTATIONS_ENABLED=false` và `WIKI_MUTATION_DRY_RUN=true`.
- Khi cần ghi thật: giới hạn phạm vi bằng `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`, sau đó chuyển `WIKI_MUTATION_DRY_RUN=false`.
- Mutaion sẽ ghi audit log ra stderr; nên thu thập log trong môi trường vận hành.

## Khắc phục sự cố

- `Missing required environment variable: WIKI_*`: thiếu biến trong `.env` hoặc `env` của client MCP.
- `PageViewForbidden 6013`: kiểm tra quyền nhóm API key và page rule cho `read:pages`/`read:source`.
- List được nhưng `content` lỗi: thường thiếu `read:source`.
- GraphQL không ở `/graphql`: chỉnh `WIKI_GRAPHQL_PATH` cho đúng.

## Ghi chú quyền (Wiki.js)

- Một số thao tác có thể cần `manage:pages`/`delete:pages` ở page rule.
- Đọc trường `content` có thể cần `read:source`.
- Nếu gặp 6013 (`PageViewForbidden`), kiểm tra quyền nhóm API key và page rule.
