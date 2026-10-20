// Renders src/*.html with site.config.mjs into dist/, then checks the output.
// Zero dependencies. Node 18+. Run: npm run build

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import config from "./site.config.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const PAGES = ["index.html", "privacy.html"];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---------------------------------------------------------------------------
// Config → template values

// Brand rule: ClearPulse is never shortened to "CP". The only short form is "CPLS".
const BRAND_BANNED = /\bCP\b/i;

const required = {
  brandName: "string", brandShortName: "string", ownerName: "string", ownerAge: "number", city: "string",
  serviceArea: "string", serviceAreaShort: "string", instagramHandle: "string",
  email: "string", phoneDisplay: "string", phoneE164: "string", bookingUrl: "string",
  priceMonthly: "number", foundingSpots: "number", liveDemoEnabled: "boolean", photoPath: "string",
};
for (const [key, type] of Object.entries(required)) {
  if (typeof config[key] !== type) fail(`site.config.mjs: "${key}" must be a ${type}.`);
}
if (config.instagramHandle?.startsWith("@")) fail('site.config.mjs: instagramHandle must not start with "@".');
if (config.phoneE164 && !/^\+\d{8,15}$/.test(config.phoneE164)) fail("site.config.mjs: phoneE164 must look like +17145550123.");
if (config.bookingUrl && !/^https:\/\/\S+$/.test(config.bookingUrl)) fail("site.config.mjs: bookingUrl must start with https:// (or be empty).");
if (config.siteUrl && !/^https:\/\/\S+$/.test(config.siteUrl)) fail("site.config.mjs: siteUrl must start with https:// (or be empty).");
if (BRAND_BANNED.test(config.brandShortName ?? "")) fail('site.config.mjs: brandShortName must never be "CP" — use "CPLS".');
bail();

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const numberWord = (n) => NUMBER_WORDS[n] ?? String(n);
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const handle = config.instagramHandle;
const mailtoUrl = `mailto:${config.email}`;
const instagramDmUrl = `https://ig.me/m/${handle}`;
const bookingHref = config.bookingUrl || instagramDmUrl;
if (!config.bookingUrl) warn(`bookingUrl is empty — booking buttons open a DM to @${handle} instead. Add a Cal.com or Calendly link in site.config.mjs.`);

const hasPhoto = existsSync(join(ROOT, config.photoPath));
if (!hasPhoto) warn(`Photo not found at ${config.photoPath} — showing the "${initials(config.ownerName)}" monogram instead. Add a real photo of yourself there.`);

const ogImagePath = "assets/og-image.png";
const hasOgImage = existsSync(join(ROOT, ogImagePath));
if (hasOgImage && !config.siteUrl) warn("siteUrl is empty — the link-preview image uses a relative URL. Set siteUrl once the domain is live so Instagram previews pick it up reliably.");

const now = new Date();
const tz = "America/Los_Angeles";

const values = {
  brandName: config.brandName,
  brandShortName: config.brandShortName,
  ownerName: config.ownerName,
  ownerFirstName: config.ownerName.split(/\s+/)[0],
  ownerInitials: initials(config.ownerName),
  ownerAge: String(config.ownerAge),
  city: config.city,
  cityShort: config.city.split(",")[0].trim(),
  serviceArea: config.serviceArea,
  serviceAreaShort: config.serviceAreaShort,
  handle,
  instagramDmUrl,
  instagramProfileUrl: `https://www.instagram.com/${handle}/`,
  email: config.email,
  mailtoUrl,
  phoneDisplay: config.phoneDisplay,
  telUrl: `tel:${config.phoneE164}`,
  bookingHref,
  priceMonthly: String(config.priceMonthly),
  foundingSpots: String(config.foundingSpots),
  foundingSpotsWord: numberWord(config.foundingSpots),
  foundingSpotsWordCap: capitalize(numberWord(config.foundingSpots)),
  photoSrc: config.photoPath,
  ogImageUrl: config.siteUrl ? `${config.siteUrl.replace(/\/$/, "")}/${ogImagePath}` : ogImagePath,
  year: new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: tz }).format(now),
  lastUpdated: new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: tz }).format(now),
  buildDateIso: new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now),
};
values.metaDescription =
  `After-hours Instagram DM replies for med spas in ${values.serviceAreaShort}. Your team approves every reply; ` +
  `medical questions go straight to your phone. $${values.priceMonthly}/month.`;

const flags = { liveDemoEnabled: config.liveDemoEnabled, hasPhoto, hasOgImage, hasBookingUrl: Boolean(config.bookingUrl) };

function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Templating: {{> partial}}, <!-- if:flag --> … <!-- else --> … <!-- endif -->, {{token}}

function render(template, pageValues) {
  let out = template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    const file = join(SRC, "partials", `${name}.html`);
    if (!existsSync(file)) { fail(`Missing partial: src/partials/${name}.html`); return ""; }
    return readFileSync(file, "utf8").trimEnd();
  });

  // Resolve innermost blocks first so blocks can nest.
  const block = /[ \t]*<!--\s*if:(!?)(\w+)\s*-->\n?((?:(?!<!--\s*if:)[\s\S])*?)(?:[ \t]*<!--\s*else\s*-->\n?((?:(?!<!--\s*if:)[\s\S])*?))?[ \t]*<!--\s*endif\s*-->\n?/;
  let m;
  while ((m = out.match(block))) {
    const [whole, negate, flag, yes, no = ""] = m;
    if (!(flag in flags)) fail(`Unknown condition "if:${flag}".`);
    const on = negate ? !flags[flag] : Boolean(flags[flag]);
    out = out.replace(whole, () => (on ? yes : no));
  }
  if (/<!--\s*(if:|else|endif)/.test(out)) fail("Unbalanced <!-- if --> / <!-- else --> / <!-- endif --> block.");

  out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!(key in pageValues)) { fail(`Unknown token {{${key}}}.`); return ""; }
    return escapeHtml(pageValues[key]);
  });
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Tiny HTML scanner — enough to read our own output.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const TEXT_ATTRS = ["alt", "aria-label", "title", "placeholder"];
const META_TEXT = new Set(["description", "og:title", "og:description", "og:image:alt"]);

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
}

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

/** Returns { chunks: [{ text, spa }], elements: [{ name, attrs }] } */
function scan(html) {
  const chunks = [];
  const elements = [];
  const stack = [];
  const inSpa = () => stack.some((e) => e.spa);
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=\/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/gi;
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    const text = html.slice(last, m.index);
    if (text.trim()) chunks.push({ text: decode(text), spa: inSpa() });
    last = re.lastIndex;
    if (!m[2]) continue; // comment or doctype
    const name = m[2].toLowerCase();
    if (m[1]) { // closing tag
      const i = stack.map((e) => e.name).lastIndexOf(name);
      if (i !== -1) stack.length = i;
      continue;
    }
    const attrs = parseAttrs(m[3] || "");
    const spa = attrs["data-voice"] === "spa";
    elements.push({ name, attrs });
    for (const a of TEXT_ATTRS) if (attrs[a]) chunks.push({ text: attrs[a], spa: spa || inSpa() });
    if (name === "meta" && META_TEXT.has(attrs.name || attrs.property)) chunks.push({ text: attrs.content || "", spa: false });
    if (name === "script" || name === "style") { // skip raw text
      const end = html.toLowerCase().indexOf(`</${name}>`, last);
      last = re.lastIndex = end === -1 ? html.length : end + name.length + 3;
      continue;
    }
    if (!VOID.has(name)) stack.push({ name, spa });
  }
  const tail = html.slice(last);
  if (tail.trim()) chunks.push({ text: decode(tail), spa: false });
  return { chunks, elements };
}

// ---------------------------------------------------------------------------
// Build

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const rendered = {};
for (const page of PAGES) {
  const template = readFileSync(join(SRC, page), "utf8");
  checkTemplateForHardcodedValues(page, template);
  const homePrefix = page === "index.html" ? "" : "index.html";
  const html = render(template, { ...values, homePrefix });
  if (/\{\{|\}\}/.test(html)) fail(`${page}: unrendered {{…}} left in output.`);
  rendered[page] = html;
  writeFileSync(join(DIST, page), html);
}

cpSync(join(SRC, "styles.css"), join(DIST, "styles.css"));
if (existsSync(join(ROOT, "assets"))) {
  cpSync(join(ROOT, "assets"), join(DIST, "assets"), {
    recursive: true,
    filter: (p) => !p.split(/[\\/]/).pop().startsWith("."),
  });
}
writeFileSync(join(DIST, "favicon.svg"), favicon(values.brandShortName));

for (const file of [...PAGES, "favicon.svg"]) {
  const m = readFileSync(join(DIST, file), "utf8").match(BRAND_BANNED);
  if (m) fail(`${file}: contains "${m[0]}" — never shorten ClearPulse to "CP"; use "ClearPulse" or "CPLS".`);
}

// ---------------------------------------------------------------------------
// Checks

const BANNED = /\b(ai|artificial\s+intelligence|bot|chatbot|chatgpt|gpt|llm|agent|hipaa)\b/gi;
const PLURAL_VOICE = /\b(we|our|us|our\s+team|the\s+studio)\b/gi;

{
  const { chunks } = scan(rendered["index.html"]);
  for (const { text, spa } of chunks) {
    for (const m of text.matchAll(BANNED)) fail(`index.html: banned word "${m[0]}" in: "${snippet(text, m.index)}"`);
    if (!spa) for (const m of text.matchAll(PLURAL_VOICE)) fail(`index.html: "${m[0]}" outside a data-voice="spa" element — Bach writes as I/me/my: "${snippet(text, m.index)}"`);
  }
}

const idsByPage = {};
const scans = {};
for (const page of PAGES) {
  scans[page] = scan(rendered[page]);
  idsByPage[page] = new Set(scans[page].elements.map((e) => e.attrs.id).filter(Boolean));
}

for (const page of PAGES) {
  const els = scans[page].elements;
  const ids = els.map((e) => e.attrs.id).filter(Boolean);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(`${page}: duplicate id(s): ${[...new Set(dupes)].join(", ")}`);
  const h1s = els.filter((e) => e.name === "h1").length;
  if (h1s !== 1) fail(`${page}: expected exactly one <h1>, found ${h1s}.`);

  for (const { name, attrs } of els) {
    if ("href" in attrs) checkHref(page, name, attrs.href);
    if (name === "img" && !("alt" in attrs)) fail(`${page}: <img src="${attrs.src}"> has no alt text.`);
    if ("src" in attrs && !/^(https?:|data:)/.test(attrs.src) && !existsSync(join(DIST, attrs.src))) {
      fail(`${page}: src="${attrs.src}" points at a file that isn't in dist/.`);
    }
  }
}

function checkHref(page, tag, href) {
  const h = href.trim();
  if (h === "" || h === "#") return fail(`${page}: <${tag}> has an empty or "#" href.`);
  if (/^(https?:|mailto:|tel:)/i.test(h)) {
    if (/^mailto:\s*(\?|$)/i.test(h) || /^tel:\s*$/i.test(h)) fail(`${page}: incomplete link "${h}".`);
    return;
  }
  if (/^javascript:/i.test(h)) return fail(`${page}: javascript: link "${h}".`);
  const [file, hash] = h.split("#");
  const target = file || page;
  if (file && !existsSync(join(DIST, file))) return fail(`${page}: href="${h}" points at a missing file.`);
  if (hash !== undefined) {
    if (!hash) return fail(`${page}: href="${h}" has an empty fragment.`);
    if (!idsByPage[target]) return fail(`${page}: href="${h}" — can't verify fragment on ${target}.`);
    if (!idsByPage[target].has(hash)) fail(`${page}: href="${h}" points at #${hash}, which doesn't exist on ${target}.`);
  }
}

// Every business value must come from site.config.mjs, so the templates themselves must not contain them.
function checkTemplateForHardcodedValues(page, template) {
  const { chunks, elements } = scan(template);
  const haystack = [...chunks.map((c) => c.text), ...elements.flatMap((e) => Object.values(e.attrs))].join("\n");
  const word = (s) => new RegExp(`(^|[^\\w@.])${String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i");
  const literals = {
    instagramHandle: handle, email: config.email, phoneDisplay: config.phoneDisplay,
    phoneE164: config.phoneE164, priceMonthly: config.priceMonthly, ownerAge: config.ownerAge,
    ownerName: config.ownerName,
  };
  for (const [key, val] of Object.entries(literals)) {
    if (word(val).test(haystack)) fail(`src/${page}: hardcoded ${key} ("${val}") — use {{…}} from site.config.mjs.`);
  }
  const spots = new RegExp(`\\b(${config.foundingSpots}|${numberWord(config.foundingSpots)})\\s+(founding|med\\s+spas|spas|spots)\\b`, "i");
  if (spots.test(haystack)) fail(`src/${page}: hardcoded number of founding spots — use {{foundingSpots}} / {{foundingSpotsWord}}.`);
}

function snippet(text, i) {
  return text.slice(Math.max(0, i - 30), i + 40).replace(/\s+/g, " ").trim();
}

function favicon(letters) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#121214"/>
<rect x="2.5" y="2.5" width="59" height="59" rx="11.5" fill="none" stroke="#C9A96E" stroke-opacity=".4"/>
<text x="32" y="38" text-anchor="middle" font-family="Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="17" font-weight="600" letter-spacing="0" fill="#C9A96E">${escapeHtml(letters)}</text>
</svg>
`;
}

// ---------------------------------------------------------------------------

function bail() {
  for (const w of warnings) console.warn(`⚠  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`✖  ${e}`);
    console.error(`\nBuild failed with ${errors.length} error(s).`);
    process.exit(1);
  }
}

bail();

console.log(`✔  Built dist/ (live demo ${config.liveDemoEnabled ? "ON" : "off"}).`);
