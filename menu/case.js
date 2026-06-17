const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const { toggleAntidelete } = require("../antiDelete");

if (!global.mode) global.mode = "self";

const ownerOnlyCommands = [
  "shutdown", "restart", "setbio", "setname", "setpp", "save",
  "antilink", "autostatus", "autoreact", "autotyping"
];

const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  if (fs.existsSync(menuPath)) {
    Object.assign(menuData, require(menuPath));
  }
} catch (err) {
  console.error("❌ Error loading menu.js:", err);
}

let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  if (fs.existsSync(corePath)) {
    core = require(corePath);
  }
} catch (err) {
  console.error("❌ Error loading core.js:", err);
}

async function handleCommand(conn, msg) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!text.startsWith(".")) return;

  const parts = text.trim().split(/ +/);
  const command = parts[0].slice(1).toLowerCase();
  const args = parts.slice(1);

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderId = msg.key.fromMe
    ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
    : msg.key.participant || msg.key.remoteJid;

  const senderNum = senderId.replace(/\D/g, "");
  const botNum = (conn.user.id || "").replace(/\D/g, "");
  const isOwner = senderNum.slice(0, 10) === botNum.slice(0, 10);

  const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: msg });

  if (command === "self") {
    if (!isOwner) return reply("🚫 *Only Owner Can Switch Modes*");
    global.mode = "self";
    return reply("🔒 BOT IS NOW IN *SELF MODE*");
  }

  if (command === "public") {
    if (!isOwner) return reply("🚫 *Only Owner Can Switch Modes*");
    global.mode = "public";
    return reply("🌍 BOT IS NOW IN *PUBLIC MODE*");
  }

  if (global.mode === "self" && !isOwner && !["menu", "repo"].includes(command)) {
    return;
  }

  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!*");
  }

  return runCommand({ conn, msg, args, command, chatId, isGroup, senderNum, reply });
}

async function runCommand({ conn, msg, args, command, chatId, isGroup, senderNum, reply }) {
  try {
    if (command === "idcheck") {
      return reply(`🤖 *Bot ID:* ${conn.user.id}\n📤 *Sender JID:* ${msg.key.participant || msg.key.remoteJid}`);
    }

    if (menuData[command]) {
      try {
        const media = await prepareWAMessageMedia(
          { image: { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800" } }, 
          { upload: conn.waUploadToServer }
        );

        const menuMessage = generateWAMessageFromContent(
          chatId,
          { imageMessage: { ...media.imageMessage, caption: menuData[command] } },
          { userJid: chatId }
        );

        return await conn.relayMessage(chatId, menuMessage.message, { messageId: menuMessage.key.id });
      } catch (err) {
        return reply(menuData[command]);
      }
    }

    if (command === "antidelete") {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
    }

    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      const commandFile = require(filePath);
      if (typeof commandFile === "function") {
        return await commandFile({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
      }
    }

    return reply("*ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ! ᴛʀʏ `.ᴍᴇɴᴜ`*");
  } catch (err) {
    console.error(err);
  }
}

module.exports = { handleCommand };
