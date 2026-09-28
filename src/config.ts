/** Точки расширения: URL статуса, интервал обновления, подписи Telegram. */

export const config = {
  remoteStatusUrl:
    "https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/main/status.json",
  /**
   * Утренний publish status.json стёр `gsc`. Этот коммит — последний снимок с кликами.
   * Берётся, только если в текущем файле показов нет.
   */
  gscFallbackStatusUrl:
    "https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/3cca83f/status.json",
  localStatusUrl: "/status.json",
  refreshMs: 5 * 60 * 1000,
  telegramBot: "@checkingsites111_bot",
  telegramChannel: "MONITOR",
} as const;
