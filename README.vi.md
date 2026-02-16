# requarks-wiki-mcp

Máy chủ MCP cho [Wiki.js](https://js.wiki/), cho phép agent sử dụng nó như một kho tri thức.

Tính năng:

- **29 công cụ** (19 đọc + 10 ghi) bao phủ trang, bình luận, thẻ, tài nguyên, người dùng, điều hướng và thông tin hệ thống.
- Tìm kiếm, liệt kê và duyệt trang cho luồng truy xuất (sử dụng kiểu RAG).
- Lấy nội dung trang theo đường dẫn hoặc ID trang, xem lịch sử phiên bản và khôi phục phiên bản trước.
- Duyệt cấu trúc phân cấp trang web với cây trang, đồ thị liên kết trang và cấu trúc điều hướng.
- Hệ thống bình luận đầy đủ: liệt kê, đọc, tạo, cập nhật và xóa bình luận trên trang.
- Duyệt tài nguyên và thư mục để khám phá tệp phương tiện.
- Ngữ cảnh người dùng: hồ sơ người dùng hiện tại và tìm kiếm người dùng.
- Chẩn đoán hệ thống: thông tin phiên bản, cấu hình trang web và cây điều hướng.
- Quản lý thẻ: liệt kê, tìm kiếm, cập nhật và xóa thẻ.
- Công cụ tạo/cập nhật/xóa/di chuyển/khôi phục trang tùy chọn với cơ chế bảo vệ an toàn rõ ràng.
- Tài nguyên tích hợp: hướng dẫn cú pháp markdown, hướng dẫn sơ đồ Mermaid và hướng dẫn quyền API.
- Phân loại lỗi có kiểu với thông báo lỗi thân thiện với LLM.
- Client GraphQL với timeout, thử lại theo cấp số nhân và tương quan yêu cầu.
- Tăng cường bảo mật: lọc trường nhạy cảm, xác thực URL, giới hạn độ dài đầu vào.

## Yêu cầu

- Node.js 20+
- Hostname Wiki.js có thể truy cập được
- Khóa API Wiki.js (JWT) với quyền phù hợp

## Thiết lập

```bash
cp .env.example .env
npm install
```

Cấu hình `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# Các thao tác thay đổi bị vô hiệu hóa theo mặc định
WIKI_MUTATIONS_ENABLED=false
# Cổng bảo vệ bổ sung tùy chọn cho ghi. Nếu đặt, công cụ ghi phải truyền confirm khớp.
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# Tiền tố đường dẫn phân tách bằng dấu phẩy không có dấu / đầu (rỗng = không hạn chế tiền tố)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# Khả năng phục hồi HTTP
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

Tham chiếu biến môi trường:

| Biến                                  | Bắt buộc | Mặc định   | Mô tả                                                                                                                       |
| ------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | Có       | -          | URL cơ sở Wiki.js (ví dụ: `https://wiki.example.com`).                                                                     |
| `WIKI_API_TOKEN`                      | Có       | -          | Khóa API JWT của Wiki.js được sử dụng trong `Authorization: Bearer ...`.                                                   |
| `WIKI_GRAPHQL_PATH`                   | Không    | `/graphql` | Đường dẫn điểm cuối GraphQL được thêm vào `WIKI_BASE_URL`.                                                                 |
| `WIKI_DEFAULT_LOCALE`                 | Không    | `en`       | Locale mặc định được sử dụng khi đầu vào công cụ không cung cấp locale.                                                    |
| `WIKI_DEFAULT_EDITOR`                 | Không    | `markdown` | Trình soạn thảo mặc định được sử dụng để tạo trang khi không được chỉ định.                                                |
| `WIKI_MUTATIONS_ENABLED`              | Không    | `false`    | Kích hoạt tất cả công cụ ghi (thay đổi trang, bình luận và thẻ) khi đặt thành `true`.                                      |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | Không    | `` (rỗng)  | Cổng bảo vệ bổ sung tùy chọn. Khi đặt, các lệnh gọi công cụ ghi phải cung cấp `confirm` khớp.                              |
| `WIKI_MUTATION_DRY_RUN`               | Không    | `true`     | Khi `true`, công cụ thay đổi chỉ trả về bản xem trước và không ghi vào Wiki.js.                                            |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | Không    | `` (rỗng)  | Tiền tố đường dẫn phân tách bằng dấu phẩy (không có dấu / đầu) được phép thay đổi. Rỗng nghĩa là không hạn chế tiền tố.   |
| `WIKI_HTTP_TIMEOUT_MS`                | Không    | `15000`    | Thời gian chờ yêu cầu HTTP tính bằng mili giây (bao gồm đọc body). Tối thiểu 1.                                            |
| `WIKI_HTTP_MAX_RETRIES`               | Không    | `2`        | Số lần thử lại tối đa cho lỗi đọc tạm thời (408, 502-504). Thay đổi không bao giờ được thử lại. Tối thiểu 0.              |

Điều kiện tiên quyết của Wiki.js (GraphQL + khóa API):

- MCP này sử dụng GraphQL của Wiki.js bên trong.
- Trong quản trị Wiki.js, vào `Administration -> API` và bật truy cập API.
- Tạo khóa API và đặt nó làm `WIKI_API_TOKEN`.

## Ví dụ cấu hình MCP Client (`~/.mcp.json`)

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

## Đăng ký MCP qua đường dẫn cục bộ (không cần xuất bản npm)

Bạn có thể đăng ký máy chủ MCP này trực tiếp từ đường dẫn dự án cục bộ của mình mà không cần xuất bản/cài đặt từ npm.

1. Build trong kho lưu trữ này

```bash
npm install
npm run build
```

2. Đăng ký đường dẫn tuyệt đối cục bộ trong `~/.mcp.json`

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

Lưu ý:

- Luôn sử dụng đường dẫn tuyệt đối.
- Chạy lại `npm run build` sau khi thay đổi code để `dist/index.js` được cập nhật.

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

## Công cụ MCP

### Công cụ đọc (19)

**Trang:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_search_pages` | Tìm kiếm toàn văn trên các trang wiki. |
| `wikijs_list_pages` | Liệt kê trang với bộ lọc locale và giới hạn tùy chọn. |
| `wikijs_get_page_by_path` | Lấy toàn bộ nội dung trang theo đường dẫn + locale. |
| `wikijs_get_page_by_id` | Lấy toàn bộ nội dung trang theo ID số. |
| `wikijs_get_page_tree` | Duyệt cấu trúc phân cấp trang web (thư mục, trang hoặc cả hai). |
| `wikijs_get_page_history` | Xem chuỗi lịch sử chỉnh sửa cho một trang. |
| `wikijs_get_page_version` | Lấy toàn bộ nội dung của một phiên bản cụ thể. |
| `wikijs_get_page_links` | Lấy mối quan hệ liên kết trang (đồ thị tri thức). |

**Thẻ:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_list_tags` | Liệt kê tất cả thẻ để khám phá phân loại nội dung. |
| `wikijs_search_tags` | Tìm kiếm thẻ khớp với chuỗi truy vấn. |

**Bình luận:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_list_comments` | Liệt kê tất cả bình luận cho một trang theo đường dẫn và locale. |
| `wikijs_get_comment` | Lấy một bình luận duy nhất theo ID. |

**Hệ thống & Điều hướng:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_get_system_info` | Phiên bản Wiki.js, loại cơ sở dữ liệu và thống kê sử dụng. |
| `wikijs_get_navigation` | Cấu trúc cây điều hướng. |
| `wikijs_get_site_config` | Cấu hình trang web (các trường không nhạy cảm). |

**Tài nguyên:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_list_assets` | Liệt kê tài nguyên với bộ lọc thư mục và loại tùy chọn. |
| `wikijs_list_asset_folders` | Liệt kê thư mục tài nguyên. |

**Người dùng:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_get_current_user` | Lấy hồ sơ người dùng API đã xác thực hiện tại. |
| `wikijs_search_users` | Tìm kiếm người dùng theo tên hoặc email. |

### Công cụ ghi (10, bị vô hiệu hóa trừ khi `WIKI_MUTATIONS_ENABLED=true`)

**Thay đổi trang:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_create_page` | Tạo trang mới với nội dung, thẻ và siêu dữ liệu. |
| `wikijs_update_page` | Cập nhật trang hiện có theo ID. |
| `wikijs_delete_page` | Xóa trang theo ID. Có thể cần `manage:pages` hoặc `delete:pages`. |
| `wikijs_move_page` | Di chuyển/đổi tên trang sang đường dẫn hoặc locale mới. |
| `wikijs_restore_page` | Khôi phục trang về phiên bản trước. |

**Thay đổi bình luận:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_create_comment` | Tạo bình luận trên trang. |
| `wikijs_update_comment` | Cập nhật bình luận hiện có theo ID. |
| `wikijs_delete_comment` | Xóa bình luận theo ID. |

**Thay đổi thẻ:**

| Công cụ | Mô tả |
| --- | --- |
| `wikijs_update_tag` | Cập nhật slug và tiêu đề của thẻ. |
| `wikijs_delete_tag` | Xóa thẻ khỏi tất cả trang. |

### An toàn thay đổi

- Khi `WIKI_MUTATION_CONFIRM_TOKEN` được đặt, công cụ thay đổi yêu cầu đối số `confirm` khớp.
- Khi `WIKI_MUTATION_DRY_RUN=true`, công cụ ghi trả về bản xem trước và không thay đổi Wiki.js.
- Nếu `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` được đặt, thay đổi trang và tạo bình luận bị giới hạn trong các tiền tố đường dẫn đó.
- Tất cả các nỗ lực thay đổi ghi một dòng kiểm toán có cấu trúc vào stderr.

## Tài nguyên MCP

| URI tài nguyên                     | Mô tả                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide`          | Hướng dẫn cú pháp markdown của Wiki.js (CommonMark/GFM + tiện ích mở rộng đặc biệt của Wiki.js) dành cho việc tạo và cập nhật trang. |
| `wikijs://mermaid-guide`           | Hướng dẫn cú pháp sơ đồ Mermaid 8.8.2 cho Wiki.js (9 loại sơ đồ được hỗ trợ, cảnh báo tính năng không hỗ trợ, hạn chế phiên bản). |
| `wikijs://api-permissions-guide`   | Mô hình quyền API của Wiki.js, mã lỗi và hướng dẫn cấu hình khóa API để tự chẩn đoán lỗi quyền.                                       |

## Lưu ý về quyền (Wiki.js)

Hành vi quyền của Wiki.js có thể gây bất ngờ đối với khóa API. Cụ thể:

- Một số thao tác có thể yêu cầu quy tắc `manage:pages`/`delete:pages` ở cấp quy tắc trang.
- Đọc `content` có thể yêu cầu `read:source` tùy thuộc vào kiểm tra cấp schema/field.
- Thao tác bình luận yêu cầu `read:comments`, `write:comments` hoặc `manage:comments`.
- Thông tin hệ thống và điều hướng yêu cầu quyền khóa API cấp quản trị.

Mã lỗi phổ biến:

| Mã | Ý nghĩa |
| --- | --- |
| 6013 | `PageViewForbidden` — kiểm tra quyền nhóm + quy tắc trang cho `read:pages`/`read:source` |
| 6003 | Trang không tồn tại |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

Để biết thêm chi tiết, hãy đọc tài nguyên `wikijs://api-permissions-guide`.

## Quyền khóa API tối thiểu được đề xuất

Cho sử dụng KB tập trung đọc:

- `read:pages`, `read:source`
- `read:comments` (để duyệt bình luận)
- Quy tắc trang cho phép các quyền đó cho đường dẫn/locale dự định

Cho luồng công việc ghi:

- `write:pages` (tạo và cập nhật)
- `manage:pages` hoặc `delete:pages` (cho thao tác xóa/di chuyển)
- `write:comments`, `manage:comments` (cho thay đổi bình luận)
- `manage:system` (cho quản lý thẻ)

## Hướng dẫn bảo mật

- Chỉ giữ API token ở phía máy chủ.
- Bắt đầu với quyền chỉ đọc.
- Giữ `WIKI_MUTATIONS_ENABLED=false` trừ khi cần cập nhật.
- Tăng cường bảo mật tùy chọn: đặt `WIKI_MUTATION_CONFIRM_TOKEN` ngẫu nhiên mạnh và truyền `confirm` khớp cho lệnh gọi ghi.
- Giữ `WIKI_MUTATION_DRY_RUN=true` cho đến khi bạn sẵn sàng ghi thật.
- Sử dụng `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` để hạn chế phạm vi ghi.
- `wikijs_get_system_info` lọc các trường cơ sở hạ tầng nhạy cảm (dbHost, configFile, v.v.) theo mặc định.
- Các trường `scriptJs`/`scriptCss` trong tạo/cập nhật trang bị giới hạn độ dài (10.000 ký tự) và bao gồm cảnh báo thực thi trình duyệt.
