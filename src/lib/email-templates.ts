// Shared email wrapper for consistent branding
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { font-size: 20px; font-weight: 700; color: #18181b; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 600; color: #18181b; margin: 0 0 12px 0; line-height: 1.3; }
    p { font-size: 15px; color: #52525b; line-height: 1.6; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px 0; }
    .btn:hover { background: #27272a; }
    .stat-row { display: flex; gap: 16px; margin: 16px 0; }
    .stat { background: #f4f4f5; border-radius: 8px; padding: 12px 16px; flex: 1; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #18181b; }
    .stat-label { font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-safety { background: #fef2f2; color: #dc2626; }
    .badge-major { background: #fff7ed; color: #ea580c; }
    .badge-minor { background: #fefce8; color: #ca8a04; }
    .badge-cosmetic { background: #eff6ff; color: #2563eb; }
    .footer { text-align: center; margin-top: 24px; font-size: 13px; color: #a1a1aa; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">PropIntel</div>
      ${content}
    </div>
    <div class="footer">
      <p>PropIntel &mdash; Property Intelligence &amp; Execution</p>
    </div>
  </div>
</body>
</html>`
}

// --- Invite Homeowner ---
export function inviteHomeownerEmail({
  firstName,
  propertyAddress,
  inviteLink,
}: {
  firstName: string
  propertyAddress?: string
  inviteLink: string
}): { subject: string; html: string } {
  const propertyLine = propertyAddress
    ? `<p>Your property assessment for <strong>${escapeHtml(propertyAddress)}</strong> is ready to view.</p>`
    : '<p>A property assessment has been prepared for you.</p>'

  return {
    subject: propertyAddress
      ? `Your property assessment for ${propertyAddress} is ready`
      : 'Your PropIntel property assessment is ready',
    html: emailWrapper(`
      <h1>Welcome, ${escapeHtml(firstName)}</h1>
      ${propertyLine}
      <p>Click below to set your password and view your results. You'll see a detailed breakdown of any issues found, along with photos and recommended next steps.</p>
      <a href="${escapeHtml(inviteLink)}" class="btn">View Your Assessment</a>
      <p style="font-size: 13px; color: #a1a1aa;">This link expires in 24 hours. If it doesn't work, copy and paste this URL into your browser:<br>${escapeHtml(inviteLink)}</p>
    `),
  }
}

// --- Assessment Ready ---
export function assessmentReadyEmail({
  firstName,
  propertyAddress,
  issueCount,
  safetyCount,
  viewLink,
}: {
  firstName: string
  propertyAddress: string
  issueCount: number
  safetyCount: number
  viewLink: string
}): { subject: string; html: string } {
  const safetyNote = safetyCount > 0
    ? `<p style="color: #dc2626; font-weight: 500;">&#9888; ${safetyCount} safety hazard${safetyCount > 1 ? 's' : ''} identified &mdash; please review promptly.</p>`
    : ''

  return {
    subject: `Your property assessment is complete — ${issueCount} item${issueCount !== 1 ? 's' : ''} found`,
    html: emailWrapper(`
      <h1>Your Assessment is Complete</h1>
      <p>Hi ${escapeHtml(firstName)}, the inspection of <strong>${escapeHtml(propertyAddress)}</strong> is finished.</p>
      <!--[if mso]><table><tr><td style="padding:0 8px"><![endif]-->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td style="background:#f4f4f5; border-radius:8px; padding:12px 16px; text-align:center; width:50%;">
            <div style="font-size:24px; font-weight:700; color:#18181b;">${issueCount}</div>
            <div style="font-size:12px; color:#71717a; text-transform:uppercase;">Issues Found</div>
          </td>
          <td style="width:12px;"></td>
          <td style="background:#f4f4f5; border-radius:8px; padding:12px 16px; text-align:center; width:50%;">
            <div style="font-size:24px; font-weight:700; color:${safetyCount > 0 ? '#dc2626' : '#18181b'};">${safetyCount}</div>
            <div style="font-size:12px; color:#71717a; text-transform:uppercase;">Safety Items</div>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
      ${safetyNote}
      <p>Review your assessment to see photos, severity ratings, and recommended actions. You can select which items to fix and request quotes from qualified contractors.</p>
      <a href="${escapeHtml(viewLink)}" class="btn">Review Your Assessment</a>
    `),
  }
}

// --- Proposal Received ---
export function proposalReceivedEmail({
  firstName,
  propertyAddress,
  contractorName,
  totalAmount,
  viewLink,
}: {
  firstName: string
  propertyAddress: string
  contractorName: string
  totalAmount: string
  viewLink: string
}): { subject: string; html: string } {
  return {
    subject: `New proposal received — ${contractorName} for ${propertyAddress}`,
    html: emailWrapper(`
      <h1>You Have a New Proposal</h1>
      <p>Hi ${escapeHtml(firstName)}, <strong>${escapeHtml(contractorName)}</strong> has submitted a proposal for work on <strong>${escapeHtml(propertyAddress)}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td style="background:#f4f4f5; border-radius:8px; padding:16px; text-align:center;">
            <div style="font-size:28px; font-weight:700; color:#18181b;">$${escapeHtml(totalAmount)}</div>
            <div style="font-size:13px; color:#71717a;">Total Proposed Amount</div>
          </td>
        </tr>
      </table>
      <p>Review the proposal details, including line-item pricing and timeline, to decide if this contractor is the right fit.</p>
      <a href="${escapeHtml(viewLink)}" class="btn">Review Proposal</a>
    `),
  }
}

// --- Contractor Selected ---
export function contractorSelectedEmail({
  contractorFirstName,
  propertyAddress,
  totalAmount,
  viewLink,
}: {
  contractorFirstName: string
  propertyAddress: string
  totalAmount: string
  viewLink: string
}): { subject: string; html: string } {
  return {
    subject: `Congratulations! You've been selected for ${propertyAddress}`,
    html: emailWrapper(`
      <h1>You've Been Selected</h1>
      <p>Hi ${escapeHtml(contractorFirstName)}, your proposal for <strong>${escapeHtml(propertyAddress)}</strong> has been accepted!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td style="background:#f0fdf4; border-radius:8px; padding:16px; text-align:center;">
            <div style="font-size:28px; font-weight:700; color:#16a34a;">$${escapeHtml(totalAmount)}</div>
            <div style="font-size:13px; color:#71717a;">Accepted Amount</div>
          </td>
        </tr>
      </table>
      <p>Log in to view the full project details and next steps.</p>
      <a href="${escapeHtml(viewLink)}" class="btn">View Project</a>
    `),
  }
}

// --- Inspector Assigned ---
export function inspectorAssignedEmail({
  inspectorFirstName,
  propertyAddress,
  scheduledDate,
  viewLink,
}: {
  inspectorFirstName: string
  propertyAddress: string
  scheduledDate: string
  viewLink: string
}): { subject: string; html: string } {
  return {
    subject: `New inspection assigned — ${propertyAddress}`,
    html: emailWrapper(`
      <h1>New Inspection Assigned</h1>
      <p>Hi ${escapeHtml(inspectorFirstName)}, you&rsquo;ve been assigned a new property inspection.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
        <tr>
          <td style="background:#f4f4f5; border-radius:8px; padding:16px;">
            <div style="font-size:15px; font-weight:600; color:#18181b;">${escapeHtml(propertyAddress)}</div>
            <div style="font-size:13px; color:#71717a; margin-top:4px;">Scheduled: ${escapeHtml(scheduledDate)}</div>
          </td>
        </tr>
      </table>
      <p>Log in to view the property details, start the inspection, and record your observations.</p>
      <a href="${escapeHtml(viewLink)}" class="btn">View Inspection</a>
    `),
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
