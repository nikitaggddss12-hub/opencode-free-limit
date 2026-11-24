# OpenCode Free Limit

### Убираем плашку «Достигнут бесплатный лимит» в OpenCode Desktop — и не даём ей вернуться

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/nikitaggddss12-hub/opencode-free-limit)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![OpenCode](https://img.shields.io/badge/OpenCode%20Desktop-2.4.1-black)](https://opencode.ai)
[![CI](https://github.com/nikitaggddss12-hub/opencode-free-limit/actions/workflows/ci.yml/badge.svg)](https://github.com/nikitaggddss12-hub/opencode-free-limit/actions/workflows/ci.yml)

🇬🇧 [English version](README.md)

Когда бесплатная квота заканчивается, OpenCode Desktop не просто предупреждает — он
подменяет поле ввода карточкой, которая перекрывает чат, и возвращает её после каждого
обновления. Патч убирает карточку из интерфейса и выключает автообновление, чтобы она не
возвращалась.

**Квоту это не возвращает.** Лимит считается на сервере, запрос всё равно будет отклонён.
Возвращается рабочий клиент: обычное поле ввода, читаемый чат, переключение модели, свои
API-ключи.

---

## ⚡ Быстрый старт

```bash
git clone https://github.com/nikitaggddss12-hub/opencode-free-limit.git
cd opencode-free-limit
node scripts/remove-free-limit.cjs
node scripts/disable-autoupdate.cjs
```

Перезапусти OpenCode — карточки больше нет, поле ввода на месте.

## 🧨 Что делает патч

| Файл в `app.asar` | Что меняется |
| --- | --- |
| `out/renderer/assets/route-IwQmm3WU.js` | условие показа карточки `session-free-limit` становится `active:()=>!1` — карточка «Достигнут бесплатный лимит» не рендерится, вместо неё обычный композер |
| `out/main/platform-DZ0ycknI.js` | из проверки обновлений убирается `await x.checkForUpdates()` — приложение не ходит в сеть за обновлениями и считает версию актуальной |

Патч делается «в размер»: подменяются байты той же длины, SHA-256 в заголовке `app.asar`
пересчитывается, размер архива не меняется. Ничего не перекачивается и никаких бинарников
не поставляется — меняются две строки в уже установленном приложении.

## 🖥 Требования

- Windows 10/11
- OpenCode Desktop **2.4.1** (имена чанков и строк привязаны к версии)
- Node.js 22+

## 🛠 Использование

```bash
node scripts/check.cjs                        # что уже пропатчено
node scripts/remove-free-limit.cjs --dry-run  # показать изменение, ничего не записывая
node scripts/remove-free-limit.cjs            # убрать карточку
node scripts/disable-autoupdate.cjs           # выключить автообновление
```

Или через npm:

```bash
npm run check
npm run free-limit:dry
npm run free-limit
npm run no-autoupdate
```

Путь по умолчанию:
`%LOCALAPPDATA%\Programs\ai.opencode.desktop\resources\app.asar`.
Если приложение установлено в другое место — передай `--asar <путь>`.

## 🔄 Бэкап и откат

- `remove-free-limit.cjs` при первом запуске создаёт рядом `app.asar.bak` (≈255 МБ).
  После проверки его можно удалить.
- Полный откат — переустановка OpenCode.

## ❓ FAQ

**Карточка вернулась после обновления.**
Автообновление перезаписало `app.asar`. Запусти `disable-autoupdate.cjs`, затем скрипты
патча ещё раз.

**Вышла новая версия OpenCode.**
Чанки и строки отличаются. Найди новые имена через `node scripts/scan.mjs` (нужен
`npm install`), поправь константы и пришли PR.

**Почему не через настройку?**
Такой настройки нет. Карточка рендерится кодом клиента — ни флага, ни переменной окружения,
ни опции в конфиге не существует.

**Это безопасно?**
Меняются только байты в `app.asar`, контрольная сумма пересчитывается, размер архива не
меняется. Скрипты — около 200 читаемых строк, без сетевых запросов и телеметрии. Вернуться
к стоковой версии можно переустановкой.

**Это даёт бесплатный доступ?**
Нет. Убирается блокирующая карточка, а не серверная квота.

## 📁 Структура

```
scripts/
  check.cjs              — показывает, применены ли патчи
  remove-free-limit.cjs  — убирает карточку «Достигнут бесплатный лимит»
  disable-autoupdate.cjs — отключает проверку обновлений
  scan.mjs               — ищет компонент карточки в app.asar (для новых версий)
test/
  patch.test.cjs         — собирает тестовый app.asar и проверяет все скрипты
```

## 🧪 Разработка

```bash
npm test
```

Тест собирает синтетический `app.asar` с той же структурой (смещения, SHA-256 в заголовке)
и проверяет, что `--dry-run` ничего не пишет, оба патча не меняют размер файла, хеш в
заголовке пересчитывается, повторный запуск ничего не делает, а архив от другой версии
отклоняется, а не портится. CI гоняет это на Linux и Windows с Node 22 и 24.

## ⭐ Поддержка

Если пригодилось — поставь звезду, чтобы проект нашли другие.

## 📄 Лицензия

MIT — см. [LICENSE](LICENSE). Copyright (c) 2026 nikitaggddss12.
