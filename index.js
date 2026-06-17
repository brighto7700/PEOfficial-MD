const fs = require("fs");
const readline = require("readline");
const path = require("path");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, // Updated to multi-file auth state tracking
  fetchLatestBaileysVersion, 
  DisconnectReason,
  Browsers // Added native helper array maps
} = require("@whiskeysockets/baileys");

const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");
const AntiLinkKick = require("./antilinkkick.js");

// 🔑 PASTE YOUR FRESH PAIRING SESSION STRING HERE DIRECTLY
const SESSION_ID = "ARSLAN-MD~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQU14NEI2cVVlWFVzbTlPYWtsZG4vaWh3N3p2T2ZRMXJKU0ZjYVppbmgzUT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiWklzZUJodlI1UDBTeEQzbkFvL0g1VWIrdklvRHNHRXljWDlEOE5XOE5sST0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJzQXlPL1dJUk51SERmM0pqb1NGTmtMOXRjaDh1bGpwOXFIanJLZlpFK2xBPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJnSlFQTVBwbHhwK2JMUjBneXFLWldXZ0VxMHRWcVRVR2ZjbUdJZEhZYWg0PSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkVJbnlxNjVlN1h5dWNuTlducENSQXJqaWNvazB3OGdlZGp0a1RmSm9VMDA9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkZQc1JINUV5SmZIQk95UnhKMFlGY0NIUjk2NTN4YnNsQWREM2NjRmRQUm89In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ1BrMHA0Rkc4cm96eTJzTGZNODQ2NnFlMnR0SGhaa05lL1NQUlI1bVdHdz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiWUxDNFloM3NzSEIyeWZZdFJObFRtak9IV0szL1BHQ0tQTCt4K2pab3puaz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IklsOWVLVmJnbTBpZVpSMWdvWTAxeEdhYm9lZnNxZU9rL3g5SVhKanZKWHVObFJTSGxMVTVSV1VRTG5zOW9TWjdyajhhQ0RtdXE4RUJqK2d2ZnJzWUNBPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MywiYWR2U2VjcmV0S2V5IjoiMTBGTkVqbDRsUCtXWjhYSkh2dUxLbWkwMlVtUlU0N296dVRteFVlalFxRT0iLCJwcm9jZXNzZWRIaXN0b3J5TWVzc2FnZXMiOlt7ImtleSI6eyJyZW1vdGVKaWQiOiIyMzQ3MDg1MDg1MjIxQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjpmYWxzZSwiaWQiOiJBQ0Q1ODJBNTY4NjJGQTk4MUM5M0E2OEZBRjQzNjI3NiIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxNjU1NTczfSx7ImtleSI6eyJyZW1vdGVKaWQiOiIyMzQ3MDg1MDg1MjIxQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjpmYWxzZSwiaWQiOiJBQ0E3NUI2QzAxNjc4NjlCQTNGMUMxRDU5NkQ2RDlEQiIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxNjU1NTc1fSx7ImtleSI6eyJyZW1vdGVKaWQiOiIyMzQ3MDg1MDg1MjIxQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjpmYWxzZSwiaWQiOiJBQ0E2NzIyRjZFNzdFNkE3MzA1OUUwNjJFOTY3NUZEOSIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxNjU1NTc1fSx7ImtleSI6eyJyZW1vdGVKaWQiOiIyMzQ3MDg1MDg1MjIxQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjpmYWxzZSwiaWQiOiJBQ0Y4QTZCMjU4QzNBMjU3OURBMjExRjdFNkYxMTc1RiIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxNjU1NTc1fSx7ImtleSI6eyJyZW1vdGVKaWQiOiIyMzQ3MDg1MDg1MjIxQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjpmYWxzZSwiaWQiOiJBQzBBOURGMEFENUEwM0I3RjA5N0IyRDEwMEFCNTUxMiIsInBhcnRpY2lwYW50IjoiIiwiYWRkcmVzc2luZ01vZGUiOiJwbiJ9LCJtZXNzYWdlVGltZXN0YW1wIjoxNzgxNjU1NTc4fV0sIm5leHRQcmVLZXlJZCI6ODEzLCJmaXJzdFVudXBsb2FkZWRQcmVLZXlJZCI6ODEzLCJhY2NvdW50U3luY0NvdW50ZXIiOjEsImFjY291bnRTZXR0aW5ncyI6eyJ1bmFyY2hpdmVDaGF0cyI6ZmFsc2V9LCJyZWdpc3RlcmVkIjp0cnVlLCJwYWlyaW5nQ29kZSI6Ilg1VjI3RVZDIiwibWUiOnsiaWQiOiIyMzQ3MDg1MDg1MjIxOjZAcy53aGF0c2FwcC5uZXQiLCJsaWQiOiIyNDAyMjQ3MzU2MDE2OTo2QGxpZCIsIm5hbWUiOiJCbGF6ZSJ9LCJhY2NvdW50Ijp7ImRldGFpbHMiOiJDTS9Bcm9VRUVJelF4OUVHR0FFZ0FDZ0EiLCJhY2NvdW50U2lnbmF0dXJlS2V5IjoiVG9ra28wcEpKdVVwayswZzZJOGtWOUFOclZrZ0ozVkhkYUlZaFM1b29Wbz0iLCJhY2NvdW50U2lnbmF0dXJlIjoieDNOb2c0MVY0ZjMxQVhmVldudUoreFByNWlIbFpHNWtQa0hRY2ExWWUxVDB5eDFBV3ZnN2craTQ2ek9GWWo0c2d5ZkFJU2pYWFpKZm8zUDhHaTExQ2c9PSIsImRldmljZVNpZ25hdHVyZSI6IjJxeEdpTmF4a09GQVFUWHM5b0hEdjgvdzB0blZDSk5nWmExNEVMNTFYbHphUS9ZeXFuV0VHZEZRRlA2eWZCa0YxN2w2cVNQYWMxclNKRlV4SXV1NERRPT0ifSwic2lnbmFsSWRlbnRpdGllcyI6W3siaWRlbnRpZmllciI6eyJuYW1lIjoiMjQwMjI0NzM1NjAxNjk6NkBsaWQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCVTZKSktOS1NTYmxLWlB0SU9pUEpGZlFEYTFaSUNkMVIzV2lHSVV1YUtGYSJ9fV0sInBsYXRmb3JtIjoiYW5kcm9pZCIsInJvdXRpbmdJbmZvIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ0JJSUFnZ04ifSwibGFzdEFjY291bnRTeW5jVGltZXN0YW1wIjoxNzgxNjU1NTcxLCJteUFwcFN0YXRlS2V5SWQiOiJBQUFBQURQbCJ9";

if (global.isBotRunning) {
    console.log("⚠️ Guard active: Duplicate context runner thread suspended.");
    return;
}
global.isBotRunning = true;

const SESSION_DIR = path.join(__dirname, "auth_session_stable");

// Pre-initialize configuration folders to parse incoming string elements cleanly
function initSessionSpace() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
    const credsFilePath = path.join(SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsFilePath)) {
        try {
            const base64Data = SESSION_ID.split('~')[1];
            if (!base64Data) throw new Error("Malformed session configuration structure signature.");
            const decodedJsonText = Buffer.from(base64Data, 'base64').toString('utf-8');
            fs.writeFileSync(credsFilePath, decodedJsonText, 'utf-8');
            console.log("📁 Credentials storage written to active disk.");
        } catch (error) {
            console.error("❌ Credentials extraction error:", error.message);
        }
    }
}

initSessionSpace();

const { state, saveCreds } = useMultiFileAuthState(SESSION_DIR);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({ 
    version, 
    auth: state, 
    logger: P({ level: "fatal" }),
    browser: Browsers.appropriate('Chrome'), // Fixes standard signature connection drops
    mobile: false
  });

  // Load settings
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  let ownerRaw = settings.ownerNumber?.[0] || "92300xxxxxxx";
  const ownerJid = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";

  // Global flags config
  global.sock = sock;
  global.settings = settings;
  global.signature = settings.signature || "> 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓";
  global.owner = ownerJid;
  global.ownerNumber = ownerRaw;
  global.antilink = {};
  global.antilinkick = {};
  global.autogreet = {};
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;

  console.log("✅ BOT OWNER ASSIGNED:", global.owner);

  // Sync state tracking parameters
  sock.ev.on("creds.update", saveCreds);

  // Connection handling logic
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ [BOT ONLINE] Connected to WhatsApp via Session String!");
      rl.close();
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = (reason !== DisconnectReason.loggedOut);
      console.log(`❌ Disconnected (${reason}). Reconnecting:`, shouldReconnect);
      if (shouldReconnect) {
          setTimeout(() => startBot(), 5000);
      } else {
          global.isBotRunning = false;
      }
    }
  });

  // Message events processing hub
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // View-Once Anti-Delete Media Parsing Filter Hook
    const messageType = Object.keys(msg.message)[0];
    let viewOnceContent = null;
    let mediaType = "";

    if (messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2') {
        const viewOnceMsg = msg.message[messageType].message;
        mediaType = Object.keys(viewOnceMsg)[0]; 
        viewOnceContent = viewOnceMsg[mediaType];
    }

    if (viewOnceContent) {
        try {
            console.log(`🚨 View Once asset intercepted from ${jid}. Downloading buffer...`);
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            
            const stream = await downloadContentFromMessage(
                viewOnceContent, 
                mediaType === 'imageMessage' ? 'image' : 'video'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const captionText = `🔓 *Anti-View Once System Success!*\n\n📝 *Caption:* ${viewOnceContent.caption || 'None'}`;

            if (mediaType === 'imageMessage') {
                await sock.sendMessage(jid, { image: buffer, caption: captionText }, { quoted: msg });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(jid, { video: buffer, caption: captionText }, { quoted: msg });
            }
        } catch (err) {
            console.error("❌ View-Once Interceptor Error:", err.message);
        }
    }

    // Core AntiDelete
    if (settings.ANTIDELETE) {
      try {
        if (msg.message) storeMessage(msg);
        if (msg.message?.protocolMessage?.type === 0) await handleMessageRevocation(sock, msg);
      } catch (err) {
        console.error("❌ AntiDelete Error:", err.message);
      }
    }

    // AutoTyping
    if (global.autotyping && jid !== "status@broadcast") {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(res => setTimeout(res, 2000));
      } catch (err) {
        console.error("❌ AutoTyping Error:", err.message);
      }
    }

    // AutoReact
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = ["❤️","☣️","🅣","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕"];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }

    // AutoStatus
    if (global.autostatus && jid === "status@broadcast") {
      try {
        await sock.readMessages([{ remoteJid: jid, id: msg.key.id, participant: msg.key.participant || msg.participant }]);
        console.log(`👁️ Status Seen: ${msg.key.participant || "Unknown"}`);
      } catch (err) {
        console.error("❌ AutoStatus Error:", err.message);
      }
      return;
    }

    // Antilink
    if (jid.endsWith("@g.us") && global.antilink[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant || msg.key.participant } }); } catch (err) { console.error("❌ Antilink Delete Error:", err.message); }
    }

    // AntilinkKick
    if (jid.endsWith("@g.us") && global.antilinkick[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg }); } catch (err) { console.error("❌ AntilinkKick Error:", err.message); }
    }

    // Pass downstream to plugin case processor
    handleCommand(sock, msg);
  });

  // AutoGreet event hook
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;
    if (!global.autogreet[id]) return;

    try {
      const metadata = await sock.groupMetadata(id);
      const memberCount = metadata.participants.length;
      const groupName = metadata.subject || "Unnamed Group";

      for (const user of participants) {
        const tag = `@${user.split("@")[0]}`;
        let message = "";
        if (action === "add") message = `👋 Welcome ${tag} to ${groupName} ⚡ Members: ${memberCount}`;
        else if (action === "remove") message = `💔 ${tag} left ${groupName} ⚡ Members: ${memberCount - 1}`;
        if (message) await sock.sendMessage(id, { text: message, mentions: [user] });
      }
    } catch (err) {
      console.error("❌ AutoGreet Error:", err.message);
    }
  });
}

// Instantiate the environment engine 
startBot();
