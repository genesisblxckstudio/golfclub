// GOLF CLUB "this week" poster generator — Vercel serverless function.
// Two steps, because changing text and background at once breaks the layout:
//   step "text": template -> new date / DJ / time
//   step "bg":   result of step 1 -> new dark, blurred, mystical background
import { readFile } from "node:fs/promises";
import path from "node:path";

export const config = { maxDuration: 60 };

const MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-image-preview";
const API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// What is in the template image (must match assets/template.png)
const TEMPLATE = { name1: "Nastya", name2: "Muravyova", time: "22:00", date: "16.10.fr" };

const BACKGROUNDS = [
  "the silhouette of a medieval knight in armor and a pale woman in a flowing dark gown drifting in deep murky water, gothic cathedral arches dissolving into the darkness, faint candle glints, suspended particles; palette near-black, deep indigo, muted blood red, faint silver",
  "a woman's face and long dark hair floating in deep black water, eyes closed, a drifting veil of sheer fabric, a few glowing pale-violet jellyfish far away, a gothic chandelier sinking; palette near-black, deep violet, cold emerald, pearl highlights",
  "glowing translucent jellyfish drifting in deep dark teal ocean water, bioluminescent pink and cyan tentacles, faint light rays from above; dreamy and nocturnal",
  "a smoky nightclub at 4 a.m. seen through wet glass: blurred dancing silhouettes, a woman in a black lace dress turning away, red and violet stage lights bleeding into darkness",
  "an empty gothic chapel at night flooded with dark water, rows of candles reflected and trembling, a knight's helmet resting on a stone altar, mist; palette black, amber, oxblood",
  "a pale woman in a silver chainmail dress lying on dark water among floating white lilies, moonlight, ripples; palette black, silver, cold blue",
  "a masquerade ball in a dim baroque hall, masked figures in velvet, a chandelier swaying, champagne glass in a gloved hand; palette black, wine red, tarnished gold",
  "stained-glass rose window seen from deep underwater, colored light breaking through dark water, drifting black ribbons; palette deep blue, ruby, black",
  "a horse and rider in black armor emerging from fog in a night forest, faint torchlight, mysterious; palette charcoal, moss green, ember orange",
  "abstract ink clouds of deep violet and black blooming in water, a faint ghostly female figure inside the smoke, pearlescent highlights",
];

const BLUR =
  "The whole background is heavily blurred, soft, out of focus and smeared, with film grain and gentle light diffusion, dark and mysterious, abstract rather than detailed, nothing crisp or photographic. Only the background is blurred; the glass letters, ornament and logo stay sharp and refract the background.";

function doorsLine(doors) {
  return doors
    ? `- Directly under "this week“" add one new line "doors open ${doors}" in the same wide extended translucent glass font, at the same small size as the time line "${TEMPLATE.time}", left-aligned with the text above. Push the lines below it down slightly if needed; do not touch the ornament.`
    : "";
}

function textPrompt({ date, dj, time, doors }) {
  const keep = `Keep unchanged: "GOLF CLUB", "this week“", "PRAGUE", "BUDECSKA 28", the large central ornament of four mirrored ram-horn spirals, the bottom-right logo, and the background.`;
  const head =
    "Minimal text edit on this poster. Do NOT redesign, move, resize or restyle anything. The background, the central ornament, the logo, all positions and the glass font must stay identical.";
  if (!dj) {
    return `${head}

Changes:
- Remove the lines "${TEMPLATE.name1}", "${TEMPLATE.name2}" and "${TEMPLATE.time}" entirely. Leave that area as clean, empty background (continue the existing background there).
${doors ? doorsLine(doors) + `\n- Apart from "doors open ${doors}", there must be no other text under "this week“".` : `- Under "this week“" there must be no text at all.`}
- Replace the date "${TEMPLATE.date}" with "${date}" in the exact same wide extended translucent glass font, same size and position.

${keep}`;
  }
  const words = dj.trim().split(/\s+/);
  let l1 = dj.trim(), l2 = "";
  if (words.length > 1) {
    const half = Math.ceil(words.length / 2);
    l1 = words.slice(0, half).join(" ");
    l2 = words.slice(half).join(" ");
  }
  const nameChange = l2
    ? `- Replace "${TEMPLATE.name1}" with "${l1}" and "${TEMPLATE.name2}" with "${l2}" (two lines).`
    : `- Replace the two lines "${TEMPLATE.name1}" / "${TEMPLATE.name2}" with a single line "${l1}"; move the time line up directly under it.`;
  const timeChange = time
    ? `- Replace "${TEMPLATE.time}" with "${time}".`
    : `- Remove the time line "${TEMPLATE.time}" entirely.`;
  return `${head}

Change ONLY these texts, rendered in the exact same wide extended translucent glass font, same size and same left alignment as the existing letters:
${doorsLine(doors)}
${nameChange}
${timeChange}
- Replace the date "${TEMPLATE.date}" with "${date}".

${keep}`;
}

function bgPrompt({ texts, wish }) {
  const scene = wish && wish.trim()
    ? `${wish.trim()}. Keep it dark, mysterious and night-life in mood`
    : BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  return `Replace ONLY the background of this poster. Do NOT move, resize, redesign or restyle any foreground element: the glass text ${texts
    .map((t) => `"${t}"`)
    .join(", ")}, the large central ornament of four mirrored ram-horn spirals, and the bottom-right logo all stay identical in shape, size, position and translucent glass material. Do not add or remove any text.

Remove the current background entirely. NEW BACKGROUND: ${scene}.

${BLUR}

FRAMING IS LOCKED: keep exactly the same canvas, crop and scale as the input image. Do not zoom in, do not crop, do not reframe. The whole poster must stay visible, including the bottom row: the date "${texts.find((t) => /^\d{2}\.\d{2}\./.test(t))}" with "PRAGUE" in the bottom-left corner and the ornamental logo with "BUDECSKA 28" in the bottom-right corner, at the same size and position as in the input.

No extra text, no UI, no watermark.`;
}

async function callGemini(prompt, imageB64) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("На сервере не задан GEMINI_API_KEY"), { status: 500 });
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: imageB64 } }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16", imageSize: "2K" } },
    }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = json?.error?.message || `Gemini error ${r.status}`;
    throw Object.assign(new Error(msg), { status: 502 });
  }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!img) throw Object.assign(new Error("Модель не вернула картинку, попробуйте ещё раз"), { status: 502 });
  const d = img.inlineData || img.inline_data;
  return { data: d.data, mimeType: d.mimeType || d.mime_type || "image/png" };
}

// PNG/JPEG size check: the model sometimes returns a reframed image; 9:16 = 0.5625
function imageRatio(b64) {
  const buf = Buffer.from(b64.slice(0, 200000), "base64");
  if (buf.readUInt32BE(0) === 0x89504e47) return buf.readUInt32BE(16) / buf.readUInt32BE(20);
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc3) return buf.readUInt16BE(i + 7) / buf.readUInt16BE(i + 5);
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
const ratioOk = (img) => { const r = imageRatio(img.data); return r === null || Math.abs(r - 0.5625) < 0.02; };

async function callChecked(prompt, imageB64) {
  let out = await callGemini(prompt, imageB64);
  if (!ratioOk(out)) out = await callGemini(prompt, imageB64); // one retry
  return out;
}

const clean = (s, max) => String(s || "").replace(/[\u0000-\u001f"“”]/g, "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const pass = process.env.APP_PASSWORD;
    if (pass && body.password !== pass) return res.status(401).json({ error: "Неверный пароль" });

    const date = clean(body.date, 12);
    const dj = clean(body.dj, 40);
    const time = clean(body.time, 8);
    const doors = clean(body.doors, 8);
    if (!/^\d{2}\.\d{2}\.(mo|tu|we|th|fr|sat|su)$/.test(date))
      return res.status(400).json({ error: "Неверная дата" });

    if (body.step === "text") {
      const tpl = await readFile(path.join(process.cwd(), "assets", "template.png"));
      const out = await callChecked(textPrompt({ date, dj, time, doors }), tpl.toString("base64"));
      return res.status(200).json(out);
    }
    if (body.step === "bg") {
      if (!body.image || body.image.length > 6_000_000) return res.status(400).json({ error: "Нет картинки шага 1" });
      const texts = ["GOLF CLUB", "this week“"];
      if (doors) texts.push(`doors open ${doors}`);
      if (dj) {
        const w = dj.split(/\s+/);
        const half = Math.ceil(w.length / 2);
        texts.push(w.slice(0, half).join(" "));
        if (w.length > 1) texts.push(w.slice(half).join(" "));
      }
      if (dj && time) texts.push(time);
      texts.push(date, "PRAGUE", "BUDECSKA 28");
      const out = await callChecked(bgPrompt({ texts, wish: clean(body.wish, 300) }), body.image);
      return res.status(200).json(out);
    }
    return res.status(400).json({ error: "Неизвестный шаг" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Ошибка сервера" });
  }
}
