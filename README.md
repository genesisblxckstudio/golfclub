# GOLF CLUB — генератор афиш

Страница, где вводишь дату и диджея и получаешь сторис-афишу 9:16 через Gemini (Nano Banana Pro).

## Переменные окружения (Vercel → Settings → Environment Variables)
- `GEMINI_API_KEY` — ключ из https://aistudio.google.com/apikey (обязательно, с включённым биллингом)
- `APP_PASSWORD` — пароль для входа на страницу (обязательно задать, иначе ключом сможет пользоваться любой)
- `GEMINI_MODEL` — необязательно, по умолчанию `gemini-3-pro-image-preview`

## Файлы
- `public/index.html` — страница
- `api/generate.js` — серверная функция (2 шага: текст, потом фон)
- `assets/template.png` — эталон макета. Если появится оригинал лучшего качества, замени этот файл
  (текст в нём должен быть: Nastya / Muravyova / 22:00 / 16.10.fr, иначе поправь TEMPLATE в api/generate.js)

Стоимость: около $0.27 за афишу (2 генерации Pro), «Другой фон» — ещё около $0.13.
