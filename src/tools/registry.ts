import type { ToolModule } from '../types.js'

// ── Phase 0: Original tools ─────────────────────────────────────────
import { searchPagesTool } from './searchPages.js'
import { listPagesTool } from './listPages.js'
import { getPageByPathTool } from './getPageByPath.js'
import { getPageByIdTool } from './getPageById.js'
import { getPageTreeTool } from './getPageTree.js'
import { getPageHistoryTool } from './getPageHistory.js'
import { listTagsTool } from './listTags.js'
import { createPageTool } from './createPage.js'
import { updatePageTool } from './updatePage.js'
import { deletePageTool } from './deletePage.js'

// ── Phase 1: Enhanced Pages ─────────────────────────────────────────
import { getPageVersionTool } from './getPageVersion.js'
import { getPageLinksTool } from './getPageLinks.js'
import { searchTagsTool } from './searchTags.js'
import { movePageTool } from './movePage.js'
import { restorePageTool } from './restorePage.js'

// ── Phase 2: Comments ───────────────────────────────────────────────
import { listCommentsTool } from './listComments.js'
import { getCommentTool } from './getComment.js'
import { createCommentTool } from './createComment.js'
import { updateCommentTool } from './updateComment.js'
import { deleteCommentTool } from './deleteComment.js'

// ── Phase 3: Tag Management & Site Awareness ────────────────────────
import { updateTagTool } from './updateTag.js'
import { deleteTagTool } from './deleteTag.js'
import { getSystemInfoTool } from './getSystemInfo.js'
import { getNavigationTool } from './getNavigation.js'
import { getSiteConfigTool } from './getSiteConfig.js'

// ── Phase 4: Assets (READ-ONLY) ────────────────────────────────────
import { listAssetsTool } from './listAssets.js'
import { listAssetFoldersTool } from './listAssetFolders.js'

// ── Phase 5: User Context (READ-ONLY) ──────────────────────────────
import { getCurrentUserTool } from './getCurrentUser.js'
import { searchUsersTool } from './searchUsers.js'

export const allTools: ToolModule[] = [
  // Pages (read)
  searchPagesTool,
  listPagesTool,
  getPageByPathTool,
  getPageByIdTool,
  getPageTreeTool,
  getPageHistoryTool,
  getPageVersionTool,
  getPageLinksTool,

  // Tags (read)
  listTagsTool,
  searchTagsTool,

  // Pages (write)
  createPageTool,
  updatePageTool,
  deletePageTool,
  movePageTool,
  restorePageTool,

  // Tags (write)
  updateTagTool,
  deleteTagTool,

  // Comments (read)
  listCommentsTool,
  getCommentTool,

  // Comments (write)
  createCommentTool,
  updateCommentTool,
  deleteCommentTool,

  // Site awareness (read)
  getSystemInfoTool,
  getNavigationTool,
  getSiteConfigTool,

  // Assets (read)
  listAssetsTool,
  listAssetFoldersTool,

  // Users (read)
  getCurrentUserTool,
  searchUsersTool
]
