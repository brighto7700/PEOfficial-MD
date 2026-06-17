const fs = require("fs");
const readline = require("readline");
const path = require("path");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, // Clean multi-file auth tracking
  fetchLatestBaileysVersion, 
  DisconnectReason,
  Browsers 
} = require("@whiskeysockets/baileys");

const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");
const AntiLinkKick = require("./antilinkkick.js");

// 🔑 PASTE YOUR FRESH PAIRING SESSION STRING HERE DIRECTLY
const SESSION_ID = "ARSLAN-MD~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiTU9tRFdXL2JoUDBUcHpIVS9YaVUzVDRqdnlsOGpNR05KSmI5YUxDTzAyaz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQkQyb3ZKZjI1emdoeDRmc3M3V0JRZDdTeVZzbTFPSFU3ZWlLcjlDZmZCUT0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiI2RzVZT1o2RitTZkQ3U0l5NXBZR3FKWjNpL3gyZjNRcitPYU81c1JkV0ZNPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJET0VxVTR2bVI0MVFkYUFnOFEyZFZiTUdHNFh1SGhXUDVOdVErWkpYb0cwPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IlNGaUg4OWU4TXprZ0Z3SmJkanhxQ3RjM2hDRlFtTENXKzhqc1FQZEJPMG89In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6InV6QVdiS21HSVdMVUpSaVlldHJtMTdJOFMwZG5pejQzMm5hTXlMNDJUd0k9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiZU5icHhYeUlMOUU3L3BWczU1SmNZWkkxNVloMW85bWRLdURTU252R0lucz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiMEhPajVLMXZEN1ByYXNTbTJ2bFFHQ3dRVlRnSmUvL09PM0cvb1NaM0ZuOD0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IndDL3BmLytrSTFlVDNCM0Y4dnMxT25XMzYrWEJPSHpnZGE0K0lBNkZqMURhMkZQK1duOG1aTHZYTjRhVDN6ak96UzNyVUF6V0dUZktpcUhCak5UZGl3PT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MzQsImFkdlNlY3JldEtleSI6InlPYzNyeVJmOEpYaEhoWUFPb1BaaUlhaXZITTF0T3o2US9mZUFodXJVK2s9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbeyJrZXkiOnsicmVtb3RlSmlkIjoiMjM0NzA4NTA4NTIyMUBzLndoYXRzYXBwLm5ldCIsImZyb21NZSI6ZmFsc2UsImlkIjoiQUMzQkVGNjBBODFCRTg4QUVDM0UzQ0M2MzNCRTMwNTciLCJwYXJ0aWNpcGFudCI6IiIsImFkZHJlc3NpbmdNb2RlIjoicG4ifSwibWVzc2FnZVRpbWVzdGFtcCI6MTc4MTY5NzU3M30seyJrZXkiOnsicmVtb3RlSmlkIjoiMjM0NzA4NTA4NTIyMUBzLndoYXRzYXBwLm5ldCIsImZyb21NZSI6ZmFsc2UsImlkIjoiQUM5RTgyRTc0QzJCQTRENjYzQTM3MTYzRUQ2MjA5MDciLCJwYXJ0aWNpcGFudCI6IiIsImFkZHJlc3NpbmdNb2RlIjoicG4ifSwibWVzc2FnZVRpbWVzdGFtcCI6MTc4MTY5NzU3NH0seyJrZXkiOnsicmVtb3RlSmlkIjoiMjM0NzA4NTA4NTIyMUBzLndoYXRzYXBwLm5ldCIsImZyb21NZSI6ZmFsc2UsImlkIjoiQUMyMUY4NTVEMEFCNTkyN0Y4MUY1REU3NUFDNzIyMjgiLCJwYXJ0aWNpcGFudCI6IiIsImFkZHJlc3NpbmdNb2RlIjoicG4ifSwibWVzc2FnZVRpbWVzdGFtcCI6MTc4MTY5NzU3Nn0seyJrZXkiOnsicmVtb3RlSmlkIjoiMjM0NzA4NTA4NTIyMUBzLndoYXRzYXBwLm5ldCIsImZyb21NZSI6ZmFsc2UsImlkIjoiQUMyMzFFNzY0NTI0QkJGQzIwQjZGNjVCMkM0RTEzNzQiLCJwYXJ0aWNpcGFudCI6IiIsImFkZHJlc3NpbmdNb2RlIjoicG4ifSwibWVzc2FnZVRpbWVzdGFtcCI6MTc4MTY5NzU3N31dLCJuZXh0UHJlS2V5SWQiOjgxMywiZmlyc3RVbnVwbG9hZGVkUHJlS2V5SWQiOjgxMywiYWNjb3VudFN5bmNDb3VudGVyIjoxLCJhY2NvdW50U2V0dGluZ3MiOnsidW5hcmNoaXZlQ2hhdHMiOmZhbHNlfSwicmVnaXN0ZXJlZCI6dHJ1ZSwicGFpcmluZ0NvZGUiOiI2SE1IQVpSSCIsIm1lIjp7ImlkIjoiMjM0NzA4NTA4NTIyMTo3QHMud2hhdHNhcHAubmV0IiwibGlkIjoiMjQwMjI0NzM1NjAxNjk6N0BsaWQifSwiYWNjb3VudCI6eyJkZXRhaWxzIjoiQ05EQXJvVUVFSjJZeXRFR0dBRWdBQ2dBIiwiYWNjb3VudFNpZ25hdHVyZUtleSI6IlRva2tvMHBKSnVVcGsrMGc2SThrVjlBTnJWa2dKM1ZIZGFJWWhTNW9vVm89IiwiYWNjb3VudFNpZ25hdHVyZSI6ImVDenU2amtYY1kwcmFyL2QxRVdKMi9RTzROWG5oUTcreTVMMGowNDZ2V2dZdDZOTEpIQjdtLzhrTmk4b3orc0pDZkozRDdEa1dVZXM1eXJrWmVBNUJ3PT0iLCJkZXZpY2VTaWduYXR1cmUiOiJVRzlkYXJQekp3MERpbnRSanpQNm5HdGlxMmc3UXJwZzZKbk1sb2VlSFFnbXRCcmQ1U0wyeWxDcXJ5T2ZGZHFoK2NzMTA0aTllMXRvWVVrNjJHOU9nZz09In0sInNpZ25hbElkZW50aXRpZXMiOlt7ImlkZW50aWZpZXIiOnsibmFtZSI6IjI0MDIyNDczNTYwMTY5OjdAbGlkIiwiZGV2aWNlSWQiOjB9LCJpZGVudGlmaWVyS2V5Ijp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQlU2SkpLTktTU2JsS1pQdElPaVBKRmZRRGExWklDZDFSM1dpR0lVdWFLRmEifX1dLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJyb3V0aW5nSW5mbyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkNCSUlBZ2dOIn0sImxhc3RBY2NvdW50U3luY1RpbWVzdGFtcCI6MTc4MTY5NzU3MiwibXlBcHBTdGF0ZUtleUlkIjoiQUFBQUFLa0wifQ==";

if (global.isBotRunning) {
    console.log("⚠️ Guard active: Duplicate context runner thread suspended.");
    return;
}
global.isBotRunning = true;

const SESSION_DIR = path.join(__dirname, "auth_session_stable");

// Unpack the session string directly into the project directory
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

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({ 
    version, 
    auth: state, 
    logger: P({ level: "fatal" }),
    browser: Browsers.appropriate('Chrome'), // Fixed handshake signature dropping
    mobile: false
  });

  // Load configuration settings
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  let ownerRaw = settings.ownerNumber?.[0] || "2348153765443";
  const ownerJid = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";

  // Global variables initialization
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

  // Sync session state updates
  sock.ev.on("creds.update", saveCreds);

  // Handle connection events
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ [BOT ONLINE] Connected to WhatsApp successfully!");
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 500;
      const shouldReconnect = (reason !== DisconnectReason.loggedOut);
      console.log(`❌ Disconnected (${reason}). Reconnecting:`, shouldReconnect);
      if (shouldReconnect) {
          setTimeout(() => startBot(), 5000);
      } else {
          global.isBotRunning = false;
      }
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // 🔓 INTERCEPT VIEW ONCE MEDIA BEFORE IT DISAPPEARS
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
            console.log(`🚨 View Once asset intercepted from ${jid}. Downloading...`);
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

    // AntiDelete feature
    if (settings.ANTIDELETE) {
      try {
        if (msg.message) storeMessage(msg);
        if (msg.message?.protocolMessage?.type === 0) await handleMessageRevocation(sock, msg);
      } catch (err) {
        console.error("❌ AntiDelete Error:", err.message);
      }
    }

    // AutoTyping feature
    if (global.autotyping && jid !== "status@broadcast") {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(res => setTimeout(res, 2000));
      } catch (err) {
        console.error("❌ AutoTyping Error:", err.message);
      }
    }

    // AutoReact feature
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = ["❤️","☣️","🅣","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕"];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }

    // AutoStatus feature
    if (global.autostatus && jid === "status@broadcast") {
      try {
        await sock.readMessages([{ remoteJid: jid, id: msg.key.id, participant: msg.key.participant || msg.participant }]);
        console.log(`👁️ Status Seen: ${msg.key.participant || "Unknown"}`);
      } catch (err) {
        console.error("❌ AutoStatus Error:", err.message);
      }
      return;
    }

    // Antilink feature
    if (jid.endsWith("@g.us") && global.antilink[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant } }); } catch (err) { console.error("❌ Antilink Delete Error:", err.message); }
    }

    // AntilinkKick feature
    if (jid.endsWith("@g.us") && global.antilinkick[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg }); } catch (err) { console.error("❌ AntilinkKick Error:", err.message); }
    }

    // Pass down to the modular command processors
    handleCommand(sock, msg);
  });

  // AutoGreet feature
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

startBot();
