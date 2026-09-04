export default {
  switcher: {
    title: "Language",
    homeOf: ({ language }: { language: string }) => `${language} (home page)`,
    unavailable: ({ language }: { language: string }) => `Not available in ${language}`,
  },
  notice: {
    missing: ({ languages }: { languages: string }) =>
      `This page is only available in ${languages}.`,
    available: ({ language }: { language: string }) =>
      `This page is also available in ${language}.`,
  },
  redirect: {
    title: "Redirecting…",
    text: ({ language }: { language: string }) => `Continue in ${language}`,
  },
};
