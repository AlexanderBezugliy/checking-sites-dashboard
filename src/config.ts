/** Точки расширения: URL статуса, интервал обновления, подписи Telegram. */

export const config = {
  remoteStatusUrl:
    "https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/main/status.json",
  /**
   * Если утренний publish снова сотрёт `gsc`, берём последний снимок с дневным рядом.
   * Используется, только когда в текущем файле показов нет.
   */
  gscFallbackStatusUrl:
    "https://raw.githubusercontent.com/AlexanderBezugliy/checking-sites/e3fbec2c2eccbaebd6b81685ccb028d135fe1627/status.json",
  localStatusUrl: "/status.json",
  refreshMs: 5 * 60 * 1000,
  telegramBot: "@checkingsites111_bot",
  telegramChannel: "MONITOR",
} as const;
