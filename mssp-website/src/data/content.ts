/**
 * All marketing copy and structured content for the site.
 *
 * NOTE: the brand, metrics, locations, certifications, and contact details are
 * illustrative placeholders — replace them with your organisation's real data.
 */
import type { AssetCategory, SocModuleId } from '../lib/store'

export const brand = {
  name: 'Aetherguard',
  legalName: 'Aetherguard Security, Inc.',
  tagline: 'Managed Security Services',
}

export const navLinks = [
  { label: 'Attack Surface', href: '#attack-surface', station: 1 },
  { label: 'AI Detection', href: '#detection', station: 2 },
  { label: 'SOC', href: '#soc', station: 3 },
  { label: 'Threat Hunting', href: '#threat-hunting', station: 4 },
  { label: 'Services', href: '#services', station: 5 },
  { label: 'Results', href: '#results', station: 6 },
]

/** Labels for the scroll HUD, one per 3D station. */
export const stationLabels = [
  'Command',
  'Attack Surface',
  'AI Detection',
  'SOC Operations',
  'Threat Hunting',
  'Service Catalog',
  'Customer Success',
  'Engage',
]

export const hero = {
  eyebrow: 'Managed Detection & Response · Global SOC',
  headline: [
    { text: 'Continuous Protection.', tone: 'plain' },
    { text: 'Intelligent Detection.', tone: 'cyan' },
    { text: 'Rapid Response.', tone: 'violet' },
  ] as const,
  subheadline: '24/7 Managed SOC, MDR, Threat Hunting, and Incident Response Services.',
  supporting:
    'Elite analysts and an AI-driven detection fabric watching every endpoint, identity, and cloud workload — so your team can build while we defend.',
  quickStats: [
    { value: '< 5 min', label: 'Mean time to detect' },
    { value: '1,200+', label: 'Organisations protected' },
    { value: '24/7/365', label: 'Follow-the-sun SOC' },
  ],
  industries: ['Financial Services', 'Healthcare', 'Energy & Utilities', 'Public Sector', 'Retail', 'Manufacturing', 'Technology', 'Logistics'],
}

/** Uses RFC 5737 documentation IP ranges — never real hosts. */
export const liveFeed = [
  { verdict: 'Blocked', tactic: 'Credential stuffing', source: '203.0.113.42', region: 'EU-West' },
  { verdict: 'Contained', tactic: 'Ransomware precursor', source: 'FIN-LT-0421', region: 'US-East' },
  { verdict: 'Blocked', tactic: 'C2 beacon', source: '198.51.100.7', region: 'AP-South' },
  { verdict: 'Investigating', tactic: 'Impossible travel', source: 'svc-backup', region: 'US-West' },
  { verdict: 'Blocked', tactic: 'Malicious OAuth grant', source: 'M365 tenant', region: 'EU-Central' },
  { verdict: 'Contained', tactic: 'Lateral movement (SMB)', source: 'SRV-DB-07', region: 'AP-East' },
  { verdict: 'Blocked', tactic: 'Phishing payload', source: '192.0.2.188', region: 'SA-East' },
]

export interface AssetCategoryInfo {
  id: AssetCategory
  label: string
  count: string
  description: string
  color: string
}

export const assetCategories: AssetCategoryInfo[] = [
  { id: 'endpoint', label: 'Endpoints', count: '38,400', description: 'Laptops, desktops & mobile devices under continuous EDR telemetry.', color: '#22e3ff' },
  { id: 'cloud', label: 'Cloud Workloads', count: '12,900', description: 'Containers, VMs & serverless across multi-cloud with runtime protection.', color: '#4d8dff' },
  { id: 'server', label: 'Servers', count: '4,150', description: 'On-prem, hybrid & OT gateways hardened and monitored around the clock.', color: '#9b5cff' },
  { id: 'saas', label: 'SaaS Applications', count: '210+', description: 'Email, collaboration & CRM platforms with posture and activity monitoring.', color: '#e879f9' },
  { id: 'user', label: 'Users & Identities', count: '52,000', description: 'Identity threat detection across IdP, directory & privileged accounts.', color: '#34d399' },
]

export const detection = {
  pipeline: ['Ingest', 'Normalize', 'Enrich', 'Correlate', 'Detect', 'Triage'],
  counters: [
    { value: 10, suffix: 'B+', label: 'Events Analyzed', sub: 'Security signals processed every day' },
    { value: 24, suffix: '/7', label: 'Monitoring', sub: 'Human-led, machine-accelerated coverage' },
    { value: 99.9, suffix: '%', decimals: 1, label: 'Coverage', sub: 'Monitored assets with healthy telemetry' },
  ],
}

export interface SocModule {
  id: SocModuleId
  short: string
  name: string
  description: string
  capabilities: string[]
  kpis: { value: string; label: string }[]
  log: string[]
  color: string
}

export const socModules: SocModule[] = [
  {
    id: 'siem',
    short: 'SIEM',
    name: 'Security Information & Event Management',
    description:
      'Centralise and correlate logs from every source with detection-as-code, long-term hot retention, and compliance-ready reporting.',
    capabilities: ['400+ native log integrations', 'Detection-as-code with version control', '13-month searchable retention'],
    kpis: [
      { value: '2.4M', label: 'Events / sec peak' },
      { value: '1,850', label: 'Active detections' },
    ],
    log: [
      'corr-rule 4412 matched · impossible travel · user a.khan',
      'ingest ok · firewall-edge-02 · 18,402 eps',
      'enrich · geo+asn · 203.0.113.42 → hosting provider',
      'detection · suspicious PowerShell encoded command',
      'case #88213 opened · severity HIGH · pod EMEA-2',
    ],
    color: '#22e3ff',
  },
  {
    id: 'xdr',
    short: 'XDR',
    name: 'Extended Detection & Response',
    description:
      'Unify endpoint, identity, email, and cloud telemetry into a single incident story — with one-click response across every control plane.',
    capabilities: ['Cross-domain incident correlation', 'Native EDR, ITDR & cloud sensors', 'Unified response actions'],
    kpis: [
      { value: '97%', label: 'Alert noise reduced' },
      { value: '6', label: 'Telemetry domains' },
    ],
    log: [
      'incident stitched · 14 alerts → 1 story',
      'endpoint FIN-LT-0421 · process tree captured',
      'identity · MFA fatigue pattern · user r.ortiz',
      'email · malicious link clicked · quarantined 212 msgs',
      'cloud · anomalous IAM key usage · us-east-1',
    ],
    color: '#4d8dff',
  },
  {
    id: 'soar',
    short: 'SOAR',
    name: 'Security Orchestration, Automation & Response',
    description:
      'Battle-tested playbooks isolate hosts, revoke sessions, and block indicators in seconds — with analyst approval gates where it matters.',
    capabilities: ['300+ automated playbooks', 'Human-in-the-loop approvals', 'ITSM & chat-ops integrations'],
    kpis: [
      { value: '42s', label: 'Median containment' },
      { value: '81%', label: 'Tier-1 tasks automated' },
    ],
    log: [
      'playbook ransomware-contain · step 3/5 · isolate host',
      'action · revoke sessions · user j.meyer · ok',
      'action · block hash on 38,400 endpoints · ok',
      'ticket SEC-20931 synced · status contained',
      'approval requested · disable service account',
    ],
    color: '#9b5cff',
  },
  {
    id: 'ndr',
    short: 'NDR',
    name: 'Network Detection & Response',
    description:
      'Deep packet analytics expose C2 beacons, lateral movement, and data staging across north-south and east-west traffic.',
    capabilities: ['Encrypted traffic analytics', 'East-west lateral movement detection', 'Full PCAP on demand'],
    kpis: [
      { value: '120 Gbps', label: 'Inspected throughput' },
      { value: '< 1s', label: 'Beacon detection' },
    ],
    log: [
      'beacon · jitter 4.1% · 198.51.100.7:443',
      'lateral · SMB admin share · SRV-DB-07 → SRV-FS-02',
      'dns tunnel suspected · entropy 4.8 · 12k qpm',
      'tls · self-signed cert · rare JA4 fingerprint',
      'exfil watch · 2.3 GB staged · archive .7z',
    ],
    color: '#e879f9',
  },
  {
    id: 'ti',
    short: 'Threat Intel',
    name: 'Threat Intelligence',
    description:
      'Curated intelligence from our global telemetry, dark-web monitoring, and industry sharing communities enriches every alert in real time.',
    capabilities: ['Adversary & campaign tracking', 'Dark-web & leak monitoring', 'Industry-specific threat briefings'],
    kpis: [
      { value: '3.1M', label: 'IOCs curated daily' },
      { value: '240+', label: 'Threat actors tracked' },
    ],
    log: [
      'ioc · sha256 9f2c…e41a · loader family · HIGH',
      'actor profile updated · financially motivated cluster',
      'leak monitor · 3 credentials exposed · rotated',
      'campaign · invoice-themed phishing · finance sector',
      'feed sync · 41,288 new indicators · deduped',
    ],
    color: '#34d399',
  },
]

export interface ChainStage {
  id: string
  title: string
  tactic: string
  time: string
  narrative: string
  hunt: string
  signal: string
}

export const attackChain: ChainStage[] = [
  {
    id: 'initial-access',
    title: 'Initial Access',
    tactic: 'TA0001',
    time: 'T+00:00',
    narrative: 'A weaponised invoice lands in finance. A macro spawns a hidden PowerShell loader.',
    hunt: 'Office applications spawning script interpreters with encoded arguments.',
    signal: 'EDR process lineage · email telemetry',
  },
  {
    id: 'lateral-movement',
    title: 'Lateral Movement',
    tactic: 'TA0008',
    time: 'T+00:04',
    narrative: 'The adversary pivots over RDP and SMB using harvested credentials.',
    hunt: 'Rare host-to-host authentication edges and first-seen admin share access.',
    signal: 'Identity graph · NDR east-west flows',
  },
  {
    id: 'privilege-escalation',
    title: 'Privilege Escalation',
    tactic: 'TA0004',
    time: 'T+00:07',
    narrative: 'Token manipulation targets a domain admin account to seize control.',
    hunt: 'Kerberos ticket anomalies and suspicious access to credential stores.',
    signal: 'Directory audit logs · EDR memory events',
  },
  {
    id: 'exfiltration',
    title: 'Exfiltration',
    tactic: 'TA0010',
    time: 'T+00:09',
    narrative: 'Sensitive data is archived and beaconed out over encrypted channels.',
    hunt: 'Low-and-slow outbound volume outliers and rare TLS fingerprints.',
    signal: 'NDR metadata · proxy & DNS logs',
  },
  {
    id: 'response',
    title: 'Response',
    tactic: 'CONTAIN',
    time: 'T+00:11',
    narrative: 'Host isolated, credentials revoked, C2 blocked — contained in eleven minutes.',
    hunt: 'Automated playbooks with analyst approval, followed by eradication and root-cause review.',
    signal: 'SOAR playbooks · IR retainer team',
  },
]

export interface Service {
  id: string
  title: string
  kicker: string
  description: string
  features: string[]
  icon: 'radar' | 'shield' | 'layers' | 'scan' | 'siren' | 'crosshair'
  badge?: string
  accent: string
}

export const services: Service[] = [
  {
    id: 'soc',
    title: 'Managed SOC',
    kicker: 'Security Operations Center as a Service',
    description: 'A dedicated pod of analysts monitoring, triaging, and escalating around the clock — embedded in your workflows.',
    features: ['24/7/365 eyes-on-glass', 'Custom detection engineering', 'Executive & compliance reporting'],
    icon: 'radar',
    accent: '#22e3ff',
  },
  {
    id: 'mdr',
    title: 'MDR',
    kicker: 'Managed Detection & Response',
    description: 'Detect, investigate, and actively respond to threats across endpoints, identity, and cloud before they become breaches.',
    features: ['Active threat containment', '15-minute response SLA', 'Root-cause analysis'],
    icon: 'shield',
    badge: 'Most popular',
    accent: '#4d8dff',
  },
  {
    id: 'xdr',
    title: 'XDR',
    kicker: 'Extended Detection & Response',
    description: 'Correlated protection across every control plane, operated by experts on a single unified console.',
    features: ['Cross-domain correlation', 'Bring-your-own or native sensors', 'Unified response actions'],
    icon: 'layers',
    accent: '#7a6bff',
  },
  {
    id: 'vm',
    title: 'Vulnerability Management',
    kicker: 'Continuous Exposure Management',
    description: 'Continuous discovery and risk-based prioritisation, with remediation tracked through to verified closure.',
    features: ['Risk-based prioritisation', 'Patch orchestration', 'Exposure trend dashboards'],
    icon: 'scan',
    accent: '#9b5cff',
  },
  {
    id: 'ir',
    title: 'Incident Response',
    kicker: 'Retainer-Backed IR',
    description: 'Responders engaged within the hour to contain, eradicate, and recover — with forensics your regulators trust.',
    features: ['1-hour remote engagement', 'Digital forensics & recovery', 'Breach & crisis coaching'],
    icon: 'siren',
    accent: '#e879f9',
  },
  {
    id: 'pentest',
    title: 'Continuous Pentesting',
    kicker: 'Offensive Security',
    description: 'Always-on adversarial testing that validates controls against the real-world attack paths into your business.',
    features: ['Attack-path validation', 'Purple-team exercises', 'Free retest on every fix'],
    icon: 'crosshair',
    accent: '#ff5c8a',
  },
]

export const metrics = {
  primary: [
    { value: '1,200+', label: 'Clients Protected', sub: 'Across 38 countries and 14 industries', color: '#22e3ff' },
    { value: '86K+', label: 'Incidents Investigated', sub: 'Every year, each with a documented verdict', color: '#4d8dff' },
    { value: '4.7B+', label: 'Threats Blocked', sub: 'Malicious events stopped in the last 12 months', color: '#9b5cff' },
  ],
  secondary: [
    { value: '< 5 min', label: 'Mean time to detect' },
    { value: '< 30 min', label: 'Mean time to respond' },
    { value: '98%', label: 'Customer retention' },
    { value: '450+', label: 'Security analysts' },
  ],
  testimonial: {
    quote:
      'Within the first quarter their SOC cut our alert backlog to zero and contained a live intrusion before it touched production. It feels like our own team — just bigger and never asleep.',
    author: 'Chief Information Security Officer',
    company: 'Global financial services firm',
  },
}

export const socLocations = [
  { city: 'Dallas', lat: 32.8, lon: -96.8 },
  { city: 'Toronto', lat: 43.7, lon: -79.4 },
  { city: 'São Paulo', lat: -23.5, lon: -46.6 },
  { city: 'London', lat: 51.5, lon: -0.1 },
  { city: 'Frankfurt', lat: 50.1, lon: 8.7 },
  { city: 'Dubai', lat: 25.2, lon: 55.3 },
  { city: 'Singapore', lat: 1.35, lon: 103.8 },
  { city: 'Tokyo', lat: 35.7, lon: 139.7 },
  { city: 'Sydney', lat: -33.9, lon: 151.2 },
]

export const contact = {
  address: ['100 Placeholder Avenue, Suite 400', 'Austin, TX 78701, USA'],
  phone: '+1 (555) 010-2400',
  hotline: '+1 (555) 010-9111',
  email: 'hello@aetherguard.example',
  socEmail: 'soc@aetherguard.example',
}

export const socials = [
  { id: 'linkedin', label: 'LinkedIn', href: '#' },
  { id: 'x', label: 'X', href: '#' },
  { id: 'github', label: 'GitHub', href: '#' },
  { id: 'youtube', label: 'YouTube', href: '#' },
] as const

export const certifications = [
  { name: 'SOC 2', detail: 'Type II' },
  { name: 'ISO/IEC', detail: '27001' },
  { name: 'PCI DSS', detail: 'v4.0' },
  { name: 'HIPAA', detail: 'Compliant' },
  { name: 'CREST', detail: 'Accredited' },
  { name: 'GDPR', detail: 'Ready' },
]

export const footerColumns = [
  { title: 'Services', links: ['Managed SOC', 'MDR', 'XDR', 'Vulnerability Management', 'Incident Response', 'Continuous Pentesting'] },
  { title: 'Company', links: ['About', 'Careers', 'Partners', 'Newsroom'] },
  { title: 'Resources', links: ['Threat Reports', 'Blog', 'Trust Center', 'Service Status'] },
]
