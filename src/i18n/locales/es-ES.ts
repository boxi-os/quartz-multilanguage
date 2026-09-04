import type { Translation } from "../index";

const esES: Translation = {
  switcher: {
    title: "Idioma",
    homeOf: ({ language }) => `${language} (página de inicio)`,
    unavailable: ({ language }) => `No disponible en ${language}`,
  },
  notice: {
    missing: ({ languages }) => `Esta página solo está disponible en ${languages}.`,
    available: ({ language }) => `Esta página también está disponible en ${language}:`,
  },
  redirect: {
    title: "Redirigiendo…",
    text: ({ language }) => `Continuar en ${language}`,
  },
};

export default esES;
