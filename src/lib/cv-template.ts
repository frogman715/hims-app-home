import { getDocumentTypeLabel } from "@/lib/document-types";

type CvDocument = {
  docType: string;
  docNumber: string | null;
  expiryDate: Date | null;
};

type CvContract = {
  rank: string | null;
  contractStart: Date | null;
  contractEnd: Date | null;
  status: string | null;
  vesselName: string | null;
  principalName: string | null;
};

type CvInput = {
  candidateName: string;
  rank: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  passportNumber: string | null;
  seamanBookNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact?: string | null;
  applicationPosition?: string | null;
  sourceLabel?: string | null;
  documents?: CvDocument[];
  latestContract?: CvContract | null;
};

export type CrewCvPayload = {
  candidateName: string;
  rank: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  seamanBookNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  applicationPosition: string | null;
  sourceLabel: string | null;
  latestContract: CvContract | null;
  documentSummary: Array<{
    docType: string;
    docLabel: string;
    docNumber: string | null;
    expiryDate: string | null;
  }>;
};

function formatDate(value: Date | null): string | null {
  return value ? value.toISOString().split("T")[0] : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildCrewCvPayload(input: CvInput): CrewCvPayload {
  const documentSummary = (input.documents ?? [])
    .sort((left, right) => {
      if (!left.expiryDate) return 1;
      if (!right.expiryDate) return -1;
      return left.expiryDate.getTime() - right.expiryDate.getTime();
    })
    .slice(0, 8)
    .map((document) => ({
      docType: document.docType,
      docLabel: getDocumentTypeLabel(document.docType),
      docNumber: document.docNumber,
      expiryDate: formatDate(document.expiryDate),
    }));

  return {
    candidateName: input.candidateName,
    rank: input.rank ?? null,
    nationality: input.nationality ?? null,
    dateOfBirth: formatDate(input.dateOfBirth),
    passportNumber: input.passportNumber ?? null,
    seamanBookNumber: input.seamanBookNumber ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    emergencyContact: input.emergencyContact ?? null,
    applicationPosition: input.applicationPosition ?? null,
    sourceLabel: input.sourceLabel ?? null,
    latestContract: input.latestContract ?? null,
    documentSummary,
  };
}

export function renderCrewCvText(payload: CrewCvPayload): string {
  const lines = [
    "HGI Crew CV",
    "===========",
    `Name: ${payload.candidateName}`,
    `Rank: ${payload.rank ?? "-"}`,
    `Nationality: ${payload.nationality ?? "-"}`,
    `Date of Birth: ${payload.dateOfBirth ?? "-"}`,
    `Passport Number: ${payload.passportNumber ?? "-"}`,
    `Seaman Book Number: ${payload.seamanBookNumber ?? "-"}`,
    `Email: ${payload.email ?? "-"}`,
    `Phone: ${payload.phone ?? "-"}`,
    `Address: ${payload.address ?? "-"}`,
    `Emergency Contact: ${payload.emergencyContact ?? "-"}`,
    `Requested Position: ${payload.applicationPosition ?? "-"}`,
    `CV Source: ${payload.sourceLabel ?? "-"}`,
    "",
    "Latest Contract",
    "---------------",
    `Rank: ${payload.latestContract?.rank ?? "-"}`,
    `Status: ${payload.latestContract?.status ?? "-"}`,
    `Vessel: ${payload.latestContract?.vesselName ?? "-"}`,
    `Principal: ${payload.latestContract?.principalName ?? "-"}`,
    `Contract Start: ${formatDate(payload.latestContract?.contractStart ?? null) ?? "-"}`,
    `Contract End: ${formatDate(payload.latestContract?.contractEnd ?? null) ?? "-"}`,
    "",
    "Active Documents",
    "----------------",
  ];

  if (payload.documentSummary.length === 0) {
    lines.push("No active document records available.");
  } else {
    for (const document of payload.documentSummary) {
      lines.push(
        `${document.docLabel}: ${document.docNumber ?? "-"} (Expiry: ${document.expiryDate ?? "-"})`
      );
    }
  }

  return lines.join("\n");
}

export function renderCrewCvHtml(payload: CrewCvPayload): string {
  const documentRows = payload.documentSummary.length
    ? payload.documentSummary
        .map(
          (document) => `
            <tr>
              <td>${escapeHtml(document.docLabel)}</td>
              <td>${escapeHtml(document.docNumber ?? "-")}</td>
              <td>${escapeHtml(document.expiryDate ?? "-")}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="3">No active document records available.</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>HGI Crew CV</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #0f172a;
            background: #f8fafc;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 20mm 16mm;
          }
          .header {
            border-bottom: 3px solid #0f766e;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .eyebrow {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #0f766e;
            margin-bottom: 6px;
          }
          h1 {
            font-size: 30px;
            margin: 0;
          }
          .subhead {
            margin-top: 6px;
            color: #475569;
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            background: #f8fafc;
          }
          .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
            margin-bottom: 4px;
          }
          .value {
            font-size: 14px;
            font-weight: 600;
          }
          .section {
            margin-top: 18px;
          }
          .section h2 {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #0f172a;
            margin: 0 0 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            text-align: left;
            padding: 9px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          th {
            background: #f1f5f9;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #475569;
          }
          .footer {
            margin-top: 20px;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="eyebrow">HGI Crew CV</div>
            <h1>${escapeHtml(payload.candidateName)}</h1>
            <div class="subhead">
              ${escapeHtml(payload.rank ?? "-")} • ${escapeHtml(payload.nationality ?? "-")}
            </div>
          </div>

          <div class="grid">
            <div class="card"><div class="label">Date of Birth</div><div class="value">${escapeHtml(payload.dateOfBirth ?? "-")}</div></div>
            <div class="card"><div class="label">Passport</div><div class="value">${escapeHtml(payload.passportNumber ?? "-")}</div></div>
            <div class="card"><div class="label">Seaman Book</div><div class="value">${escapeHtml(payload.seamanBookNumber ?? "-")}</div></div>
            <div class="card"><div class="label">Contact</div><div class="value">${escapeHtml(payload.phone ?? "-")} / ${escapeHtml(payload.email ?? "-")}</div></div>
            <div class="card"><div class="label">Address</div><div class="value">${escapeHtml(payload.address ?? "-")}</div></div>
            <div class="card"><div class="label">Emergency Contact</div><div class="value">${escapeHtml(payload.emergencyContact ?? "-")}</div></div>
          </div>

          <div class="section">
            <h2>Latest Contract</h2>
            <div class="grid">
              <div class="card"><div class="label">Rank</div><div class="value">${escapeHtml(payload.latestContract?.rank ?? "-")}</div></div>
              <div class="card"><div class="label">Status</div><div class="value">${escapeHtml(payload.latestContract?.status ?? "-")}</div></div>
              <div class="card"><div class="label">Vessel</div><div class="value">${escapeHtml(payload.latestContract?.vesselName ?? "-")}</div></div>
              <div class="card"><div class="label">Principal</div><div class="value">${escapeHtml(payload.latestContract?.principalName ?? "-")}</div></div>
              <div class="card"><div class="label">Contract Start</div><div class="value">${escapeHtml(formatDate(payload.latestContract?.contractStart ?? null) ?? "-")}</div></div>
              <div class="card"><div class="label">Contract End</div><div class="value">${escapeHtml(formatDate(payload.latestContract?.contractEnd ?? null) ?? "-")}</div></div>
            </div>
          </div>

          <div class="section">
            <h2>Active Document Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Number</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>${documentRows}</tbody>
            </table>
          </div>

          <div class="footer">
            Generated from current HIMS crew data${payload.sourceLabel ? ` • Source: ${escapeHtml(payload.sourceLabel)}` : ""}.
          </div>
        </div>
      </body>
    </html>
  `;
}
