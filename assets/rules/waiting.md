## Waiting on a subagent or job: notification, not polling

**Nothing here is a fixed wait.** `timeout_ms` is a **ceiling, not a duration**: measured on
2026-09-15, a 45 s job with a 180 s ceiling returned in ~45 s. Use a generous ceiling without fear —
it only guards against a stuck job, and never makes you wait until the end.

There are two mechanisms, and neither of them is a polling loop:

1. **Background subagent: the runtime notifies you.** When the child settles, a notification arrives
   with its outcome and its final message. **There is nothing to check.** Keep working; the
   notification arrives on its own. Checking before that anticipates nothing and burns tokens.
2. **Background job: one call that returns on completion.**
   `job_output(job_id, wait: true, timeout_ms: 180000)` — blocks until the job finishes **or** the
   ceiling expires. It returns on completion.

**Every check is a call and a result that stays in context** — that is what makes polling expensive.
A call with `wait` costs the same as a manual check but replaces all of them.

**While you wait, do local work**: update the ledger, prepare the review package, read the previous
task's report, dispatch another independent task. Only wait idle if there is genuinely nothing to
do — and then it is one call, not a loop.

**Never** create a wait job with a long `sleep` or a bash watcher to watch another process: that is
one more process and it does not notify you any faster. And never check every few seconds.

**If the ceiling expires with no response**, re-check the state (`job_list`, `list_agents`,
`git status`) and decide whether to open another window — or kill with `job_kill` whatever stopped
mattering.
