import type { ToolModule } from '../types.js'

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

export const allTools: ToolModule[] = [
  searchPagesTool,
  listPagesTool,
  getPageByPathTool,
  getPageByIdTool,
  getPageTreeTool,
  getPageHistoryTool,
  listTagsTool,
  createPageTool,
  updatePageTool,
  deletePageTool
]
