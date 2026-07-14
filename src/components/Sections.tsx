import {
  ABOUT,
  CONTACT_HEADING,
  CONTACT_LINKS,
  type ContactIcon,
  HERO,
  JOBS,
  PROJECTS,
  PROJECTS_HEADING,
  SECTIONS,
  SKILLS,
  SKILLS_HEADING,
} from "../content.ts";

interface Props {
  /** Register each section's <div class="frame"> for measuring + positioning. */
  setFrameEl: (id: string, el: HTMLDivElement | null) => void;
  setSectionEl: (id: string, el: HTMLElement | null) => void;
}

const meta = (id: string) => SECTIONS.find((s) => s.id === id)!;

function Eyebrow({ id }: { id: string }) {
  const m = meta(id);
  return (
    <p className="eyebrow">
      SECTION {m.no} / <b>{m.label}</b>
    </p>
  );
}

export default function Sections({ setFrameEl, setSectionEl }: Props) {
  const frame = (id: string, className: string, children: React.ReactNode) => (
    <section
      id={id}
      className={`section ${className}`}
      ref={(el) => setSectionEl(id, el)}
    >
      <div className="frame" ref={(el) => setFrameEl(id, el)}>
        <div className="frame-content">
          <Eyebrow id={id} />
          {children}
        </div>
      </div>
    </section>
  );

  return (
    <main>
      {frame("index", "hero", (
        <>
          <h1 className="h-display">{HERO.name}</h1>
          <p className="role">{HERO.role}</p>
          <p className="bio">{HERO.bio}</p>
          <div className="meta">
            <div>
              <b>Location</b>
              <span>{HERO.location}</span>
            </div>
            <div>
              <b>Status</b>
              <span>{HERO.status}</span>
            </div>
          </div>
        </>
      ))}

      {frame("about", "about", (
        <>
          <h2 className="h-display">{ABOUT.heading}</h2>
          {ABOUT.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </>
      ))}

      {frame("experience", "xp", (
        <div className="jobs">
          {JOBS.map((job, i) => (
            <div className="job" key={i}>
              <div className="company">{job.company}</div>
              <div className="dates">{job.dates}</div>
              <div className="title">{job.title}</div>
              <p className="blurb">{job.blurb}</p>
            </div>
          ))}
        </div>
      ))}

      {frame("projects", "projects", (
        <>
          <h2 className="h-display">{PROJECTS_HEADING}</h2>
          <div className="proj-grid">
            {PROJECTS.map((p) => (
              <article className="card" key={p.name}>
                <h3>{p.name}</h3>
                <a
                  className="link"
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.linkText} ↗
                </a>
                <p>{p.blurb}</p>
                <div className="tags">
                  {p.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ))}

      {frame("skills", "skills", (
        <>
          <h2 className="h-display">{SKILLS_HEADING}</h2>
          {SKILLS.map((g) => (
            <div className="skill-group" key={g.label}>
              <h4>{g.label}</h4>
              <div className="tags">
                {g.items.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      ))}

      {frame("contact", "contact", (
        <>
          <h2 className="h-display">{CONTACT_HEADING}</h2>
          <div className="contact-links">
            {CONTACT_LINKS.map((c) => (
              <a
                key={c.icon}
                className="contact-link"
                href={c.href}
                aria-label={c.label}
                title={c.label}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noreferrer" : undefined}
              >
                <ContactSvg icon={c.icon} />
              </a>
            ))}
          </div>
        </>
      ))}
    </main>
  );
}

/** Inline monochrome contact icons (currentColor); no external assets. */
function ContactSvg({ icon }: { icon: ContactIcon }) {
  if (icon === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <path d="M3 6.5l9 6 9-6" />
      </svg>
    );
  }
  if (icon === "github") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 22.29 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
