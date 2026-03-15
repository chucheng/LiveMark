# LiveMark — Marketing & Growth Strategy

## The Story (Your Biggest Asset)

One engineer, 30 hours, $500 in Claude tokens — built a full desktop Markdown editor that would take a traditional 2-3 person team 12-15 months and $300K-500K in salaries.

- 18,400+ lines of code across 107 source files
- 637 tests across 20 test files
- Full AI revision system with inline diff
- From v0 to v3.3.6 in ~30 hours

**The story is more viral than the product itself.** You're not selling a Markdown editor — you're selling proof of what one person can do in the AI era.

## Honest Assessment

### Why LiveMark Won't Make Serious Money Directly

- Market is saturated: Typora ($15), Obsidian (free), VS Code (free), Notion (free)
- AGPL license = users can use for free, no payment leverage
- Desktop app = no recurring SaaS revenue
- Typora's ceiling is the ceiling: years of work, $15 price point

### Why Getting Massive GitHub Stars Is Hard

- Tech stack (Tauri + SolidJS + ProseMirror) has a very small intersection of developers who understand all three
- Few people can contribute PRs
- Few people will star it to "learn the stack" (unlike React/Next.js projects)

### But Stars Come From Users, Not Contributors

- Most starred repos get stars from people who never read the code
- If the product is useful enough, the tech stack doesn't matter
- The AI-assisted development story drives curiosity stars

## Indirect Monetization Paths

| Path | Viability | Notes |
|------|-----------|-------|
| **Better job offers / fame** | High | A starred GitHub project with this story = skip interview rounds |
| **Tutorials / courses** | Medium-High | "How I built X in 30 hours with AI" has a market |
| **Consulting** | Medium | "I can build in 30 hours what your team builds in a year" is the best business card |
| **AI Revision as standalone SaaS** | Medium | Would need to decouple from the editor |
| **Acquisition / acqui-hire** | Low but non-zero | If it gains traction |

## Product Improvements for Differentiation

### AI Capabilities (Biggest Competitive Moat)

Typora and Obsidian have zero native AI. Go deeper:

- **AI autocomplete** — Tab to complete at cursor, like Copilot but for prose
- **AI translate** — Select paragraph, translate between languages, preserve Markdown formatting
- **AI summarize** — One-click TL;DR for long documents
- **Tone adjustment** — Formal / casual / academic / simple

### Cross-Platform Quality

- Windows and Linux experience must be solid (not just "it compiles")
- Linux users = developer community = stars and word-of-mouth

### CJK Excellence

- Chinese/Japanese/Korean typography done right
- Auto-spacing between CJK and Latin characters (pangu-style)
- Typora is mediocre here — own this niche

## Launch Playbook

### Step 0: Prepare Assets (1-2 hours)

1. **Record a 15-30 second GIF** showing: type Markdown → live render → AI revise → accept → toggle dark mode
   - Tool: `brew install --cask kap` (free, open source)
   - Window size: ~800×600, font size up
   - Every action pause 0.5s so viewers can follow
2. **Create a comparison graphic**: 30 hrs / $500 vs 2-3 people / 12-15 months / $300K+
3. **Add GIF to README** — a README without visuals gets 5-10x fewer clicks

### Step 1: Write the Article (2-3 hours)

**Title**: "I built a Typora alternative in 30 hours with Claude ($500 in tokens)"

**Structure**:

```
Hook: The numbers (30 hrs vs 12-15 months)

1. Why I built this (Typora went paid, wanted to try AI-assisted dev)
2. The product (GIF! GIF! GIF!)
3. Tech stack (brief — Tauri + SolidJS + ProseMirror)
4. How I worked with Claude (interesting examples, workflow)
5. The numbers: 18K LOC, 637 tests, $500 cost
6. What AI can and can't do (honest reflection)
7. GitHub link + download link

Closing: "The bottleneck is no longer coding speed — it's knowing what to build."
```

### Step 2: Launch Day (All Platforms, Same Day)

Concentrate all firepower on one day. Cross-platform traffic creates a snowball:
- HN readers → star GitHub → GitHub trending rises
- GitHub trending → more HN upvotes → stays on front page
- Someone screenshots HN front page → tweets it → more clicks
- Reddit comments "this is on HN front page" → credibility → more upvotes

**English platforms (morning, US Pacific Tuesday-Thursday 8-9 AM):**

| Platform | Angle |
|----------|-------|
| **Hacker News** | `Show HN: I built a Typora alternative in 30 hours with Claude ($500 in tokens)` |
| **Reddit r/programming** | Same title, link to article |
| **Reddit r/rust** | Emphasize Tauri/Rust angle |
| **Reddit r/opensource** | Open-source Typora alternative |
| **Reddit r/SideProject** | Solo dev story |
| **Twitter/X** | Thread: GIF → numbers → story → GitHub link. **Tag @AnthropicAI** — they have incentive to retweet (built with their API). Tag AI influencers |

**Chinese platforms (same day or next day):**

| Platform | Angle |
|----------|-------|
| **V2EX** | 「Show」區 — 「一個人 30 小時用 AI 寫了個 Typora 替代品」 |
| **知乎** | 長文技術分析，SEO 長尾流量 |
| **少數派 (sspai.com)** | 投稿，編輯會幫推，讀者群體精準（工具控 + 效率黨） |
| **即刻** | 短貼 + GIF，開發者圈子傳播快 |

### Step 3: Ongoing

- Every version release → changelog post + social media update
- Accept issues and PRs — active projects get more stars
- Write a "How I built X with AI" blog series — each post drives traffic back to repo

## Open Source Readiness Checklist

- [x] LICENSE file (AGPL-3.0)
- [x] README with badges, feature list, architecture diagram
- [x] CONTRIBUTING.md
- [x] GitHub issue templates (bug report, feature request)
- [x] GitHub PR template
- [x] CI/CD workflows (test + build + release)
- [x] Cargo.toml metadata (description, authors, license, repository)
- [x] package.json license field
- [ ] **GIF/screenshots in README** ← highest priority missing item
- [ ] Landing page (GitHub Pages) with download buttons
- [ ] CODE_OF_CONDUCT.md (optional but signals maturity)

## Key Insight

> LiveMark is your best resume, not your revenue stream.
> The story of how you built it is more viral than the product itself.
> Fame → opportunities → money. That's the path.
