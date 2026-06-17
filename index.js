const fs = require("fs");
const readline = require("readline");
const path = require("path");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");

const { handleCommand } = require("./menu/Case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antiDelete");

// 🔑 PASTE YOUR FRESH PAIRING SESSION STRING HERE DIRECTLY
const SESSION_ID = "PASTE_YOUR_NEW_ARSLAN_MD_STRING_HERE";

if (global.isBotRunning) {
    console.log("⚠️ Guard active: Duplicate context runner thread suspended.");
    return;
}
global.isBotRunning = true;

const SESSION_DIR = path.join(__dirname, "auth_session_stable");

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
    browser: Browsers.appropriate('Chrome'),
    mobile: false
  });

  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  let ownerRaw = settings.ownerNumber?.[0] || "2348153765443";
  const ownerJid = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";

  global.sock = sock;
  global.settings = settings;
  global.signature = settings.signature || "> 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓";
  global.owner = ownerJid;
  global.ownerNumber = ownerRaw;
  global.antilink = {};
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;

  console.log("✅ BOT OWNER ASSIGNED:", global.owner);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ [BOT ONLINE] Connected to WhatsApp successfully!");
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode || 500;
      const shouldReconnect = (reason !== DisconnectReason.loggedOut);
      console.log(`❌ Disconnected (${reason}). Reconnecting:`, shouldReconnect);
      if (shouldReconnect) {
          setTimeout(() => startBot(), 5000);
      } else {
          global.isBotRunning = false;
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // 🔓 VIEW ONCE INTERCEPTOR ENGINE
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
      } catch (err) {}
    }

    // AutoReact feature
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = ["❤️","🧡","💛","💚","💙","💜","🖤"];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {}
    }

    // AutoStatus feature
    if (global.autostatus && jid === "status@broadcast") {
      try {
        await sock.readMessages([{ remoteJid: jid, id: msg.key.id, participant: msg.key.participant || msg.participant }]);
      } catch (err) {}
      return;
    }

    // Antilink feature
    if (jid.endsWith("@g.us") && global.antilink[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me)/i.test(text)) {
      try { await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant } }); } catch (err) {}
    }

    handleCommand(sock, msg);
  });
}

startBot();
