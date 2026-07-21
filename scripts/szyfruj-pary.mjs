// Galerie par (strefa prywatna) — krok 2/2: SZYFROWANIE (wzorzec StatiCrypt jak w HANDPAN).
//
// Dla każdej pary:
//   klucz = PBKDF2(hasło = NAZWA WIELKIMI LITERAMI, sól losowa, 310 000 iteracji, SHA-256) -> AES-GCM-256
//   każde jawne zdjęcie galerii -> plik images/pary/<slug>/pNN.enc  =  iv(12 bajtów) || szyfrogram
// Jawne zdjęcia galerii NIGDY nie trafiają do repo. Manifest data/pary.js nie zawiera haseł ani jawnych zdjęć.
//
// Użycie:  node scripts/szyfruj-pary.mjs "<ścieżka do pary_build.json>"
import { webcrypto as crypto } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TUTAJ = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TUTAJ, '..');
const ITERACJE = 310000;
const BUILD_JSON = process.argv[2];
if (!BUILD_JSON) { console.error('Podaj ścieżkę do pary_build.json'); process.exit(1); }

const b64 = (buf) => Buffer.from(buf).toString('base64');

async function kluczZHasla(haslo, sol) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(haslo), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sol, iterations: ITERACJE, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

const build = JSON.parse(await readFile(BUILD_JSON, 'utf8'));
const out = [];

for (const c of build.couples) {
  const sol = crypto.getRandomValues(new Uint8Array(16));
  const klucz = await kluczZHasla(c.password, sol);

  const photos = [];
  for (const p of c.photos) {
    const jawne = await readFile(p.plain);                       // bajty JPEG
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const szyfr = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, klucz, jawne));
    const plik = new Uint8Array(iv.length + szyfr.length);       // iv || szyfrogram
    plik.set(iv, 0); plik.set(szyfr, iv.length);
    const rel = `images/pary/${c.slug}/${p.name}.enc`;
    await mkdir(join(ROOT, 'images', 'pary', c.slug), { recursive: true });
    await writeFile(join(ROOT, rel), Buffer.from(plik));
    photos.push({ src: rel, width: p.width, height: p.height });
  }

  out.push({
    slug: c.slug, name: c.name,
    teaser: c.teaser,
    salt: b64(sol), iterations: ITERACJE,
    photos,
  });
  console.log(`  zaszyfrowano: ${c.name} — ${photos.length} zdjęć`);
}

const manifest = {
  meta: { brand: 'Mariusz Świergula Fotografia', count: out.length },
  couples: out,
};

const naglowek = '/* Wygenerowane przez scripts/szyfruj-pary.mjs — nie edytuj ręcznie. Hasła i jawne zdjęcia tu nie występują. */\n';
await writeFile(join(ROOT, 'data', 'pary.js'),
  naglowek + 'window.PARY = ' + JSON.stringify(manifest, null, 2) + ';\n', 'utf8');

console.log(`\nGotowe: ${out.length} par w manifeście data/pary.js`);
