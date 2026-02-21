import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Video } from "lucide-react";

const Privacy = () => {
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
        <h1>{t("privacy.title")}</h1>
        <p className="text-muted-foreground">{t("privacy.lastUpdated")} {new Date().toLocaleDateString()}</p>

        <h2>{t("privacy.infoCollect")}</h2>
        <p>{t("privacy.infoCollectText")}</p>

        <h2>{t("privacy.howWeUse")}</h2>
        <ul>
          {(t("privacy.howWeUseList", { returnObjects: true }) as string[]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2>{t("privacy.videoStreamData")}</h2>
        <p>{t("privacy.videoStreamDataText")}</p>

        <h2>{t("privacy.paymentInfo")}</h2>
        <p>{t("privacy.paymentInfoText")}</p>

        <h2>{t("privacy.dataSharing")}</h2>
        <p>{t("privacy.dataSharingText")}</p>

        <h2>{t("privacy.dataSecurity")}</h2>
        <p>{t("privacy.dataSecurityText")}</p>

        <h2>{t("privacy.yourRights")}</h2>
        <p>{t("privacy.yourRightsText")} <strong>{t("privacy.yourRightsEmail")}</strong> {t("privacy.yourRightsSuffix")}</p>

        <h2>{t("privacy.cookies")}</h2>
        <p>{t("privacy.cookiesText")}</p>

        <h2>{t("privacy.childrensPrivacy")}</h2>
        <p>{t("privacy.childrensPrivacyText")}</p>

        <h2>{t("privacy.changes")}</h2>
        <p>{t("privacy.changesText")}</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        {t("common.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default Privacy;
