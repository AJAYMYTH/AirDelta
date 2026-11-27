import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const arg = process.argv[2];

if (!token || token.includes("your_telegram") || token.length < 15) {
  console.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}

async function run() {
  if (arg === "--delete") {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    const json = await res.json();
    console.log("deleteWebhook:", json);
    return;
  }

  const baseUrl = (arg || process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) {
    console.error("Usage: pnpm bot:webhook https://<your-deployed-api-domain>");
    console.error("   or: pnpm bot:webhook --delete (to switch back to local polling)");
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/webhooks/telegram`;
  const payload = {
    url: webhookUrl,
    ...(secret ? { secret_token: secret } : {})
  };

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  console.log("setWebhook:", json);

  // Register bot slash-command menu for deployed webhook mode
  await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Start & pick city or live location" },
        { command: "location", description: "Share live GPS location for local AQI & plan" },
        { command: "today", description: "Live AQI snapshot & cleanest airing window" },
        { command: "plan", description: "Plan A vs Plan B exposure savings" },
        { command: "advisory", description: "Regional RWA / community air notice" },
        { command: "lang", description: "Switch bot language" }
      ]
    })
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
