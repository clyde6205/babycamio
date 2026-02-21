import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Video } from "lucide-react";

const Terms = () => {
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
        <h1>{t("terms.title")}</h1>
        <p className="text-muted-foreground">{t("terms.lastUpdated")} {new Date().toLocaleDateString()}</p>

        <h2>{t("terms.acceptance")}</h2>
        <p>{t("terms.acceptanceText")}</p>

        <h2>{t("terms.description")}</h2>
        <p>{t("terms.descriptionText")}</p>

        <h2>{t("terms.userAccounts")}</h2>
        <p>{t("terms.userAccountsText")}</p>

        <h2>{t("terms.privacyData")}</h2>
        <p>{t("terms.privacyDataText")} <button onClick={() => navigate("/privacy")} className="text-primary underline">{t("terms.privacyLink")}</button> {t("terms.privacyDataSuffix")}</p>

        <h2>{t("terms.acceptableUse")}</h2>
        <p>{t("terms.acceptableUseText")}</p>

        <h2>{t("terms.subscriptionPayments")}</h2>
        <p>{t("terms.subscriptionPaymentsText")}</p>

        <h2>{t("terms.disclaimerWarranties")}</h2>
        <p>{t("terms.disclaimerWarrantiesText")}</p>

        <h2>{t("terms.limitationLiability")}</h2>
        <p>{t("terms.limitationLiabilityText")}</p>

        <h2>{t("terms.changesToTerms")}</h2>
        <p>{t("terms.changesToTermsText")}</p>

        <h2>{t("terms.contact")}</h2>
        <p>{t("terms.contactText")} <strong>legal@babycam.io</strong>.</p>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        {t("common.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default Terms;
