import { chromium } from "playwright-core";
const base = process.env.BASE ?? "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
const ok = (name, cond) => { console.log(cond ? "PASS" : "FAIL", name); if (!cond) process.exitCode = 1; };

await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
ok("overview shows 7,000", await p.getByText("7,000").filter({ visible: true }).first().isVisible());
await p.getByLabel("Category").selectOption("Fraud and Scam");
ok("category filter changes total to 1,755", await p.getByText("1,755").filter({ visible: true }).first().isVisible());
ok("top issue is fraud", (await p.locator("ol").first().innerText()).includes("Charged but order never arrived"));
await p.getByLabel("Sentiment").selectOption("positive");
ok("positive+fraud shows 326", await p.getByText("326").filter({ visible: true }).first().isVisible());
await p.getByText("Clear filters").click();
ok("clear resets", await p.getByText("7,000").filter({ visible: true }).first().isVisible());

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
ok("search highlights the matching text", await p.locator("tbody mark").first().isVisible());
await p.getByRole("button", { name: /Clear search/ }).click();
await p.getByRole("button", { name: /^Negative/ }).click();
ok("sentiment chip filters the feed to negative reviews", (await p.getByRole("button", { name: /^Negative/ }).getAttribute("aria-pressed")) === "true" && (await p.locator("tbody tr").first().innerText()).includes("Negative"));
const [fbCsv] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /^Export/ }).click()]);
const fbText = (await import("node:fs")).readFileSync(await fbCsv.path(), "utf8");
ok("feedback export holds only the filtered reviews", fbText.startsWith('"Review","Category"') && !fbText.includes('"positive"') && fbText.includes('"negative"'));
await p.getByRole("tab", { name: "By issue" }).click();
await p.locator("details > summary").first().click();
ok("by-issue view groups reviews under an issue", await p.locator("details[open] li").first().isVisible());


await p.goto(`${base}/reports`, { waitUntil: "networkidle" });
const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /Export CSV/ }).click()]);
ok("csv export downloads", dl.suggestedFilename() === "insightflow-issues.csv");
await p.getByRole("button", { name: /Save report/ }).click();
ok("saved report listed", await p.getByText("Saved reports").isVisible());
ok("no page errors", errs.length === 0);
if (errs.length) console.log(errs);

// Import dialog: paste three reviews, add them, dashboard total changes.
await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "New session" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback", { exact: true }).fill("Refund took six weeks to arrive\nI was scammed, they took my money. Contact me at jane@example.com\nThe app crashes every time I pay");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByText(/Personal data found/).waitFor({ timeout: 5000 });
await p.getByLabel(/This session/).check();
ok("pre-flight flags the email", await p.getByText(/Personal data found/).isVisible());
ok("shows a match", await p.getByText(/similar to/).first().isVisible());
await p.getByRole("button", { name: /Add 3 reviews/ }).waitFor({ timeout: 5000 });
await p.getByRole("button", { name: /Add 3 reviews/ }).click();
await p.waitForURL(/overview/);
await p.getByText("7,003").filter({ visible: true }).first().waitFor({ timeout: 5000 });
ok("total becomes 7,003", await p.getByText("7,003").filter({ visible: true }).first().isVisible());
await p.reload({ waitUntil: "networkidle" });
await p.getByText("7,003").filter({ visible: true }).first().waitFor({ timeout: 5000 });
ok("added reviews persist", await p.getByText("7,003").filter({ visible: true }).first().isVisible());

// Adding the same text again must not double the counts.
await p.getByRole("button", { name: "New session" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback", { exact: true }).fill("Refund took six weeks to arrive\nThe app crashes every time I pay");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByLabel(/This session/).waitFor({ timeout: 5000 });
await p.getByLabel(/This session/).check();
await p.getByText(/already in your dashboard/).first().waitFor({ timeout: 5000 });
ok("re-adding is flagged", await p.getByText(/already in your dashboard/).first().isVisible());
ok("nothing new to add", await p.getByRole("button", { name: "Nothing new to add" }).isDisabled());
await p.getByLabel(/Add the 2 repeated reviews again anyway/).check();
ok("can add anyway on purpose", await p.getByRole("button", { name: /Add 2 reviews/ }).isEnabled());

// --- connectedness checks: things that looked interactive but weren't ---
// 1) /import: "Import your own data" opens the popup (no dead-end upload zone).
await p.goto(`${base}/import`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Import your own data" }).click();
ok("import page opens the popup", await p.getByRole("tab", { name: /Upload CSV/ }).isVisible());
await p.keyboard.press("Escape");

// 2) Reports: copy summary (share) and saved reports can be opened and deleted.
await p.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await p.goto(`${base}/reports`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /Copy summary/ }).click();
await p.getByText("Copied").waitFor({ timeout: 3000 });
ok("copy summary confirms", await p.getByText("Copied").isVisible());
const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
ok("clipboard holds the report", clip.includes("Top priorities") && clip.includes("Charged but order never arrived"));
await p.locator("summary").filter({ hasText: /Insight report,/ }).first().click();
ok("saved report opens with its issues", await p.getByText(/when saved/).first().isVisible());
const before = await p.getByRole("button", { name: /^Delete Insight report/ }).count();
await p.getByRole("button", { name: /^Delete Insight report/ }).first().click();
ok("saved report deletes", (await p.getByRole("button", { name: /^Delete Insight report/ }).count()) === before - 1);

// 3) Avatar menu resets browser data.
await p.getByRole("button", { name: "My data" }).click();
ok("avatar menu opens", await p.getByRole("menuitem", { name: /Reset everything/ }).isVisible());
await p.getByRole("menuitem", { name: /Reset everything/ }).click();
await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
await p.getByText("7,000").filter({ visible: true }).first().waitFor({ timeout: 5000 });
ok("reset returns to the 7,000-review sample", await p.getByText("7,000").filter({ visible: true }).first().isVisible());
ok("reset clears tracked issues", (await p.evaluate(() => JSON.parse(localStorage.getItem("if.sessions") ?? "[]")[0]?.tracked?.length)) === 0);

// --- report builder: options change the preview, downloads follow the options, and saved reports are compared ---
await p.goto(`${base}/reports`, { waitUntil: "networkidle" });
await p.getByLabel("Title", { exact: true }).fill("Q4 fraud review");
await p.getByLabel("Cover").selectOption("Fraud and Scam");
await p.getByLabel("Priorities to include").selectOption("3");
await p.getByRole("checkbox", { name: "Summary" }).uncheck();
await p.getByLabel("Note for readers").fill("Shared with the payments team on Monday.");
const art = p.locator("article");
const artText = await art.innerText();
ok("preview shows the custom title and the note", artText.includes("Q4 fraud review") && artText.includes("payments team"));
ok("scope limits the report to that category", !artText.includes("Website crashes and checkout glitches"));
ok("an unchecked section leaves the preview", (await art.getByRole("heading", { name: "Summary" }).count()) === 0);
ok("only the chosen number of priorities is listed", (await art.locator("ol > li").count()) === 3);
const [md] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /Download \.md/ }).click()]);
const mdText = (await import("node:fs")).readFileSync(await md.path(), "utf8");
ok("markdown download follows the options", mdText.startsWith("# Q4 fraud review") && mdText.includes("## Priorities") && mdText.includes("payments team"));
await p.getByRole("button", { name: "Save report" }).click();
await p.getByRole("checkbox", { name: "Summary" }).check();
await p.getByText(/Since your last saved report/).waitFor({ timeout: 4000 });
ok("report compares itself with the last saved one", await p.getByText(/Since your last saved report/).isVisible());


// --- sessions: every import can be its own dataset, with its own dashboard ---
await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
ok("starts with one session (the sample)", (await p.getByRole("list", { name: "Sessions" }).getByRole("listitem").count()) === 1);
await p.getByRole("button", { name: "New session" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback", { exact: true }).fill("Checkout crashed twice on my phone\nSupport answered in minutes, thank you");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByRole("button", { name: /Create session with 2 reviews/ }).waitFor({ timeout: 5000 });
ok("sidebar New session defaults to a new session", await p.getByLabel(/^New session/).isChecked());
await p.getByRole("button", { name: /Create session with 2 reviews/ }).click();
await p.waitForURL(/overview/);
await p.getByRole("button", { name: "Switch session" }).filter({ hasText: "Pasted feedback" }).waitFor({ timeout: 5000 });
ok("new session is created and active", (await p.getByRole("button", { name: "Switch session" }).innerText()).includes("Pasted feedback · 2"));
ok("sidebar now lists two sessions", (await p.getByRole("list", { name: "Sessions" }).getByRole("listitem").count()) === 2);

await p.getByRole("list", { name: "Sessions" }).getByRole("button", { name: /Sample dataset/ }).click();
await p.getByRole("button", { name: "Switch session" }).filter({ hasText: "Sample dataset" }).waitFor({ timeout: 5000 });
ok("switching back shows the 7,000-review sample", (await p.getByRole("button", { name: "Switch session" }).innerText()).includes("Sample dataset · 7,000"));

await p.getByRole("button", { name: /Options for Pasted feedback/ }).click();
await p.getByRole("menuitem", { name: "Rename" }).click();
await p.getByLabel("Session name").fill("Q4 export");
await p.keyboard.press("Enter");
ok("session renames", await p.getByRole("list", { name: "Sessions" }).getByText("Q4 export").isVisible());

await p.getByRole("button", { name: /Options for Q4 export/ }).click();
await p.getByRole("menuitem", { name: "Delete session" }).click();
await p.getByRole("menuitem", { name: /Click again to delete/ }).click();
ok("session deletes after confirmation", (await p.getByRole("list", { name: "Sessions" }).getByRole("listitem").count()) === 1);

// Sessions survive a reload, and the sample can't be deleted.
await p.getByRole("button", { name: "New session" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback", { exact: true }).fill("The delivery was a week late");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByRole("button", { name: /Create session with 1 review/ }).click();
await p.waitForURL(/overview/);
await p.reload({ waitUntil: "networkidle" });
ok("sessions and the active one persist after reload", (await p.getByRole("list", { name: "Sessions" }).getByRole("listitem").count()) === 2 && (await p.getByRole("button", { name: "Switch session" }).innerText()).includes("Pasted feedback"));
ok("the sample session has no delete option", (await p.getByRole("button", { name: /Options for Sample dataset/ }).count()) === 0);

// --- security: spreadsheet formulas in imported text must not survive into exported CSV ---
await p.goto(`${base}/overview`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "New session" }).first().click();
await p.getByRole("tab", { name: /Paste feedback/ }).click();
await p.getByLabel("Pasted feedback", { exact: true }).fill("=HYPERLINK(\"http://evil.example\",\"click\") my refund never arrived and nobody replied\n=HYPERLINK(\"http://evil.example\",\"click\") my refund never arrived and nobody replied again");
await p.getByRole("button", { name: "Check feedback" }).click();
await p.getByRole("button", { name: /Create session with/ }).waitFor({ timeout: 5000 });
await p.getByRole("button", { name: /Create session with/ }).click();
await p.waitForURL(/overview/);
await p.goto(`${base}/reports`, { waitUntil: "networkidle" });
const [dl2] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /Export CSV/ }).click()]);
const csvText = (await import("node:fs")).readFileSync(await dl2.path(), "utf8");
ok("CSV export has no cell starting with a formula character", !/(^|\n)"[=+@-]/.test(csvText) && !/,"[=+@-]/.test(csvText));
ok("CSV export keeps the text, defused with an apostrophe", csvText.includes("\"'=HYPERLINK"));
await b.close();
