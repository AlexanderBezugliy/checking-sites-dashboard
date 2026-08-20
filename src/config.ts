/** Точки расширения: URL статуса, интервал обновления, подписи Telegram. */

export const config = {
  remoteStatusUrl:
    "https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/main/status.json",
  localStatusUrl: "/status.json",
  refreshMs: 5 * 60 * 1000,
  telegramBot: "@checkingsites111_bot",
  telegramChannel: "MONITOR",
} as const;
