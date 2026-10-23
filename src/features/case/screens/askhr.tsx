/*
 * Ask HR screens (CONTOH — redrawn from the shipped design; ganti dengan screenshot asli jika boleh).
 * The employee app and the HR admin's review queue: an answer with its source, a draft waiting for
 * a person, and a sensitive question that never reaches the AI.
 */

function Bar({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="ah-bar">
      <span className="ah-back">‹</span>
      <span>
        <b>{title}</b>
        <small>{sub}</small>
      </span>
    </div>
  );
}

/** A routine question, answered automatically from the company's own policy, with its section. */
export function AskHrAnswer() {
  return (
    <div className="ah">
      <Bar title="Ask HR" sub="Answers from your company handbook" />
      <div className="ah-body">
        <span className="ah-q">Can I carry over my leave to next year?</span>
        <div className="ah-card">
          <span className="ah-tag">Answered automatically</span>
          <h4 style={{ marginTop: "0.6em" }}>Yes, up to 5 days. Use them by 31 March.</h4>
          <p>You have 7 days left this year, so 2 would not carry over. Your manager doesn&apos;t need to approve it.</p>
          <p className="ah-src">
            Leave policy, section 4.2 <span>Open</span>
          </p>
          <div className="ah-row">
            <span className="ah-btn">Helpful</span>
            <span className="ah-btn">Ask a person</span>
          </div>
        </div>
        <p className="ah-meta" style={{ textAlign: "center" }}>
          Written by AI from PT Sinar&apos;s handbook, updated 2 Oct
        </p>
      </div>
    </div>
  );
}

/**
 * HR's review queue: the decision first (approve the swap or not), then the reply. A draft about
 * pay or a contract can't be sent until its source has been opened.
 */
export function AskHrQueue() {
  return (
    <div className="ah">
      <Bar title="Review queue" sub="6 waiting · oldest 25 min" />
      <div className="ah-body">
        <div className="ah-card">
          <div className="ah-queue-head">
            <span className="ah-who">
              <span className="ah-face">RN</span>
              <span>
                <b style={{ fontSize: "1em" }}>Rina, Warehouse B</b>
                <br />
                <span className="ah-meta">Can I swap my Saturday shift with Dedi?</span>
              </span>
            </span>
          </div>
          <p className="ah-step">1 · Your decision</p>
          <div className="ah-row">
            <span className="ah-btn ah-btn--go">Approve swap</span>
            <span className="ah-btn">Decline</span>
          </div>
          <p className="ah-step">2 · Reply (AI draft)</p>
          <p className="ah-draft">Hi Rina, yes. Swaps are fine if Dedi agrees and you both log it in the app by Thursday.</p>
          <p className="ah-src">
            Attendance policy, 3.1 <span>Open</span>
          </p>
          <div className="ah-row">
            <span className="ah-btn">Edit</span>
            <span className="ah-btn ah-btn--off">Send after deciding</span>
          </div>
        </div>
        <span className="ah-peek" />
      </div>
    </div>
  );
}

/** The admin side: which topics may be answered automatically, and a handbook change to review. */
export function AskHrAdmin() {
  const topics: [string, boolean][] = [
    ["Leave balance", true],
    ["Payslip dates", true],
    ["Public holidays", true],
    ["Reimbursement rules", false],
  ];
  return (
    <div className="ah">
      <Bar title="Ask HR settings" sub="PT Sinar · admin" />
      <div className="ah-body">
        <div className="ah-card ah-card--alert">
          <span className="ah-tag ah-tag--wait">Handbook changed</span>
          <p style={{ marginTop: "0.5em" }}>
            <b>Leave policy</b> was updated today. 3 recent answers cited sections that changed.
          </p>
          <div className="ah-row">
            <span className="ah-btn ah-btn--go">Review 3 answers</span>
          </div>
        </div>
        <div className="ah-card">
          <h4>Answered automatically</h4>
          <ul className="ah-toggles">
            {topics.map(([t, on]) => (
              <li key={t}>
                <span>{t}</span>
                <span className="ah-switch" data-on={on || undefined}>
                  {on ? "On" : "Off"}
                </span>
              </li>
            ))}
          </ul>
          <p className="ah-lock">🔒 Complaints, health, termination and pay disputes always go to a person. Set by Legal; can&apos;t be switched on.</p>
        </div>
      </div>
    </div>
  );
}

/** A question that needs HR: who will answer and roughly when, not a spinner. */
export function AskHrPending() {
  return (
    <div className="ah">
      <Bar title="Ask HR" sub="Answers from your company handbook" />
      <div className="ah-body">
        <span className="ah-q">Can I get my new glasses reimbursed?</span>
        <div className="ah-card">
          <span className="ah-tag ah-tag--wait">A person will answer</span>
          <div className="ah-who" style={{ marginTop: "0.8em" }}>
            <span className="ah-face">DN</span>
            <span>
              <b>Dina from HR</b>
              <br />
              <span className="ah-meta">Usually within 2 hours on workdays</span>
            </span>
          </div>
          <p style={{ marginTop: "0.7em" }}>Reimbursements depend on your grade, so a person checks them.</p>
          <ul className="ah-steps">
            <li data-done="">Sent, 10:12</li>
            <li data-now="">Dina is reviewing</li>
            <li>Answer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** A sensitive message, sent after hours: no AI, a named person, when, who can see it, and an urgent line. */
export function AskHrSensitive() {
  return (
    <div className="ah">
      <Bar title="Ask HR" sub="Answers from your company handbook" />
      <div className="ah-body">
        <span className="ah-q">My supervisor keeps shouting at me in front of everyone. What can I do?</span>
        <div className="ah-card">
          <span className="ah-tag ah-tag--care">Sent privately to HR</span>
          <h4 style={{ marginTop: "0.6em" }}>Thank you for telling us.</h4>
          <p>This goes to Dina in HR, not to your supervisor. HR is offline now; she&apos;ll contact you by 10:00 tomorrow, the way you choose.</p>
          <p className="ah-lock">🔒 Only you and HR can see this. No automatic reply is written.</p>
          <div className="ah-row">
            <span className="ah-btn">How Dina contacts me</span>
            <span className="ah-btn ah-btn--care">Unsafe now? 24-hour line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
