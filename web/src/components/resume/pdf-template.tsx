import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { type ResumeFormData } from "@/components/resume/structured-form";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 48,
    color: "#111",
    lineHeight: 1.4,
  },
  // Header
  header: { textAlign: "center", marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#111" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" },
  contactLine: { fontSize: 8.5, color: "#444", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  contactSep: { color: "#888" },
  // Section
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5, borderBottomWidth: 0.5, borderBottomColor: "#111", paddingBottom: 2, marginBottom: 5 },
  // Entry
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  entryCompany: { fontFamily: "Helvetica-Oblique", fontSize: 10 },
  entryDate: { fontSize: 8.5, color: "#666" },
  bullet: { flexDirection: "row", marginTop: 1.5, paddingLeft: 8 },
  bulletDot: { width: 10, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  // Skills
  skillRow: { flexDirection: "row", marginBottom: 2 },
  skillLabel: { fontFamily: "Helvetica-Bold", width: 90, fontSize: 9.5 },
  skillValue: { flex: 1, fontSize: 9.5 },
  // Summary
  summaryText: { fontSize: 9.5, lineHeight: 1.5 },
});

function formatDate(d: string) {
  if (!d) return "";
  if (d.toLowerCase() === "present") return "Present";
  const [y, m] = d.split("-");
  if (!m) return y;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

interface PdfTemplateProps {
  data: ResumeFormData;
  resumeTitle?: string;
}

export function PdfTemplate({ data, resumeTitle }: PdfTemplateProps) {
  const { contactInfo, summary, skills, experience, education, projects, certifications } = data;

  const contactItems = [
    contactInfo.email,
    contactInfo.phone,
    contactInfo.location,
    contactInfo.linkedin,
    contactInfo.github,
  ].filter(Boolean);

  return (
    <Document title={resumeTitle ?? contactInfo.name ?? "Resume"}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {contactInfo.name && <Text style={styles.name}>{contactInfo.name}</Text>}
          <View style={styles.contactLine}>
            {contactItems.map((item, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: "#444" }}>
                {i > 0 ? "  •  " : ""}{item}
              </Text>
            ))}
          </View>
        </View>

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Skills */}
        {Object.values(skills).some(Boolean) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {skills.technical && (
              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>Languages:</Text>
                <Text style={styles.skillValue}>{skills.technical}</Text>
              </View>
            )}
            {skills.frameworks && (
              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>Frameworks:</Text>
                <Text style={styles.skillValue}>{skills.frameworks}</Text>
              </View>
            )}
            {skills.tools && (
              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>Tools:</Text>
                <Text style={styles.skillValue}>{skills.tools}</Text>
              </View>
            )}
            {skills.languages && (
              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>Languages (spoken):</Text>
                <Text style={styles.skillValue}>{skills.languages}</Text>
              </View>
            )}
          </View>
        )}

        {/* Experience */}
        {experience.some((e) => e.company || e.title) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {experience.filter((e) => e.company || e.title).map((exp, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{exp.title}</Text>
                  <Text style={styles.entryDate}>
                    {formatDate(exp.startDate)}{exp.startDate ? " – " : ""}
                    {exp.endDate ? formatDate(exp.endDate) : exp.startDate ? "Present" : ""}
                  </Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entryCompany}>{exp.company}</Text>
                  {exp.location && <Text style={styles.entryDate}>{exp.location}</Text>}
                </View>
                {exp.bullets.filter(Boolean).map((b, bi) => (
                  <View key={bi} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education.some((e) => e.school) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.filter((e) => e.school).map((edu, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{edu.school}</Text>
                  <Text style={styles.entryDate}>
                    {formatDate(edu.startDate)}{edu.startDate && edu.endDate ? " – " : ""}{formatDate(edu.endDate)}
                  </Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entryCompany}>
                    {edu.degree}{edu.field ? `, ${edu.field}` : ""}
                  </Text>
                  {edu.gpa && <Text style={styles.entryDate}>GPA: {edu.gpa}</Text>}
                </View>
                {edu.honors && <Text style={{ fontSize: 9, color: "#555", marginTop: 1 }}>{edu.honors}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects.some((p) => p.name) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.filter((p) => p.name).map((proj, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{proj.name}{proj.tech ? ` — ${proj.tech}` : ""}</Text>
                  {proj.url && <Text style={styles.entryDate}>{proj.url}</Text>}
                </View>
                {proj.description && <Text style={{ fontSize: 9.5, marginTop: 1 }}>{proj.description}</Text>}
                {proj.bullets.filter(Boolean).map((b, bi) => (
                  <View key={bi} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications.some((c) => c.name) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.filter((c) => c.name).map((cert, i) => (
              <View key={i} style={[styles.entryRow, { marginBottom: 2 }]}>
                <Text style={{ fontSize: 9.5 }}>{cert.name}</Text>
                <Text style={styles.entryDate}>
                  {cert.issuer}{cert.date ? ` • ${formatDate(cert.date)}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
