import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  MARKDOWN_GUIDE_URI,
  markdownGuideResource,
  markdownGuideContent
} from '../src/resources/markdownGuide.js'

import {
  PERMISSIONS_GUIDE_URI,
  permissionsGuideResource,
  permissionsGuideContent
} from '../src/resources/permissionsGuide.js'

import {
  MERMAID_GUIDE_URI,
  mermaidGuideResource,
  mermaidGuideContent
} from '../src/resources/mermaidGuide.js'

/* ------------------------------------------------------------------ */
/*  Existing resources – smoke tests                                   */
/* ------------------------------------------------------------------ */

describe('markdownGuideResource', () => {
  it('exports a valid URI', () => {
    assert.equal(MARKDOWN_GUIDE_URI, 'wikijs://markdown-guide')
  })
  it('resource metadata is well-formed', () => {
    assert.equal(markdownGuideResource.uri, MARKDOWN_GUIDE_URI)
    assert.ok(markdownGuideResource.name.length > 0)
    assert.ok(markdownGuideResource.description.length > 0)
    assert.equal(markdownGuideResource.mimeType, 'text/markdown')
  })
  it('content is non-empty markdown', () => {
    assert.ok(markdownGuideContent.length > 100)
    assert.ok(markdownGuideContent.startsWith('# '))
  })
})

describe('permissionsGuideResource', () => {
  it('exports a valid URI', () => {
    assert.equal(PERMISSIONS_GUIDE_URI, 'wikijs://api-permissions-guide')
  })
  it('resource metadata is well-formed', () => {
    assert.equal(permissionsGuideResource.uri, PERMISSIONS_GUIDE_URI)
    assert.ok(permissionsGuideResource.name.length > 0)
    assert.equal(permissionsGuideResource.mimeType, 'text/markdown')
  })
  it('content is non-empty markdown', () => {
    assert.ok(permissionsGuideContent.length > 100)
    assert.ok(permissionsGuideContent.startsWith('# '))
  })
})

/* ------------------------------------------------------------------ */
/*  Mermaid guide – the new resource                                   */
/* ------------------------------------------------------------------ */

describe('mermaidGuideResource', () => {
  it('exports a valid URI', () => {
    assert.equal(MERMAID_GUIDE_URI, 'wikijs://mermaid-guide')
  })

  it('resource metadata is well-formed', () => {
    assert.equal(mermaidGuideResource.uri, MERMAID_GUIDE_URI)
    assert.ok(mermaidGuideResource.name.length > 0)
    assert.ok(mermaidGuideResource.description.length > 0)
    assert.equal(mermaidGuideResource.mimeType, 'text/markdown')
  })

  it('description mentions Mermaid 8.8.2', () => {
    assert.ok(mermaidGuideResource.description.includes('8.8.2'))
  })

  it('content is non-empty markdown', () => {
    assert.ok(mermaidGuideContent.length > 500)
    assert.ok(mermaidGuideContent.startsWith('# '))
  })

  it('mentions Mermaid version 8.8.2', () => {
    assert.ok(mermaidGuideContent.includes('8.8.2'))
  })
})

describe('mermaidGuide – supported diagram types', () => {
  const supportedTypes = [
    'graph',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'gantt',
    'pie',
    'erDiagram',
    'journey',
    'gitGraph'
  ]

  for (const diagramType of supportedTypes) {
    it(`documents ${diagramType}`, () => {
      assert.ok(
        mermaidGuideContent.includes(diagramType),
        `Expected content to include "${diagramType}"`
      )
    })
  }

  it('includes a code example for each supported diagram type', () => {
    // Each diagram type should have at least one ```mermaid fenced block example
    // We check that the content has mermaid code blocks
    const mermaidBlocks = mermaidGuideContent.match(/```mermaid/g)
    assert.ok(mermaidBlocks, 'Expected at least one ```mermaid code block')
    // At minimum one example per diagram type (9 types)
    assert.ok(
      mermaidBlocks.length >= 9,
      `Expected at least 9 mermaid code blocks, got ${mermaidBlocks.length}`
    )
  })
})

describe('mermaidGuide – unsupported features warning', () => {
  const unsupportedTypes = [
    'mindmap',
    'timeline',
    'C4Context',
    'sankey-beta',
    'quadrantChart',
    'xychart-beta',
    'block-beta'
  ]

  for (const diagramType of unsupportedTypes) {
    it(`warns against ${diagramType}`, () => {
      assert.ok(
        mermaidGuideContent.includes(diagramType),
        `Expected content to warn about unsupported "${diagramType}"`
      )
    })
  }

  it('warns about direction inside subgraphs', () => {
    assert.ok(mermaidGuideContent.toLowerCase().includes('direction'))
    assert.ok(mermaidGuideContent.includes('subgraph'))
  })

  it('warns about Markdown-in-labels', () => {
    assert.ok(
      mermaidGuideContent.toLowerCase().includes('markdown') &&
        mermaidGuideContent.toLowerCase().includes('label')
    )
  })
})

describe('mermaidGuide – syntax features', () => {
  it('documents classDef and style statements', () => {
    assert.ok(mermaidGuideContent.includes('classDef'))
    assert.ok(mermaidGuideContent.includes('style'))
  })

  it('documents node shapes', () => {
    // Should mention at least a few common shapes
    assert.ok(mermaidGuideContent.includes('['))
    assert.ok(mermaidGuideContent.includes('('))
    assert.ok(mermaidGuideContent.includes('{'))
  })

  it('documents graph directions (TD, LR, etc.)', () => {
    assert.ok(mermaidGuideContent.includes('TD'))
    assert.ok(mermaidGuideContent.includes('LR'))
  })

  it('prefers graph over flowchart keyword', () => {
    // The guide should recommend using `graph` over `flowchart`
    assert.ok(
      mermaidGuideContent.includes('graph') && mermaidGuideContent.toLowerCase().includes('prefer')
    )
  })
})

describe('mermaidGuide – no unsupported syntax in examples', () => {
  it('does not use direction inside subgraph in examples', () => {
    // Extract all mermaid code blocks
    const codeBlockRegex = /```mermaid\n([\s\S]*?)```/g
    let match
    while ((match = codeBlockRegex.exec(mermaidGuideContent)) !== null) {
      const block = match[1]
      // Check if block has subgraph and direction together
      if (block.includes('subgraph')) {
        const lines = block.split('\n')
        let inSubgraph = false
        for (const line of lines) {
          if (line.trim().startsWith('subgraph')) inSubgraph = true
          if (line.trim() === 'end') inSubgraph = false
          if (inSubgraph && /^\s*direction\s+(TB|TD|BT|RL|LR)/.test(line)) {
            assert.fail(`Found "direction" inside subgraph in example:\n${block}`)
          }
        }
      }
    }
  })

  it('does not use flowchart keyword in examples (uses graph instead)', () => {
    const codeBlockRegex = /```mermaid\n([\s\S]*?)```/g
    let match
    while ((match = codeBlockRegex.exec(mermaidGuideContent)) !== null) {
      const block = match[1]
      const firstLine = block.trim().split('\n')[0].trim()
      if (firstLine.startsWith('flowchart')) {
        assert.fail(`Example uses "flowchart" keyword instead of "graph":\n${block}`)
      }
    }
  })

  it('does not include unsupported diagram types in examples', () => {
    const unsupported = [
      'mindmap',
      'timeline',
      'C4Context',
      'sankey-beta',
      'quadrantChart',
      'xychart-beta',
      'block-beta',
      'requirementDiagram'
    ]
    const codeBlockRegex = /```mermaid\n([\s\S]*?)```/g
    let match
    while ((match = codeBlockRegex.exec(mermaidGuideContent)) !== null) {
      const firstLine = match[1].trim().split('\n')[0].trim()
      for (const type of unsupported) {
        assert.ok(!firstLine.startsWith(type), `Example uses unsupported diagram type "${type}"`)
      }
    }
  })
})
