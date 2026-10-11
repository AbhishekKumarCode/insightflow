import { chromium } from "playwright-core";
const base = process.env.BASE ?? "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
const ok = (name, cond) => { console.log(cond ? "PASS" : "FAIL", name); if (!cond) process.exitCode = 1; };

await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
ok("overview shows 7,000", await p.getByText("7,000").first().isVisible());
await p.getByLabel("Category").selectOption("Fraud and Scam");
ok("category filter changes total to 1,755", await p.getByText("1,755").first().isVisible());
ok("top issue is fraud", (await p.locator("ol").first().innerText()).includes("Charged but order never arrived"));
await p.getByLabel("Sentiment").selectOption("positive");
ok("positive+fraud shows 326", await p.getByText("326").first().isVisible());
await p.getByText("Clear filters").click();
ok("clear resets", await p.getByText("7,000").first().isVisible());

await p.goto(`${base}/priorities`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /Track this issue/ }).first().click();
ok("tracked", await p.getByText("Tracked").first().isVisible());
await p.goto(`${base}/tracker`, { waitUntil: "networkidle" });
ok("tracker has card", await p.getByText("Charged but order never arrived").isVisible());
await p.locator("article[data-issue]").first().dragTo(p.getByRole("region", { name: "Investigating" }), { sourcePosition: { x: 90, y: 30 } });
ok("drag card to Investigating column", (await p.getByRole("region", { name: "Investigating" }).locator("article").count()) === 1);
await p.getByLabel("Status", { exact: true }).selectOption("In progress");
ok("dropdown also moves it", (await p.getByRole("region", { name: "In progress" }).locator("article").count()) === 1);
await p.getByLabel("Owner").fill("Priya");
await p.reload({ waitUntil: "networkidle" });
ok("status+owner persist after reload", (await p.getByLabel("Owner").inputValue()) === "Priya");

await p.goto(`${base}/feedback`, { waitUntil: "networkidle" });
await p.getByLabel("Search feedback").fill("crashing");
await p.waitForTimeout(300);
ok("search narrows rows", (await p.locator("tbody tr").count()) > 0 && (await p.locator("tbody tr").count()) < 15);

await p.goto(`${base}/reports`, { waitUntil: "networkidle" });
const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /Export CSV/ }).click()]);
ok("csv export downloads", dl.suggestedFilename() === "insightflow-issues.csv");
await p.getByRole("button", { name: /Save report/ }).click();
ok("saved report listed", await p.getByText("Saved reports").isVisible());
ok("no page errors", errs.length === 0);
if (errs.length) console.log(errs);

// Import dialog: paste three reviews, add them, dashboard total changes.
await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Import data" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback").fill("No fraudulent activity or scam during my transaction\nI was scammed, they took my money. Contact me at jane@example.com\nThe app crashes every time I pay");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByText(/Personal data found/).waitFor({ timeout: 5000 });
ok("pre-flight flags the email", await p.getByText(/Personal data found/).isVisible());
ok("shows a match", await p.getByText(/similar to/).first().isVisible());
await p.getByRole("button", { name: /Add 3 reviews/ }).waitFor({ timeout: 5000 });
await p.getByRole("button", { name: /Add 3 reviews/ }).click();
await p.waitForURL(/overview/);
await p.getByText("7,003").first().waitFor({ timeout: 5000 });
ok("total becomes 7,003", await p.getByText("7,003").first().isVisible());
await p.reload({ waitUntil: "networkidle" });
await p.getByText("7,003").first().waitFor({ timeout: 5000 });
ok("added reviews persist", await p.getByText("7,003").first().isVisible());
await b.close();
