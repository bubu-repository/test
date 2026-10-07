/*
 * An approximate, BPE-flavoured tokenizer.
 *
 * Real tokenizers learn tens of thousands of merges from a huge corpus. This one fakes the
 * result well enough to be instructive:
 *   1. a GPT-style regex pre-tokenizer (words keep their leading space, contractions split off,
 *      numbers in groups of up to three digits, punctuation runs, whitespace runs);
 *   2. greedy longest-match against a few hundred embedded words and subword pieces;
 *   3. a byte fallback for anything the vocabulary has never seen (emoji, rare scripts).
 * English prose lands around four characters per token, like the real thing.
 */

/* Common English words plus the vocabulary of building AI products. Each gets a " word" twin. */
const WORDS = `
the of and to in is it you that he was for on are with as his they be at one have this from or
had by not but what some we can out other were all there when up use your how said an each she
which do their time if will way about many then them write would like so these her long make thing
see him two has look more day could go come did no most people my over know than call first who may
down side been now find any new work part take get place made live where after back little only
round man year came show every good me give our under name very through just form great think say
help low line turn cause much mean before move right old too same tell does set three want air well
also play small end put home read hand large add even land here must big high such follow act why
ask men change went light kind off need house try us again point world near build self earth head
stand own page should found answer school grow study still learn plant cover food sun four between
state keep eye never last let thought city tree cross hard start might story saw far draw left late
run while press close night real life few open seem together next white begin got walk example ease
paper group always music those both mark often letter until car feet care second book carry took
science eat room friend began idea stop once base hear cut sure watch color face main enough plain
young ready above ever red list though feel talk soon body family direct leave song measure door
black short class question happen complete ship area half order fire problem piece told knew pass
since top whole space heard best hour better true during hundred five remember step early hold
ground interest reach fast six table travel less morning ten simple several toward against pattern
slow center love person money serve appear road map rain rule pull cold notice voice unit power town
fine certain fall lead dark machine note wait plan figure star box field rest correct able done drive
stood front teach week final gave green quick develop warm free minute strong special mind behind
clear produce fact street course stay full force blue object decide surface deep system busy test
record common possible check game shape hot miss brought heat bring yes fill east among
is are was were be been being has have had do does did done get gets got make makes made
using used uses use user users people person thing things something nothing everything anything
really actually today tomorrow yesterday because around little careful honest calm taste mostly
pick picks picked watch measure everything often right best feel feels felt real rough version
ai model models token tokens prompt prompts agent agents product products data design designer
designers engineer engineers engineering building built ship ships shipping feature features team
teams cost costs price prices latency answer answers tool tools code function return const var
text count estimate bill export import async await error errors test tests app apps web phone
phones train trains coffee morning traffic commute rain writing language languages learning
predict predicts prediction next likely chance temperature sample random words word piece pieces
small short longer longest split number numbers read reads reading cheap fast faster slow calm
sentence sentences type typed typing see saw almost instead roughly much how chop chops
human humans helpful search plan plans task tasks goal goals loop loops budget result results
window screen notebook sketch idea ideas shop shops drink ice iced sugar sweet strong black latte
road toll story adventure message messages weather leave hour hours day days rainy every morning
cannot knows guesses still asks sure get gets
because through during without within between another however although whether against around before after above below
across along always already almost often never sometimes usually maybe perhaps quite rather enough though until since unless
whose whom able accept according account action activity address administration admit adult affect again age agency ago agree
agreement ahead allow alone amount analysis animal anyone anything apply approach argue arm arrive art article artist assume
attack attention audience author authority available avoid away baby bad bag ball bank bar beat beautiful become bed behavior
believe benefit beyond billion bit blood board born break brother business buy camera campaign candidate capital card career
catch cell central century certainly chair challenge character charge child choice choose citizen civil claim clearly coach
collection college come commercial community company compare computer concern condition conference consider consumer continue
control country couple court create crime cultural culture cup current customer daughter dead deal death debate decade decision
defense degree describe despite detail determine difference different difficult dinner direction director discover discuss
discussion disease doctor dream drop easy economic economy edge education effect effort eight either election else employee
energy enjoy enter entire environment especially establish evening event everybody everyone evidence exactly executive exist
expect experience expert explain fail father fear federal feeling fight finally financial finger finish firm floor focus foreign
forget former forward friend fund future garden gas general generation girl glass guess guy hair hang happy health heart heavy
herself himself history hit hope hospital hotel huge husband identify image imagine impact important improve include including
increase indeed indicate individual industry information inside institution interesting international interview into
investment involve issue item its itself job join key kid kitchen knowledge law lawyer leader least leg legal level lie likely
local lose loss lot magazine maintain major majority manage management manager market marriage material matter maybe media
medical meet meeting member memory mention method middle military million mission modern moment month mother mouth movement
movie myself nation national natural nature nearly necessary network news newspaper nice none nor north nothing occur offer
office officer official oil onto operation opportunity option organization others outside owner pain painting parent
participant particular particularly partner party past patient pay peace perform performance period personal physical player
police policy political politics poor popular population position positive practice prepare present president pressure pretty
prevent private probably process production professional professor program project property protect prove provide public
purpose push quality quickly radio raise range rate reality realize reason receive recent recently recognize reduce reflect
region relate relationship religious remain remove report represent require research resource respond response
responsibility return reveal rich rise risk rock role safe save scene scientist score sea season seat section security seek
sell send senior sense series serious service seven shake share shoot shot shoulder sign significant similar simply single
sister sit site situation size skill skin smile social society soldier somebody someone sort source south southern speak
specific speech spend sport spring staff stage standard statement station stock store strategy structure student stuff style
subject success successful suddenly suffer suggest summer support tax teacher technology television tend term thank
themselves theory third threat throughout throw thus tonight total tough town trade traditional training treat treatment trial
trip trouble truth understand upon various victim view violence visit vote wall war weapon wear weight west western whatever
wide wife win wind wish woman wonder worker worry writer wrong yard yeah yet yourself
length million fixed default class null undefined true false string push map filter reduce console log document element
value index input output fetch request response math round floor max min join slice props effect
process development production included increasing period states water light energy earth air fire
monday tuesday wednesday thursday friday saturday sunday january february march april june july august
september october november december weekend weekday hours minutes seconds route routes bus city
one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty sixty percent family sleep
repair neighbor previous previously priority volunteer accurate accuracy
`;

/* Very common Indonesian function words (real tokenizers learn these from the web too). */
const WORDS_ID = `
yang dan di ke ini itu dengan untuk ada tidak akan dari kita saya kami kamu bisa lebih juga atau
pada dalam sudah jadi orang apa
karena tetapi hanya masih harus sangat banyak baru kalau sama lagi seperti semua besar baik benar tahu
`;

/* Acronyms and casing that a learned vocabulary would keep whole. */
const KEEP_CASE = `AI API JSON URL HTML CSS UI UX GPU CPU OK I I'm The A An In It This You We They
Then When What If Every Jakarta Bekasi Indonesia English`;

/* Subword pieces: suffixes, stems and frequent letter clusters (no leading space). */
const PIECES = `
s es ed ing ings er ers est ly ty ity ities ment ments ness tion tions sion sions ation ations
able ible al ally ial ical ic ics ive ives ous ious ful less ize ized izes izing izer ise ised ism
ist ists ant ance ence ent ents ency ure ures age ages ate ated ates ating ator ory ary ery ward
wise ship hood like or ors y ie ies en ened ening ify ified ology ware work time line base book
place point side man land way ways ide ude ade ode ute ite ine ane one ore are ire ole ile ale ame
ime ome ume ape ipe ope ase ose use ack eck ick ock uck ang ong ung ank ink unk int ont unt ast ost
ust all ell ill oll ull ass ess iss oss uss ight ought ough ould own ound ount ain een oon eer oor
air ear ier our ower ater oken ark ork ord ield old ild ult ect ept act ict uct ead eat eal eam ean
ear eas ock ook ool oom oop oot ush ash ish esh ath eth ith oth uth ble ple tle dle gle kle cle
th he an in er on re at nd ti te of it al ar st to nt ng se ha as ou io le ve co me de hi ri ro
ic ne ea ra ce li ch ll be ma si om ur ca el ta la ns di fo ho pe ec pr no ct us ac ot il tr ly nc
et ut ss so rs un lo wa ge ie wh ee wi em ad ol rt po we na ul ni ts mo ow pa im mi ai sh ir su id
os iv ia am fi ci vi pl ig tu ev ld ry mp fe bl ab gh ty op wo sa ay ex ke fr oo av ag if ap gr od
bo sp rd do uc bu ei ov by rm ep tt oc fa ef cu rn sc gi da yo cr cl du ga qu ue ff ba ey ls va
um pp ua up lu go ht ru ug ds lt pi rc rr eg au ck ew mu br bi pt ak pu ui rg ib tl ny ki rk ys
ob mm fu ph og ms ye ud mb ip ub oi rl gu dr hr cc tw ft wn nu af hu nn eo vo rv nf xp gn sm fl
iz ok nl my gl aw sy oa
the and ing ion ent for tio ere her ate ver ter tha ati hat ers his res ill are con nce all eve
ith ted ain est man red thi ive rea wit ons ess ave per ect one und int ant hin lin ome ble ust ine
ple ure com pro pre dis str sta ste sto spe sco tra tri pla ple cha che chi sho sha whe whi tho
kan nya ber ter men mem meng peng pen pem lah kah ny ah ih uh ang ung ong eng an ar ur ir at ut
ak ik uk ap ip up am im al ul il ka ku ke ko ga gu ba bu da du ja ju je jo ma mu na nu pa pu pe
ra ru sa su ta tu wa ya ca cu ci se ge ha hu ri la
ition itions ional ionally ization ational ative atives ibility ability ables ically ifies ifying ually ual uals ences ances
ancy ient ients ience ior iors iously ously ured uring ories aries eries isms ises ising mental nesses lessly fully ships wards
ening ered ering ics ence ance ive ives age ure ury ery ory ately ently ingly ments ness ality ulation ulated ular ularly
uction uct ction ctions ction cess cessed cesses ocess roc ustr ustrial olution olut olve olved ufact ufactur acturing anuf
inent inental ental ently ential ology ological ific ifically ection ections ected ecting ivity ivities ided ider iding ided
ital itive itude ulus uous unt unity unit unity ateg ategy egy ograph ography olog ources ource orts ort orted orting orm
orms ormed ormation anced ances ancing aign ained aining ainly ained ears eared ually ery erry erence erences erent erently
ings ers ened ish ished ishing ized izing ise ises
`;

/* Word roots: real merges often start a word with one of these. */
const ROOTS = `
photo synth esis graph gram tele phone phon bio geo logy struct ture tures dom some ling let ster oid ian ean ese ide
ides oxy gen gene genic plast chlor cil coun rove roved prov ove oved over ues tend rary ident idents walk due port form
duct spect scrib script tract vers vert vent vid vis voc pend pens pose pos press mit miss phys psych chron cycl dict duc
fac fect fer flex flu grad gress ject junct lect leg log loc mand mar med meter min mob mot mov nat nom norm nov pac par
pass path ped pel pet plic ply pon pop prim quer quest rect rupt sci scope sect sens sent sequ serv sign sist sol son spir
stat stit tain tact temp ten tens term terr text therm tort tox trib turb typ uni vac val ven vit viv vol ound ounds
ather other ither ether ight ights ights ought ure ures ured ark arks ail ails ain ains ane anes ate ates ave aves aze
ead eads eal eals eam eams ean eans eap ear ears eat eats ect ects eed eeds eel eels eem eems een eep eeps eer eet ell ells
end ends ent ents ept erve est ests ice ices ick icks ide ides ief ield ift ifts ike ikes ild ile iles ill ills ime imes
ind inds ine ines ing ings int ints ipe ire ires ise ish ist ists ite ites ive ives oad oak oal oam oan oar oat oats ock
ocks ode odes oke old olds ole oles oll olls ome omes one ones ong ongs ood oods ook ooks ool ools oom oon oop oor oose ope
opes ore ores ork orks orm orms orn orse ort orts ose oses ost osts ote otes oud ould ound ount our ours ouse out outs ove
oves own owns uch uck ude ue uel uff uge uit ule ules ume ump umps une ung unk unt ure urn urns use uses ust ute utes
`;

/* Prefixes that real vocabularies keep with their leading space. */
const SPACED = `un re pre pro con com dis de in im ex en em inter over under sub super trans auto
micro multi non mis out up co anti semi mid per th st sh ch wh pl pr tr gr br cr dr fr bl cl fl gl
sl sp sc sk sm sn sw tw kn qu ber ter men mem meng peng pen pem ke se di ma pa ka ba sa ta la da
ja na ra wa ya ga ha ca`;

/* Punctuation and whitespace merges. */
const PUNCT = [
  ".", ",", ";", ":", "!", "?", "...", "..", " (", "(", ")", "),", ").", ");", " {", "{", "}", "},",
  "};", " =", " ==", " ===", " =>", " !=", " !==", "=", "==", " +", "+", "++", " -", "-", "--",
  " *", "*", "**", " /", "/", "//", " //", "/*", "*/", " <", "<", "</", "/>", ">", " >", "\">",
  "('", "')", "(\"", "\")", "\",", " \"", "\"", "\".", "'", " '", "',", "';", " [", "[", "]", "],",
  "];", " #", "#", "`", "```", " —", "—", " –", "–", "’", "’s", "“", " “", "”", "”.", "…", " $",
  "$", " %", "%", " &", " &&", " ||", "|", " |", "_", "__", " _", "@", " @", "\\", "^", "~", " ?",
  "?.", " ??", ".\n", ",\n", ";\n", ":\n", "{\n", "}\n", "(\n", ")\n", ".\n\n", "}\n\n", " {\n",
  "é", "ñ", "ü", "ö", "á", "í", "ó", "ú", "à", "è", "•", " •", "·", "×", "→", "←",
];

const vocab = new Set();

/* A learned vocabulary also holds the inflections of common words: "plants", "approved". */
function addInflections(text) {
  for (const w of text.split(/\s+/)) {
    if (w.length < 3 || !/^[a-z]+$/.test(w)) continue;
    const forms = [w + "s"];
    if (w.endsWith("e")) forms.push(w + "d", w.slice(0, -1) + "ing", w + "r", w + "rs");
    else if (/[^aeiou]y$/.test(w)) forms.push(w.slice(0, -1) + "ies", w.slice(0, -1) + "ied", w + "ing");
    else forms.push(w + "ed", w + "ing", w + "er", w + "ers", w + "ly");
    if (/(s|x|z|ch|sh)$/.test(w)) forms.push(w + "es");
    for (const form of forms) {
      vocab.add(form);
      vocab.add(" " + form);
    }
  }
}

function addList(text, spaced) {
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    vocab.add(word);
    if (spaced) vocab.add(" " + word);
  }
}

addList(WORDS, true);
addInflections(WORDS);
addList(WORDS_ID, true);
addList(KEEP_CASE, true);
addList(PIECES, false);
addList(ROOTS, false);
for (const piece of SPACED.split(/\s+/)) if (piece) vocab.add(" " + piece);
for (const root of ROOTS.split(/\s+/)) if (root.length > 2) vocab.add(" " + root);
for (const p of PUNCT) vocab.add(p);
for (let c = 32; c < 127; c++) {
  const ch = String.fromCharCode(c);
  vocab.add(ch);
  if (/[A-Za-z0-9]/.test(ch)) vocab.add(" " + ch);
}
for (let n = 1; n <= 16; n++) vocab.add(" ".repeat(n));
for (let n = 1; n <= 4; n++) {
  vocab.add("\n".repeat(n));
  vocab.add("\t".repeat(n));
  vocab.add("\r\n".repeat(n));
}

let maxLen = 1;
for (const piece of vocab) if (piece.length > maxLen) maxLen = piece.length;
const MAX_PIECE = Math.min(maxLen, 18);

export const VOCAB_SIZE = vocab.size;

/*
 * GPT-style pre-tokenizer: contractions | optional non-letter + letters | 1–3 digits |
 * optional space + punctuation run (+ trailing newlines) | newlines | trailing spaces | spaces.
 */
const PRETOKEN = /['’](?:s|t|re|ve|m|ll|d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/giu;

export function pretokenize(text) {
  return text.match(PRETOKEN) || [];
}

const TITLE = /^ ?\p{Lu}\p{Ll}+$/u;
const DIGITS = /^\p{N}+$/u;

function inVocab(piece) {
  if (vocab.has(piece)) return true;
  // A learned vocabulary has "Model" and " Building" too: accept Title-case of known pieces.
  if (TITLE.test(piece)) {
    const i = piece[0] === " " ? 1 : 0;
    return vocab.has(piece.slice(0, i) + piece[i].toLowerCase() + piece.slice(i + 1));
  }
  return false;
}

const encoder = new TextEncoder();
const hex = (b) => b.toString(16).toUpperCase().padStart(2, "0");

/* Splits one pre-token into pieces. Returns [{ text, kind, offset, length, bytes? }]. */
function splitPretoken(s) {
  if (DIGITS.test(s)) return [{ text: s, kind: "number", offset: 0, length: s.length }];
  const out = [];
  let i = 0;
  while (i < s.length) {
    let found = 0;
    for (let len = Math.min(MAX_PIECE, s.length - i); len > 0; len--) {
      if (inVocab(s.substr(i, len))) {
        found = len;
        break;
      }
    }
    if (found) {
      out.push({ text: s.substr(i, found), kind: "vocab", offset: i, length: found });
      i += found;
      continue;
    }
    // Byte fallback: unknown character → its UTF-8 bytes, merged two at a time.
    const ch = String.fromCodePoint(s.codePointAt(i));
    const bytes = encoder.encode(ch);
    if (bytes.length <= 2) {
      out.push({ text: ch, kind: "rare", offset: i, length: ch.length, bytes: Array.from(bytes) });
    } else {
      for (let b = 0; b < bytes.length; b += 2) {
        const chunk = Array.from(bytes.slice(b, b + 2));
        out.push({
          text: "⟨" + chunk.map(hex).join(" ") + "⟩",
          kind: "byte",
          offset: i,
          length: ch.length,
          bytes: chunk,
        });
      }
    }
    i += ch.length;
  }
  return out;
}

/* FNV-1a, so the same piece always gets the same (fake) id. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tokenId(text, kind, bytes) {
  if (kind === "byte" && bytes.length === 1) return bytes[0];
  if (kind === "vocab" && text.length === 1 && text.charCodeAt(0) < 128) return text.charCodeAt(0);
  return 256 + (hash(kind === "byte" ? bytes.join(",") : text) % 99_744);
}

const cache = new Map();

/* Tokenizes a whole string. Returns [{ text, start, end, id, kind, bytes? }]. */
export function tokenize(text) {
  const tokens = [];
  for (const match of text.matchAll(PRETOKEN)) {
    const pre = match[0];
    const pos = match.index;
    let pieces = cache.get(pre);
    if (!pieces) {
      pieces = splitPretoken(pre).map((p) => ({ ...p, id: tokenId(p.text, p.kind, p.bytes || []) }));
      if (cache.size > 20_000) cache.clear();
      cache.set(pre, pieces);
    }
    for (const p of pieces) {
      tokens.push({
        text: p.text,
        start: pos + p.offset,
        end: pos + p.offset + p.length,
        id: p.id,
        kind: p.kind,
        bytes: p.bytes,
      });
    }
  }
  return tokens;
}

export function countWords(text) {
  const m = text.match(/\S+/g);
  return m ? m.length : 0;
}
