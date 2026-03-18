# Assess NAS Sources to Azure Storage

A configurable browser-based decision tree that guides users through a series of questions about their NAS workload and produces a filtered list of eligible Azure Storage target SKUs.

---

## What it does

The app walks through a sequence of questions (Azure region, source NAS appliance, target services, redundancy, access frequency, workload type, etc.) and applies a series of filters to narrow down the full set of seven Azure Storage outcomes to only those that are compatible with the user's environment. At the end, all eligible SKUs are displayed together with a summary of the inputs provided.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [React 18](https://react.dev/) (via [Vite](https://vitejs.dev/)) |
| Language | JavaScript (JSX) — no TypeScript |
| Styling | Plain CSS (no framework) |
| State | React `useState` only — no external state library |
| Build | Vite 8 |

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node)

### Install and run

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd decision-tree-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for production

```bash
npm run build       # outputs to dist/
npm run preview     # local preview of the production build
```

---

## Project structure

```
src/
├── data/
│   ├── treeConfig.js             ← ALL questions and outcomes live here
│   ├── regionAvailability.js     Maps each outcome to the regions it supports
│   └── redundancyAvailability.js Maps each outcome to its supported redundancy types
│
├── utils/
│   └── matchOutcomes.js          Filtering engine — runs all gates against user answers
│
├── components/
│   ├── DecisionTree.jsx          Renders questions serially; handles all question types
│   └── Results.jsx               Renders eligible outcomes + input summary
│
├── App.jsx                       Root component — owns answers state
├── index.css                     All styling
└── main.jsx                      Vite entry point
```

---

## How to customise the decision tree

All decision tree content lives in **`src/data/treeConfig.js`**. You do not need to touch any component code for most changes.

### Adding or editing a question

Questions are defined in the `questions` array. Each question object supports these fields:

| Field | Required | Description |
|---|---|---|
| `id` | ✅ | Unique string identifier — used as the key in `answers`. |
| `text` | ✅ | Question label shown to the user. |
| `type` | ✅ | `"select"` (dropdown), `"multiselect"` (checkboxes), or omit for button list. |
| `options` | ✅ | Flat `[{ label, value }]` or grouped `[{ group, items: [{label, value}] }]`. |
| `placeholder` | — | Disabled first `<option>` shown in a select dropdown. |
| `note` | — | Small callout shown below the question heading. |
| `showIf` | — | Condition to show/hide the whole question (see below). |

#### `showIf` syntax

```js
// Show only when the user answered a specific value
showIf: { questionId: "expectedValue" }

// Show only when an array answer (multiselect) includes a value
showIf: { questionId: { includes: "expectedValue" } }
```

Questions whose `showIf` condition is not met are silently skipped and their stored answers cleared.

#### `requiresAnswer` on individual options

Hide a single option within a question based on a prior answer:

```js
{ label: "Azure NetApp Files", value: "anf", requiresAnswer: { nas: "netapp" } }
```

---

### Adding or editing an outcome

Outcomes are defined in the `outcomes` array in `treeConfig.js`:

```js
{
  id: "my-outcome",          // unique string, referenced in serviceOutcomeMap
  title: "Display name",
  description: "Shown on the results page.",
  rules: [
    // Eligible if ANY rule set is a full subset of the user's answers.
    // Empty array [] means always eligible (filtered only by the gates below).
    { nas: "netapp" }
  ],
}
```

---

## Understanding the filtering pipeline

`src/utils/matchOutcomes.js` applies these gates **in order** for every outcome:

1. **Service gate** — only outcomes belonging to the user's selected target services (`serviceOutcomeMap` in `treeConfig.js`).
2. **Region gate** — outcome must be GA in the selected region (`regionAvailability.js`).
3. **Blob tier gate** — maps `blobAccessFrequency` directly to one blob tier outcome.
4. **Media type gate** — maps `filesMediaType` to `files-premium-ssd` or `files-standard-hdd`.
5. **Redundancy gate** — outcome must support the selected redundancy type (`redundancyAvailability.js`).
6. **Rules gate** — at least one rule set in `outcome.rules` must match the user's answers.

To add a new filter, add a gate block in `matchOutcomes.js` and a data file (if needed) following the same pattern.

---

## Adding a new Azure region

In `treeConfig.js`, add an entry under the correct `group` in the `region` question:

```js
{ label: "My New Region", value: "mynewregion" }
```

Then in `regionAvailability.js`, add `"mynewregion"` to `ANF_REGIONS` if Azure NetApp Files is supported there.

---

## Outcomes reference

| ID | SKU |
|---|---|
| `blob-hot` | Azure Blob Storage — Hot Tier |
| `blob-cool` | Azure Blob Storage — Cool Tier |
| `blob-cold` | Azure Blob Storage — Cold Tier |
| `blob-archive` | Azure Blob Storage — Archive Tier |
| `files-standard-hdd` | Azure Files — Standard HDD (Provisioned v2) |
| `files-premium-ssd` | Azure Files — Premium SSD (Provisioned v2) |
| `anf-default` | Azure NetApp Files — Default SKU |

---

## Contributing

1. Fork or clone the repo.
2. Make your changes — most content changes only require editing `src/data/treeConfig.js`.
3. Run `npm run dev` to verify locally.
4. Open a pull request with a brief description of what changed and why.

---

## Original Vite template notes

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
