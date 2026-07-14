// All site copy, derived from the résumé + the approved section mockups.
// Sections render from this data; the engine reads only `frameWidth`.

export interface SectionMeta {
  id: string;
  /** Two-digit index shown in the eyebrow, e.g. "00". */
  no: string;
  /** Eyebrow label, e.g. "INDEX". */
  label: string;
  /** Per-section frame width as a fraction of grid columns (handoff §3). */
  frameWidth: number;
}

export interface Job {
  company: string;
  title: string;
  dates: string;
  blurb: string;
}

export interface Project {
  name: string;
  href: string;
  linkText: string;
  blurb: string;
  tags: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export type ContactIcon = "email" | "github" | "linkedin";

export interface ContactLink {
  /** Accessible label (icon has no visible text). */
  label: string;
  icon: ContactIcon;
  href: string;
  external?: boolean;
}

export const SECTIONS: SectionMeta[] = [
  { id: "index", no: "00", label: "INDEX", frameWidth: 0.6 },
  { id: "about", no: "01", label: "ABOUT", frameWidth: 0.62 },
  { id: "experience", no: "02", label: "EXPERIENCE", frameWidth: 0.82 },
  { id: "projects", no: "03", label: "PROJECTS", frameWidth: 0.8 },
  { id: "skills", no: "04", label: "SKILLS", frameWidth: 0.74 },
  { id: "contact", no: "05", label: "CONTACT", frameWidth: 0.62 },
];

export const HERO = {
  name: "Ryan Price",
  role: "Sr. Frontend Software Engineer",
  bio: "Ten years building conversion-critical, high-traffic web experiences in React, Next.js & TypeScript — most recently for an ecommerce platform serving ~1M daily users. Increasingly building end-to-end with agentic AI workflows.",
  location: "South Lake Tahoe, CA",
  status: "Open to work",
};

export const ABOUT = {
  heading: "Frontend engineer who ships.",
  paragraphs: [
    "I specialize in the surfaces where performance meets revenue — product pages, listing grids, checkout funnels — and the A/B experimentation that proves what actually works. I care about accessibility, internationalization, and web-vitals as first-class features, not afterthoughts.",
    "Lately I’ve been going deep on agentic coding: shipping real products (see Musicopia) end-to-end with Claude Code. I like reusable systems, tight feedback loops, and interfaces that feel alive.",
  ],
};

export const JOBS: Job[] = [
  {
    company: "FIGS",
    title: "Sr. Software Engineer, Frontend",
    dates: "Jul 2025 — Feb 2026",
    blurb:
      "Conversion-critical features & A/B tests on a React/Next.js ecommerce platform (~1M DAU). PDP/PLP focus, i18n + a11y storefronts, Contentful & Shopify integration, LaunchDarkly experimentation.",
  },
  {
    company: "Intuit",
    title: "Sr. Full Stack Developer III (Contract)",
    dates: "Feb 2024 — Aug 2024",
    blurb:
      "React libraries & micro front-ends for TurboTax marketing surfaces. Migrated tests Enzyme → RTL to 90%+ coverage under strict CI/CD.",
  },
  {
    company: "Savage X Fenty",
    title: "Sr. Software Engineer",
    dates: "Sep 2021 — May 2023",
    blurb:
      "Reusable, scalable React components for high-profile brands. Led the Savage X Sport front-end launch. Appointed to React Oversight & TypeScript committees.",
  },
  {
    company: "Billups",
    title: "Sr. Engineer → Front-End Team Lead",
    dates: "Nov 2018 — Aug 2021",
    blurb:
      "Mentored the team, revamped CI/CD on AWS/Kubernetes/Drone, shipped with TypeScript, Material UI & AG Grid, plus Go API endpoints.",
  },
  {
    company: "Womply",
    title: "Software Engineer III",
    dates: "Aug 2017 — Aug 2018",
    blurb:
      "Production UI in AngularJS at scale; pixel-perfect cross-browser work; shipped a cross-platform Ionic mobile app.",
  },
  {
    company: "Billups",
    title: "Software Engineer I → II",
    dates: "Apr 2016 — Aug 2017",
    blurb:
      "React/Redux features in a microservice architecture; built an internal React + Mapbox integration library.",
  },
];

export const PROJECTS_HEADING = "Things I’ve built.";

export const PROJECTS: Project[] = [
  {
    name: "Musicopia",
    href: "https://app.musicopia.xyz",
    linkText: "app.musicopia.xyz",
    blurb:
      "A Duolingo-style music-learning web app — ear training, sight reading, and mic-based pitch detection with AI-personalized lessons. Built end-to-end with Claude Code agentic workflows.",
    tags: ["SvelteKit 2", "Svelte 5", "TypeScript", "Drizzle", "Tone.js", "VexFlow", "Fly.io"],
  },
  {
    name: "Personal Portfolio",
    href: "https://github.com/aviato",
    linkText: "this, but for real",
    blurb:
      "Portfolio site built with Next.js & TailwindCSS, deployed on Vercel — the eventual home for the very grid mechanic you’re scrolling through right now.",
    tags: ["Next.js", "TailwindCSS", "Canvas", "Vercel"],
  },
];

export const SKILLS_HEADING = "Toolkit.";

export const SKILLS: SkillGroup[] = [
  {
    label: "CORE",
    items: [
      "JavaScript", "TypeScript", "React", "Next.js", "Svelte / SvelteKit",
      "Redux", "AngularJS", "HTML5", "CSS3", "TailwindCSS", "SASS",
    ],
  },
  {
    label: "BACKEND & INFRA",
    items: ["Node", "GraphQL", "REST", "MySQL", "MongoDB", "Python", "Go", "Elixir", "Docker", "AWS", "CI/CD"],
  },
  {
    label: "QUALITY & AI",
    items: [
      "Vitest", "RTL", "Mocha", "E2E / A/B", "Web Performance", "Storybook",
      "Figma", "Claude Code", "Agentic Workflows", "LLM API Integration",
    ],
  },
];

export const CONTACT_HEADING = "Let’s talk.";

export const CONTACT_LINKS: ContactLink[] = [
  { label: "Email hello@ryanprice.dev", icon: "email", href: "mailto:hello@ryanprice.dev" },
  { label: "GitHub — github.com/aviato", icon: "github", href: "https://github.com/aviato", external: true },
  { label: "LinkedIn — linkedin.com/in/rsprice", icon: "linkedin", href: "https://linkedin.com/in/rsprice", external: true },
];
