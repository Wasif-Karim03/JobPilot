import { type ResumeFormData } from "@/components/resume/structured-form";

interface ResumePreviewProps {
  data: ResumeFormData;
  title?: string;
}

function formatDate(d: string) {
  if (!d) return "";
  if (d.toLowerCase() === "present") return "Present";
  const [y, m] = d.split("-");
  if (!m) return y;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function ResumePreview({ data, title }: ResumePreviewProps) {
  const { contactInfo, summary, skills, experience, education, projects, certifications } = data;

  const hasSkills = Object.values(skills).some(Boolean);
  const hasExperience = experience.some((e) => e.company || e.title);
  const hasEducation = education.some((e) => e.school);
  const hasProjects = projects.some((p) => p.name);
  const hasCerts = certifications.some((c) => c.name);

  return (
    <div className="bg-white text-black text-[11px] leading-relaxed p-8 min-h-full font-serif">
      {/* Header */}
      <div className="text-center mb-4 pb-3 border-b border-black">
        {contactInfo.name && (
          <h1 className="text-2xl font-bold tracking-wide uppercase mb-1">{contactInfo.name}</h1>
        )}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
          {contactInfo.email && <span>{contactInfo.email}</span>}
          {contactInfo.phone && <span>• {contactInfo.phone}</span>}
          {contactInfo.location && <span>• {contactInfo.location}</span>}
          {contactInfo.linkedin && <span>• {contactInfo.linkedin}</span>}
          {contactInfo.github && <span>• {contactInfo.github}</span>}
          {contactInfo.website && <span>• {contactInfo.website}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Summary
          </h2>
          <p className="text-[11px] leading-snug">{summary}</p>
        </div>
      )}

      {/* Skills */}
      {hasSkills && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Skills
          </h2>
          <div className="space-y-0.5">
            {skills.technical && (
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">Languages:</span>
                <span>{skills.technical}</span>
              </div>
            )}
            {skills.frameworks && (
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">Frameworks:</span>
                <span>{skills.frameworks}</span>
              </div>
            )}
            {skills.tools && (
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">Tools:</span>
                <span>{skills.tools}</span>
              </div>
            )}
            {skills.languages && (
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">Spoken:</span>
                <span>{skills.languages}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {hasExperience && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Work Experience
          </h2>
          <div className="space-y-2">
            {experience
              .filter((e) => e.company || e.title)
              .map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{exp.title}</span>
                    <span className="text-[10px] text-gray-600">
                      {formatDate(exp.startDate)}
                      {exp.startDate && " – "}
                      {exp.endDate ? formatDate(exp.endDate) : exp.startDate ? "Present" : ""}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="italic">{exp.company}</span>
                    {exp.location && (
                      <span className="text-[10px] text-gray-600">{exp.location}</span>
                    )}
                  </div>
                  {exp.bullets.filter(Boolean).length > 0 && (
                    <ul className="mt-0.5 ml-3 space-y-0.5 list-disc">
                      {exp.bullets.filter(Boolean).map((b, bi) => (
                        <li key={bi} className="text-[11px]">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Education */}
      {hasEducation && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Education
          </h2>
          <div className="space-y-1.5">
            {education
              .filter((e) => e.school)
              .map((edu, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{edu.school}</span>
                    <span className="text-[10px] text-gray-600">
                      {formatDate(edu.startDate)}
                      {edu.startDate && edu.endDate && " – "}
                      {formatDate(edu.endDate)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="italic">
                      {edu.degree}
                      {edu.field && `, ${edu.field}`}
                    </span>
                    {edu.gpa && <span className="text-[10px]">GPA: {edu.gpa}</span>}
                  </div>
                  {edu.honors && <p className="text-[10px] text-gray-600">{edu.honors}</p>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {hasProjects && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Projects
          </h2>
          <div className="space-y-1.5">
            {projects
              .filter((p) => p.name)
              .map((proj, i) => (
                <div key={i}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{proj.name}</span>
                    {proj.tech && (
                      <span className="text-[10px] text-gray-600">| {proj.tech}</span>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-[11px] mt-0.5">{proj.description}</p>
                  )}
                  {proj.bullets.filter(Boolean).length > 0 && (
                    <ul className="mt-0.5 ml-3 space-y-0.5 list-disc">
                      {proj.bullets.filter(Boolean).map((b, bi) => (
                        <li key={bi} className="text-[11px]">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {hasCerts && (
        <div className="mb-3">
          <h2 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-0.5 mb-1">
            Certifications
          </h2>
          <div className="space-y-0.5">
            {certifications
              .filter((c) => c.name)
              .map((cert, i) => (
                <div key={i} className="flex items-baseline justify-between">
                  <span>{cert.name}</span>
                  <span className="text-[10px] text-gray-600">
                    {cert.issuer}
                    {cert.date && ` • ${formatDate(cert.date)}`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
