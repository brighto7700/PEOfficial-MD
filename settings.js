// ✅ MegaTron Bot Stylish Configuration – by 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓

const ownerNumber = ['2348153765443', '2347085085221']; 

const config = {
  ownerNumber,                         
  ownerName: '𓆩 *Bright Emmanuel* *❦︎𓆪',              
  botName: '🤖 *_𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿-𝑉1.5_* ❦_*',           
  signature: '> 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓',               
  youtube: 'https://www.youtube.com/@PEOfficialTech', 

  autoTyping: false,        
  autoReact: false,         
  autoStatusView: true,    
  public: false,             
  antiLink: false,          
  antiBug: false,           
  greetings: true,          
  readmore: false,          
  ANTIDELETE: true          
};

global.owner = (
  Array.isArray(ownerNumber) ? ownerNumber : [ownerNumber]
).map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');

function loadSettings() {
  return config;
}

module.exports = { loadSettings };
