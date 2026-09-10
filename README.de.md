# quartz-multilanguage

Mehrsprachige Inhalte für [Quartz](https://quartz.jzhao.xyz) v5. Quartz kennt nur ein `locale` pro
Site; dieses Plugin ergänzt alles, was nötig ist, um dieselben Notizen aus einem Vault in mehreren
Sprachen zu veröffentlichen.

**📖 Das Handbuch steht auf [boxi-os.github.io/quartz-multilanguage](https://boxi-os.github.io/quartz-multilanguage/)** —
neun Kapitel auf Deutsch und Englisch, jede Option am Beispiel und die Gründe für die sperrigen
Stellen. Diese README ist die Kurzfassung.

- Spracherkennung je Seite über Sprachordner (`de/…`), Dateisuffix (`notiz.de.md`) oder ein
  Frontmatter-Feld, in beliebiger Reihenfolge kombinierbar
- Verknüpfung der Übersetzungen: explizit (`translationKey`, `translations`), über
  Obsidian-Aliases (kompatibel mit dem Obsidian-Plugin „Multilingual") oder implizit über gleiche
  Pfade
- Eine Sprachwechsler-Komponente: Textlinks, Dropdown oder Flaggen; Beschriftung als Code, Name,
  Eigenname oder übersetzter Seitentitel
- `<html lang>`, `hreflang`/`x-default`-Links und `og:locale` je Seite
- Weiterleitung von `/` auf eine Sprach-Startseite, nach Browsersprache und gemerkter Wahl
- Optionale Hinweise, Fallback-Weiterleitungen, Korrektur sprachfremder Links, lokalisierte Daten
- Veröffentlichung nur bestimmter Sprachen (`publishLanguages`, `QUARTZ_LANGS`)

## Installation

```bash
npx quartz plugin add github:boxi-os/quartz-multilanguage
```

Danach das Plugin in die `quartz.config.yaml` eintragen. Ein Eintrag konfiguriert Transformer,
Filter, Emitter und die Komponente auf einmal; `layout` platziert den Sprachwechsler.

```yaml
plugins:
  - source: github:boxi-os/quartz-multilanguage
    enabled: true
    order: 65 # nach crawl-links (60), damit die Link-Korrektur greift
    options:
      languages:
        - { code: de, label: German, native: Deutsch, locale: de-DE }
        - { code: en, label: English, native: English, locale: en-US }
      defaultLanguage: de
      rootRedirect: browser
    layout:
      position: header
      group: toolbar
```

`order` zählt nur für `rewriteCrossLanguageLinks` — siehe
[7.2](https://boxi-os.github.io/quartz-multilanguage/7-hinweise/02-links-zwischen-sprachen).

## Optionen

| Option                       | Typ                                                  | Standard                                 | Beschreibung                                                                                                                              |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                  | `(string \| Language)[]`                             | `["en"]`                                 | Sprachen der Site, siehe unten. Strings sind Codes.                                                                                       |
| `defaultLanguage`            | `string`                                             | erste Sprache                            | Sprache für Seiten ohne Treffer bei der Erkennung.                                                                                        |
| `detection`                  | `("folder" \| "suffix" \| "frontmatter")[]`          | alle drei                                | Erkennungsstrategien in Prioritätsreihenfolge. `[]` ordnet alle Seiten der Standardsprache zu.                                            |
| `linking`                    | `("frontmatter" \| "aliases" \| "path")[]`           | alle drei                                | Verknüpfungsstrategien in Prioritätsreihenfolge.                                                                                          |
| `frontmatterKeys`            | `{ lang, key, translations }`                        | `lang`, `translationKey`, `translations` | Vom Plugin gelesene Frontmatter-Schlüssel.                                                                                                |
| `rootRedirect`               | `"none" \| "default" \| "browser"`                   | `"none"`                                 | Schreibt eine `index.html` im Wurzelverzeichnis, die auf eine Sprach-Startseite leitet. Nur, wenn der Vault keine `index.md` im Root hat. |
| `rememberChoice`             | `boolean`                                            | `true`                                   | Merkt die im Sprachwechsler gewählte Sprache in `localStorage`; die Startseiten-Weiterleitung berücksichtigt sie.                         |
| `seo.hreflang`               | `boolean`                                            | `true`                                   | `<link rel="alternate" hreflang>` für jede Übersetzung. Benötigt `configuration.baseUrl`.                                                 |
| `seo.ogLocale`               | `boolean`                                            | `true`                                   | `og:locale` und `og:locale:alternate`.                                                                                                    |
| `seo.xDefault`               | `"default" \| "none" \| <code>`                      | `"default"`                              | Auf welche Übersetzung `x-default` zeigt.                                                                                                 |
| `switcher.style`             | `"links" \| "dropdown" \| "flags"`                   | `"links"`                                | Darstellung des Sprachwechslers.                                                                                                          |
| `switcher.label`             | `"code" \| "label" \| "native" \| "translatedTitle"` | `"label"`                                | Text der Einträge. `translatedTitle` zeigt den Titel der Zielseite.                                                                       |
| `switcher.showCurrent`       | `boolean`                                            | `true`                                   | Aktuelle Sprache als hervorgehobenen Eintrag ohne Link anzeigen.                                                                          |
| `switcher.missing`           | `"hide" \| "home" \| "disabled"`                     | `"home"`                                 | Sprachen ohne Übersetzung der aktuellen Seite: ausblenden, auf ihre Startseite verlinken oder ausgegraut anzeigen.                        |
| `switcher.separator`         | `string`                                             | `"\|"`                                   | Trenner zwischen Einträgen im Stil `links`. Leerer String für keinen.                                                                     |
| `switcher.title`             | `string`                                             | übersetztes „Sprache“                    | Barrierefreier Name des Sprachwechslers.                                                                                                  |
| `missingTranslationNotice`   | `boolean`                                            | `false`                                  | Hinweis „Diese Seite ist nur auf … verfügbar“, wenn es keine Übersetzung in der Sprache des Besuchers gibt.                               |
| `availableTranslationNotice` | `boolean`                                            | `false`                                  | Hinweis „Diese Seite gibt es auch auf …“ mit Link, wenn eine Übersetzung in der Sprache des Besuchers existiert.                          |
| `fallbackPages`              | `"none" \| "redirect"`                               | `"none"`                                 | Schreibt Weiterleitungsseiten, wo eine Übersetzung fehlt (`de/coffee` → `en/coffee`), für Ordner- und Suffix-Konvention.                  |
| `rewriteCrossLanguageLinks`  | `boolean`                                            | `false`                                  | Schreibt Links um, die auf die Seite einer anderen Sprache zeigen, wenn dieselbe Seite in der Seitensprache existiert.                    |
| `localizeDates`              | `boolean`                                            | `false`                                  | Formatiert `<time datetime>`-Elemente (Datum aus content-meta) im Browser in der Seitensprache.                                           |
| `publishLanguages`           | `string[]`                                           | `[]` (alle)                              | Nur diese Sprachen veröffentlichen. `QUARTZ_LANGS=de,en` überschreibt beim Build.                                                         |

Ein Spracheintrag:

| Feld     | Beschreibung                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| `code`   | Code in Ordnern, Suffixen und Frontmatter, z. B. `de`. Pflicht.                                                     |
| `label`  | Anzeigename, z. B. `German`. Standard: Code in Großbuchstaben.                                                      |
| `native` | Name in der Sprache selbst, z. B. `Deutsch`. Standard: `label`. Für `switcher.label: native` und in Hinweisen.      |
| `locale` | BCP-47-Locale für `<html lang>`, `hreflang` und `og:locale`, z. B. `de-DE`. Standard: `code`.                       |
| `home`   | Slug der Sprach-Startseite. Standard: `<code>/index`, falls vorhanden, sonst `index` für die Standardsprache.       |
| `flag`   | Text oder Emoji für `switcher.style: flags`. Standard: Flagge der Region des Locale (`de-DE` → 🇩🇪), sonst der Code. |

Die Standardwerte liegen im Plugin-Code; Quartz reicht die YAML-Optionen unverändert durch.
Alles Weitere — Inhalte ordnen, Übersetzungen verknüpfen, der Umschalter, SEO, Weiterleitungen,
Hinweise und ein Build je Sprache — steht im Handbuch:

| Kapitel                                                                                |                                                                       |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [1 Einstieg](https://boxi-os.github.io/quartz-multilanguage/1-einstieg/)               | Was Quartz allein kann, die erste zweisprachige Site, die sechs Teile |
| [2 Spracherkennung](https://boxi-os.github.io/quartz-multilanguage/2-spracherkennung/) | Ordner, Suffix, Frontmatter — und der Basispfad                       |
| [3 Verknüpfen](https://boxi-os.github.io/quartz-multilanguage/3-verknuepfen/)          | `translationKey`, Aliase, Pfad, und wenn es nicht klappt              |
| [4 Der Umschalter](https://boxi-os.github.io/quartz-multilanguage/4-umschalter/)       | Formen, Beschriftungen, fehlende Übersetzungen                        |
| [5 Adressen](https://boxi-os.github.io/quartz-multilanguage/5-adressen/)               | `hreflang`, `x-default`, `og:locale`, `html lang`                     |
| [6 Weiterleitungen](https://boxi-os.github.io/quartz-multilanguage/6-weiterleitungen/) | Die Startseite, fehlende Seiten                                       |
| [7 Hinweise und Links](https://boxi-os.github.io/quartz-multilanguage/7-hinweise/)     | Die zwei Hinweise, Links zwischen Sprachen, Daten                     |
| [8 Bauen](https://boxi-os.github.io/quartz-multilanguage/8-bauen/)                     | Eine Site für alle, oder eine je Sprache                              |
| [9 Nachschlagen](https://boxi-os.github.io/quartz-multilanguage/9-nachschlagen/)       | Alle Optionen, der Explorer-Filter, die Grenzen                       |

Die englische Fassung dieser README steht in [README.md](README.md).

## Entwicklung

```bash
npm install
npm run check   # typecheck + lint + format + tests
npm run build   # schreibt dist/ (committed, Quartz installiert daraus)
```

`dist/` ist absichtlich committed. Nach jeder Änderung unter `src/` `npm run build` ausführen und
das aktualisierte `dist/` mit committen.

## Wie das hier entstanden ist

Ein Hobbyprojekt. Das Plugin ist im Zuge von
[QuartzControl](https://github.com/boxi-os/QuartzControl) entstanden, funktioniert aber in jedem
Quartz-5-Projekt für sich.

Folgendes möchte ich an dieser Stelle transparent machen: Der Code ist zum größten Teil mit
[Claude Code](https://claude.com/claude-code) entstanden; die Commits sagen das mit einem
`Co-Authored-By`-Eintrag. Mir ist bewusst, dass Vibe-coding teilweise kontrovers diskutiert wird,
und ich möchte hier nichts verbergen.

## Wie gut ist der Code geprüft?

`npm run check` fährt Typcheck, Linter, Formatprüfung, 58 Tests und den Bau; die CI tut bei
jedem Push dasselbe. Das ist keine Garantie, aber es ist etwas, das ihr selbst laufen lassen könnt,
bevor ihr dem Plugin vertraut.

## Lizenz

MIT
