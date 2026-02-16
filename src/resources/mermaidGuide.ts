export const MERMAID_GUIDE_URI = 'wikijs://mermaid-guide'

export const mermaidGuideResource = {
  uri: MERMAID_GUIDE_URI,
  name: 'Wiki.js Mermaid 8.8.2 Diagram Guide',
  description:
    'Complete reference for Mermaid diagram syntax compatible with Wiki.js (Mermaid 8.8.2). ' +
    'Covers all 9 supported diagram types with examples, lists unsupported features, and syntax restrictions. ' +
    'Read this resource before writing mermaid diagrams in wiki pages.',
  mimeType: 'text/markdown' as const
}

export const mermaidGuideContent = `\
# Wiki.js Mermaid Diagram Guide (v8.8.2)

Wiki.js bundles **Mermaid 8.8.2** (October 2020). This guide covers only syntax and diagram types confirmed to work in this version. Do NOT rely on features from newer Mermaid releases (9.x, 10.x, 11.x).

> Use fenced code blocks with the language \`mermaid\` to embed diagrams in Wiki.js Markdown pages.

---

## Supported Diagram Types

| Diagram | Keyword | Purpose |
|---------|---------|---------|
| Flowchart | \`graph\` | Process flows, decision trees |
| Sequence | \`sequenceDiagram\` | Actor interactions over time |
| Class | \`classDiagram\` | OOP class structures |
| State | \`stateDiagram-v2\` | State machines, FSMs |
| Gantt | \`gantt\` | Project timelines |
| Pie | \`pie\` | Proportional data |
| ER | \`erDiagram\` | Database entity relationships |
| User Journey | \`journey\` | UX workflow mapping |
| Git Graph | \`gitGraph\` | Branch/merge visualization |

---

## Unsupported Diagram Types

The following were added **after** 8.8.2 and will NOT render in Wiki.js:

| Diagram | Added In | Keyword |
|---------|----------|---------|
| Requirement | 8.10.1 | \`requirementDiagram\` |
| Mindmap | 9.3.0 | \`mindmap\` |
| Timeline | 9.3.0 | \`timeline\` |
| C4 Architecture | ~9.2.x | \`C4Context\` |
| Sankey | 10.3.0 | \`sankey-beta\` |
| Quadrant Chart | 10.x | \`quadrantChart\` |
| XY Chart | 10.x | \`xychart-beta\` |
| Block | 10.x+ | \`block-beta\` |

---

## Syntax Restrictions (8.8.2)

These features exist in newer Mermaid but will **break or be ignored** in 8.8.2:

| Feature | Added In | Workaround |
|---------|----------|------------|
| \`direction\` inside subgraphs | 8.10.2 | Set direction at graph level only |
| \`direction\` inside composite states | 8.10.1 | Not available; use default layout |
| Markdown-in-labels (\`"\\\`**bold**\\\`"\`) | 10.1.0 | Use plain text labels |
| \`flowchart\` keyword | Works but prefer \`graph\` for maximum compatibility |

---

## 1. Flowchart (\`graph\`)

Prefer \`graph\` over \`flowchart\` for maximum compatibility with 8.8.2.

### Direction

Set flow direction at the graph level:

| Keyword | Direction |
|---------|-----------|
| \`TB\` / \`TD\` | Top to bottom (default) |
| \`BT\` | Bottom to top |
| \`LR\` | Left to right |
| \`RL\` | Right to left |

### Node Shapes

| Syntax | Shape |
|--------|-------|
| \`A[text]\` | Rectangle |
| \`A(text)\` | Rounded rectangle |
| \`A((text))\` | Circle |
| \`A([text])\` | Stadium / pill |
| \`A[[text]]\` | Subroutine |
| \`A[(text)]\` | Cylindrical (database) |
| \`A{text}\` | Diamond (decision) |
| \`A{{text}}\` | Hexagon |
| \`A>text]\` | Asymmetric / flag |
| \`A[/text/]\` | Parallelogram |
| \`A[\\text\\]\` | Parallelogram (alt) |
| \`A[/text\\]\` | Trapezoid |
| \`A[\\text/]\` | Trapezoid (alt) |

### Edge Types

| Syntax | Description |
|--------|-------------|
| \`A --> B\` | Arrow |
| \`A --- B\` | Line (no arrow) |
| \`A -.- B\` | Dotted line |
| \`A -.-> B\` | Dotted arrow |
| \`A ==> B\` | Thick arrow |
| \`A -- text --> B\` | Arrow with label |
| \`A -->|text| B\` | Arrow with label (alt) |

### Subgraphs

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    subgraph Group One
        C --> E[Result 1]
    end
    subgraph Group Two
        D --> F[Result 2]
    end
\`\`\`

> **WARNING**: Do NOT use \`direction\` inside subgraphs. This feature was added in 8.10.2 and does not work in 8.8.2. Set direction at the top-level \`graph\` declaration only.

### Styling

\`\`\`mermaid
graph LR
    A[Normal]:::green --> B[Warning]:::orange --> C[Error]:::red
    classDef green fill:#9f6,stroke:#333,stroke-width:2px
    classDef orange fill:#f96,stroke:#333,stroke-width:2px
    classDef red fill:#f33,stroke:#fff,stroke-width:2px,color:#fff
    style A font-weight:bold
\`\`\`

Use \`classDef\` to define reusable styles, \`:::\` shorthand to apply them, and \`style\` for inline per-node styling.

---

## 2. Sequence Diagram

### Participants

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    participant S as Server
    A->>B: Hello Bob
    B->>S: Check status
    S-->>B: OK
    B-->>A: Everything is fine
\`\`\`

### Message Types

| Syntax | Description |
|--------|-------------|
| \`A->B\` | Solid line, no arrow |
| \`A-->B\` | Dotted line, no arrow |
| \`A->>B\` | Solid line, arrow |
| \`A-->>B\` | Dotted line, arrow |
| \`A-xB\` | Solid line, cross |
| \`A--xB\` | Dotted line, cross |

### Activation

\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    C->>+S: Request
    S->>+S: Process
    S-->>-S: Done
    S-->>-C: Response
\`\`\`

Use \`+\` after the arrow to activate, \`-\` to deactivate. Or use explicit \`activate\`/\`deactivate\` statements.

### Control Flow

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as System
    U->>S: Login
    alt Valid credentials
        S-->>U: Success
    else Invalid credentials
        S-->>U: Error
    end
    opt Remember me
        S->>S: Save session
    end
    loop Health check
        S->>S: Ping
    end
\`\`\`

Supported blocks: \`alt\`/\`else\`/\`end\`, \`opt\`/\`end\`, \`loop\`/\`end\`, \`par\`/\`and\`/\`end\`.

### Notes

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    Note left of A: Alice's note
    Note right of B: Bob's note
    A->>B: Message
    Note over A,B: Shared note
\`\`\`

---

## 3. Class Diagram

### Classes and Relationships

\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal : +isMammal() bool
    Animal : +mate()
    Duck : +String beakColor
    Duck : +swim()
    Duck : +quack()
    Fish : -int sizeInFeet
    Fish : -canEat()
\`\`\`

### Relationship Types

| Syntax | Description |
|--------|-------------|
| \`A <\\|-- B\` | Inheritance |
| \`A *-- B\` | Composition |
| \`A o-- B\` | Aggregation |
| \`A --> B\` | Association |
| \`A -- B\` | Link (solid) |
| \`A ..> B\` | Dependency |
| \`A ..\\|> B\` | Realization |
| \`A .. B\` | Link (dashed) |

### Cardinality

\`\`\`mermaid
classDiagram
    Customer "1" --> "*" Order : places
    Order "1" *-- "1..*" LineItem : contains
    LineItem "*" --> "1" Product : refers to
\`\`\`

### Annotations

\`\`\`mermaid
classDiagram
    class Shape {
        <<interface>>
        +draw()
        +area() double
    }
    class Circle {
        +double radius
        +draw()
        +area() double
    }
    Shape <|.. Circle
\`\`\`

Supported annotations: \`<<interface>>\`, \`<<abstract>>\`, \`<<service>>\`, \`<<enumeration>>\`.

---

## 4. State Diagram

Use \`stateDiagram-v2\` (or \`stateDiagram\`; both keywords are accepted by the same parser).

### Basic States and Transitions

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Done : Complete
    Processing --> Error : Fail
    Error --> Idle : Reset
    Done --> [*]
\`\`\`

\`[*]\` represents start and end states. Direction of the arrow determines which.

### Composite States

\`\`\`mermaid
stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused : Pause
        Paused --> Running : Resume
        Running --> [*]
    }
    Active --> [*] : Stop
\`\`\`

> **WARNING**: Do NOT use \`direction\` statements inside composite states. This feature was added in 8.10.1 and will break in 8.8.2.

### Forks and Joins

\`\`\`mermaid
stateDiagram-v2
    state fork_state <<fork>>
    state join_state <<join>>
    [*] --> fork_state
    fork_state --> TaskA
    fork_state --> TaskB
    TaskA --> join_state
    TaskB --> join_state
    join_state --> Done
    Done --> [*]
\`\`\`

### Choice

\`\`\`mermaid
stateDiagram-v2
    state check <<choice>>
    [*] --> check
    check --> Approved : if valid
    check --> Rejected : if invalid
    Approved --> [*]
    Rejected --> [*]
\`\`\`

### Notes

\`\`\`mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Inactive
    note right of Active
        This state is active
        when the system is running
    end note
    note left of Inactive : System is off
\`\`\`

### Concurrency

Use \`--\` to indicate concurrent (parallel) regions:

\`\`\`mermaid
stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Working
        Working --> [*]
        --
        [*] --> Monitoring
        Monitoring --> [*]
    }
\`\`\`

---

## 5. Gantt Chart

### Basic Structure

\`\`\`mermaid
gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section Planning
    Requirements  :done, req, 2024-01-01, 7d
    Design        :active, des, after req, 10d

    section Development
    Backend       :crit, dev1, after des, 14d
    Frontend      :dev2, after des, 12d
    Integration   :after dev1, 5d

    section Testing
    QA            :after dev2, 7d
\`\`\`

### Task Tags

| Tag | Meaning |
|-----|---------|
| \`done\` | Completed (filled) |
| \`active\` | In progress (striped) |
| \`crit\` | Critical path (red) |
| (none) | Default styling |

### Task Duration

| Format | Example |
|--------|---------|
| Days | \`7d\` |
| After dependency | \`after taskId, 5d\` |
| Date range | \`2024-01-01, 2024-01-15\` |
| Until date | \`2024-01-01, 14d\` |

### Date Formats

Input format (\`dateFormat\`): follows Moment.js tokens — \`YYYY-MM-DD\`, \`DD/MM/YYYY\`, etc.

Axis format (\`axisFormat\`): follows d3 time format — \`%Y-%m-%d\`, \`%m/%d\`, \`%b %d\`, etc.

### Exclusions

\`\`\`mermaid
gantt
    title Sprint Plan
    dateFormat YYYY-MM-DD
    excludes weekends

    section Sprint 1
    Task A :a1, 2024-01-08, 5d
    Task B :after a1, 3d
\`\`\`

---

## 6. Pie Chart

\`\`\`mermaid
pie
    title Language Distribution
    "JavaScript" : 45
    "TypeScript" : 30
    "Python" : 15
    "Other" : 10
\`\`\`

Syntax: \`"Label" : value\`. Values are proportional (do not need to sum to 100).

---

## 7. ER Diagram

### Entities and Attributes

\`\`\`mermaid
erDiagram
    CUSTOMER {
        int id PK
        string name
        string email UK
    }
    ORDER {
        int id PK
        int customer_id FK
        date created_at
        string status
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    PRODUCT {
        int id PK
        string name
        float price
    }
\`\`\`

Attribute keys: \`PK\` (primary), \`FK\` (foreign), \`UK\` (unique).

### Relationship Cardinality

| Left | Right | Meaning |
|------|-------|---------|
| \`\\|\\|\` | \`\\|\\|\` | Exactly one |
| \`\\|o\` | \`o\\|\` | Zero or one |
| \`}\\|\` | \`\\|{\` | One or more |
| \`}o\` | \`o{\` | Zero or more |

Line types: \`--\` identifying (solid), \`..\` non-identifying (dashed).

### Full Example

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM }o--|| PRODUCT : "refers to"
    CUSTOMER {
        int id PK
        string name
    }
    ORDER {
        int id PK
        date created_at
    }
\`\`\`

---

## 8. User Journey

\`\`\`mermaid
journey
    title User Login Flow
    section Visit Site
        Open homepage: 5: User
        Click login: 4: User
    section Authentication
        Enter credentials: 3: User
        Validate: 4: System
        MFA check: 2: User, System
    section Dashboard
        Load dashboard: 4: System
        View profile: 5: User
\`\`\`

### Syntax

- \`title\` — diagram title
- \`section\` — groups related tasks
- Task format: \`Task name: score: actor1, actor2\`
- Score: **1** (negative) to **5** (positive)

---

## 9. Git Graph

\`\`\`mermaid
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
\`\`\`

### Commands

| Command | Description |
|---------|-------------|
| \`commit\` | Add a commit on current branch |
| \`branch <name>\` | Create and switch to a new branch |
| \`checkout <name>\` | Switch to an existing branch |
| \`merge <name>\` | Merge a branch into current branch |

> The gitGraph implementation in 8.8.2 is basic. Advanced features like custom commit IDs (\`id:\`), tags (\`tag:\`), commit types (\`type: HIGHLIGHT\`), and cherry-pick were added in later versions.

---

## Quick Reference: Safe Patterns

### Minimal Flowchart

\`\`\`mermaid
graph LR
    A[Input] --> B[Process] --> C[Output]
\`\`\`

### Minimal Sequence

\`\`\`mermaid
sequenceDiagram
    Client->>Server: Request
    Server-->>Client: Response
\`\`\`

### Minimal State

\`\`\`mermaid
stateDiagram-v2
    [*] --> On
    On --> Off : Toggle
    Off --> On : Toggle
    Off --> [*]
\`\`\`

---

## Common Mistakes to Avoid

1. **Using \`flowchart\` keyword** — prefer \`graph\` for safety in 8.8.2.
2. **Using \`direction\` inside subgraphs** — only set direction at graph level (\`graph LR\`).
3. **Using \`direction\` inside composite states** — not supported in 8.8.2.
4. **Using Markdown-in-labels** (\`"\\\`**bold**\\\`"\`) — plain text only.
5. **Using unsupported diagram types** — no \`mindmap\`, \`timeline\`, \`C4Context\`, \`sankey-beta\`, \`quadrantChart\`, \`xychart-beta\`, \`block-beta\`, or \`requirementDiagram\`.
6. **Relying on newer gitGraph features** — keep to basic \`commit\`, \`branch\`, \`checkout\`, \`merge\`.
`
