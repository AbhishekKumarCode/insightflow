// Phone checks: layout, not just "nothing overflows". Run: BASE=http://localhost:3100 node scripts/phone.mjs
import { chromium } from "playwright-core";
const base = process.env.BASE ?? "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const ok = (name, cond) => { console.log(cond ? "PASS" : "FAIL", name); if (!cond) process.exitCode = 1; };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const go = async (path) => { await p.goto(`${base}/${path}`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); };

// Every page fits at four phone widths.
for (const w of [320, 360, 390, 414]) {
  await p.setViewportSize({ width: w, height: 844 });
  let all = true;
  for (const path of ["overview", "import", "feedback", "priorities", "tracker", "reports"]) { await go(path); all = all && (await fits()); }
  ok(`no sideways scroll on any page at ${w}px`, all);
}
await p.setViewportSize({ width: 390, height: 844 });

// Navigation: bottom bar with the current page marked, sidebar hidden, floating New session button.
await go("overview");
ok("bottom bar marks the current page", (await p.locator("nav[aria-label='Pages'] a[aria-current='page']").innerText()).includes("Overview"));
ok("sidebar is hidden on phones", !(await p.locator("aside").first().isVisible()));
const fab = p.getByRole("button", { name: "New session" });
ok("floating New session button is visible and sits above the bar", await fab.isVisible() && (await fab.boundingBox()).y + 56 < 844 - 40);

// The floating button gets out of the way while reading down the page and returns on the way up.
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(150);
await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(500);
ok("floating button hides while scrolling down", (await fab.evaluate((e) => getComputedStyle(e).opacity)) === "0");
await p.evaluate(() => window.scrollTo(0, 1100)); await p.waitForTimeout(500);
ok("floating button returns when scrolling up", (await fab.evaluate((e) => getComputedStyle(e).opacity)) === "1");
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);

// Popup is a bottom sheet.
await fab.click();
await p.waitForTimeout(600); // let the slide-up finish
const dlg = await p.locator("dialog[open]").boundingBox();
ok("import popup opens as a bottom sheet", !!dlg && Math.abs(dlg.y + dlg.height - 844) < 3 && dlg.width >= 388);
await p.keyboard.press("Escape");

// Overview: issues are cards, not a table.
await go("overview");
const home = p.locator("[data-mobile-home]");
ok("phone dashboard is its own layout, not the desktop page", await home.isVisible() && (await p.locator("table").count()) === 0 || !(await p.locator("table").first().isVisible()));
ok("phone dashboard leads with the one thing to fix", (await home.locator("section[aria-label='What to fix first'] h2").innerText()).includes("Charged but order never arrived"));
ok("key numbers swipe sideways", await home.locator("section[aria-label='Key numbers']").evaluate((e) => e.scrollWidth > e.clientWidth));
ok("phone dashboard lists the top issues", (await home.locator("[data-issue-card]").count()) === 5);
ok("phone dashboard is short (under 4 screens)", (await p.evaluate(() => document.documentElement.scrollHeight)) < 844 * 4);
await home.getByRole("button", { name: "Track top 3" }).click();
ok("Track top 3 works from the phone dashboard", await home.getByRole("button", { name: "Top 3 tracked" }).isVisible());

// Feedback: cards, sentiment chips with counts, by-issue view.
await go("feedback");
ok("feedback shows review cards, not a table", (await p.locator("ul.md\\:hidden > li").count()) > 0 && !(await p.locator("table").first().isVisible()));
const neg = p.getByRole("button", { name: /^Negative/ });
await neg.click();
ok("sentiment chip filters the list", (await neg.getAttribute("aria-pressed")) === "true" && (await p.locator("ul.md\\:hidden > li").first().innerText()).toLowerCase().includes("negative"));
await p.getByRole("tab", { name: "By issue" }).click();
await p.locator("details > summary").first().click();
ok("by-issue view expands an issue", await p.locator("details[open] li").first().isVisible());

// Priorities: a swipeable row of issues, picking one jumps to its detail.
await go("priorities");
const row = p.getByRole("list", { name: "Ranked issues" });
ok("priorities list scrolls sideways", await row.evaluate((e) => e.scrollWidth > e.clientWidth));
await row.getByRole("button").nth(1).click();
await p.waitForTimeout(700);
ok("picking an issue shows its detail", (await p.locator("article h2").first().innerText()).includes("Website crashes"));

// Tracker: columns swipe sideways, status menu works.
await go("overview");
await go("tracker"); // the top 3 were already tracked from the phone dashboard above
const cols = p.locator("section[data-col]");
ok("tracker columns are wide cards in a swipeable row", (await cols.count()) === 4 && (await cols.first().boundingBox()).width > 300 && (await p.locator("section[data-col]").first().evaluate((e) => e.parentElement.scrollWidth > e.parentElement.clientWidth)));
await cols.first().locator("select[aria-label='Status']").first().selectOption("In progress");
ok("status menu moves a card on a phone", (await p.locator("section[data-col='In progress'] article").count()) === 1);

// Reports: options start collapsed so the preview comes first.
await go("reports");
ok("report options start collapsed", !(await p.getByLabel("Note for readers").isVisible()));
await p.getByRole("button", { name: /^Customize/ }).click();
ok("report options expand on tap", await p.getByLabel("Note for readers").isVisible());

// Header: search, session chip and avatar are one height and share a center line.
await go("overview");
const hb = async (loc) => { const x = await loc.boundingBox(); return { h: Math.round(x.height), mid: Math.round(x.y + x.height / 2) }; };
const hs = [await hb(p.getByRole("textbox", { name: "Search feedback" })), await hb(p.getByRole("button", { name: "Switch session" })), await hb(p.getByRole("button", { name: "My data" }))];
ok("header items are the same height", hs.every((x) => x.h === hs[0].h));
ok("header items share one center line", hs.every((x) => Math.abs(x.mid - hs[0].mid) <= 1));

// Filters: one button with a count, a bottom sheet, and removable chips.
const filterBtn = p.getByRole("button", { name: /^Filters/ });
ok("phone shows a single Filters button, not a row of dropdowns", await filterBtn.isVisible() && !(await p.locator("select").first().isVisible()));
await filterBtn.click();
await p.waitForTimeout(500);
const sheet = p.locator("dialog[open]");
const sb = await sheet.boundingBox();
ok("filters open in a bottom sheet", !!sb && Math.abs(sb.y + sb.height - 844) < 3 && sb.width >= 388);
await sheet.getByLabel("Category").selectOption("Fraud and Scam");
await sheet.getByLabel("Sentiment").selectOption("negative");
await sheet.getByRole("button", { name: "Show results" }).click();
await p.waitForTimeout(500);
ok("active filters appear as chips with a count", await p.getByRole("button", { name: "Remove filter Fraud and Scam" }).isVisible() && (await filterBtn.innerText()).includes("2"));
ok("the dashboard follows the filter", (await p.locator("[data-mobile-home]").innerText()).includes("Fraud and Scam"));
await p.getByRole("button", { name: "Remove filter Negative" }).click();
await p.getByRole("button", { name: "Remove filter Fraud and Scam" }).click();
ok("chips remove filters", (await p.getByRole("button", { name: /^Remove filter/ }).count()) === 0);

// Header keeps the session switcher on a phone.
await p.getByRole("button", { name: "Switch session" }).click();
ok("session switcher works on a phone", await p.getByRole("menuitem", { name: /New session/ }).isVisible());
ok("no page errors", errs.length === 0);
if (errs.length) console.log(errs);
await b.close();
