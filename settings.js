// ✅ MegaTron Bot Stylish Configuration – by 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓

// 🔗 Your WhatsApp phone numbers with country codes (No spaces, symbols, or + signs)
const ownerNumber = ['2348153765443', '2347085085221']; 

const config = {
  // 👑 Owner Info
  ownerNumber,                          // 🔹 Array of Owner Numbers
  ownerName: '𓆩 *Bright Emmanuel* *❦︎𓆪',     // 🔹 Displayed in Greetings
  botName: '🤖 *_𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿-𝑉1.5_* ⚡',           // 🔹 Bot Display Name
  signature: '> 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓',               // 🔹 Footer on Bot Replies
  youtube: 'https://www.youtube.com/@PEOfficialTech', // 🔹 Optional YouTube

  // ⚙️ Feature Toggles
  autoTyping: false,        // ⌨️ Fake Typing
  autoReact: false,         // 💖 Auto Emoji Reaction
  autoStatusView: true,    // 👁️ Auto-View Status
  public: false,             // 🌍 Public or Private Mode (False means only owners can use commands)
  antiLink: false,          // 🚫 Delete Links in Groups
  antiBug: false,           // 🛡️ Prevent Malicious Crashes
  greetings: true,          // 🙋 Welcome/Farewell Messages
  readmore: false,          // 📜 Readmore in Long Replies
  ANTIDELETE: true          // 🗑️ Anti-Delete Messages (Includes View-Once protection)
};

// ✅ Register owner(s) globally in WhatsApp JID format
global.owner = (
  Array.isArray(ownerNumber) ? ownerNumber : [ownerNumber]
).map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');

// ⚙️ Export Settings Loader
function loadSettings() {
  return config;
}

module.exports = { loadSettings };
