"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ProfileModal from "@/components/profile/ProfileModal";
import { getCvDownloadUrl } from "../actions";
import type { KandidaatProfile } from "../actions";

interface Props {
  profile: KandidaatProfile;
  profileComplete: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function ProfilePageClient({ profile, profileComplete }: Props) {
  const [editing, setEditing] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      {/* Header */}
      <motion.div custom={0.1} variants={fadeInUp} initial="hidden" animate="visible" className="text-center">
        <h1 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
          {t("profile_title")} <span className="gradient-text-warm">{t("profile_title_accent")}</span>
        </h1>
        <p className="mt-2 text-muted">
          {t("profile_subtitle")}
        </p>
      </motion.div>

      {/* Incomplete banner */}
      {!profileComplete && (
        <motion.div custom={0.2} variants={fadeInUp} initial="hidden" animate="visible">
          <button
            onClick={() => setEditing(true)}
            className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-coral/30 bg-coral/5 p-5 text-left transition-all hover:bg-coral/10"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral/10">
              <svg className="h-5 w-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-heading">{t("profile_incomplete")}</p>
              <p className="text-xs text-muted">{t("profile_incomplete_desc")}</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Profile card */}
      <motion.div custom={0.3} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-heading">{t("profile_personal_info")}</h2>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-smaragd/10 px-4 py-2 text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {t("dash_edit")}
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label={t("profile_first_name")} value={profile.voornaam} />
            <Field label={t("profile_last_name")} value={profile.achternaam} />
            <Field label={t("profile_email")} value={profile.email} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            } />
            <Field label={t("profile_phone")} value={profile.telefoon} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            } />
            <Field label={t("dash_linkedin")} value={profile.linkedin_url} isLink icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            } />
            <Field
              label={t("dash_availability")}
              value={
                profile.beschikbaarheid === true ? t("dash_available") :
                profile.beschikbaarheid === false ? t("dash_not_available") : null
              }
              badge={profile.beschikbaarheid === true ? "success" : profile.beschikbaarheid === false ? "muted" : undefined}
            />
            <Field label={t("profile_notice_period")} value={profile.opzegtermijn} />
            <Field
              label={t("profile_salary")}
              value={profile.salarisindicatie ? `EUR ${profile.salarisindicatie.toLocaleString("nl-NL")}` : null}
            />
            <Field
              label={t("profile_hourly_rate")}
              value={profile.uurtarief ? `EUR ${profile.uurtarief}/uur` : null}
            />
          </div>
        </div>
      </motion.div>

      {/* Skills */}
      <motion.div custom={0.45} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="glass mt-5 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-heading">{t("profile_skills_title")}</h2>
            <span className="text-xs text-muted">{profile.vaardigheden.length} skills</span>
          </div>
          {profile.vaardigheden.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.vaardigheden.map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.03 }}
                  className="rounded-full bg-smaragd/10 px-3.5 py-1.5 text-sm font-medium text-smaragd"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10">
                <svg className="h-6 w-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-heading">{t("profile_no_skills")}</p>
                <p className="mt-1 text-xs text-muted">{t("profile_no_skills_desc")}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl bg-smaragd px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark hover:shadow-[0_0_20px_rgba(46,213,115,0.3)]"
              >
                {t("profile_add_skills")}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* CV */}
      <motion.div custom={0.55} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="glass mt-5 rounded-2xl p-6 sm:p-8">
          <h2 className="font-heading text-lg font-bold text-heading">{t("dash_cv")}</h2>
          {profile.cv_url ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-smaragd/10">
                <svg className="h-5 w-5 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-heading">{t("profile_cv_uploaded")}</p>
                <p className="text-xs text-muted">{profile.cv_url.split("/").pop()}</p>
              </div>
              <button
                onClick={async () => {
                  const result = await getCvDownloadUrl();
                  if (result.success) {
                    window.open(result.url, "_blank");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-smaragd/10 px-4 py-2 text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t("profile_download")}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral/10">
                <svg className="h-5 w-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-heading">{t("profile_no_cv")}</p>
                <p className="text-xs text-muted">{t("profile_no_cv_desc")}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-smaragd/10 px-4 py-2 text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
              >
                {t("profile_upload")}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <ProfileModal
        profile={profile}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </>
  );
}

function Field({
  label,
  value,
  icon,
  isLink,
  badge,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  isLink?: boolean;
  badge?: "success" | "muted";
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-light text-muted">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        {value ? (
          badge ? (
            <span className={`mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium ${
              badge === "success" ? "text-smaragd" : "text-muted"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge === "success" ? "bg-smaragd" : "bg-muted"}`} />
              {value}
            </span>
          ) : isLink ? (
            <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-sm text-smaragd hover:underline">
              {value}
            </a>
          ) : (
            <p className="mt-0.5 text-sm text-heading">{value}</p>
          )
        ) : (
          <p className="mt-0.5 text-sm text-muted/50">—</p>
        )}
      </div>
    </div>
  );
}
