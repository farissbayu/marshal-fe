# Demo script (5 minutes)

All steps work with **no Gemini key** (offline, deterministic). Add a key only for step 5.

1. **Offline, clean car.** `bun dev`, open http://localhost:3000, enter `1`, Run batch.
   Watch it move line → inspection gate → test track → report → yard. The gate verdict is PASS
   and the report appears with all 7 flows filled in.

2. **3-car batch with faults.** Enter `3`, Run batch. Three labelled cars go out:
   - one **wrong colour** (declared blue, spawned red) → FAIL at the gate;
   - one **dead lamp** (one headlight out) → fails the `headlights` step on the track;
   - one **incident** (box + worker block the lane) → the car stops and an Assistance card appears.

3. **Supervisor decision.** On the Assistance card, pick `manual_override` (or `reroute`). The
   lane clears, the log shows `Assist decided`, and the batch continues.

4. **Flows 6–7.** Because there was an incident, after the cars finish the Scenario generator and
   the Adversarial tester run. The Adversarial card/ counts show runs and failures, and the
   brittle variant is reported.

5. **Report.** Open the report: 7 per-flow feedback entries, expected-vs-actual labels
   (caught/missed/false alarms), a risk badge, and **Download JSON**. Without a key the
   `degraded` badge is shown. Then (optional) set `GOOGLE_GENAI_API_KEY`, rerun step 2, and
   compare: the same structure but real model feedback and latency.

Tips: use the viewer cameras (overview / follow / gate / track) to see exactly what the vision
capture sees; use Pause and the speed buttons (1×–8×) to slow things down.
