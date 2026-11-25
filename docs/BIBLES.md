# Bible versions

| Version | Status | Notes |
|---|---|---|
| KJV (King James Version) | **Included** | Public domain. Full text (66 books, 31,102 verses) ships inside the app and works offline. |
| NIV | Not included | Copyright Biblica. Needs a licence from Biblica, or the church imports its own licensed copy. |
| NKJV | Not included | Copyright Thomas Nelson (HarperCollins Christian). Needs a licence or church import. |
| Good News Bible | Not included | Copyright American Bible Society / HarperCollins. Needs a licence or church import. |
| Kiswahili (Union Version / Habari Njema) | Not included | Copyright Bible Society of Kenya / Tanzania. Needs a licence or church import. |

## About the KJV text

- The text is the standard Cambridge KJV with LORD in capitals, compiled from open data sets on GitHub.
- It was cross-checked verse by verse against a second independent data set. That found 42 verses with translators' margin notes mixed into the text; they were repaired and a unit test now guards against it.
- Some verses end without punctuation (for example Genesis 23:17). That matches the printed text.
- The KJV is public domain in most countries. In the United Kingdom it is under a perpetual Crown letters patent, so check before selling there.
- Psalm titles and the epistle sign-offs are not included as verse text.

## Adding a Bible (import)

Scriptures tab → **Add a Bible…**. The church picks a Bible file it is allowed to use; the app shows a summary, asks for a short name (for example NIV) and a confirmation that the church has the right to use the text, then saves it inside the app so it works offline.

Supported files:

- Text or CSV/TSV, one verse per line: `John 3:16 For God so loved…`, `John,3,16,"For God…"`, or `John|3|16|For God…`
- JSON: this app's format, arrays of books with chapters, rows of `book / chapter / verse / text`, or nested objects

Book names can be English or Kiswahili (for example *Yohana*, *Mwanzo*). A Bible keeps its own book names, so a Swahili Bible shows "Yohana 3:16" on the slide.

Verses a translation leaves out on purpose (for example some verses in modern translations) are skipped, not shown as blanks. Imported Bibles are stored in the app's data folder and can be removed at any time. The built-in KJV cannot be replaced.

## Next

Licence applications to the owners of the NIV, NKJV, Good News Bible and Kiswahili Bible, so the app can ship them built in.
