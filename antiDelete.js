const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "antidelete.json");

function loadDb() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}), "utf-8");
  }
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (e) {
    return {};
  }
}

function saveDb(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
}

function storeMessage(msg) {
  const db = loadDb();
  const id = msg.key.id;
  db[id] = msg;
  saveDb(db);
}

async function handleMessageRevocation(sock, msg) {
  const db = loadDb();
  const targetId = msg.message.protocolMessage.key.id;
  const savedMsg = db[targetId];

  if (savedMsg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: "🚨 *Anti-Delete Intercepted a Message!*" });
    await sock.sendMessage(jid, { forward: savedMsg }, { quoted: savedMsg });
  }
}

function toggleAntidelete({ reply }) {
  global.settings.ANTIDELETE = !global.settings.ANTIDELETE;
  return reply(`🗑️ Anti-Delete feature toggled: *${global.settings.ANTIDELETE ? "ON" : "OFF"}*`);
}

module.exports = { storeMessage, handleMessageRevocation, toggleAntidelete };
