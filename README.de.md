# quartz-multilanguage

Deutsche Dokumentation · Version 0.1.0 · Quartz 5 Community-Plugin
([English README](README.md))

- [1. Was das Plugin macht](#1-was-das-plugin-macht)
- [2. Installation und Einbindung](#2-installation-und-einbindung)
- [3. Inhalte organisieren](#3-inhalte-organisieren)
- [4. Optionen](#4-optionen)
- [5. Sprachwechsler](#5-sprachwechsler)
- [6. SEO: hreflang und og:locale](#6-seo-hreflang-und-oglocale)
- [7. Startseiten-Weiterleitung](#7-startseiten-weiterleitung)
- [8. Hinweise auf fehlende oder vorhandene Übersetzungen](#8-hinweise-auf-fehlende-oder-vorhandene-übersetzungen)
- [9. Fallback-Weiterleitungen](#9-fallback-weiterleitungen)
- [10. Links zwischen Sprachen](#10-links-zwischen-sprachen)
- [11. Datumsformat](#11-datumsformat)
- [12. Ein Build je Sprache](#12-ein-build-je-sprache)
- [13. Explorer](#13-explorer)
- [14. Obsidian-Plugin „Multilingual“](#14-obsidian-plugin-multilingual)
- [15. Grenzen](#15-grenzen)
- [16. Entwicklung](#16-entwicklung)

## 1. Was das Plugin macht

Quartz kennt nur ein `locale` pro Site. Dieses Plugin ergänzt alles, was nötig ist, um dieselben
Notizen aus einem Vault in mehreren Sprachen zu veröffentlichen:

- Spracherkennung je Seite über Sprachordner (`de/…`), Dateisuffix (`notiz.de.md`) oder ein
  Frontmatter-Feld, in beliebiger Reihenfolge kombinierbar
- Verknüpfung der Übersetzungen: explizit (`translationKey`, `translations`), über
  Obsidian-Aliases (kompatibel mit dem Obsidian-Plugin „Multilingual“) oder implizit über gleiche
  Pfade
- Eine Sprachwechsler-Komponente: Textlinks, Dropdown oder Flaggen; Beschriftung als Code, Name,
  Eigenname oder übersetzter Seitentitel
- `<html lang>`, `hreflang`/`x-default`-Links und `og:locale` je Seite
- Weiterleitung von `/` auf eine Sprach-Startseite, nach Browsersprache und gemerkter Wahl
- Optionale Hinweise („nur auf Englisch verfügbar“ / „auch auf Deutsch verfügbar“),
  Fallback-Weiterleitungen für fehlende Übersetzungen, Korrektur sprachfremder Links,
  lokalisierte Datumsangaben
- Veröffentlichung nur bestimmter Sprachen (`publishLanguages`, `QUARTZ_LANGS`) für getrennte
  Builds je Sprache

## 2. Installation und Einbindung

```bash
npx quartz plugin add github:boxi-os/quartz-multilanguage
```

Danach das Plugin in `quartz.config.yaml` eintragen. Ein Eintrag konfiguriert Transformer, Filter,
Emitter und die Komponente `LanguageSwitcher` gemeinsam; `layout` platziert den Sprachwechsler.

```yaml
plugins:
  - source: github:boxi-os/quartz-multilanguage
    enabled: true
    order: 65 # nach crawl-links (60), damit das Link-Rewriting aufgelöste Links sieht
    options:
      languages:
        - { code: de, label: German, native: Deutsch, locale: de-DE }
        - { code: en, label: English, native: English, locale: en-US }
      defaultLanguage: en
      rootRedirect: browser
      switcher:
        style: links
        label: native
    layout:
      position: left
      group: toolbar
      priority: 32
```

`order` ist nur für `rewriteCrossLanguageLinks` relevant; die Spracherkennung funktioniert bei jeder
Reihenfolge oberhalb des Frontmatter-Plugins (`note-properties`, order 5).

## 3. Inhalte organisieren

Eine oder mehrere Konventionen wählen. Die Erkennungsstrategien werden in der Reihenfolge von
`detection` geprüft (Standard: `folder`, `suffix`, `frontmatter`); eine Seite ohne Treffer gehört
zu `defaultLanguage`.

```
content/
  de/
    index.md
    notizen/kaffee.md          # folder: Sprache "de", Basispfad "notizen/kaffee"
  en/
    index.md
    notes/coffee.md            # folder: Sprache "en", Basispfad "notes/coffee"
  guide.md                     # kein Treffer: defaultLanguage ("en"), Basispfad "guide"
  guide.de.md                  # suffix: Sprache "de", Basispfad "guide"
  legal.md                     # Frontmatter `lang: fr`
```

Übersetzungen einer Seite werden über die Strategien in `linking` verknüpft (Standard:
`frontmatter`, `aliases`, `path`):

| Strategie     | Verknüpft Seiten, wenn …                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontmatter` | sie denselben `translationKey` tragen oder eine Seite die anderen unter `translations` nennt (`translations: { en: en/notes/coffee }`, Wikilinks erlaubt).                                                   |
| `aliases`     | ein Alias einer Seite dem Titel oder Dateinamen einer Seite in einer anderen Sprache entspricht. Genau das schreibt das Obsidian-Plugin „Multilingual“, übersetzte Notiznamen verknüpfen sich so von selbst. |
| `path`        | der Basispfad (Slug ohne Sprachordner oder -suffix) identisch ist, z. B. `de/notes/coffee` und `en/notes/coffee` oder `guide.md` und `guide.de.md`.                                                          |

Eine Gruppe enthält nie zwei Seiten derselben Sprache; eine widersprüchliche Verknüpfung wird mit
Warnung übersprungen. Frühere Strategien haben Vorrang.

Jede Seite erhält `fileData.multilanguage` (`lang`, `baseSlug`, `source`, `translationKey`,
`translations`) und, falls nicht gesetzt, `frontmatter.lang` mit dem `locale` der Sprache, das
Quartz als `<html lang>` ausgibt.

## 4. Optionen

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

## 5. Sprachwechsler

Die Komponente rendert einen Eintrag je konfigurierter Sprache:

```html
<nav
  class="multilanguage-switcher style-links"
  aria-label="Sprache"
  data-lang="de"
  data-translations="…"
>
  <ul>
    <li><span class="current" aria-current="page" lang="de-DE">Deutsch</span></li>
    <li class="separator" aria-hidden="true">|</li>
    <li><a href="../en/notes/coffee" hreflang="en-US" lang="en-US" data-lang="en">English</a></li>
    <li class="separator" aria-hidden="true">|</li>
    <li>
      <a
        href="../fr/"
        class="fallback"
        hreflang="fr-FR"
        lang="fr-FR"
        data-lang="fr"
        title="Français (Startseite)"
        >Français</a
      >
    </li>
  </ul>
</nav>
```

`style: dropdown` rendert ein `<details>`-Element (funktioniert ohne JavaScript; das Script des
Plugins schließt es bei Klick außerhalb und mit Escape). `style: flags` zeigt `flag` mit dem
Eigennamen als Tooltip. Auf einsprachigen Sites und auf Seiten ohne weitere Einträge rendert der
Sprachwechsler nichts.

Er passt in die Toolbar neben Suche und Darkmode (`position: left`, `group: toolbar`) oder an jede
andere Stelle. Die Styles sind minimal und nutzen die Theme-Variablen; Anpassungen in
`quartz/styles/custom.scss` über `.multilanguage-switcher`.

## 6. SEO: hreflang und og:locale

Mit gesetzter `configuration.baseUrl` erhält jede Seite mit Übersetzungen

```html
<link rel="alternate" hreflang="de-DE" href="https://example.org/de/notizen/kaffee" />
<link rel="alternate" hreflang="en-US" href="https://example.org/en/notes/coffee" />
<link rel="alternate" hreflang="x-default" href="https://example.org/en/notes/coffee" />
<meta property="og:locale" content="de_DE" />
<meta property="og:locale:alternate" content="en_US" />
```

Die Übersetzungen stammen aus den Seiten, die die Filterphase des Builds gesehen hat; bei Ordner-
und Suffix-Konvention leitet das Plugin sie zur Not allein aus den Slugs ab.

## 7. Startseiten-Weiterleitung

Quartz liefert `content/index.md` unter `/` aus. Wer stattdessen eine Startseite je Sprache pflegt
(`de/index.md`, `en/index.md`), setzt `rootRedirect`, und das Plugin schreibt eine kleine
`index.html`:

- `default`: leitet auf die Startseite der Standardsprache.
- `browser`: nimmt den ersten Treffer aus gemerkter Wahl und `navigator.languages`, der zu einer
  konfigurierten Sprache passt, sonst die Standardsprache. Enthält einen `<noscript>`-Meta-Refresh
  und eine einfache Liste der Sprachlinks.

## 8. Hinweise auf fehlende oder vorhandene Übersetzungen

`missingTranslationNotice` und `availableTranslationNotice` fügen oben auf jeder Seite ein
verstecktes Callout ein. Das Script des Plugins vergleicht die Seitensprache mit der bevorzugten
Sprache des Besuchers (gemerkte Wahl, sonst Browsersprache) und zeigt den passenden Text in der
Sprache des Besuchers. Die Texte kommen aus den eigenen Übersetzungen des Plugins (`en-US`,
`de-DE`, `fr-FR`, `es-ES`; andere fallen auf Englisch zurück). Das Callout trägt die Klasse
`callout`, sodass die Obsidian-Callout-Styles greifen, wenn dieses Plugin aktiv ist.

## 9. Fallback-Weiterleitungen

Mit `fallbackPages: redirect` bekommt eine Seite, die nur als `en/notes/coffee` existiert,
zusätzlich `de/notes/coffee/index.html` mit Weiterleitung auf die englische Seite (mit `noindex`).
So funktionieren Links und Lesezeichen, die der Ordner- oder Suffix-Konvention folgen. Ordner-
Indexseiten werden ausgelassen, damit die Listen des folder-page-Plugins nie überschrieben werden.

## 10. Links zwischen Sprachen

Obsidian löst `[[coffee]]` auf den kürzesten passenden Pfad auf, das kann die Kopie in der anderen
Sprache sein. Mit `rewriteCrossLanguageLinks: true` wird ein Link von einer deutschen Seite auf
`en/notes/coffee` auf `de/notes/coffee` umgeschrieben, wenn diese Seite existiert (nur Ordner- und
Suffix-Konvention). Dafür braucht das Plugin eine `order` oberhalb von `crawl-links` (60).

## 11. Datumsformat

`localizeDates: true` formatiert jedes `<time datetime>`-Element im Browser mit
`Intl.DateTimeFormat` in der Seitensprache, im selben Format wie Quartz’ `formatDate`. Ohne die
Option folgen Datumsangaben dem site-weiten `locale`.

## 12. Ein Build je Sprache

`publishLanguages: [de]` (oder `QUARTZ_LANGS=de npx quartz build`) entfernt alle anderen Sprachen
vor dem Rendern. In Kombination mit einer `quartz.config.yaml` je Build (`locale`, `baseUrl`)
entstehen vollständig lokalisierte Sites, inklusive der UI-Texte aller anderen Plugins, die immer
dem site-weiten `locale` folgen.

## 13. Explorer

Das Explorer-Plugin nimmt eine `filterFn` nur über `quartz.ts` an. Das Plugin exportiert dafür
einen Helfer:

```ts
// quartz.ts
import { languageExplorerFilter } from "./.quartz/plugins/quartz-multilanguage";

Explorer({ filterFn: languageExplorerFilter("de", { languages: ["de", "en"] }) });
```

## 14. Obsidian-Plugin „Multilingual“

Das Obsidian-Community-Plugin [Multilingual](https://github.com/leolazou/obsidian-multilingual)
speichert übersetzte Notiznamen als einfache `aliases`. Die Verknüpfungsstrategie `aliases` gleicht
sie mit Titeln und Dateinamen der Seiten anderer Sprachen ab, sodass `de/Kaffee.md` (Alias
`Coffee`) und `en/Coffee.md` ohne weiteres Frontmatter verknüpft sind. `switcher.label:
translatedTitle` zeigt dann „Coffee“ auf der deutschen und „Kaffee“ auf der englischen Seite.

## 15. Grenzen

- UI-Texte anderer Plugins (Explorer-Titel, „Backlinks“, Datum in content-meta) folgen dem
  site-weiten `locale`. Für eine vollständig lokalisierte Oberfläche einen Build je Sprache nutzen.
- `dir` (rechts nach links) ist in Quartz global; das Plugin ändert es nicht je Seite.
- Der Suchindex umfasst alle Sprachen.
- Nur per Frontmatter erkannte Seiten haben keine Slug-Konvention; Fallback-Weiterleitungen und
  Link-Rewriting greifen bei ihnen nicht, hreflang und Sprachwechsler schon.

## 16. Entwicklung

```bash
npm install
npm run check   # typecheck + lint + format + tests
npm run build   # schreibt dist/ (committed, Quartz installiert daraus)
```

`dist/` ist absichtlich committed. Nach jeder Änderung unter `src/` `npm run build` ausführen und
das aktualisierte `dist/` mit committen.

## Lizenz

MIT
