# How InsightFlow uses Adaption

## The problem it solves

The sample file has 7,000 customer reviews, but only 320 are distinct. A handful of sentences repeat hundreds of times ("The packaging was damaged upon arrival…" appears 295 times). Raw, that is a poor dataset: Adaption scored it **2.0 / 10, grade E, 0.6th percentile**.

InsightFlow's job is to decide what to fix first. If repeats are treated as separate customers, or if they are thrown away, the ranking is wrong. So cleaning comes first, and the repeat counts are handled on purpose.

## What was run

The sample file went through Adaption's web app as an **Instruction dataset**: `review` as the prompt, `category` as context. Two recipes were applied:

- **Prompt Deduplication** removes repeated prompts.
- **Checklist verification** adds a per-row quality checklist score.

Rows submitted: 7,223. Credits used: 73. Prompt Rephrase and similar recipes were not used, because the analysis needs the customers' original wording.

## Results

| | Before | After |
|---|---|---|
| Quality score | 2.0 / 10 | **9.6 / 10** (+380%) |
| Grade | E | **A** |
| Percentile (corporate-business) | 0.6 | **57.7** |
| Rows | 7,223 | **441** |

Other facts from the cleaned file:

- All 320 distinct reviews were kept.
- Rows earned 98.4% of checklist points on average; 379 of 441 rows had full marks.

## Where it sits in the product

1. **Import and clean** (`/import`): shows the before and after numbers above, next to our own count (7,000 rows → 320 distinct).
2. **Analysis**: runs on the distinct reviews, so it is cheap and consistent.
3. **Dashboard and priorities**: every distinct review keeps its **original repeat count**, so the ranking reflects how many customers said it, not how many rows survived cleaning.

## Where Adaption did not do the job (and what we did instead)

- **Deduplication was partial.** 54 reviews still appear more than once in the cleaned file (up to 6 times), and the original repeat counts (like 295) are not preserved. We count repeats from the original file before cleaning, so volume stays correct.
- **Its labels are not ground truth.** In 40 of 441 rows (9%) the "enhanced completion" changed the category (for example "Customer Support", "Operational Risk"). We do not use those labels.
- **It scores dataset quality, not feedback sentiment.** Sentiment, issues and recommendations come from our own analysis. Adaption makes the data trustworthy; it does not read the reviews for meaning.
- The jump from 2.0 to 9.6 comes from deduplication plus the checklist process on an instruction-style dataset. It is a measure of data quality for training use, and we report it as that.

## Reproduce

```
node scripts/adaption-summary.mjs path/to/customer_issue_categories.csv
```

This reads the file Adaption emails and writes `data/adaption/summary.json` and a trimmed copy of the data. The Import page reads that summary.
