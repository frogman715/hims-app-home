import PrincipalVesselMatrixClient from "./PrincipalVesselMatrixClient";

export default async function PrincipalVesselMatrixPage({
  params,
}: {
  params: Promise<{ vesselId: string }>;
}) {
  const { vesselId } = await params;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Vessel Crew Matrix</h1>
          <p className="mt-2 text-sm text-slate-600">Read-only manning view for your vessel.</p>
        </header>
        <PrincipalVesselMatrixClient vesselId={vesselId} />
      </div>
    </div>
  );
}
