# Checking-sites dashboard

Панель по флоту из [checking-sites](https://github.com/AlexanderBezugliy/checking-sites).

Бот `@checkingsites111_bot` пишет в группу **MONITOR** дифф и редкий дайджест. История чата через Bot API не читается, поэтому дашборд берёт тот же `status.json`.

Дашборд **только читает** `status.json` (GitHub raw или локальный снимок). GSC/OAuth и повторные SEO-проверки здесь нет — индексация приходит из монитора checking-sites.

## Как устроен код

```
src/
  config.ts                 URL статуса, интервал, имя канала
  types.ts                  контракт status.json
  hooks/useFleetStatus.ts   загрузка и автообновление
  lib/status.ts             GitHub → локальный снимок
  lib/site.ts               хост, зона, NS, статус строки
  lib/index.ts              GSC index: skip/stale/noindex/частично
  lib/metrics.ts            агрегаты и текст дайджеста
  lib/table.ts              фильтр и сортировка таблицы
  lib/format.ts             даты и миллисекунды
  components/               шапка, KPI, NS, индекс, таблица
```

Блок **Google Index** (`IndexStrip`) показывает KPI по главным и внутренним URL, фильтры таблицы (`indexok`, `indexbad`, `indexpartial`, …) и раскрытие строки с `index.pages[]`. В шапке отдельно: «Последняя проверка» (аптайм) и «Индекс обновлён» (`index_last_update`).

## Команды

```bash
npm install
npm run dev
npm test
npm run build
```

Живые данные: `https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/main/status.json`  
Запасной снимок: `public/status.json`
