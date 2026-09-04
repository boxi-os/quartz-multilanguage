import type { Translation } from "../index";

const frFR: Translation = {
  switcher: {
    title: "Langue",
    homeOf: ({ language }) => `${language} (page d’accueil)`,
    unavailable: ({ language }) => `Non disponible en ${language}`,
  },
  notice: {
    missing: ({ languages }) => `Cette page n’est disponible qu’en ${languages}.`,
    available: ({ language }) => `Cette page est aussi disponible en ${language}.`,
  },
  redirect: {
    title: "Redirection…",
    text: ({ language }) => `Continuer en ${language}`,
  },
};

export default frFR;
