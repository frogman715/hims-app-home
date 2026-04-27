export const companyProfile = {
  name: "PT Hanmarine Global Indonesia",
  shortName: "Hanmarine Global Indonesia",
  legalSummary:
    "PT Hanmarine Global Indonesia is an Indonesian maritime services company focused on crew manning, ship management, and maritime consulting for principals and vessel operators.",
  heroTitle: "Integrated Maritime Crew Management for Reliable Vessel Operations",
  heroSubtitle:
    "Professional crew manning, ship management support, and maritime consulting delivered with disciplined compliance, structured training, and operational accountability.",
  officeAddress: "Jl. Raya Muara Karang No. 8, Jakarta Utara 14450, Indonesia",
  officePhone: "+62 21 6693 6060",
  officeEmail: "info@hanmarine.co",
  officeHours: "Monday to Friday, 08:30 to 17:00 WIB",
  trainingNote:
    "Office-based recruitment, selection, documentation control, briefing, and training coordination are managed from the Jakarta office to support timely deployment and crew readiness.",
  vision:
    "To be a trusted maritime partner recognized for dependable crew management, responsible ship support services, and commitment to international maritime standards.",
  mission: [
    "Provide qualified, well-screened, and deployment-ready seafarers for principals and vessel operators.",
    "Operate crew management processes through disciplined recruitment, selection, training, and employment controls.",
    "Promote safe, compliant, and efficient vessel operations through maritime consulting and management support.",
    "Sustain continuous improvement in quality, documentation, and service responsiveness.",
  ],
  qualityPolicy: [
    "Deliver services consistently in line with client requirements and applicable maritime regulations.",
    "Maintain competence through recruitment controls, verification, familiarization, and training.",
    "Protect service quality with documented procedures, traceable records, and continual improvement.",
    "Support seafarer welfare, professional conduct, and safe working practices throughout the employment cycle.",
  ],
  services: [
    {
      title: "Crew Manning",
      description:
        "Sourcing and supplying competent officers and ratings for merchant vessels with document verification, availability control, and deployment coordination.",
    },
    {
      title: "Ship Management Support",
      description:
        "Administrative and operational support for crewing continuity, crew changes, readiness monitoring, and vessel manpower planning.",
    },
    {
      title: "Maritime Consulting",
      description:
        "Guidance for principals and operators on manning strategy, compliance alignment, crew administration, and process improvement.",
    },
  ],
  serviceFunctions: [
    "Recruitment and candidate sourcing",
    "Screening, selection, and document verification",
    "Interview coordination and principal submission",
    "Pre-joining briefing and training coordination",
    "Employment administration and deployment follow-up",
    "Crew database and record maintenance",
  ],
  compliance: [
    "MLC 2006",
    "STCW 2010",
    "ISM Code",
    "ISO 9001:2015 aligned quality management",
  ],
  workflow: [
    {
      step: "Recruitment",
      description:
        "Collect applications, build candidate pools, and match seafarer experience with vessel and principal requirements.",
    },
    {
      step: "Selection",
      description:
        "Verify certificates, sea service, medical readiness, references, and suitability before client submission.",
    },
    {
      step: "Training & Briefing",
      description:
        "Coordinate familiarization, standards briefing, and training requirements to prepare crew for assignment.",
    },
    {
      step: "Employment",
      description:
        "Complete documentation, assignment confirmation, and deployment administration in line with client and regulatory requirements.",
    },
    {
      step: "Monitoring",
      description:
        "Track readiness, crew changes, and supporting records to maintain continuity during the service period.",
    },
  ],
  statistics: [
    { label: "Core Service Lines", value: "3" },
    { label: "Workflow Stages", value: "5" },
    { label: "Standards Referenced", value: "4" },
  ],
} as const;

export const portalRoles = [
  { key: "crew", label: "Crew Login", href: "/auth/signin?role=crew" },
  { key: "staff", label: "Staff Login", href: "/auth/signin?role=staff" },
  { key: "principal", label: "Principal Login", href: "/auth/signin?role=principal" },
  { key: "auditor", label: "Auditor Login", href: "/auth/signin?role=auditor" },
] as const;
