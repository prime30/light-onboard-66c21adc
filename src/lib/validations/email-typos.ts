// Catches misspelled domains of the big mailbox providers ("gmail.co",
// "gmail.con", "gnail.com", "yahoo.co") and returns the corrected address.
// Kept in sync with supabase/functions/track-registration-lead/email-typos.ts.

type Provider = { tld: string; singleTld: boolean };

// singleTld providers have no country domains, so any other ending is a typo.
// The rest have real country domains (yahoo.co.uk, hotmail.fr), so only the
// endings in TLD_TYPOS count as typos for them.
const PROVIDERS: Record<string, Provider> = {
  gmail: { tld: "com", singleTld: true },
  icloud: { tld: "com", singleTld: true },
  comcast: { tld: "net", singleTld: true },
  yahoo: { tld: "com", singleTld: false },
  hotmail: { tld: "com", singleTld: false },
  outlook: { tld: "com", singleTld: false },
  aol: { tld: "com", singleTld: false },
};

const NAME_MISSPELLINGS: Record<string, string> = {
  gnail: "gmail", gamil: "gmail", gmai: "gmail", gmal: "gmail", gmial: "gmail", gmaill: "gmail",
  gmali: "gmail", gmsil: "gmail", gmil: "gmail", gmaik: "gmail", gmaul: "gmail", gmajl: "gmail",
  gmwil: "gmail", gmaip: "gmail", gmau: "gmail", gmaio: "gmail", gmaim: "gmail",
  yaho: "yahoo", yahooo: "yahoo", yhoo: "yahoo", yahho: "yahoo", yaoo: "yahoo", yahool: "yahoo", yahol: "yahoo",
  hotmal: "hotmail", hotmial: "hotmail", hotmai: "hotmail", hormail: "hotmail", hotmil: "hotmail",
  hotamil: "hotmail", hotmsil: "hotmail", hitmail: "hotmail", hotmaill: "hotmail",
  iclod: "icloud", icoud: "icloud", iclould: "icloud", icould: "icloud", iclpud: "icloud", icloudd: "icloud",
  outlok: "outlook", outllok: "outlook", outlool: "outlook",
};

const TLD_TYPOS: Record<string, Set<string>> = {
  com: new Set([
    "", "c", "co", "con", "cm", "om", "vom", "xom", "cpm", "comm", "como", "coom", "cim", "comn", "cmo",
    "clm", "ckm", "cok", "coo", "cco", "ccom", "clom", "col", "coms", "cln", "fom", "dom", "x", "v",
    "xo", "vo", "oc", "ci", "cp", "vl", "vlm", "xon",
  ]),
  net: new Set(["", "n", "ne", "nt", "met", "bet", "nett"]),
};

/** Returns the corrected address when the domain is a known typo, otherwise null. */
export function suggestEmailDomainFix(email: string | undefined | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return null;

  const dot = domain.indexOf(".");
  let name = dot === -1 ? domain : domain.slice(0, dot);
  let rest = dot === -1 ? "" : domain.slice(dot + 1);
  if (dot === -1) {
    // "gmailcom" (missing dot)
    for (const [provider, { tld }] of Object.entries(PROVIDERS)) {
      if (domain === `${provider}${tld}`) {
        name = provider;
        rest = tld;
      }
    }
  }

  const fixedName = NAME_MISSPELLINGS[name] ?? name;
  const provider = PROVIDERS[fixedName];
  if (!provider) return null;
  if (rest !== provider.tld && !provider.singleTld && !TLD_TYPOS[provider.tld].has(rest)) return null;

  const fixedDomain = `${fixedName}.${provider.tld}`;
  return fixedDomain === domain ? null : `${local}@${fixedDomain}`;
}
