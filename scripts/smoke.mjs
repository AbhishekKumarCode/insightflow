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
await p.getByLabel("Status").selectOption("In progress");
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
await b.close();
