import fs from "node:fs";
import path from "node:path";

console.log("\n==========================================");
console.log("  AirDelta Environment & Service Verifier  ");
console.log("==========================================\n");

const envPath = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  console.log("❌ .env file not found in project root.");
  console.log("👉 Run the setup script: powershell ./scripts/setup-env.ps1");
  console.log("   or copy .env.example to .env and fill in your keys.\n");
  process.exit(0);
}

// Simple parser for .env
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = val;
  }
}

async function verifyGoogle() {
  const geminiKey = envVars.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes("your_gemini") || geminiKey.length < 15) {
    console.log("⚠️  Google Gemini API: [NOT CONFIGURED] (Falls back to deterministic templates)");
    console.log("    Get key at: https://aistudio.google.com/");
  } else {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      if (res.ok) {
        console.log("✅ Google Gemini API: [CONNECTED & ACTIVE]");
      } else {
        console.log(`⚠️  Google Gemini API: [INVALID KEY] HTTP ${res.status}`);
      }
    } catch (e) {
      console.log("⚠️  Google Gemini API: [NETWORK TIMEOUT / OFFLINE]");
    }
  }

  const gmapsKey = envVars.GOOGLE_MAPS_API_KEY;
  if (!gmapsKey || gmapsKey.includes("your_google") || gmapsKey.length < 15) {
    console.log("ℹ️  Google Air Quality API: [OPTIONAL / NOT CONFIGURED] (Using OpenAQ & Replay fixtures)");
    console.log("    Enable at: https://console.cloud.google.com/apis/library/airquality.googleapis.com");
  } else {
    console.log("✅ Google Maps Air Quality Key: [FOUND]");
  }
}

async function verifySupabase() {
  const url = envVars.SUPABASE_URL;
  const anonKey = envVars.SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("your-project") || anonKey.includes("your_supabase")) {
    console.log("⚠️  Supabase Postgres: [NOT CONFIGURED] (Using in-memory data store with RLS simulation)");
    console.log("    Create free project at: https://supabase.com/");
  } else {
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        console.log("✅ Supabase Postgres: [CONNECTED]");
      } else {
        console.log(`⚠️  Supabase Postgres: [AUTH ERROR] HTTP ${res.status}`);
      }
    } catch (e) {
      console.log("⚠️  Supabase Postgres: [NETWORK / UNREACHABLE]");
    }
  }
}

async function verifyTelegram() {
  const token = envVars.TELEGRAM_BOT_TOKEN;

  if (!token || token.includes("your_telegram") || token.length < 20) {
    console.log("ℹ️  Telegram Bot: [OPTIONAL / NOT CONFIGURED] (Option B delivery channel)");
    console.log("    Create bot via: https://t.me/BotFather");
  } else {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Telegram Bot: [CONNECTED] @${data.result.username} (${data.result.first_name})`);
      } else {
        console.log(`⚠️  Telegram Bot: [INVALID TOKEN] ${data.description}`);
      }
    } catch (e) {
      console.log("⚠️  Telegram Bot: [NETWORK / TIMEOUT]");
    }
  }
}

async function run() {
  await verifyGoogle();
  await verifySupabase();
  await verifyTelegram();
  console.log("\n==========================================\n");
}

run();
