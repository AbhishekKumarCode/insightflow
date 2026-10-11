import { generateText, Output } from "ai";
import { deepSeek, type DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import { z } from "zod";

export const MAX_DISTINCT = 400;
const BATCH = 40;
const MODEL = "deepseek-v4-flash";
const opts = { deepseek: { thinking: { type: "disabled" } } satisfies DeepSeekLanguageModelChatOptions };

export type Distinct = { id: string; text: string; category: string; count: number };
export type Labeled = Distinct & { issue: string; sentiment: "positive" | "neutral" | "negative"; severity: number };

const LabelSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    issue: z.string().min(3).max(60),
    severity: z.number().min(0).max(1),
  })),
});
const RecSchema = z.object({ why: z.string().min(20), actions: z.array(z.string().min(8)).min(2).max(4) });

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Label distinct reviews in batches. Issue names found so far are passed back so the same problem keeps one name. */
export async function labelReviews(rows: Distinct[], onProgress?: (done: number) => void): Promise<Labeled[]> {
  const known = new Map<string, string>(); // normalized -> display
  const out: Labeled[] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { output } = await generateText({
      model: deepSeek(MODEL),
      temperature: 0,
      providerOptions: opts,
      output: Output.object({ schema: LabelSchema }),
      system:
        "You label customer reviews for a feedback-analysis product. For every review return: " +
        "sentiment (positive, neutral for mixed or ambivalent, negative); " +
        "issue: a short 2-6 word name for the specific problem or praise (e.g. 'Charged but order never arrived', 'Fast, helpful support'). " +
        "Reuse an existing issue name exactly when the review is about the same thing. Name positive reviews by what is praised. " +
        "severity: 0 for positive; for negative 0.3 cosmetic or minor, 0.5 delays and inconvenience, 0.7 broken product or unresolved help, 0.9 money loss, fraud or safety. " +
        "Return exactly one item per input id.",
      prompt: `Existing issue names: ${JSON.stringify([...known.values()])}\n\nReviews:\n${JSON.stringify(batch.map((r) => ({ id: r.id, category: r.category, text: r.text })))}`,
    });
    const byId = new Map(output.items.map((x) => [x.id, x]));
    for (const r of batch) {
      const l = byId.get(r.id);
      if (!l) throw new Error(`Model skipped review ${r.id}`);
      const key = norm(l.issue);
      const issue = known.get(key) ?? (known.set(key, l.issue), l.issue);
      out.push({ ...r, issue, sentiment: l.sentiment, severity: l.sentiment === "negative" ? l.severity : 0 });
    }
    onProgress?.(Math.min(i + BATCH, rows.length));
  }
  return out;
}

/** Recommendation per top issue. The model only sees real counts and quotes, so it has nothing to invent numbers from. */
export async function recommend(issue: string, category: string, negative: number, quotes: string[]) {
  const { output } = await generateText({
    model: deepSeek(MODEL),
    temperature: 0,
    providerOptions: opts,
    output: Output.object({ schema: RecSchema }),
    system: "You advise a business on customer complaints. Be specific and practical. Do not state any numbers other than the ones given.",
    prompt: `Issue: ${issue}\nCategory: ${category}\nNegative reviews: ${negative}\nCustomer quotes:\n${quotes.map((q) => `- ${q}`).join("\n")}\n\nWrite: why this issue deserves attention (1-2 sentences, based on the evidence), and 2-4 concrete actions.`,
  });
  return output;
}
