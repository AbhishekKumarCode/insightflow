# Demo script (about 2 minutes)

Open the live app first: https://insightflow-blond.vercel.app

Tip: do one dry run before recording. Use a fresh browser window so the Tracker is empty (your data is stored per browser).

## 0:00 to 0:15, the problem

**Show:** the live URL's welcome screen. Tap two or three review cards so they flip into their issue, then click **Open the dashboard**. (If you have opened the site before, use the avatar menu, then **Show the welcome screen**.)

> "A business gets thousands of reviews and has to decide what to fix first. This file has 7,000 reviews, but only 320 are different. Some sentences repeat hundreds of times, so counting rows would give the wrong answer."

## 0:15 to 0:40, Adaption

**Show:** scroll to the Adaption card.

> "I ran the file through Adaption first. Quality went from 2.0 out of 10, grade E, to 9.6, grade A, and 7,223 rows became 441. All 320 distinct reviews survived."
>
> "Adaption lost the repeat counts, and it changed some labels, so I don't use its labels. I count repeats from the original file. That is why a complaint said 295 times still counts as 295."

## 0:40 to 1:10, the decision

**Show:** click **Open dashboard**.

> "The top of the page is the decision: fix 'charged but order never arrived' first. 510 customers reported it, every report was negative, and the first action is to refund orders that are paid but not shipped within 48 hours."

**Show:** point at the Pressure board, then the filters. Pick **Fraud and Scam**, then **Clear filters**.

> "The bars show how many reported each issue, and the colour shows what it costs: red is lost money or trust. Every filter changes the whole page."

## 1:10 to 1:30, why it ranks first

**Show:** click **See why it ranks first**. Point at the score bar.

> "No black box. The score is 40% volume, 35% how one-sided the feedback is, and 25% severity, which I set by hand. It is a ranking heuristic, and the page shows the arithmetic and the real customer quotes."

## 1:30 to 1:50, adding feedback

**Show:** click **New session**, open **Paste feedback**, paste two or three lines (one with an email address, for example `Contact me at jane@example.com`, and one that is new, such as `My refund never arrived and support ignores my emails`), click **Check feedback**.

> "New feedback goes through a pre-flight check. It finds personal data and masks it, flags repeats, and matches each review to a known issue, showing how similar it is. Anything new is grouped into its own issue. Each import becomes a session with its own dashboard, tracker and reports, like a chat history."

Click **Create session**. Point at the new session in the sidebar and its own ranked issues, then click **Sample dataset** to switch back.

## 1:50 to 2:10, act on it

**Show:** on the Overview, click **Track top 3 issues**, open the **Tracker**, drag a card to **In progress**, then open **Reports** and click **Export CSV**.

> "Then it becomes work: track the issues, move them across the board, and export a report for the team."

## Closing line

> "InsightFlow turns 7,000 repetitive reviews into one clear decision, and shows its reasoning."

## If something goes wrong

- A blank chart usually means the page is still loading. Wait one second and refresh.
- To reset a messy demo, clear this site's data in your browser settings.
- Say plainly that trends use a simulated timeline, because the sample file has no dates. The chart is labelled that way on screen.
