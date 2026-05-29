/**
 * Notifications Plugin
 * Sends notifications when sessions complete (macOS/Linux)
 */

export const NotificationPlugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        try {
          if (process.platform === "darwin") {
            await $`osascript -e 'display notification "Session completed!" with title "OpenCode"'`;
          } else if (process.platform === "linux") {
            await $`notify-send "OpenCode" "Session completed!"`;
          }
        } catch {
          // Ignore notification errors
        }
      }
    },
  };
};
