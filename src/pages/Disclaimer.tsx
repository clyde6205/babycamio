import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Video, AlertTriangle } from "lucide-react";

const Disclaimer = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Baby<span className="text-primary">Cam</span>.io
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 prose prose-sm dark:prose-invert">
        <div className="not-prose mb-6 flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            {t("disclaimer.importantBanner")}
          </p>
        </div>

        <h1>{t("disclaimer.title")}</h1>
        <p className="text-muted-foreground">{t("disclaimer.lastUpdated")} {new Date().toLocaleDateString()}</p>

        <h2>{t("disclaimer.notSubstitute")}</h2>
        <p><strong>{t("disclaimer.notSubstituteText")}</strong></p>

        <h2>{t("disclaimer.noMedical")}</h2>
        <p>{t("disclaimer.noMedicalText")}</p>

        <h2>{t("disclaimer.serviceAvailability")}</h2>
        <p>{t("disclaimer.serviceAvailabilityText")}</p>

        <h2>{t("disclaimer.thirdParty")}</h2>
        <p>{t("disclaimer.thirdPartyText")}</p>

        <h2>{t("disclaimer.userResponsibility")}</h2>
        <p>{t("disclaimer.userResponsibilityText")}</p>
        <ul>
          {(t("disclaimer.userResponsibilityList", { returnObjects: true }) as string[]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2>{t("disclaimer.limitationLiability")}</h2>
        <p>{t("disclaimer.limitationLiabilityText")}</p>

        <h2>{t("disclaimer.indemnification")}</h2>
        <p>{t("disclaimer.indemnificationText")}</p>

        <h2>{t("disclaimer.contact")}</h2>
        <p>{t("disclaimer.contactText")} <strong>legal@babycam.io</strong>.</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        {t("common.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default Disclaimer;
