import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Compass,
  FileCheck2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShipWheel,
  Users,
} from "lucide-react";
import { companyProfile } from "@/lib/company-profile";

export const metadata: Metadata = {
  title: "PT Hanmarine Global Indonesia",
  description:
    "Public company profile for PT Hanmarine Global Indonesia covering crew manning, ship management, maritime consulting, compliance standards, and contact information.",
  robots: {
    index: true,
    follow: true,
  },
};

const sectionLinks = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#compliance", label: "Compliance" },
  { href: "#workflow", label: "Workflow" },
  { href: "#office", label: "Office" },
  { href: "#contact", label: "Contact" },
];

const workflowIcons = [Users, FileCheck2, GraduationCap, BriefcaseBusiness, ClipboardCheck];
const serviceIcons = [Anchor, ShipWheel, Compass];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),linear-gradient(135deg,#031634_0%,#0a295d_48%,#f8fbff_48.1%,#ffffff_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        <header className="relative z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
            <Link href="/" className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-2 backdrop-blur">
                <Image
                  src="/hanmarinereal.png"
                  alt="Hanmarine Global Indonesia"
                  width={52}
                  height={52}
                  className="h-12 w-12 object-contain"
                  priority
                />
              </div>
              <div className="text-white">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">PT Hanmarine</p>
                <p className="text-lg font-semibold leading-none">Global Indonesia</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium text-blue-50/90 lg:flex">
              {sectionLinks.map((item) => (
                <a key={item.href} href={item.href} className="transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="hidden rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
              >
                Staff Sign In
              </Link>
              <Link
                href="/login-portal"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Login Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:pb-24 lg:pt-14">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
                Crew Manning • Ship Management • Maritime Consulting
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                {companyProfile.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-blue-100 sm:text-lg">
                {companyProfile.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login-portal"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Open Login Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Contact Hanmarine
                </a>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {companyProfile.statistics.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                    <p className="text-3xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm text-blue-100">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-end">
              <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">Head Office</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">{companyProfile.shortName}</h2>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 flex-none text-sky-700" />
                    <span>{companyProfile.officeAddress}</span>
                  </div>
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 h-4 w-4 flex-none text-sky-700" />
                    <span>{companyProfile.officePhone}</span>
                  </div>
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 h-4 w-4 flex-none text-sky-700" />
                    <span>{companyProfile.officeEmail}</span>
                  </div>
                </div>
                <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-sm text-slate-200">
                  <p className="font-semibold text-white">Quality and readiness focus</p>
                  <p className="mt-2 leading-7 text-slate-300">
                    Structured recruitment, controlled documentation, principal coordination, and training support are
                    managed through one maritime operations framework.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="about" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">About Hanmarine</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Maritime operations support built around competence, compliance, and continuity.
            </h2>
          </div>
          <div className="space-y-6 text-base leading-8 text-slate-600">
            <p>{companyProfile.legalSummary}</p>
            <p>{companyProfile.vision}</p>
            <div className="grid gap-5 pt-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-sky-50 p-6">
                <h3 className="text-lg font-semibold text-slate-950">Mission</h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  {companyProfile.mission.map((item) => (
                    <li key={item} className="flex gap-3">
                      <ShieldCheck className="mt-1 h-4 w-4 flex-none text-sky-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-slate-950 p-6 text-slate-200">
                <h3 className="text-lg font-semibold text-white">Quality Policy</h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  {companyProfile.qualityPolicy.map((item) => (
                    <li key={item} className="flex gap-3">
                      <ClipboardCheck className="mt-1 h-4 w-4 flex-none text-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Services</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Core maritime services for principals, vessels, and crew operations.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Hanmarine supports the employment lifecycle through recruitment, selection, training coordination, and
              deployment administration backed by practical maritime management controls.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {companyProfile.services.map((service, index) => {
              const Icon = serviceIcons[index];
              return (
                <article key={service.title} className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-200">
                  <div className="inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-slate-950">{service.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{service.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companyProfile.serviceFunctions.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="compliance" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,#08224c_0%,#0f3b75_58%,#10b7d8_140%)] p-8 text-white shadow-[0_30px_80px_-35px_rgba(2,12,27,0.55)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Compliance / International Standards</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Operating with international maritime standards as a baseline.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-100">
                  Our public-facing service position is aligned with recognized maritime conventions and management
                  practices referenced throughout the system and company materials.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {companyProfile.compliance.map((item) => (
                  <div key={item} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                    <ShieldCheck className="h-5 w-5 text-cyan-300" />
                    <p className="mt-4 text-lg font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Crew Management Workflow</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Structured handling from recruitment to employment monitoring.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-5">
            {companyProfile.workflow.map((item, index) => {
              const Icon = workflowIcons[index];
              return (
                <article key={item.step} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-sky-700">0{index + 1}</span>
                    <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-950">{item.step}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="office" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Office & Training</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Jakarta-based coordination for crew readiness and deployment support.
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">{companyProfile.trainingNote}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Office Hours</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{companyProfile.officeHours}</p>
                </div>
                <div className="rounded-3xl bg-sky-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Operational Focus</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">Selection, briefing, records, deployment</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_30px_90px_-35px_rgba(2,12,27,0.65)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Business Scope</p>
              <div className="mt-6 space-y-5">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-xl font-semibold">Recruitment & Selection</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Candidate sourcing, screening, interview support, and principal submission built around document
                    and suitability checks.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-xl font-semibold">Training & Familiarization</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Pre-joining orientation, standards familiarization, and training coordination to improve readiness
                    before embarkation.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-xl font-semibold">Employment Administration</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Contract and deployment administration, crew record control, and support for continuity during the
                    assignment cycle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Contact</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Contact Hanmarine for crew support, management coordination, and business inquiries.
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <MapPin className="h-5 w-5 text-sky-700" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">Office</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{companyProfile.officeAddress}</p>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <Phone className="h-5 w-5 text-sky-700" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">Phone</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{companyProfile.officePhone}</p>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <Mail className="h-5 w-5 text-sky-700" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">Email</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{companyProfile.officeEmail}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] bg-[linear-gradient(120deg,#031634_0%,#0c366e_55%,#0ea5c6_150%)] p-8 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Login Portal CTA</p>
                <h3 className="mt-3 text-3xl font-semibold">Access the HIMS portal by user type.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
                  Crew, staff, principals, and auditors can continue to the correct entry point without changing the
                  existing authentication workflow.
                </p>
              </div>
              <Link
                href="/login-portal"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open Login Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
