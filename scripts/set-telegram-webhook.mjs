import fs from "node:fs";
import path from "node:path";

function loadRootEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadRootEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const args = process.argv.slice(2);
const arg = args[0];

if (!token || token.includes("your_telegram") || token.length < 15) {
  console.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}

async function run() {
  if (arg === "--status") {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const json = await res.json();
    console.log("getWebhookInfo:", JSON.stringify(json, null, 2));
    return;
  }

  if (arg === "--delete") {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    const json = await res.json();
    console.log("deleteWebhook:", json);
    return;
  }

  const baseUrl = (arg || process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) {
    console.error("Usage:");
    console.error("  pnpm bot:webhook https://<your-deployed-api-domain> [--secret <TELEGRAM_WEBHOOK_SECRET>]");
    console.error("  pnpm bot:webhook --status");
    console.error("  pnpm bot:webhook --delete");
    process.exit(1);
  }

  const secretIdx = args.indexOf("--secret");
  const rawSecret =
    secretIdx >= 0 && args[secretIdx + 1]
      ? args[secretIdx + 1]
      : process.env.TELEGRAM_WEBHOOK_SECRET;
  const secret =
    rawSecret && !rawSecret.includes("your_telegram")
      ? rawSecret.replace(/[^A-Za-z0-9_-]/g, "")
      : "";

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

  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const infoJson = await infoRes.json();
  console.log("getWebhookInfo:", JSON.stringify(infoJson, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
