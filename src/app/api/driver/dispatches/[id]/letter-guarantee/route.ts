import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { resolveDriverDispatchIds } from "@/lib/driver-dispatch-scope";

type LetterGuaranteeData = {
  companyName: string;
  date: string;
  letterNumber: string;
  principalName: string;
  vesselName: string;
  vesselFlag: string;
  joinDate: string;
  joinPort: string;
  crewName: string;
  crewDob: string;
  crewRank: string;
  passportNo: string;
  seamanBookNo: string;
};

function generateLetterGuaranteeHTML(data: LetterGuaranteeData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Letter of Guarantee</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; line-height: 1.55; }
    h1 { font-size: 20px; margin-bottom: 6px; }
    .muted { color: #444; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f4f4f4; }
    .section { margin-top: 18px; }
  </style>
</head>
<body>
  <h1>LETTER OF GUARANTEE</h1>
  <p class="muted">${data.companyName}</p>
  <p><strong>Date:</strong> ${data.date}</p>
  <p><strong>Letter No:</strong> ${data.letterNumber}</p>

  <div class="section">
    <p>
      This letter confirms that the seafarer below is assigned to join the vessel for employment.
      This document is issued for airline check-in and immigration handling.
    </p>
  </div>

  <div class="section">
    <p><strong>Principal:</strong> ${data.principalName}</p>
    <p><strong>Vessel:</strong> ${data.vesselName} (${data.vesselFlag})</p>
    <p><strong>Join Date:</strong> ${data.joinDate}</p>
    <p><strong>Join Port:</strong> ${data.joinPort}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Date of Birth</th>
        <th>Rank</th>
        <th>Passport No</th>
        <th>Seaman Book No</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${data.crewName}</td>
        <td>${data.crewDob}</td>
        <td>${data.crewRank}</td>
        <td>${data.passportNo}</td>
        <td>${data.seamanBookNo}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;
}

async function assertAssignedDispatch(input: {
  userId: string;
  email?: string | null;
  dispatchId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const assignedDispatchIds = resolveDriverDispatchIds({
    userId: input.userId,
    email: input.email,
  });

  if (assignedDispatchIds.length === 0) {
    return { ok: false, reason: "Driver dispatch scope is not configured for this user." };
  }

  if (!assignedDispatchIds.includes(input.dispatchId)) {
    return { ok: false, reason: "Dispatch is not assigned to this driver." };
  }

  return { ok: true };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi(["DRIVER"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  const { id } = await context.params;
  const scope = await assertAssignedDispatch({
    userId: auth.user.id,
    email: auth.session.user.email,
    dispatchId: id,
  });

  if (!scope.ok) {
    const message = "reason" in scope ? scope.reason : "Dispatch is not assigned to this driver.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          dateOfBirth: true,
          passportNumber: true,
          seamanBookNumber: true,
        },
      },
    },
  });

  if (!dispatch) {
    return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
  }

  const prepareJoining = await prisma.prepareJoining.findFirst({
    where: {
      crewId: dispatch.crewId,
      status: {
        in: ["READY", "DISPATCHED"],
      },
    },
    include: {
      principal: {
        select: {
          name: true,
        },
      },
      vessel: {
        select: {
          name: true,
          flag: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!prepareJoining) {
    return NextResponse.json(
      { error: "Prepare joining record not found for this dispatch crew." },
      { status: 404 }
    );
  }

  const today = new Date();
  const data: LetterGuaranteeData = {
    companyName: "PT HANMARINE INTERNATIONAL MARITIME SERVICE",
    date: today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    letterNumber: `LG/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
    principalName: prepareJoining.principal?.name ?? "N/A",
    vesselName: prepareJoining.vessel?.name ?? "N/A",
    vesselFlag: prepareJoining.vessel?.flag ?? "N/A",
    joinDate: dispatch.dispatchDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    joinPort: dispatch.port,
    crewName: dispatch.crew.fullName ?? "N/A",
    crewDob: dispatch.crew.dateOfBirth
      ? new Date(dispatch.crew.dateOfBirth).toLocaleDateString("en-GB")
      : "N/A",
    crewRank: dispatch.crew.rank ?? "N/A",
    passportNo: dispatch.crew.passportNumber ?? "N/A",
    seamanBookNo: dispatch.crew.seamanBookNumber ?? "N/A",
  };

  const html = generateLetterGuaranteeHTML(data);
  const format = new URL(request.url).searchParams.get("format");
  if (format === "html") {
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ data, html });
}
