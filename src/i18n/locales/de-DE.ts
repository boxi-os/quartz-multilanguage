import type { Translation } from "../index";

const deDE: Translation = {
  switcher: {
    title: "Sprache",
    homeOf: ({ language }) => `${language} (Startseite)`,
    unavailable: ({ language }) => `Nicht auf ${language} verfügbar`,
  },
  notice: {
    missing: ({ languages }) => `Diese Seite ist nur auf ${languages} verfügbar.`,
    available: ({ language }) => `Diese Seite gibt es auch auf ${language}.`,
  },
  redirect: {
    title: "Weiterleitung…",
    text: ({ language }) => `Weiter auf ${language}`,
  },
};

export default deDE;
