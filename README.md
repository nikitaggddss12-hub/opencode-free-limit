# OpenCode Unlimited

### Убираем плашку «Достигнут бесплатный лимит» в OpenCode Desktop — один раз и навсегда

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/nikitaggddss12-hub/opencode-unlimited)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![OpenCode](https://img.shields.io/badge/OpenCode%20Desktop-2.4.1-black)](https://opencode.ai)

Плашка «Достигнут бесплатный лимит» перекрывает поле ввода, висит поверх чата и
возвращается после каждого обновления приложения. Этот репозиторий убирает её
двумя командами и отключает автообновление, чтобы патч не затирался.

---

## ⚡ Быстрый старт

```bash
git clone https://github.com/nikitaggddss12-hub/opencode-unlimited.git
cd opencode-unlimited
node scripts/remove-free-limit.cjs
node scripts/disable-autoupdate.cjs
```

Перезапусти OpenCode — плашки больше нет, вместо неё сразу обычное поле ввода.

## 🚀 Как убрать лимит

Самый простой способ — **сменить IP**. Включи режим полёта на 10–15 секунд и
выключи (подойдёт и перезапуск роутера или включение VPN) — лимит сбрасывается,
и бесплатной моделью снова можно пользоваться.

## 🧨 Что делает патч

| Файл в `app.asar` | Что меняется |
| --- | --- |
| `out/renderer/assets/route-IwQmm3WU.js` | условие показа карточки `session-free-limit` заменяется на `active:()=>!1` — карточка «Достигнут бесплатный лимит» не рендерится, композер снова на месте |
| `out/main/platform-DZ0ycknI.js` | из проверки обновлений убирается `await x.checkForUpdates()` — приложение не ходит в сеть за обновлениями и считает версию актуальной |

Патч делается «в размер»: подменяются байты той же длины, SHA-256 в заголовке
`app.asar` пересчитывается, размер архива не меняется. Ничего не ломается и не
перекачивается — правится пара строк в уже установленном приложении.

## 🖥 Требования

- Windows 10/11
- OpenCode Desktop **2.4.1** (имена чанков и строк привязаны к версии)
- Node.js 22+

## 🛠 Использование

```bash
node scripts/check.cjs                 # что уже пропатчено
node scripts/remove-free-limit.cjs --dry-run   # посмотреть патч без записи
node scripts/remove-free-limit.cjs     # убрать плашку
node scripts/disable-autoupdate.cjs    # выключить автообновление
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

- `remove-free-limit.cjs` при первом запуске создаёт `app.asar.bak` (≈255 МБ).
  После проверки его можно удалить.
- Полный откат — переустановка OpenCode.

## ❓ FAQ

**Плашка вернулась после обновления.**
Автообновление перезаписало `app.asar`. Запусти `disable-autoupdate.cjs`, а затем
скрипты патча ещё раз.

**Новая версия OpenCode.**
Чанки и строки отличаются. Найди новые имена помощником
`node scripts/scan.mjs` (нужен `npm install`) и поправь константы в скриптах.

**Это точно безопасно?**
Меняются только байты в `app.asar` с пересчётом контрольной суммы, размер архива
не меняется. В любой момент можно вернуться к стоковой версии переустановкой.

## 📁 Структура

```
scripts/
  check.cjs              — показывает, применены ли патчи
  remove-free-limit.cjs  — убирает карточку «Достигнут бесплатный лимит»
  disable-autoupdate.cjs — отключает проверку обновлений
  scan.mjs               — ищет компонент плашки в app.asar (для новых версий)
```

## ⭐ Поддержка

Если пригодилось — поставь звезду, чтобы проект нашли другие.

## 📄 Лицензия

MIT — см. [LICENSE](LICENSE). Copyright (c) 2026 nikitaggddss12.
