# VueNotes AI

> A privacy-first notes application with server-side AI summarisation, automatic tagging, and retrieval-augmented (RAG) chat grounded exclusively in the user's own notes.

**Vue 3 · TypeScript · Supabase (Postgres + pgvector) · Deno Edge Functions · Google Gemini · Tailwind CSS v4**

<!-- TODO: Add these once deployed. A live link is the single highest-impact thing on this page. -->
**[Live Demo](https://ai-notes-application.vercel.app)** · **[Video Walkthrough](#)** · **[Figma](#)**

<!-- TODO: Replace with a real screenshot or GIF of the RAG chat streaming an answer.
     Recruiters scan for ~15 seconds. A moving demo of the streaming chat is your best asset. -->
![Screenshot](docs/screenshot.png)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Market Research](#2-market-research)
3. [Requirements Analysis](#3-requirements-analysis)
4. [Software Development Lifecycle](#4-software-development-lifecycle)
5. [Design](#5-design)
6. [Software Architecture](#6-software-architecture)
7. [Implementation](#7-implementation)
8. [Testing](#8-testing)
9. [Evaluation](#9-evaluation)
10. [Deployment](#10-deployment)
11. [Future Work](#11-future-work)
12. [Running Locally](#12-running-locally)

---

## 1. Project Overview

### The problem

Note-taking apps are excellent at *storing* information and poor at *retrieving* it. Once a personal knowledge base passes a few hundred notes, keyword search fails in a specific way: you remember the *idea* but not the *words*. Searching "design meeting" won't surface a note titled "Tuesday sync re: nav bar" — even though it's exactly what you wanted.

The obvious fix is to ask an AI. But that creates two new problems:

1. **Privacy.** Sending private notes to a third-party AI means trusting that provider with your data.
2. **Hallucination.** A general-purpose model asked "what did I decide about the nav bar?" will happily invent a plausible answer, because it has no way of knowing it doesn't know.

### The solution

VueNotes AI addresses both directly:

- **The AI never runs in the browser.** All model calls execute inside Supabase Edge Functions. The Gemini API key exists only as a server-side secret and is never shipped to the client.
- **Answers are retrieval-grounded.** Every note is embedded as a 768-dimensional vector on save. Questions are embedded too, matched against the user's notes via cosine similarity in Postgres, and *only the matching notes* are passed to the model as context. When nothing matches, the prompt explicitly instructs the model to say so rather than guess.
- **Isolation is enforced by the database, not the application.** Postgres Row Level Security means a user physically cannot read another user's rows — even with a modified client. The vector search function is independently scoped to `auth.uid()`.

### Aims and objectives

| # | Objective | Status |
| --- | --- | --- |
| O1 | Multi-user auth with route protection and persistent sessions | ✅ |
| O2 | Full CRUD for notes with optimistic cache invalidation | ✅ |
| O3 | Database-enforced per-user data isolation (RLS) | ✅ |
| O4 | One-click AI summary + auto-tagging with schema-guaranteed output | ✅ |
| O5 | Semantic vector search over the user's own notes | ✅ |
| O6 | Token-by-token streaming chat grounded in retrieved notes | ✅ |
| O7 | Zero exposure of AI credentials to the client | ✅ |
| O8 | Non-blocking embedding generation (UI never waits on AI) | ✅ |

### Attribution

This project was built following the [CodeWithLari](https://youtube.com/@codewithlari) VueNotes AI course series as a structured way to learn production RAG architecture.

<!-- TODO: Be specific here — this section is an ASSET, not a liability, if you're honest and precise.
     Recruiters respect "I learned X from a course, then extended it with Y" far more than a vague
     claim of sole authorship (which they can disprove in one Google search of your repo name).

     Replace the line below with what YOU actually did beyond the tutorial. Examples of things that
     count: writing the test suite, fixing the SUPABASE_PUBLISHABLE_KEY fallback, adding the missing
     schema SQL, deploying it, refactoring anything, adding a feature the course didn't cover.
     If you did nothing beyond following along, say "built by following the course" — and then go
     add ONE original feature from section 11 so you have something concrete to discuss. -->

**My extensions beyond the course material:** <!-- TODO --> _e.g. component test suite with Vitest, hardened Edge Function environment handling, production deployment on Vercel._

---

## 2. Market Research

### 2.1 Secondary research

**Market sizing — and a caveat.** Published estimates for the note-taking app market diverge dramatically. For 2026 alone, analyst figures range from <cite index="10-1">USD 1.23 billion</cite> to <cite index="6-1">USD 18.7 billion</cite> — an order-of-magnitude spread reflecting inconsistent segment definitions (standalone apps vs. bundled productivity suites vs. enterprise knowledge management). Rather than quote a single convenient number, the defensible conclusion is directional: **every major analyst agrees on rapid growth, with CAGR estimates clustering between <cite index="9-1">11%</cite> and <cite index="2-1">22%</cite>.**

Two findings directly validate this project's core thesis:

**Finding 1 — AI-assisted retrieval is where the market is moving.** The category is <cite index="8-1">shifting away from simple text capture toward intelligent knowledge systems built on semantic search and AI assistants</cite>, and forecast-period growth is attributed in part to <cite index="1-1">the integration of AI-assisted note organisation</cite>. This is precisely the RAG capability implemented here.

**Finding 2 — privacy is the category's key adoption barrier.** <cite index="2-1">68% of consumers report being somewhat or very concerned about online privacy, which constrains adoption of apps requesting broad data access.</cite> This is the single strongest argument for the server-side-key + RLS architecture: the primary brake on AI note-taking adoption is a trust problem, and trust problems are solved architecturally, not with marketing copy.

**Competitive landscape.**

| Product | AI approach | Gap this project addresses |
| --- | --- | --- |
| **Evernote** | <cite index="8-1">2025 update added a conversational assistant that searches user content, generates summaries, and fetches web information; also introduced natural-language semantic search</cite> | Closest competitor. Web-fetching means answers aren't strictly grounded in user data. |
| **Google NotebookLM** | <cite index="8-1">Supports context windows up to one million tokens, handling entire books and project repositories</cite> | Long-context brute force rather than retrieval — expensive and doesn't scale past the window. |
| **Notion AI** | <cite index="10-1">Introduced AI writing and summarisation in 2023; over 20 million monthly active users</cite> | Generation-focused; weaker on grounded retrieval over personal corpus. |
| **Microsoft OneNote / Apple Notes** | Ecosystem-bundled, limited AI retrieval | Incumbent distribution advantage, minimal semantic search. |

**Positioning.** The incumbents are converging on AI-assisted retrieval, confirming the direction. The differentiator available to a small entrant is *strict grounding* — an assistant that answers only from your notes and openly admits when it can't, rather than blending your data with web results or model priors.

**Technical validation.** Retrieval-augmented generation is the established production pattern for grounding LLMs in private data (Lewis et al., 2020, *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*). The Matryoshka embedding approach — truncating `gemini-embedding-001` from 3072 to 768 dimensions — follows Kusupati et al., 2022, *Matryoshka Representation Learning*, and yields a 4× reduction in storage and search cost for marginal accuracy loss.

### 2.2 Primary research

> **⚠️ TODO — This section requires research only you can have conducted. Do not fabricate it.**
>
> Primary research means data *you* gathered: surveys, interviews, usability sessions. If you didn't
> do any, you have two honest options:
>
> **Option A — Do it. It's genuinely cheap.** A 10-question Google Form sent to 15–20 classmates or
> colleagues takes an afternoon and gives you real numbers to cite. Useful questions:
> - How many notes are in your main note app? When did you last fail to find one you knew existed?
> - Would you let an AI read your private notes? What would change your answer?
> - Have you ever been given a confidently wrong answer by an AI assistant?
>
> Then report: sample size, method, key findings, and — critically — **how findings changed the build.**
> That last part is what separates real research from decoration.
>
> **Option B — Delete this subsection entirely** and retitle §2 to "Market Research (Secondary)".
> An honest, well-sourced secondary-only section is strictly better than an invented primary one.
>
> **Never invent an option C.** A fabricated survey is a five-second interview question away from
> collapsing ("What was your sample size? How did you recruit?"), and it turns a strong project into
> an integrity problem.

<!-- Template — fill only with real data:

**Method.** [Survey / semi-structured interviews], n = [N], [population], [dates].

**Key findings.**
| # | Finding | Data | Design implication |
| - | ------- | ---- | ------------------ |
| F1 | ... | X of N | Drove requirement FR-## |

**Limitations.** [Small n, convenience sample, self-selection bias, etc.]
-->

---

## 3. Requirements Analysis

Requirements use MoSCoW prioritisation. Each maps to a verifiable acceptance test in §8.

### 3.1 Personas

<!-- TODO: If you ran primary research, ground these in it. If not, label them as assumption-based —
     which is honest and still legitimate practice. -->

| Persona | Context | Core need |
| --- | --- | --- |
| **The Student** | Lecture and reading notes across a term | "I know I wrote about this — I can't remember what I called it." |
| **The Knowledge Worker** | Meeting notes, decisions, action items | "What did we decide about X three weeks ago?" |
| **The Privacy-Conscious User** | Personal journal, sensitive material | "I want AI search without handing my life to a third party." |

### 3.2 Functional requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-01 | User can register with email and password | Must | ✅ |
| FR-02 | User can log in and log out | Must | ✅ |
| FR-03 | Session persists across page reloads | Must | ✅ |
| FR-04 | Unauthenticated users are redirected away from protected routes | Must | ✅ |
| FR-05 | Authenticated users are redirected away from auth routes | Should | ✅ |
| FR-06 | User can create a note with title and content | Must | ✅ |
| FR-07 | User can view all their notes, newest first | Must | ✅ |
| FR-08 | User can edit an existing note | Must | ✅ |
| FR-09 | User can delete a note | Must | ✅ |
| FR-10 | User can generate an AI summary of a note on demand | Must | ✅ |
| FR-11 | System generates 2–4 topical tags alongside each summary | Must | ✅ |
| FR-12 | Summary and tags persist and display on the note card | Must | ✅ |
| FR-13 | Notes are embedded as vectors automatically on create and update | Must | ✅ |
| FR-14 | User can ask natural-language questions about their notes | Must | ✅ |
| FR-15 | Answers are grounded only in the user's own matched notes | Must | ✅ |
| FR-16 | System explicitly states when no relevant notes are found | Must | ✅ |
| FR-17 | Answers stream token-by-token rather than appearing at once | Should | ✅ |
| FR-18 | UI indicates in-progress AI operations | Should | ✅ |
| FR-19 | Full-text keyword search alongside semantic search | Could | ❌ |
| FR-20 | Note sharing between users | Won't (v1) | ❌ |

### 3.3 Non-functional requirements

| ID | Category | Requirement | How it's met |
| --- | --- | --- | --- |
| NFR-01 | **Security** | AI provider credentials must never reach the client | Gemini key stored as a Supabase secret; all model calls server-side |
| NFR-02 | **Security** | Users must be unable to access others' notes even with a modified client | Postgres RLS on all four CRUD operations |
| NFR-03 | **Security** | Vector search must not leak across user boundaries | `match_notes` filters on `auth.uid()` internally |
| NFR-04 | **Performance** | Note save must not block on AI latency | Fire-and-forget background embedding |
| NFR-05 | **Performance** | Similarity search must not degrade linearly with corpus size | HNSW approximate-nearest-neighbour index |
| NFR-06 | **Performance** | Perceived chat latency minimised | SSE streaming; first token renders immediately |
| NFR-07 | **Reliability** | AI structured output must parse deterministically | Gemini `responseSchema` constrains decoding |
| NFR-08 | **Reliability** | Background AI failure must not corrupt user data | Embedding errors caught and logged; note remains valid |
| NFR-09 | **Maintainability** | Database schema and TypeScript types must not drift | Types generated from live schema via `npm run gen:types` |
| NFR-10 | **Cost** | Vector storage minimised | Matryoshka truncation, 3072 → 768 dims |

### 3.4 Constraints and assumptions

- **Constraint:** Gemini free tier enforces rate limits; 429 responses are surfaced distinctly to the UI.
- **Constraint:** Edge Functions run on Deno, not Node — different runtime APIs and import semantics.
- **Assumption:** Notes are primarily text. Attachments, handwriting, and audio are out of scope for v1.
- **Assumption:** Single-user-per-note ownership. Collaboration is explicitly deferred (FR-20).

---

## 4. Software Development Lifecycle

**Model: Iterative and incremental.**

Waterfall was rejected for a specific, defensible reason: two core parameters of this system — the embedding similarity threshold and the RAG prompt wording — **cannot be specified correctly in advance.** There is no way to know from a requirements document whether `match_threshold: 0.5` is too strict or whether a prompt will successfully suppress hallucination. Both are empirical questions answerable only by building the pipeline and observing real output. A methodology that front-loads specification and defers integration would surface these findings at the worst possible moment.

The iterative model instead delivers a working, demonstrable increment at each stage, with every AI feature layered onto a verified foundation.

| Iteration | Deliverable | Exit criterion |
| --- | --- | --- |
| **1** | Supabase project, `notes` schema, generated types, data layer | `fetchNotes()` returns live data |
| **2** | Auth, router guard, Row Level Security | **User B cannot see User A's notes** |
| **3** | `summarize-note` Edge Function, structured JSON output | Summary + tags persist and render |
| **4** | pgvector, `match_notes`, `embed-note`, `chat-notes`, streaming UI | Grounded answer streams; unknown query correctly refused |
| **5** | Testing, hardening, deployment | Deployed and reachable |

**Why this order.** Iteration 2's exit criterion is the project's true gate. Security is foundational — retrofitting RLS onto a working app risks silently leaving a policy gap. Equally, every AI feature depends on correct CRUD; debugging a streaming RAG pipeline sitting on a broken data layer is intractable, because failures at every layer present identically as "the chat said it found nothing."

<!-- TODO: If you used a board (GitHub Projects, Trello, Jira), link it and screenshot it. Evidence of
     process is worth more than a description of process. If you worked in a team, state your role. -->

---

## 5. Design

> **⚠️ TODO — Wireframes and Figma files. Do not link to a Figma that doesn't exist.**
>
> If you designed before building, add the artefacts here. If you built directly from the tutorial
> (very common), you have two honest options:
>
> **Option A — Reverse-engineer the design docs.** Legitimate and standard practice for documenting
> an existing system. Open Figma, spend two hours reproducing the three screens (Login, Notes, Chat)
> as clean lo-fi wireframes plus one hi-fi mock. You get a real portfolio artefact, a real link, and
> a real design story — and you can honestly describe it as "design documentation produced during the
> hardening iteration."
>
> **Option B — Retitle this section "Interface Design"**, delete the wireframe subsections, and keep
> only §5.3 (design system) and §5.4 (UX decisions), which are fully evidenced by the actual code.
>
> **Do not** paste a placeholder Figma link. A dead link in a portfolio README is worse than no link.

### 5.1 Low-fidelity wireframes

<!-- TODO: Replace with real images: ![Lo-fi wireframes](docs/wireframes-lofi.png) -->

_Three screens: Login/Signup (centred card), Notes (two-column — form + list left, chat right), and the mobile single-column stack._

### 5.2 High-fidelity designs

<!-- TODO: ![Hi-fi designs](docs/hifi.png) and a real Figma link -->

### 5.3 Design system

Evidenced directly by the implementation:

| Token | Value | Applied to |
| --- | --- | --- |
| Primary | `indigo-600` | Buttons, focus rings, user chat bubbles |
| AI accent | `purple-600` | Summarise action — visually distinct from CRUD |
| Summary surface | `indigo-50` / `indigo-700` | AI-generated content blocks |
| Destructive | `red-500` | Delete, error states |
| Surface | `white` on `gray-200` | Cards on page background |
| Radius | `rounded-lg` (cards), `rounded-md` (controls), `rounded-full` (tags) | — |

**Rationale for the AI accent.** Summarise is purple while Edit/Delete are indigo/red, and it's pushed to the opposite end of the card with `ml-auto`. Both choices encode the same idea: *AI-generated content is visually distinguishable from user-authored content.* The user should never be uncertain about which words are theirs.

### 5.4 Key UX decisions

| Decision | Rationale |
| --- | --- |
| **Streaming over spinner** | A spinner communicates "wait." Streaming text communicates "working, here's progress." Same latency, materially better perceived performance. |
| **Chat panel is persistent, not modal** | Notes and chat are visible simultaneously — you can read the note the answer came from. Sticky on desktop (`lg:sticky`), stacked on mobile. |
| **Background embedding** | Saving a note must feel instant. The AI work happens after the UI has already responded. |
| **Per-note summarising state** | `summarizingNoteId` tracks *which* note is busy — only that card's button spins, not all of them. |
| **Empty state as instruction** | The chat placeholder is a worked example ("What did I write about the design meeting?") rather than "No messages" — it teaches the interaction. |
| **Honest failure** | When retrieval returns nothing, the app says so. Silence beats a plausible fabrication in a tool users are meant to trust. |

---

## 6. Software Architecture

### 6.1 Pattern: MVVM (via Vue's Composition API)

Vue's reactivity model maps naturally onto **Model–View–ViewModel**:

| MVVM layer | Implementation |
| --- | --- |
| **Model** | `src/lib/notes.ts`, `src/types/`, Postgres schema + RLS |
| **ViewModel** | `src/composables/` (`useAuth`, `useChat`) and TanStack Query hooks in views — reactive state + commands, no DOM knowledge |
| **View** | `src/views/`, `src/components/` — declarative templates bound to ViewModel state |
| **Binding** | Vue reactivity (`ref`, `watch`, `v-model`) replaces manual observer wiring |

The clean test of the separation: `useChat` mutates `target.content += chunk` and the DOM updates. The ViewModel has no reference to any element. Views hold no data-access logic.

### 6.2 Deliberate architectural decisions

**ADR-1 — AI execution is server-side.**
*Context:* Gemini calls need an API key.
*Decision:* All model calls run in Deno Edge Functions; the key is a Supabase secret.
*Consequence:* The key cannot leak via DevTools or bundle inspection. Costs a network hop and a Deno runtime to maintain. **Non-negotiable** — a client-side key is a public key.

**ADR-2 — Authorisation lives in Postgres, not Vue.**
*Context:* Multi-tenant data requires isolation.
*Decision:* Row Level Security. `fetchNotes()` deliberately issues `select * from notes` with no user filter.
*Consequence:* Isolation holds even against a hand-crafted request. Client-side filtering is a UI convenience, never a security control — this inverts that.

**ADR-3 — Two independent scopes on the vector search.**
*Context:* `match_notes` runs as a database function.
*Decision:* It filters `where notes.user_id = auth.uid()` internally, *in addition to* table-level RLS.
*Consequence:* Defence in depth. RAG retrieval is the highest-risk leak surface in the system — it reads across rows by design — so it gets its own boundary.

**ADR-4 — Embedding is fire-and-forget.**
*Context:* Embedding adds ~1–2s to a save.
*Decision:* Dispatch without `await`; catch and log failures.
*Consequence:* Saves feel instant. Trade-off: a new note is briefly unsearchable, and a failed embedding is silent. Accepted — the note itself is never at risk, and the alternative (blocking the UI on an AI call) is worse.

**ADR-5 — Raw `fetch` for chat instead of `functions.invoke()`.**
*Context:* `invoke()` buffers the full response before resolving.
*Decision:* Raw `fetch` + `response.body.getReader()`.
*Consequence:* True token-by-token streaming. Costs manual auth header construction.

**ADR-6 — 768 dimensions, not 3072.**
*Context:* `gemini-embedding-001` defaults to 3072 dims.
*Decision:* Truncate to 768 via `outputDimensionality`.
*Consequence:* 4× less storage, 4× faster search, negligible accuracy loss — valid only because the model is Matryoshka-trained. Naïvely truncating a non-Matryoshka embedding would destroy it.

### 6.3 RAG data flow

```
User: "What did I write about the design meeting?"
   │
   ▼  useChat — raw fetch, Bearer token
chat-notes (Deno, server-side)
   │
   ├─ 1. Embed question ──────────► Gemini (taskType: RETRIEVAL_QUERY, 768 dims)
   │
   ├─ 2. rpc('match_notes') ──────► Postgres
   │       cosine distance (<=>) over HNSW index
   │       scoped to auth.uid(), threshold 0.5, top 5
   │
   ├─ 3. Build prompt
   │       matches found → "answer using ONLY these notes"
   │       no matches    → "tell them you found nothing; do not invent"
   │
   ├─ 4. streamGenerateContent ───► Gemini (SSE)
   │
   └─ 5. Parse SSE, re-stream plain-text deltas
          │
          ▼
     Browser appends each chunk → Vue reactivity → typewriter render
```

**Step 3 is the anti-hallucination mechanism.** The no-match branch is not error handling — it's the feature. Without it, the model answers from general knowledge and the product's central promise silently breaks.

**Note on `taskType`.** Storage uses `RETRIEVAL_DOCUMENT`; search uses `RETRIEVAL_QUERY`. Gemini optimises the vector differently for each. Confusing them raises no error — it just quietly degrades every search result. It's the kind of bug that only surfaces through evaluation, which is precisely why the SDLC is iterative.

---

## 7. Implementation

### 7.1 Stack

| Layer | Technology | Selection rationale |
| --- | --- | --- |
| Framework | Vue 3 + TypeScript | Composition API suits MVVM; end-to-end type safety from DB to template |
| Build | Vite 8 | Native ESM, sub-second HMR |
| Styling | Tailwind CSS v4 | Zero-config Vite plugin; utilities keep styles adjacent to markup |
| Server state | TanStack Vue Query | Caching, loading/error states, invalidation — removes hand-rolled state |
| Routing | Vue Router 5 | Navigation guards for auth |
| Backend | Supabase | Postgres + Auth + Edge Functions in one platform |
| Vector search | pgvector + HNSW | Vectors live beside relational data — one query, one security model, no separate vector DB to sync |
| AI runtime | Deno Edge Functions | Server-side secret isolation |
| Models | `gemini-2.5-flash`, `gemini-embedding-001` | Fast, structured output support, generous free tier |
| Testing | Vitest + Vue Test Utils | Shares Vite config — no separate build pipeline |

**Why not a dedicated vector database?** Pinecone or Weaviate would mean a second datastore, a second security model, and a sync problem between notes and their embeddings. pgvector keeps the embedding in the same row as the note, which means RLS covers it automatically and there is no consistency window. At this scale the performance ceiling is irrelevant; the architectural simplification is not.

### 7.2 Project structure

```
vue-js-note-ai/
├── supabase/
│   └── functions/                   # Deno — server-side, holds the Gemini key
│       ├── _shared/cors.ts          # Shared CORS headers
│       ├── summarize-note/          # Structured JSON summary + tags
│       ├── embed-note/              # Text → 768-dim vector
│       └── chat-notes/              # RAG: embed → search → stream
├── src/
│   ├── components/                  # Presentational — props in, events out
│   │   ├── NoteCard.vue
│   │   ├── NoteForm.vue
│   │   └── ChatPanel.vue
│   ├── views/                       # Route-level — owns data orchestration
│   │   ├── NotesView.vue
│   │   ├── LoginView.vue
│   │   └── SignupView.vue
│   ├── composables/                 # ViewModel layer
│   │   ├── useAuth.ts               # Module-scoped refs — global singleton
│   │   └── useChat.ts               # Function-scoped refs — per-instance
│   ├── lib/                         # Model layer
│   │   ├── supabase.ts
│   │   ├── queryClient.ts
│   │   └── notes.ts                 # CRUD + summarise + background embed
│   ├── types/                       # Derived from generated DB types
│   ├── router/index.ts              # Auth guard
│   ├── database.types.ts            # GENERATED — never hand-edited
│   └── main.ts
└── package.json
```

**One deliberate asymmetry worth noting.** `useAuth` declares its refs at *module* scope, so every caller shares one instance — it's a singleton store. `useChat` declares refs *inside* the function, so each `ChatPanel` gets isolated state. Identical naming convention, opposite semantics, both correct for their purpose.

### 7.3 Database schema

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  content text,
  summary text,          -- AI-generated
  tags text[],           -- AI-generated
  embedding vector(768), -- AI-generated, background
  created_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Users can read their own notes"   on notes for select using (auth.uid() = user_id);
create policy "Users can insert their own notes" on notes for insert with check (auth.uid() = user_id);
create policy "Users can update their own notes" on notes for update using (auth.uid() = user_id);
create policy "Users can delete their own notes" on notes for delete using (auth.uid() = user_id);

create index notes_embedding_idx on notes using hnsw (embedding vector_cosine_ops);
```

`default auth.uid()` on `user_id` is load-bearing: the client insert supplies only `title` and `content`, so ownership is assigned by the database itself and cannot be spoofed by the client. `using` filters readable rows; `with check` validates written rows — insert needs the latter because there is no pre-existing row to filter.

### 7.4 Feature implementation notes

**Structured AI output.** `summarize-note` uses Gemini's `responseSchema` to constrain decoding to a typed object. This is why the code can call `JSON.parse(rawText)` directly with no markdown-fence stripping and no retry loop — the model is structurally incapable of emitting prose around the JSON. It converts a probabilistic parse into a deterministic one.

**SSE re-streaming.** `chat-notes` maintains a buffer because SSE chunks split mid-line. It splits on `\n` and uses `lines.pop()` to push the incomplete trailing line back into the buffer for the next iteration. The bare `catch {}` around `JSON.parse` is intentional: a partial JSON chunk mid-stream is expected, not exceptional.

**Type-safety chain.** `Note` is derived — `Database['public']['Tables']['notes']['Row']` — not hand-written. Add a column, run `npm run gen:types`, and every consumer type-errors until updated. Schema drift becomes a compile-time failure instead of a runtime surprise.

**Third-party services:** Supabase (Auth, Postgres, Edge Functions), Google Gemini API, pgvector.

---

## 8. Testing

A three-tier strategy, chosen by what each tier can actually verify.

### 8.1 Unit and component tests — Vitest + Vue Test Utils

```bash
npm run test:unit
# ✓ src/components/__tests__/NoteCard.spec.ts (5 tests) 45ms
```

Presentational components are tested because they're pure — props in, events out, no mocking required. Coverage includes conditional rendering (summary/tags present vs. absent), event emission with correct payloads, and disabled states during async operations.

**What is deliberately not unit-tested:** `lib/notes.ts` and the Edge Functions. Testing them would require mocking the entire Supabase client, at which point the tests verify the mocks rather than the system. These are covered by integration testing instead — a considered trade-off, not a coverage gap.

The `makeNote()` factory is typed as `Note`, so a schema change breaks the test suite at compile time and lists exactly what needs updating.

### 8.2 Integration tests — Edge Functions

Functions are exercised directly against the live Deno runtime:

```bash
npx supabase functions serve --env-file supabase/functions/.env

# Structured output contract
curl -X POST 'http://127.0.0.1:54321/functions/v1/summarize-note' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Met the design team Tuesday. Agreed to ship the new nav bar."}'
# → {"summary":"...","tags":["design","meeting"]}

# Dimension contract — must be exactly 768 to match vector(768)
curl -s -X POST 'http://127.0.0.1:54321/functions/v1/embed-note' \
  -H 'Content-Type: application/json' -d '{"text":"hello"}' \
  | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["embedding"]))'
# → 768
```

`chat-notes` cannot be tested with `--no-verify-jwt`, because it calls `auth.uid()` — without a real token, RLS correctly returns zero rows. This is the security model working as designed, and it means chat testing requires a genuine session token.

Error paths verified: empty input → 400, missing auth header → 401, Gemini rate limit → 429 surfaced distinctly.

### 8.3 System and acceptance testing

Each test maps to a requirement from §3.

| # | Test | Verifies | Result |
| --- | --- | --- | --- |
| 1 | `npm run build` — type-check + production build | Type integrity | ✅ |
| 2 | Register, confirm user record | FR-01 | ✅ |
| 3 | Hard-refresh while authenticated | FR-03 | ✅ |
| 4 | Access `/` unauthenticated | FR-04 | ✅ |
| 5 | Create / edit / delete note | FR-06–09 | ✅ |
| 6 | **User B cannot see User A's notes** | NFR-02 | ✅ |
| 7 | Summarise produces summary + tags | FR-10–12 | ✅ |
| 8 | `embedding` populated within ~5s of save | FR-13 | ✅ |
| 9 | Chat returns grounded answer, streaming | FR-14, FR-17 | ✅ |
| 10 | **Query with no matching notes → refusal, not fabrication** | FR-16 | ✅ |
| 11 | Inspect network payloads for Gemini key | NFR-01 | ✅ absent |

**Tests 6, 10, and 11 are the ones that matter.** They verify the three claims that define the product: isolation is real, grounding is real, and the key never ships. Everything else is table stakes.

### 8.4 Security testing

- **Cross-tenant read:** authenticated as User B, requested User A's note by known UUID → empty result. RLS holds at the database layer, not the UI layer.
- **Credential exposure:** production bundle and all network payloads inspected for the Gemini key → absent.
- **Unauthenticated RAG:** `chat-notes` called without a Bearer token → 401; with a valid token, `match_notes` returns only that user's rows.

---

## 9. Evaluation

### 9.1 Technical evaluation

Assessed against §3's requirements: **all Must-have requirements met (FR-01–18, NFR-01–10).** FR-19 (keyword search) deferred; FR-20 (sharing) explicitly out of v1 scope.

**What the architecture got right.**

Putting authorisation in Postgres rather than Vue was the highest-leverage decision. It means no future feature — a new component, a new query, a careless refactor — can accidentally leak data, because the enforcement point isn't in the code being changed. Similarly, `responseSchema` eliminated an entire class of parsing bugs before they could exist; no fence-stripping, no retry logic, no defensive parsing.

**What the architecture traded away.**

Fire-and-forget embedding is a real trade-off, honestly assessed: a note is unsearchable for a second or two after saving, and a failed embedding is silent — it only appears in the console. For a production system this needs a retry queue and a visible per-note indexing indicator. It was the right call for v1 (blocking the save on an AI call is strictly worse) but it is not a finished solution.

The fixed `match_threshold: 0.5` is arbitrary and unvalidated. It has not been tuned against a labelled relevance set, so I cannot currently claim it is well-calibrated — only that it works acceptably in manual use. Tuning it properly requires the evaluation harness described in §11.

### 9.2 User feedback and usability evaluation

> **⚠️ TODO — This section requires testing sessions only you can have run. Do not invent quotes.**
>
> Fabricated user feedback is the single most dangerous thing you could put in this file. "Tell me
> about a piece of user feedback that surprised you and how you responded" is a *standard* interview
> question — it's asked precisely because invented answers collapse instantly under follow-up.
>
> **The good news: this is cheap to do for real.** Sit three people in front of the deployed app.
> Give them one task ("add two notes about your week, then ask the app what you did") and say nothing
> else. Watch. Write down every moment of hesitation. That's ~45 minutes of work and it produces
> genuinely quotable material — real users always do something you didn't predict.
>
> Structure findings as: **observation → severity → what you changed.** The third column is what
> demonstrates engineering judgement. A finding you consciously chose *not* to act on, with a stated
> reason, is worth as much as one you fixed.
>
> **If you don't run sessions:** retitle §9 to "Technical Evaluation", keep §9.1 and §9.3, and delete
> this subsection. An honest technical evaluation is a complete section on its own.

<!-- Template — real data only:

**Method.** Moderated think-aloud, n = [N], [dates], task: [...].

| # | Observation | Severity | Response |
| - | ----------- | -------- | -------- |
| U1 | [N] of [N] participants asked a question immediately after saving and got "no relevant notes" — the embedding hadn't finished | High | [What you did — or why you deferred it] |

**Reflection.** [What surprised you? What would you test differently?]
-->

### 9.3 Reflection

**On grounding.** The technically interesting result is that preventing hallucination turned out to be a *prompt-branch* problem, not a model problem. The no-match branch — instructing the model to admit it found nothing — is a handful of lines and does most of the work. Retrieval quality determines whether the right notes arrive; the prompt determines whether the model stays honest when they don't.

**On the cost of an iterative approach.** Iteration 2's exit criterion (User B cannot see User A's notes) felt slow at the time — it produces no visible feature. It was the correct sequencing. Retrofitting RLS onto a working app means auditing every existing query for assumptions that no longer hold, and a missed policy is invisible until it's a breach.

**What I would do differently.** Build the evaluation harness (§11) *before* tuning retrieval, not after. I currently have no principled basis for the 0.5 threshold — only the observation that it seems fine. That's exactly the kind of unfalsifiable claim the iterative model is supposed to eliminate, and I skipped the step that would have caught it.

---

## 10. Deployment

**Architecture.** Static frontend on a CDN; backend and AI on Supabase's managed infrastructure. No servers to maintain.

| Component | Target | Method |
| --- | --- | --- |
| Frontend | <!-- TODO: Vercel / Netlify --> | `npm run build` → static `dist/` |
| Database | Supabase managed Postgres | SQL migrations |
| Edge Functions | Supabase (Deno, globally distributed) | `npx supabase functions deploy <name>` |
| Secrets | Supabase secret store | `npx supabase secrets set GEMINI_API_KEY=...` |

**Environment separation.**

| Variable | Scope | Exposure |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client | Public — safe by design |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Public — RLS makes it harmless |
| `GEMINI_API_KEY` | Supabase secret | **Never leaves the server** |

The publishable key being public is not a compromise — it's the intended model. It grants no authority on its own; every request it accompanies is still filtered by RLS against the caller's JWT.

**Deployment steps:**

```bash
npx supabase link --project-ref <ref>
npx supabase secrets set GEMINI_API_KEY=<key>
npx supabase functions deploy summarize-note
npx supabase functions deploy embed-note
npx supabase functions deploy chat-notes
npm run build   # deploy dist/ to host; set VITE_ env vars in host dashboard
```

<!-- TODO: Add the live URL at the top of this README once deployed. A recruiter who can click and
     type a note into a working RAG app is worth more than every other word on this page combined.
     If nothing else in this TODO list gets done, do this one. -->

---

## 11. Future Work

**Near-term — closing known gaps.**

1. **Retrieval evaluation harness.** ~30 labelled question→expected-note pairs, measuring precision@5 and recall. This is first because the current 0.5 threshold is unvalidated, and without measurement any tuning is guesswork.
2. **Embedding retry queue.** Replace fire-and-forget with a durable job and a per-note indexing indicator, closing the silent-failure gap identified in §9.1.
3. **Hybrid search.** Combine vector similarity with Postgres full-text search (FR-19). Semantic search is weak on exact identifiers — names, dates, error codes — where keyword search is strong. The two fail in complementary ways.

**Medium-term — product.**

4. **Chunking for long notes.** Currently one vector per note. A 5,000-word note averages into a vector that matches nothing well. Chunk to ~500-token windows with overlap.
5. **Citations in chat answers.** Show which notes an answer drew from, linked. Directly reinforces the grounding guarantee — the user can verify rather than trust.
6. **Conversation memory.** `useChat` sends only the current question; follow-ups like "what about the other one?" fail.
7. **Rate limiting.** Per-user quotas on Edge Functions. Currently a user could exhaust the Gemini quota.

**Longer-term.**

8. Note chunk–level RLS verification, automated as a test.
9. Real-time sync across devices via Supabase subscriptions.
10. Collaboration (FR-20) — requires a full re-derivation of the RLS model, hence deferred rather than bolted on.
11. E2E test suite (Playwright) covering the auth → create → embed → query journey.

---

## 12. Running Locally

**Prerequisites:** Node `^22.18.0 || >=24.12.0`, a Supabase account, a [Gemini API key](https://aistudio.google.com/apikey) (free, no card).

```bash
git clone <your-repo-url>
cd vue-js-note-ai
npm install

cp .env.example .env                                  # add Supabase URL + publishable key
cp supabase/functions/.env.example supabase/functions/.env   # add Gemini key (gitignored)
```

Run the schema from §7.3 in the Supabase SQL Editor, plus pgvector setup:

```sql
create extension if not exists vector;
```

Then the `match_notes` function (see `docs/schema.sql`). Link and deploy:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npm run gen:types

npx supabase secrets set GEMINI_API_KEY=<your-key>
npx supabase functions deploy summarize-note
npx supabase functions deploy embed-note
npx supabase functions deploy chat-notes

npm run dev   # → localhost:5173
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build |
| `npm run test:unit` | Vitest |
| `npm run gen:types` | Regenerate types from live schema |
| `npm run lint` | ESLint + Oxlint |

---

<!-- TODO before publishing — checklist:
     [ ] Deploy it and add the live URL at the top. Highest impact by far.
     [ ] Add a screenshot/GIF of the streaming chat.
     [ ] Fill in or delete §2.2 (primary research)
     [ ] Fill in or delete §5.1–5.2 (wireframes/Figma)
     [ ] Fill in or delete §9.2 (user feedback)
     [ ] Complete the attribution line in §1 — state exactly what you added
     [ ] Remove every remaining TODO comment, including this block
-->

**Built with** [Vue](https://vuejs.org) · [Supabase](https://supabase.com) · [Gemini](https://ai.google.dev)
Course foundation by [CodeWithLari](https://youtube.com/@codewithlari)
