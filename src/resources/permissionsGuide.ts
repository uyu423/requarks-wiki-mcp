export const PERMISSIONS_GUIDE_URI = 'wikijs://api-permissions-guide'

export const permissionsGuideResource = {
  uri: PERMISSIONS_GUIDE_URI,
  name: 'Wiki.js API Permissions Guide',
  description:
    'Complete guide to Wiki.js API key permissions, group configuration, page rules, and common error codes. ' +
    'Read this resource when encountering permission errors or setting up API access.',
  mimeType: 'text/markdown' as const
}

export const permissionsGuideContent = `\
# Wiki.js API Permissions Guide

This guide covers API key creation, permission assignment, page rules, and troubleshooting common permission errors.

---

## API Key Creation

### Steps

1. Navigate to **Administration** > **API Access** in your Wiki.js instance
2. Click **New API Key**
3. Assign the key to one or more **Groups**
4. Copy the generated token and set it as \`WIKI_API_TOKEN\` in your environment
5. Set key expiration (optional) or leave it permanent

> API keys inherit ALL permissions from their assigned groups. A key can belong to multiple groups, and permissions are cumulative.

---

## Key Permissions

Wiki.js uses a group-based permission model. API keys execute with the combined permissions of all assigned groups.

### Page Permissions

| Permission | Description |
|------------|-------------|
| \`read:pages\` | View published page metadata (title, path, tags, timestamps) |
| \`read:source\` | Read page content (markdown, HTML, etc.) |
| \`write:pages\` | Create and update pages |
| \`manage:pages\` | Full control: create, update, move, restore pages |
| \`delete:pages\` | Delete pages permanently |
| \`read:history\` | View page version history |

### Comment Permissions

| Permission | Description |
|------------|-------------|
| \`read:comments\` | View comments on pages |
| \`write:comments\` | Post new comments |
| \`manage:comments\` | Edit and delete any comment |

### Asset Permissions

| Permission | Description |
|------------|-------------|
| \`read:assets\` | List and download uploaded files |
| \`write:assets\` | Upload new assets |

### Best Practices

- **Read-only bots**: \`read:pages\`, \`read:source\`, \`read:history\`
- **Content editors**: \`read:pages\`, \`read:source\`, \`write:pages\`, \`read:history\`
- **Automation/CI**: \`manage:pages\`, \`read:pages\`, \`read:source\`, \`write:pages\`
- **Content moderators**: Add \`manage:comments\` for comment moderation

---

## Page Rules

Page rules filter which pages a group can access, even if the group has the required permission.

### Rule Types

| Match Mode | Description | Example |
|------------|-------------|---------|
| \`EXACT\` | Exact path match | \`/docs/api\` matches only that page |
| \`START\` | Path prefix match | \`/docs/\` matches \`/docs/api\`, \`/docs/guide\`, etc. |
| \`END\` | Path suffix match | \`/archive\` matches \`/2023/archive\`, \`/old/archive\` |
| \`REGEX\` | Regular expression | \`^/internal/.*\` matches all pages under \`/internal/\` |
| \`TAG\` | Page tag match | \`public\` matches any page tagged "public" |

### Common Patterns

#### Allow read access to /public/* paths

- Match: \`START\`
- Path: \`/public/\`
- Permissions: \`read:pages\`, \`read:source\`
- Deny: \`false\`

#### Deny write access to /archive/* paths

- Match: \`START\`
- Path: \`/archive/\`
- Permissions: \`write:pages\`, \`manage:pages\`, \`delete:pages\`
- Deny: \`true\`

#### Allow read access only to pages tagged "public"

- Match: \`TAG\`
- Path: \`public\`
- Permissions: \`read:pages\`, \`read:source\`
- Deny: \`false\`

> **IMPORTANT**: If a group has **no page rules**, it has access to **all pages** (subject to global permissions). Use \`DENY\` rules to restrict access.

---

## Common Error Codes

### Page Errors (6xxx)

| Code | Slug | Meaning | How to Fix |
|------|------|---------|------------|
| 6002 | PageDuplicateCreate | A page already exists at this path | Use a different path or update the existing page |
| 6003 | PageNotFound | Page does not exist | Verify the page ID or path |
| 6004 | PageEmptyContent | Page content is empty | Provide non-empty content |
| 6005 | PageIllegalPath | Path contains invalid characters | Use only alphanumeric, hyphens, underscores, slashes |
| 6006 | PagePathCollision | Path conflicts with existing page/folder | Choose a unique path |
| 6008 | PageDeleteForbidden | API key lacks \`delete:pages\` permission | Add \`delete:pages\` to the group |
| 6009 | PageMoveForbidden | API key lacks \`manage:pages\` permission | Add \`manage:pages\` to the group |
| 6010 | PageCreateForbidden | API key lacks \`write:pages\` permission | Add \`write:pages\` or \`manage:pages\` |
| 6011 | PageUpdateForbidden | API key lacks \`write:pages\` permission | Add \`write:pages\` or \`manage:pages\` |
| 6012 | PageRestoreForbidden | API key lacks \`manage:pages\` permission | Add \`manage:pages\` to the group |
| 6013 | PageViewForbidden | API key lacks \`read:pages\` or \`read:source\` | Add both \`read:pages\` and \`read:source\` permissions, and check page rules |
| 6014 | PageNotYetRendered | Page exists but has not been rendered | Wait a moment and retry |

### Comment Errors (8xxx)

| Code | Slug | Meaning | How to Fix |
|------|------|---------|------------|
| 8001 | CommentGenericError | Unknown comment error | Check server logs |
| 8002 | CommentPostForbidden | API key lacks \`write:comments\` | Add \`write:comments\` to the group |
| 8003 | CommentNotFound | Comment does not exist | Verify the comment ID |
| 8004 | CommentViewForbidden | API key lacks \`read:comments\` | Add \`read:comments\` to the group |
| 8005 | CommentManageForbidden | API key lacks \`manage:comments\` | Add \`manage:comments\` to the group |

### Authentication Errors (1xxx)

| Code Range | Meaning | How to Fix |
|------------|---------|------------|
| 1000-1999 | Authentication failure | Verify \`WIKI_API_TOKEN\` is correct and not expired |

---

## Troubleshooting Checklist

### Error 6013 (PageViewForbidden)

1. Check the API key group has **both** \`read:pages\` and \`read:source\` permissions
2. Verify page rules: does the group have a rule that matches the page path?
3. If using \`TAG\` match mode, confirm the page has the required tag
4. Check for \`DENY\` rules that may block access

### Error 6010, 6011, 6012 (Create/Update/Restore Forbidden)

1. Verify the group has the required permission (\`write:pages\` or \`manage:pages\`)
2. Check page rules: is the target path allowed for write operations?
3. Confirm \`WIKI_MUTATIONS_ENABLED=true\` in your environment
4. If using \`WIKI_ALLOWED_MUTATION_PATH_PREFIXES\`, ensure the path matches a prefix

### Error 6008 (PageDeleteForbidden)

1. Add \`delete:pages\` permission to the group
2. Verify the page path is allowed by page rules
3. Confirm \`WIKI_MUTATIONS_ENABLED=true\`

### Error 8002, 8004, 8005 (Comment Permission Errors)

1. Add the required comment permission to the group
2. Check if comments are enabled for the page
3. Verify the page itself is accessible (6013 errors may cascade to comment errors)

---

## Permission Hierarchy

Wiki.js evaluates permissions in this order:

1. **Authentication**: Is the API token valid?
2. **Global Permission**: Does any assigned group have the required permission?
3. **Page Rules**: Do the group's page rules allow access to this specific page?
4. **Deny Rules**: Are there any DENY rules that block access?

If any step fails, the operation is rejected with a 6013 (read) or 6008-6012 (write) error.

---

## Example Configurations

### Public Documentation Bot (Read-Only)

**Group Permissions**:
- \`read:pages\`
- \`read:source\`
- \`read:history\`

**Page Rules**:
- Match: \`START\`, Path: \`/docs/\`, Deny: \`false\`

### Internal Wiki Editor

**Group Permissions**:
- \`read:pages\`
- \`read:source\`
- \`write:pages\`
- \`manage:pages\`
- \`read:history\`

**Page Rules**:
- Match: \`START\`, Path: \`/internal/\`, Deny: \`false\`
- Match: \`START\`, Path: \`/archive/\`, Deny: \`true\` (prevent edits)

### CI/CD Automation (Full Access)

**Group Permissions**:
- \`read:pages\`
- \`read:source\`
- \`write:pages\`
- \`manage:pages\`
- \`delete:pages\`
- \`read:history\`

**Page Rules**: None (access all pages)

---

## Additional Resources

- [Wiki.js API Documentation](https://docs.requarks.io/dev/api)
- [Permission Model Overview](https://docs.requarks.io/guide/admin/permissions)
- [GraphQL Schema Explorer](https://your-wiki-instance.com/graphql) (requires admin login)
`
