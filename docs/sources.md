# Opportunity Radar — Source Adapters Specification

This document details every supported source adapter, required environment variables, where to obtain developer keys, rate limits, and scheduling intervals.

---

## Adapter Directory

| Source Name | Type | Required Env Keys | Default Interval | Official Link / Docs |
| :--- | :--- | :--- | :--- | :--- |
| **`mock`** | Mock | None | 3 Hours | Local test fixtures |
| **`remotive`** | Public API | None | 3 Hours | [https://remotive.com/api/remote-jobs](https://remotive.com/api/remote-jobs) |
| **`remoteok`** | Public API | None | 3 Hours | [https://remoteok.com/api](https://remoteok.com/api) |
| **`rss_general`**| RSS / Atom | None | 3 Hours | WWR & YC RSS feeds |
| **`hackernews`** | Firebase API| None | 6 Hours | [https://github.com/HackerNews/API](https://github.com/HackerNews/API) |
| **`github`** | GitHub API | `GITHUB_TOKEN` | 6 Hours | [https://github.com/settings/tokens](https://github.com/settings/tokens) |
| **`reddit`** | Reddit API | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | 3 Hours | [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) |
| **`adzuna`** | Job API | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | 6 Hours | [https://developer.adzuna.com/](https://developer.adzuna.com/) |
| **`email_alert`**| IMAP Reader| `IMAP_SERVER`, `IMAP_USER`, `IMAP_PASSWORD` | 1 Hour | Gmail / Outlook App Password |

---

## Detailed Adapter Configurations

### 1. Mock (`mock`)
- **Category**: Test & Development
- **Purpose**: Generates high-fidelity listings across internships, full-time jobs, freelance gigs, and collaborations.
- **Env Keys**: None required.
- **Configuration**: Always enabled by default in local dev.

### 2. Remotive (`remotive`)
- **Category**: Tech & Software Jobs
- **Endpoint**: `https://remotive.com/api/remote-jobs?limit=30`
- **Rate Limit**: 2 requests per second (enforced by `SharedHttpClient`).
- **Env Keys**: None.

### 3. RemoteOK (`remoteok`)
- **Category**: Global Remote Jobs
- **Endpoint**: `https://remoteok.com/api`
- **Rate Limit**: 1 request every 2 seconds.
- **Env Keys**: None.

### 4. Generic RSS (`rss_general`)
- **Category**: Career & Hackathon RSS Feeds
- **Default Feeds**:
  - WeWorkRemotely Programming RSS: `https://weworkremotely.com/categories/remote-programming-jobs.rss`
  - Hacker News Jobs RSS: `https://news.ycombinator.com/jobsrss`
- **Customization**: Add feed URLs in the source's `config.feed_urls` JSON array in the database or via the Sources UI.
- **Env Keys**: None.

### 5. Hacker News (`hackernews`)
- **Category**: Monthly Startup Hiring & Freelancer Threads
- **API**: Official Firebase API (`https://hacker-news.firebaseio.com/v0/user/whoishiring.json`).
- **Parsing**: Inspects the monthly "Who is hiring?" and "Freelancer? Seeking freelancer?" stories and extracts structured employer comments.
- **Env Keys**: None.

### 6. GitHub Collaborations (`github`)
- **Category**: Open Source Collaborations & Bounties
- **Search Query**: `label:"good first issue" state:open language:python language:typescript`
- **Required Env**: `GITHUB_TOKEN`
- **How to Get**: Go to GitHub -> Settings -> Developer settings -> Personal access tokens (classic) -> Generate token (public repo read only).
- **Rate Limit**: 5,000 requests/hour with token (60 requests/hour without).

### 7. Reddit (`reddit`)
- **Category**: Freelance Gigs & Internships
- **Subreddits**: `r/forhire` (filtered to `[Hiring]`), `r/internships`.
- **Required Env**:
  - `REDDIT_CLIENT_ID`
  - `REDDIT_CLIENT_SECRET`
  - `REDDIT_USER_AGENT`
- **How to Get**: Go to Reddit Preferences -> Developed applications -> Create app ("script" type). Copy client ID and secret.

### 8. Adzuna (`adzuna`)
- **Category**: Full-Time & Internships (India + Global)
- **Required Env**:
  - `ADZUNA_APP_ID`
  - `ADZUNA_APP_KEY`
  - `ADZUNA_COUNTRY` (e.g. `in` for India, `us`, `gb`)
- **How to Get**: Register for free developer credentials at [https://developer.adzuna.com/](https://developer.adzuna.com/).

### 9. Email Alert IMAP Reader (`email_alert`)
- **Category**: Direct Forwarding from LinkedIn / Internshala / Naukri / Unstop
- **Required Env**:
  - `IMAP_SERVER`: e.g. `imap.gmail.com`
  - `IMAP_PORT`: `993`
  - `IMAP_USER`: e.g. `myalertinbox@gmail.com`
  - `IMAP_PASSWORD`: Google App Password (not your primary password)
  - `IMAP_FOLDER`: `INBOX`
- **Behavior**: Reads only `UNSEEN` emails, converts HTML to clean text, extracts opportunities, and marks them `\Seen` so they are never processed twice.

---

## Manual Additions
- **`POST /api/v1/opportunities/from-url`**: Fetches a public web page, strips HTML, parses with Claude, and adds to feed. If the site blocks scraping or uses JavaScript rendering, the endpoint returns a clear 400 error suggesting `POST /api/v1/opportunities/from-text`.
- **`POST /api/v1/opportunities/from-text`**: Accepts raw job/gig/deal text, parses with Claude, and saves to database.
