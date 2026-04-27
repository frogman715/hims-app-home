import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { companyProfile, portalRoles } from "@/lib/company-profile";

export const metadata: Metadata = {
  title: "Login Portal | PT Hanmarine Global Indonesia",
  description: "Role-based login portal for crew, staff, principal, and auditor access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPortalPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,#031634_0%,#08224c_38%,#f8fbff_38.1%,#eef6ff_100%)] px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-white">
            <Image
              src="/hanmarinereal.png"
              alt="Hanmarine Global Indonesia"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Public Site</p>
              <p className="text-lg font-semibold">PT Hanmarine Global Indonesia</p>
            </div>
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Direct Sign In
          </Link>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Login Portal</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Choose your HIMS access point.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-blue-100">
              Select the appropriate portal entry for your role. The underlying authentication flow remains unchanged
              and each option forwards into the existing `/auth/signin` route.
            </p>

            <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm leading-7 text-blue-100">{companyProfile.legalSummary}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {companyProfile.compliance.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-7 shadow-[0_32px_100px_-30px_rgba(15,23,42,0.4)] ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Portal Options</p>
                <h2 className="text-2xl font-semibold text-slate-950">Role-based entry points</h2>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              {portalRoles.map((role) => (
                <Link
                  key={role.key}
                  href={role.href}
                  className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{role.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{role.href}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-700" />
                </Link>
              ))}
            </div>

            <div className="mt-8 rounded-3xl bg-slate-950 p-5 text-sm leading-7 text-slate-300">
              Existing application routes such as `/dashboard`, `/crewing`, `/principal`, and `/accounting` remain
              unchanged and protected behind authentication.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
