const { Telegraf } = require('telegraf');
const fs = require('fs-extra');
process.on(
    "unhandledRejection",
    err => {

        console.log(
            "UNHANDLED:",
            err
        )

    }
)

process.on(
    "uncaughtException",
    err => {

        console.log(
            "UNCAUGHT:",
            err
        )

    }
)
const axios = require('axios');
const vm = require('vm');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const archiver  = require("archiver")
const chokidar  = require("chokidar")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  generateForwardMessageContent,
  prepareWAMessageMedia,
  proto,
  jidDecode,
  areJidsSameUser,
} = require("@bellachu/baileys")
const config = require('./config');
const updater = require("./updater");
const updateLink = require("./updatelink");

console.clear()
console.log(chalk.green(`
▀█▀ █░█ █▀ ░█▀▄ █▀▀▄ ▄▀▄ ▀█▀ ▄▀▄ ▀█▀ █░█ █▀▄ █▀
░█░ █▀█ █▀ ░█▄█ █▐█▀ █░█ ░█░ █░█ ░█░ ▀▄▀ █▄█ █▀
░▀░ ▀░▀ ▀▀ ░▀░░ ▀░▀▀ ░▀░ ░▀░ ░▀░ ░▀░ ░▀░ ▀░░ ▀▀
`));
console.log(chalk.cyan(`🔥 THE PROTOTYPE ZERO 🔥
👑 𝖮𝗐𝗇𝖾𝗋    : @SabilOfficial
🌐 𝖵𝖾𝗋𝗌𝗂𝗈𝗇   : 𝟣 Gen 𝟤
🚧 𝖫𝖺𝗇𝗀𝗎𝖺𝗀𝖾 : JavaScript / 𝖩𝖲
🤖 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖡𝗈𝗍 Acctive`));
const bot = new Telegraf(config.BOT_TOKEN);
// =============================
// LOG AKTIVITAS USER ONLY
// =============================
bot.use(async (ctx, next) => {

    // hanya message text
    if (!ctx.message?.text) {
        return next()
    }

    const text =
        ctx.message.text

    // hanya command
    if (!text.startsWith("/")) {
        return next()
    }

    const user =
        ctx.from

    const userId =
        Number(user.id)

    // skip owner
    if (userId === config.OWNER_ID) {
        return next()
    }

    // waktu
    const waktu =
        new Date().toLocaleString(
            "id-ID"
        )

    // ambil cmd
    const cmd =
        text.split(" ")[0]

    // ambil args
    const args =
        text.split(" ")
        .slice(1)
        .join(" ") || "-"

    // username
    const username =
        user.username
        ? "@" + user.username
        : "Tidak ada"

    // mention
    const mention =
`${ctx.from.first_name}`

    // kirim log ke owner
    await bot.telegram.sendMessage(
        config.OWNER_ID,
`\`\`\`js
╔═══════ ೋღ 🌺 ღೋ ═══════╗
     Aktifitas-User-Terdeteksi
╚═══════ ೋღ 🌺 ღೋ ═══════╝
👤 USER : ${mention}
👥 USERNAME : ${username}
🆔 ID : ${userId}
⚡ COMMAND : ${cmd}
🕒 WAKTU : ${waktu}\`\`\`
`,
        {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }
    ).catch(() => {})

    return next()

})

const CHAT_SESSION = {}
const REPLY_MAP = {}
const WAITING_UPDATE_LINK = {}
const UPDATE_FLAG = "./update.flag"
// ==================== SESSION PER USER ====================
const userSessions = new Map(); // userId -> Map of senderKey -> sock
const senderStatus = new Map(); // senderKey -> status online
const waitingForConnect = new Map(); // userId -> waiting for number
const waitingForTestFunc = new Map(); // userId -> { target, loop, funcCode }

// Backup Files Jirr
const BACKUP_OWNER_ID = config.OWNER_ID

const BACKUP_DIR =
path.join(__dirname, "backup")

// =============================
// CREATE BACKUP DIR
// =============================
if (!fs.existsSync(BACKUP_DIR)) {

    fs.mkdirSync(
        BACKUP_DIR,
        {
            recursive: true
        }
    )
}
// ==================== DATABASE AKSES USER ====================
const ACCESS_FILE = './akses.json';

function loadAkses() {
    if (!fs.existsSync(ACCESS_FILE)) fs.writeJsonSync(ACCESS_FILE, { users: {} });
    return fs.readJsonSync(ACCESS_FILE);
}
function saveAkses(data) { fs.writeJsonSync(ACCESS_FILE, data, { spaces: 2 }); }
function isUserHasAccess(userId) {
    const data = loadAkses();
    return data.users[userId] === true;
}
function setUserAccess(userId, hasAccess) {
    const data = loadAkses();
    if (hasAccess) data.users[userId] = true;
    else delete data.users[userId];
    saveAkses(data);
}

// ==================== CEK JOIN CHANNEL ====================
async function isUserJoinedChannel(userId) {
    try {
        if (!config.CHANNEL_USERNAME || config.CHANNEL_USERNAME === "namachannel") return true;
        const channelUsername = config.CHANNEL_USERNAME.replace('@', '');
        const chatMember = await bot.telegram.getChatMember(`@${channelUsername}`, userId);
        return ['creator', 'administrator', 'member', 'restricted'].includes(chatMember.status);
    } catch (err) {
        return true;
    }
}

// ==================== PATH SESSION ====================
const SESSIONS_DIR = './wa_sessions';
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
function sessionPath(senderKey) {
    return path.join(SESSIONS_DIR, senderKey);
}

// ==================== FILE AKTIF ====================
const FILE_ACTIVE = './active_senders.json';
function loadActiveSenders() {
    if (fs.existsSync(FILE_ACTIVE)) return fs.readJsonSync(FILE_ACTIVE);
    return [];
}
function saveActiveSenders(data) { fs.writeJsonSync(FILE_ACTIVE, data, { spaces: 2 }); }
function addActiveSender(senderKey, userId) {
    const data = loadActiveSenders();
    if (!data.find(s => s.sender === senderKey)) {
        data.push({ sender: senderKey, userId });
        saveActiveSenders(data);
    }
}
function removeActiveSender(senderKey) {
    const data = loadActiveSenders().filter(s => s.sender !== senderKey);
    saveActiveSenders(data);
}

// ==================== GET RUNTIME ====================
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}ᴅ, ${hours}ʜ, ${minutes}ᴍ, ${secs}s`
}

const startTime = Math.floor(Date.now() / 1000);

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

// ==================== GET MEMORY ====================
function getMemoryUsage() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return `${Math.round(used)} MB`;
}

// ==================== ESCAPE HTML ====================
function esc(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ==================== SLEEP ====================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ==================== DOWNLOAD FILE TELEGRAM ====================
async function downloadTgFile(telegram, fileId) {
    const file = await telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: 'text' });
    return response.data;
}

// ==================== CEK SYNTAX ERROR DENGAN ACORN ====================
function analyseCode(code) {
    try {
        acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
        return {
            hasError: false,
            errorMsg: null,
            errorLine: null,
            fixSuggest: null,
            annotated: null
        };
    } catch (err) {
        const errorLine = err.loc?.line || '?';
        const errorColumn = err.loc?.column || '?';
        const errorMsg = err.message;
        
        // Ambil cuplikan kode di sekitar error
        const lines = code.split('\n');
        const startLine = Math.max(0, errorLine - 3);
        const endLine = Math.min(lines.length, errorLine + 2);
        let annotated = '';
        for (let i = startLine; i < endLine; i++) {
            const lineNum = i + 1;
            const prefix = lineNum === errorLine ? '👉 ' : '   ';
            annotated += `${prefix}${lineNum}: ${lines[i]}\n`;
            if (lineNum === errorLine) {
                annotated += `      ${' '.repeat(errorColumn - 1)}^\n`;
            }
        }
        
        // Saran perbaikan berdasarkan error
        let fixSuggest = '';
        if (errorMsg.includes('Unexpected token')) {
            fixSuggest = 'Periksa tanda kurung, kurung kurawal, atau titik koma yang mungkin kurang/berlebih.';
        } else if (errorMsg.includes('Unexpected end of input')) {
            fixSuggest = 'Ada kurung buka atau kurung kurawal yang tidak ditutup. Periksa pasangan { } ( ) [ ]';
        } else if (errorMsg.includes('Identifier')) {
            fixSuggest = 'Cek nama variabel atau fungsi. Mungkin menggunakan kata kunci reserved.';
        } else if (errorMsg.includes('string')) {
            fixSuggest = 'Cek string yang tidak ditutup dengan benar (kutip atau petik dua).';
        } else {
            fixSuggest = 'Periksa kode di sekitar baris error. Mungkin ada sintaks yang salah.';
        }
        
        return {
            hasError: true,
            errorMsg: errorMsg,
            errorLine: errorLine,
            fixSuggest: fixSuggest,
            annotated: annotated
        };
    }
}

// ==================== CREATE SAFE SOCK ====================
function createSafeSock(sock) {
    return new Proxy(sock, {
        get(target, prop) {
            if (typeof target[prop] === 'function') {
                return async (...args) => {
                    try {
                        return await target[prop](...args);
                    } catch (err) {
                        console.error(`[SafeSock] Error in ${prop}:`, err.message);
                        throw err;
                    }
                };
            }
            return target[prop];
        }
    });
}

// ==================== HANDLE WA MESSAGE ====================
async function handleWAMsg(sock, msg, senderKey) {
    console.log(chalk.red(`📩 WA Message from ${senderKey}:`, msg.key.remoteJid));
}

function attachWAHandler(sock, senderKey) {
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;
            try {
                await handleWAMsg(sock, msg, senderKey);
            } catch (e) {
                console.error(`WA[${senderKey}] error:`, e.message);
            }
        }
    });
}

// ==================== KONEKSI SINGLE (RESTORE) ====================
async function connectSingle(senderKey, userId) {
    const dir = sessionPath(senderKey);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        defaultQueryTimeoutMs: undefined
    });

    if (!userSessions.has(userId)) userSessions.set(userId, new Map());
    userSessions.get(userId).set(senderKey, sock);
    senderStatus.set(senderKey, false);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
            senderStatus.set(senderKey, true);
            addActiveSender(senderKey, userId);
            console.log(chalk.green(`
Infotmation
Status : ✅ Whatsapp Connect
Number : ${senderKey} 
Users : (user: ${userId})`));
        }
        if (connection === "close") {
            senderStatus.set(senderKey, false);
            userSessions.get(userId)?.delete(senderKey);
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                console.log(`🔄 WA Reconnecting · ${senderKey}`);
                setTimeout(() => connectSingle(senderKey, userId), 4000);
            } else {
                console.log(`❌ WA Logged Out · ${senderKey}`);
                senderStatus.delete(senderKey);
                removeActiveSender(senderKey);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
    attachWAHandler(sock, senderKey);
    return sock;
}

// ==================== KONEKSI BARU (PAIRING) ====================
async function connectNew(senderKey, userId, chatId, telegram) {
    const dir = sessionPath(senderKey);
    const { state, saveCreds } = await useMultiFileAuthState(dir);

    const statusMsg = await telegram.sendMessage(chatId,
        `<blockquote><b>⏳ Memulai pairing untuk</b>${senderKey}...\nHarap tunggu...</blockquote>`,
        { parse_mode: "HTML" });
    const msgId = statusMsg.message_id;
    const edit = text => telegram.editMessageText(chatId, msgId, null, text, { parse_mode: "HTML" }).catch(() => {});

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        defaultQueryTimeoutMs: undefined,
        // Support WhatsApp Business
        version: [2, 2341, 10]
    });

    if (!userSessions.has(userId)) userSessions.set(userId, new Map());
    userSessions.get(userId).set(senderKey, sock);
    senderStatus.set(senderKey, false);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "connecting") {
            await sleep(1500);
            try {
                const credsFile = path.join(dir, "creds.json");
                if (!fs.existsSync(credsFile)) {
                    const raw = await sock.requestPairingCode(senderKey);
                    const code = raw.match(/.{1,4}/g)?.join("-") || raw;
                    await edit(
                        `
<blockquote><b>🔐 Pairing WhatsApp</b></blockquote>
<blockquote><b>📱 Nomor</b> : <code>${senderKey}</code>
<b>🔢 Kode</b>  : <code>${code}</code></blockquote>
<blockquote><b>📌 Langkah:</b>
1. Buka WhatsApp/WhatsApp Business
2. ⋮ → Perangkat Tertaut
3. Tautkan Perangkat
4. Masukkan kode di atas</blockquote>
<i>Kode berlaku beberapa menit</i>`);
                }
            } catch (e) {
                await edit(`<blockquote>❗ Gagal generate kode\n\n<code>${e.message}</code>\n\nCoba lagi nanti.</blockquote>`);
            }
        }

        if (connection === "open") {
            senderStatus.set(senderKey, true);
            addActiveSender(senderKey, userId);
            await edit(`
<blockquote>
█▀ █▀█ █▄░█ █▄░█ █▀▀ █▀ ▀█▀
█▄ █▄█ █░▀█ █░▀█ ██▄ █▄ ░█░</blockquote>\n\n<blockquote>📱 Nomor: <code>${senderKey}</code>\n✅ Status: Online</blockquote>`);
            console.log(chalk.cyan(`
             Infotmation
             Status : ✅ Whatsapp Connect
             Number : ${senderKey} 
             Users : (user: ${userId})`));
            attachWAHandler(sock, senderKey);
        }

        if (connection === "close") {
            senderStatus.set(senderKey, false);
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code >= 500 && code < 600) {
                userSessions.get(userId)?.delete(senderKey);
                await edit(`<blockquote>⏳ Menghubungkan ulang <code>${senderKey}</code></blockquote>`);
                return connectNew(senderKey, userId, chatId, telegram);
            }
            await edit(`
<blockquote>
█▀▀ ▄▀█ █▀▀ ▄▀█ █░
█▄█ █▀█ █▄█ █▀█ █▄</blockquote>\n\n<blockquote>📱 Nomor: <code>${senderKey}</code>\n⚠️ Sesi tidak valid\n\nCoba /connect ${senderKey}</blockquote>`);
            userSessions.get(userId)?.delete(senderKey);
            senderStatus.delete(senderKey);
            removeActiveSender(senderKey);
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
        }
    });

    sock.ev.on("creds.update", saveCreds);
    return sock;
}

// ==================== FUNCTION ====================
async function checkJoin(userId) {
    try {
        const member = await bot.telegram.getChatMember(
            config.CHANNEL_USERNAME,
            userId
        );

        const validStatus = [
            "creator",
            "administrator",
            "member"
        ];

        return validStatus.includes(member.status);
    } catch (err) {
        console.error('Check join error:', err.message);
        return false;
    }
}

// ==================== FUNCTION 2: MIDDLEWARE ONLY JOIN CHANNEL ====================
const onlyJoinChannel = async (ctx, next) => {
    const userId = ctx.from?.id;

    // Safety check
    if (!userId) return ctx.reply("❌ User tidak valid.");

    // Owner bypass
    if (userId === config.OWNER_ID) {
        return next();
    }

    try {
        const isJoined = await checkJoin(userId);

        if (!isJoined) {
            return ctx.reply(
                "🔐 Kamu harus join channel terlebih dahulu sebelum menggunakan.",
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "✔ 𝖲𝗎𝖽𝖺𝗁 𝖩𝗈𝗂𝗇",
                                    callback_data: "check_join",
                                    style: "danger"
                                }
                            ]
                        ]
                    }
                }
            );
        }

        return next();
    } catch (err) {
        console.error("Join check error:", err);
        return ctx.reply("❌ Gagal mengecek status channel.");
    }
};

// Keyboard tempe
const keyboard1 = {
    inline_keyboard: [
        [
          { text: "🧸 𝚃𝙴𝚂𝚃 𝙵𝚄𝙽𝙲𝚃𝙸𝙾𝙽 🧸", callback_data: "test_func", style: "success" },
          { text: "⚙️ 𝚃𝚄𝚃𝙾𝚁𝙸𝙰𝙻 ⚙️", callback_data: "tutor_menu", style: "success" }
        ],
        [
          { text: "🔔 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 🔔", url: "t.me/aboutbil", style: "primary" },
          { text: "👑 𝙾𝚆𝙽𝙴𝚁 👑", url: "t.me/sabilofficial", style: "primary" }
        ]
      ]
   };
   
const keyboard2 = {
    inline_keyboard: [
        [
          { text: "⪨ 𝙱𝙰𝙲𝙺", callback_data: "main_menu", style: "success" }
        ],
        [
          { text: "🔔 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 🔔", url: "t.me/aboutbil", style: "primary" },
          { text: "👑 𝙾𝚆𝙽𝙴𝚁 👑", url: "t.me/sabilofficial", style: "primary" }
        ]
     ]
  };
        


// ==================== KIRIM DENGAN THUMBNAIL ====================
async function sendWithThumbnail(ctx, text, extra = {}) {
    try {
        if (config.THUMBNAIL_URL && config.THUMBNAIL_URL.startsWith('http')) {
            await ctx.replyWithPhoto({ url: config.THUMBNAIL_URL }, { caption: text, parse_mode: 'HTML', ...extra });
        } else {
            await ctx.reply(text, { parse_mode: 'HTML', ...extra });
        }
    } catch (err) {
        await ctx.reply(text, { parse_mode: 'HTML', ...extra });
    }
}
// ==================== COMMAND /START ====================
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    setUserAccess(userId, true);
    
    try {

    await ctx.telegram.sendChatAction(
        ctx.chat.id,
        "typing"
    )

    await new Promise(
        resolve =>
        setTimeout(
            resolve,
            1000
        )
    )

} catch (err) {

    console.log(
        "Typing Error:",
        err.message
    )

}
    const menuText = await getMenuText(ctx);
   
    
    await sendWithThumbnail(ctx, menuText, { reply_markup: keyboard1 });
});

async function getMenuText(ctx) {

    const runtime = getBotRuntime();
    const memory = getMemoryUsage();
    
    return `
<blockquote>𝖮𝗅𝖺𝖺. ${ctx.from.first_name}  𝖨𝗇 𝖡𝗈𝗍 𝖳𝖾𝗌𝗍𝖥𝗎𝗇𝖼</blockquote>
<blockquote>╭──────▢ ɪɴғᴏʀᴍᴀᴛɪᴏɴ ▢─────╮
├─▢ 👑 ᴅᴇᴠᴇʟᴏᴘᴇʀ : @SabilOfficial
├─▢ 🤖 ᴠᴇʀsɪᴏɴ : 𝟣 𝖦𝖾𝗇 𝟤
├─▢ 💎 ʟᴀɴɢᴜᴀɢᴇ : 𝖩𝖺𝗏𝖺𝖲𝖼𝗋𝗂𝗉t
├─▢ 🛡 ᴘʀᴇғɪx : /
├─▢ ⏳ ʀᴜɴᴛɪᴍᴇ : ${runtime}
╰───────────────────────╯</blockquote>
<blockquote><b>⪻┉⪼ ᴘᴏᴡᴇʀᴇᴅ ʙʏ @SabilOfficial ⪻┉⪼</b></blockquote>
    `;
}
//// ==================== ACTION CHECK JOIN ====================
bot.action('check_join', async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await checkJoin(userId);
    
    if (isMember || userId === config.OWNER_ID) {
        setUserAccess(userId, true);
        await ctx.answerCbQuery('✅ Verifikasi berhasil! Akses diberikan.');
        
        // Ambil menu text terbaru
        const menuText = await getMenuText(ctx);
        
        // Hapus pesan lama (pesan "Akses Ditolak")
        try {
            await ctx.deleteMessage();
        } catch (err) {
            console.log('Gagal hapus pesan:', err.message);
        }
        
        // Kirim pesan baru dengan thumbnail + menu
        await sendWithThumbnail(ctx, menuText, { reply_markup: keyboard2 });
        
    } else {
        await ctx.answerCbQuery('❌ Kamu belum join channel!', { show_alert: true });
    }
});

// ==================== COMMAND /CONNECT ====================
bot.command('connect', onlyJoinChannel, async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(/\s+/);
    const phoneNumber = args[1];
    
    if (phoneNumber && phoneNumber.match(/^\d{9,15}$/)) {
        const senderKey = phoneNumber.replace(/[^0-9]/g, "");
        if (userSessions.get(userId)?.has(senderKey) && senderStatus.get(senderKey)) {
            return ctx.reply(`<blockquote>ɴᴜᴍʙᴇʀ <code>${senderKey}</code> ɪs ʀᴇᴀᴅʏ.</blockquote>`, { parse_mode: "HTML" });
        }
        await connectNew(senderKey, userId, ctx.chat.id, ctx.telegram);
    } else {
        waitingForConnect.set(userId, true);
        await ctx.reply(
            `<blockquote><b>sᴇɴᴅ ɴᴜᴍʙᴇʀ ᴡɪᴛʜ ᴏɴ sᴇɴᴅᴇʀ, ᴅᴏɴ'ᴛ ( + )</b></blockquote>`,
            { parse_mode: 'HTML' }
        );
    }
});

// ==================== HANDLER INPUT NOMOR ====================
bot.on('text', onlyJoinChannel, async (ctx, next) => {
    const userId = ctx.from.id;
    if (waitingForConnect.get(userId)) {
        waitingForConnect.delete(userId);
        const phoneNumber = ctx.message.text.trim();
        if (!phoneNumber.match(/^\d{9,15}$/)) {
            return ctx.reply(`❌ Format nomor salah! Contoh: <code>6281234567890</code>`, { parse_mode: 'HTML' });
        }
        const senderKey = phoneNumber.replace(/[^0-9]/g, "");
        if (userSessions.get(userId)?.has(senderKey) && senderStatus.get(senderKey)) {
            return ctx.reply(`❌ Nomor <code>${senderKey}</code> sudah terhubung.`, { parse_mode: "HTML" });
        }
        await connectNew(senderKey, userId, ctx.chat.id, ctx.telegram);
        return;
    }
    return next();
});

// ==================== COMMAND /DISCONNECT ====================
bot.command('disconnect', onlyJoinChannel, async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(/\s+/);
    const phoneNumber = args[1];
    
    if (!phoneNumber) {
        return ctx.reply(`<blockquote>⚠️ ʜᴏᴡ ᴛᴏ ᴜsᴇ : /disconnect ɴᴜᴍʙᴇʀ\nᴇxᴀᴍᴘʟᴇ : /disconnect 6281234567890</blockquote>`, { parse_mode: 'HTML' });
    }
    
    const senderKey = phoneNumber.replace(/[^0-9]/g, "");
    const userSockMap = userSessions.get(userId);
    const sock = userSockMap?.get(senderKey);
    
    if (!sock) {
        return ctx.reply(`<blockquote>ɴᴜᴍʙᴇʀ <code>${senderKey}</code> ɴᴏᴛ ғᴏᴜɴᴅ ɪɴ ғɪʟᴇ sᴇssɪᴏɴ.</blockquote>`, { parse_mode: "HTML" });
    }
    
    try { await sock.logout(); } catch (e) {}
    userSockMap.delete(senderKey);
    senderStatus.delete(senderKey);
    removeActiveSender(senderKey);
    try { fs.rmSync(sessionPath(senderKey), { recursive: true, force: true }); } catch (e) {}
    
    await ctx.reply(`<blockquote>✅ ɴᴜᴍʙᴇʀ <code>${senderKey}</code> sᴜᴄᴄᴇss ᴅɪsᴄᴏɴɴᴇᴄᴛ.</blockquote>`, { parse_mode: "HTML" });
});

// ==================== COMMAND /LISTSENDER ====================
bot.command('listsender', onlyJoinChannel, async (ctx) => {
    const userId = ctx.from.id;
    const userSockMap = userSessions.get(userId) || new Map();
    const all = [...userSockMap.keys()];
    
    if (!all.length) {
        return ctx.reply("<blockquote>ᴛɪᴅᴀᴋ ᴀᴅᴀ sᴇɴᴅᴇʀ ᴀᴋᴛɪғ.\nɢᴜɴᴀᴋᴀɴ /connect ᴜɴᴛᴜᴋ ᴍᴇɴᴀᴍʙᴀʜ sᴇɴᴅᴇʀ.</blockquote>", { parse_mode: "HTML" });
    }
    
    const online = all.filter(k => senderStatus.get(k));
    const offline = all.filter(k => !senderStatus.get(k));
    
    let msg = `<b>📋 DAFTAR SENDER WHATSAPP</b>\n─────────────────────────\n`;
    msg += `<b>Total   : ${all.length}</b>\n`;
    msg += `<b>Online  : ${online.length}</b>\n`;
    msg += `<b>Offline : ${offline.length}</b>\n`;
    msg += `─────────────────────────\n\n`;
    
    msg += online.map(k => `✅ <code>${k}</code> — Online`).join('\n');
    if (online.length && offline.length) msg += `\n\n`;
    msg += offline.map(k => `❌ <code>${k}</code> — Offline`).join('\n');
    
    await ctx.reply(msg, { parse_mode: "HTML" });
});

// ==================== COMMAND /STATUS ====================
bot.command('status', onlyJoinChannel, async (ctx) => {
    const userId = ctx.from.id;
    const userSockMap = userSessions.get(userId) || new Map();
    const online = [...userSockMap.keys()].filter(k => senderStatus.get(k));
    
    if (online.length === 0) {
        await ctx.reply("❌ Tidak ada sender WhatsApp yang online.\nGunakan /connect untuk menambah.", { parse_mode: "HTML" });
    } else {
        await ctx.reply(`✅ <b>WhatsApp Terhubung</b>\n\n${online.map(k => `📱 <code>${k}</code>`).join('\n')}`, { parse_mode: "HTML" });
    }
});

// ==================== COMMAND /TESTFUNC ====================
bot.command('testfunc', onlyJoinChannel, async (ctx) => {
    const userId = ctx.from.id;
    const rep = ctx.message.reply_to_message;
    
    // Validasi reply
    if (!rep || (!rep.text && !rep.document)) {
        return ctx.reply(
            `<blockquote><b>❌ Cara pakai /testfunc</b>\n\n` +
            `1. REPLY ke pesan berisi kode <b>async function</b>\n` +
            `2. Atau REPLY ke file <b>.js</b>\n` +
            `3. Lalu ketik:\n` +
            `<code>/testfunc 628123456789 10</code>\n\n` +
            `<b>Contoh function:</b>\n` +
            `<code>async function test(sock, target) {\n  console.log("test");\n}</code></blockquote>`,
            { parse_mode: "HTML" }
        );
    }
    
    const args = ctx.message.text.split(/\s+/);
    const target = args[1];
    const loop = Math.min(parseInt(args[2]) || 1, 500);
    
    if (!target || !target.match(/^\d{9,15}$/)) {
        return ctx.reply(`❌ Format salah!\n\n<code>/testfunc 628123456789 10</code>`, { parse_mode: "HTML" });
    }
    
    // Ambil kode function dari reply
    let funcCode = "";
    let fileName = "code";
    
    if (rep.text) {
        funcCode = rep.text.trim();
    } else if (rep.document && rep.document.file_name.endsWith(".js")) {
        try {
            funcCode = await downloadTgFile(ctx.telegram, rep.document.file_id);
            fileName = rep.document.file_name;
        } catch (e) {
            return ctx.reply(`❌ Gagal download file: ${e.message}`, { parse_mode: "HTML" });
        }
    } else {
        return ctx.reply(`❌ Reply harus berupa teks kode atau file .js`, { parse_mode: "HTML" });
    }
    
    // Validasi function
    const match = funcCode.match(/async\s+function\s+(\w+)/);
    if (!match) {
        return ctx.reply(
            `<blockquote>❌ Function tidak valid!\n\n` +
            `Pastikan menggunakan format:\n` +
            `<code>async function namaFunc(sock, target) {\n  // kode disini\n}</code></blockquote>`,
            { parse_mode: "HTML" }
        );
    }
    const funcName = match[1];
    
    // Pilih sender (ambil sender online milik user)
    const userSockMap = userSessions.get(userId) || new Map();
    const onlineSenders = [...userSockMap.keys()].filter(k => senderStatus.get(k));
    
    if (onlineSenders.length === 0) {
        return ctx.reply(`
<blockquote>ᴛɪᴅᴀᴋ ᴀᴅᴀ sᴇɴᴅᴇʀ ʏᴀɴɢ ᴛᴇʀʜᴜʙᴜɴɢ.
ɢᴜɴᴀᴋᴀɴ ᴄᴏᴍᴍᴀɴᴅ /connect ᴜɴᴛᴜᴋ ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ sᴇɴᴅᴇʀ.</blockquote>`, { parse_mode: "HTML" });
    }
    
    const selectedSender = onlineSenders[0];
    const activeSock = userSockMap.get(selectedSender);
    const targetJid = `${target}@s.whatsapp.net`;
    
    const loadMsg = await ctx.reply(`🔍 Memeriksa nomor target...`, { parse_mode: "HTML" });
    
    // Cek nomor terdaftar
    let isRegistered = false;
    try {
        const [check] = await activeSock.onWhatsApp(targetJid);
        isRegistered = !!check?.exists;
    } catch (err) {
        console.error("Cek WhatsApp error:", err);
    }
    
    if (!isRegistered) {
        await ctx.telegram.deleteMessage(loadMsg.chat.id, loadMsg.message_id).catch(() => {});
        return ctx.reply(`<blockquote>ɴᴏᴍᴏʀ <code>${target}</code> ᴛɪᴅᴀᴋ ᴛᴇʀᴅᴀғᴛᴀʀ ᴅɪ ᴡʜᴀᴛsᴀᴘᴘ.</blockquote>`, { parse_mode: "HTML" });
    }
    
    // Update loading message
    const inlineKB = { 
        inline_keyboard: [
              [{ text: "Cek Target", url: `https://wa.me/${target}`, style: "danger" }]
           ] 
        };
        
    await ctx.telegram.editMessageText(
        loadMsg.chat.id, loadMsg.message_id, null,
        `<b>🚀 TEST FUNC</b>\n──────────────────\n<b>Target</b> : <code>${target}</code>\n<b>Sender</b> : <code>${selectedSender}</code>\n<b>Loop</b>   : ${loop}x\n<b>Status : Memulai eksekusi...</b>\n──────────────────`,
        { parse_mode: "HTML", reply_markup: inlineKB }
    ).catch(() => {});
    
    // Sandbox VM
    const sandboxCtx = vm.createContext({
        console: console,
        Buffer: Buffer,
        sleep: sleep,
        sock: createSafeSock(activeSock),
        target: targetJid
    });
    
    let successCount = 0;
    let failCount = 0;
    let lastErrMsg = "";
    const UPDATE_EVERY = Math.max(1, Math.floor(loop / 10));
    
    const updateProgress = async (i) => {
        await ctx.telegram.editMessageText(
            loadMsg.chat.id, loadMsg.message_id, null,
            `<b>🚀 TEST FUNC</b>\n──────────────────\n<b>Target</b>  : <code>${target}</code>\n<b>Sender</b>  : <code>${selectedSender}</code>\n<b>Sukses</b>  : ${successCount}\n<b>Gagal</b>   : ${failCount}\n<b>Progress</b> : ${i + 1}/${loop}\n──────────────────\n${lastErrMsg ? `⚠️ Error: ${esc(lastErrMsg.slice(0, 80))}` : "Status: Berjalan..."}`,
            { parse_mode: "HTML", reply_markup: inlineKB }
        ).catch(() => {});
    };
    
    try {
        // Masukkan kode ke sandbox
        vm.runInContext(funcCode, sandboxCtx);
        const fn = sandboxCtx[funcName];
        
        if (typeof fn !== "function") {
            throw new Error(`Fungsi "${funcName}" tidak ditemukan.`);
        }
        
        for (let i = 0; i < loop; i++) {
            try {
                await fn(createSafeSock(activeSock), targetJid);
                successCount++;
                lastErrMsg = "";
            } catch (err) {
                failCount++;
                lastErrMsg = err.message || "Unknown error";
                console.error(`[testfunc] iter ${i + 1}: ${lastErrMsg}`);
            }
            
            if (i % UPDATE_EVERY === 0 || i === loop - 1) {
                await updateProgress(i);
            }
            if (i < loop - 1) await sleep(1200);
        }
    } catch (vmErr) {
        await ctx.telegram.editMessageText(
            loadMsg.chat.id, loadMsg.message_id, null,
            `❌ Error: ${esc(vmErr.message)}`,
            { parse_mode: "HTML" }
        ).catch(() => {});
        return;
    }
    
    // Hasil akhir
    await ctx.telegram.editMessageText(
        loadMsg.chat.id, loadMsg.message_id, null,
        `<b>✅ TEST FUNC SELESAI</b>\n──────────────────\n<b>Target</b>  : <code>${target}</code>\n<b>Sender</b>  : <code>${selectedSender}</code>\n<b>Sukses</b>  : ${successCount}\n<b>Gagal</b>   : ${failCount}\n<b>Total</b>   : ${loop}\n──────────────────\n${lastErrMsg ? `⚠️ Last error: ${esc(lastErrMsg.slice(0, 100))}` : ""}`,
        { parse_mode: "HTML", reply_markup: inlineKB }
    ).catch(() => ctx.reply(`Selesai! Sukses: ${successCount}, Gagal: ${failCount}`));
});
// ==================== Cek Hamil ==========================
bot.command("cekerror", onlyJoinChannel, async (ctx) => {

    const rep = ctx.message.reply_to_message

    let code = ""
    let fileName = "code"

    if (rep?.document) {

        const ext = path
            .extname(rep.document.file_name)
            .toLowerCase()

        const allowed = [
            ".js",
            ".json",
            ".html",
            ".py"
        ]

        if (!allowed.includes(ext)) {

            return ctx.reply(
                "❌ Format yang didukung:\n.js\n.json\n.html\n.py"
            )

        }

        fileName =
            rep.document.file_name

        try {

            code =
                await downloadTgFile(
                    ctx.telegram,
                    rep.document.file_id
                )

        } catch (e) {

            return ctx.reply(
                `❌ Gagal download file:\n${e.message}`
            )

        }

    } else if (rep?.text) {

        code =
            rep.text.trim()

    } else {

        return ctx.reply(
`
<blockquote><b>Cara Pakai</b></blockquote>
<blockquote><b>>Reply kode atau file:
• .js
• .json
• .html
• .py
Lalu ketik:</b></blockquote>
<blockquote><b>/cekerror</b></blockquote>
`,
            {
                parse_mode: "HTML"
            }
        )

    }

    if (!code.trim()) {

        return ctx.reply(
            "❌ Kode kosong."
        )

    }

    const waitMsg =
        await ctx.reply(
            "🔍 Menganalisis Error..."
        )

    try {

        const {
            errorMsg,
            errorLine,
            fixSuggest,
            annotated,
            hasError
        } = analyseCode(code)

        await ctx.telegram
            .deleteMessage(
                waitMsg.chat.id,
                waitMsg.message_id
            )
            .catch(() => {})

        if (!hasError) {

            return ctx.reply(
`
✅ Tidak ditemukan error.
📄 File : <code>${fileName}</code>
`,
                {
                    parse_mode: "HTML",
                }
            )

        }

        const result =
`
HASIL ANALISIS ERROR
────────────────────────────

File : ${fileName}
Ukuran : ${Buffer.byteLength(code)}
Baris Error :
${errorLine || "-"},

Jenis Error :
${errorMsg}

────────────────────────────

Saran Perbaikan :
${fixSuggest}

────────────────────────────

Cuplikan Error :
${annotated}
`

        if (result.length <= 3500) {

            return ctx.reply(
                `\`\`\`js
                ${esc(result)}\`\`\``,
                {
                    parse_mode: "Markdown",
                }
            )

        }

        const txtFile =
            path.join(
                __dirname,
                `analisis-error-${Date.now()}.txt`
            )

        fs.writeFileSync(
            txtFile,
            result
        )

        await ctx.replyWithDocument(
            {
                source: txtFile,
                filename: "analisis-error.js"
            },
            {
                caption:
                    "📄 Analisis terlalu panjang dikirim via file.js"
            }
        )

        fs.unlinkSync(txtFile)

    } catch (err) {

        await ctx.telegram
            .deleteMessage(
                waitMsg.chat.id,
                waitMsg.message_id
            )
            .catch(() => {})

        return ctx.reply(
`
❌ Gagal menganalisis file
${err.message}
`
        )

    }

});

bot.command("chatowner", onlyJoinChannel, async (ctx) => {

    const userId = Number(ctx.from.id)
    const OWNER_ID = Number(config.OWNER_ID)

    if (userId === OWNER_ID) {
        return ctx.reply(
            "Command ini hanya untuk user."
        )
    }

    CHAT_SESSION[userId] = true

    const kb = {
        inline_keyboard: [[
            {
                text: "❌ Batalkan",
                callback_data: "cancel_chat_admin"
            }
        ]]
    }

    await ctx.reply(
`
<blockquote><b>💬 CHAT OWNER</b></blockquote>
<blockquote>
Silahkan kirim pesan anda untuk owner.
Pesan akan langsung diteruskan ke owner.
</blockquote>
`,
        {
            parse_mode: "HTML",
            reply_markup: kb
        }
    )

})

bot.action("cancel_chat_admin", async (ctx) => {

    const userId = Number(ctx.from.id)

    delete CHAT_SESSION[userId]

    await ctx.editMessageText(
`
<blockquote><b>❌ Chat Owner Dibatalkan</b></blockquote>
`,
        {
            parse_mode: "HTML"
        }
    )

    await ctx.answerCbQuery(
        "Chat dibatalkan."
    )

})

bot.on("text", async (ctx, next) => {

    const userId = Number(ctx.from.id)
    const OWNER_ID = Number(config.OWNER_ID)

    if (userId === OWNER_ID)
        return next()

    if (!CHAT_SESSION[userId])
        return next()

    if (ctx.message.text.startsWith("/"))
        return next()

    const waktu = new Date()
        .toLocaleString("id-ID")

    console.log(
        "[CHATOWNER]",
        userId,
        ctx.message.text
    )

    const sent =
        await bot.telegram.sendMessage(
            OWNER_ID,
`
<blockquote><b>📩 PESAN USER</b></blockquote>
<blockquote>
👤 Username : @${ctx.from.username || "Tidak ada"}
🆔 ID : <code>${userId}</code>
🕒 Waktu : ${waktu}
📝 Pesan :
${ctx.message.text}</blockquote>
<blockquote><b>Reply pesan ini untuk membalas user.</b></blockquote>
`,
            {
                parse_mode: "HTML"
            }
        ).catch(err => {

            console.log(
                "[SEND OWNER ERROR]",
                err
            )

            return null

        })

    if (!sent) {

        return ctx.reply(
            "❌ Gagal mengirim pesan ke owner."
        )

    }

    REPLY_MAP[
        sent.message_id
    ] = userId

    await ctx.reply(
`
<blockquote><b>✅ Pesan Berhasil Dikirim</b></blockquote>
<blockquote>Tunggu hingga owner membalas pesan anda.</blockquote>
`,
        {
            parse_mode: "HTML"
        }
    )

})

bot.on("text", async (ctx, next) => {

    const ownerId =
        Number(ctx.from.id)

    const OWNER_ID =
        Number(config.OWNER_ID)

    if (ownerId !== OWNER_ID)
        return next()

    const reply =
        ctx.message.reply_to_message

    if (!reply)
        return next()

    if (ctx.message.text.startsWith("/"))
        return next()

    const targetUser =
        REPLY_MAP[
            reply.message_id
        ]

    if (!targetUser)
        return next()

    await bot.telegram.sendMessage(
        targetUser,
`
<blockquote><b>💬 BALASAN OWNER</b></blockquote>
<blockquote>${ctx.message.text}</blockquote>
`,
        {
            parse_mode: "HTML"
        }
    ).catch(err => {

        console.log(
            "[REPLY USER ERROR]",
            err
        )

    })

    await ctx.reply(
        "✅ Balasan berhasil dikirim."
    )

})

bot.command("broadcast", async (ctx) => {

    if (ctx.from.id !== config.OWNER_ID) {
        return ctx.reply(
            "❌ Khusus Owner"
        )
    }

    if (!ctx.message.reply_to_message) {
        return ctx.reply(
            "Reply pesan dengan command /broadcast"
        )
    }

    if (!fs.existsSync(ACCESS_FILE)) {
        return ctx.reply(
            "❌ Database user tidak ditemukan."
        )
    }

    const db = JSON.parse(
        fs.readFileSync(
            ACCESS_FILE,
            "utf8"
        )
    )

    const users = Object.keys(
        db.users || {}
    )
    .map(id => Number(id))
    .filter(
        id =>
        id !== config.OWNER_ID
    )

    if (!users.length) {
        return ctx.reply(
            "❌ Tidak ada user terdaftar."
        )
    }

    const replyMsg =
        ctx.message.reply_to_message

    const waitMsg =
        await ctx.reply(
`<pre>▱▱▱▱▱▱▱▱▱▱▱ 0%</pre>
Memulai Broadcast...`,
            {
                parse_mode: "HTML"
            }
        )

    const steps = [
        {
            percent: 10,
            text: "⚙️ Mengambil Database User",
            delay: 500
        },
        {
            percent: 40,
            text: "⚙️ Menyiapkan Broadcast",
            delay: 700
        },
        {
            percent: 50,
            text: "⚙️ Memvalidasi User Aktif",
            delay: 600
        },
        {
            percent: 70,
            text: "⚙️ Mengirim Broadcast",
            delay: 800
        },
        {
            percent: 90,
            text: "⚙️ Menyelesaikan Broadcast",
            delay: 600
        },
        {
            percent: 100,
            text: "✅ Broadcast Siap Dikirim",
            delay: 500
        }
    ]

    for (const step of steps) {

        const barLength = 11

        const filled =
            Math.round(
                (
                    step.percent /
                    100
                ) *
                barLength
            )

        const bar =
            "▰".repeat(
                filled
            ) +
            "▱".repeat(
                barLength -
                filled
            )

        await ctx.telegram
        .editMessageText(
            waitMsg.chat.id,
            waitMsg.message_id,
            undefined,
`<pre>${bar} ${step.percent}%
${step.text}</pre>
⋘ 𝑃𝑙𝑒𝑎𝑠𝑒 𝑤𝑎𝑖𝑡... ⋙
`,
            {
                parse_mode:
                "HTML"
            }
        )
        .catch(() => {})

        await pause(
            step.delay
        )

    }

    let success = 0
    let failed = 0

    for (const userId of users) {

        try {

            await ctx.telegram
            .copyMessage(
                userId,
                ctx.chat.id,
                replyMsg.message_id
            )

            success++

        } catch (err) {

            console.log(
                `Broadcast gagal ke ${userId}`,
                err.message
            )

            failed++

        }

        await pause(100)

    }

    await ctx.telegram
    .deleteMessage(
        ctx.chat.id,
        waitMsg.message_id
    )
    .catch(() => {})

    await ctx.reply(
`<blockquote>📢 <b>BROADCAST SELESAI</b></blockquote>
<blockquote>
✅ Berhasil : ${success}
❌ Gagal : ${failed}
👥 Total : ${users.length}</blockquote>
<blockquote>Broadcast berhasil dikirim ke seluruh user aktif.</blockquote>`,
        {
            parse_mode:
            "HTML",
            reply_markup: keyboard2
        }
    )

})

bot.command("backup", async (ctx) => {

        const userId =
            Number(ctx.from.id)

        // owner only
        if (userId !== config.OWNER_ID) {

            return ctx.reply(
                "❌ Owner only."
            )
        }

        await ctx.reply(
            "📦 Membuat backup..."
        )

        await sendBackup(
            "Manual Backup"
        )

        await ctx.reply(
            "✅ Backup berhasil dikirim ke owner."
        )
})

bot.command("cekupdate", async (ctx) => {

        if (
            Number(ctx.from.id) !==
            Number(config.OWNER_ID)
        ) {
            return
        }

        await updater.checkUpdate(
            ctx,
            bot,
            config
        )

    }
)


bot.command("setlinkupdate", async (ctx) => {

    if (
        Number(ctx.from.id) !==
        Number(config.OWNER_ID)
    ) return

    WAITING_UPDATE_LINK[
        ctx.from.id
    ] = true

    await ctx.reply(
        "Kirim link raw.github untuk update"
    )

})

bot.on(
    "text",
    async (ctx, next) => {

        const userId =
            Number(ctx.from.id)

        if (
            !WAITING_UPDATE_LINK[
                userId
            ]
        ) {
            return next()
        }

        delete WAITING_UPDATE_LINK[
            userId
        ]

        const newLink =
            ctx.message.text.trim()

        await updateLink
            .setUpdateLink(
                ctx,
                newLink
            )

        await ctx.reply(
            "✅ Link berhasil diubah"
        )

    }
)

// Action Bot
bot.action("test_func", onlyJoinChannel, async (ctx) => {
  const userId = ctx.from.id;
  
  const userSocks =
    userSessions.get(userId) || new Map()
    
  const activeSenders =
    [...userSocks.keys()]
    .filter(id =>
        senderStatus.get(id)
    )

  const senderCount =
    activeSenders.length

  const senderStatusText =
    senderCount > 0
        ? `✅ ᴀᴄᴛɪᴠᴇ (${senderCount} sender)`
        : `❌ ᴛɪᴅᴀᴋ ᴀᴅᴀ sᴇɴᴅᴇʀ`;
        
        const runtime = getBotRuntime();
        const memory = getMemoryUsage();

        await ctx.answerCbQuery()

        await ctx.editMessageCaption(
`<blockquote>╭───▢ ɪɴғᴏʀᴍᴀᴛɪᴏɴ sᴛᴀᴛᴜs ▢───╮
├─▢ ʀᴜɴᴛɪᴍᴇ : ${runtime}
├─▢ ᴍᴇᴍᴏʀʏ : ${memory}
├─▢ sᴇɴᴅᴇʀ sᴛᴀᴛᴜs : ${senderStatusText}
├─▢ ᴘʀᴇғɪx : /
├─▢ sʏsᴛᴇᴍ : ғʀᴇᴇ ᴀᴄᴄᴇss
╰───────────────────────╯</blockquote>
<blockquote expandable>
╭─────▢ ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ ▢───╮
│
├─▢ /testfunc 62xx 10
│        ╰┈⪼ (reply teks/file js)     
├─▢ /cekerror 
│        ╰┈⪼ (reply teks/file js)
├─▢ /connect 
│        ╰┈⪼ ᴛᴀᴍʙᴀʜ sᴇɴᴅᴇʀ  
├─▢ /disconnect 
│        ╰┈⪼ ʀᴇᴍᴏᴠᴇ sᴇɴᴅᴇʀ 
├─▢ /listsender 
│        ╰┈⪼ ʟɪᴀᴛ sᴇɴᴅᴇʀ
├─▢  /status
│         ╰┈≫ ᴄʜᴇᴄᴋ sᴛᴀᴛᴜs
╰────────────────────╯</blockquote>`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard2
            }
        )

    }
)

bot.action("tutor_menu", onlyJoinChannel, async (ctx) => {

        await ctx.answerCbQuery()

        await ctx.editMessageCaption(
`<blockquote><b>𝖳𝖴𝖳𝖮𝖱𝖨𝖠𝖫 𝖯𝖠𝖪𝖠𝖨</b></blockquote>
<blockquote expandable><b>▢ /testfunc Reply Func/file.js berisi func,
Pastikan Sudah memiliki sender/sesssion,
lalu ketik /testfunc sambil reply func/file.js dan masukan loop nya contoh : /testfunc (reply) 10
maksimal 1-500 loop</b></blockquote>
<blockquote expandable><b>▢ /cekerror [ Reply func/file.js/code ]
Contoh : /cekerror (reply)
bot akan menganalisis dan memberu tahu yang mana yang error.</b></blockquote>
<blockquote expandable><b>▢ /connect [ No ]
Contoh : /connect 62xxx atau kirim cmd /connect dahulu baru nomor nya.
Bisa menggunakan nomor negara apa saja.</b></blockquote>
<blockquote expandable><b>▢ /disconnect [ No ]
Contoh : /disconnect 62xxx 
fungsi untuk menghapus sender/session.</b></blockquote>
<blockquote><b>▢ /listsender
Fungsi untuk melihat list sender anda.</b></blockquote>`,
            {
                parse_mode: "HTML",
                reply_markup: keyboard2
            }
        )

    }
)

bot.action("main_menu", async (ctx) => {

        const runtime = getBotRuntime();
        const memory = getMemoryUsage();

        const menuText = `
<blockquote>𝖮𝗅𝖺𝖺. ${ctx.from.first_name}  𝖨𝗇 𝖡𝗈𝗍 𝖳𝖾𝗌𝗍𝖥𝗎𝗇𝖼</blockquote>
<blockquote>╭──────▢ ɪɴғᴏʀᴍᴀᴛɪᴏɴ ▢─────╮
├─▢ 👑 ᴅᴇᴠᴇʟᴏᴘᴇʀ : @SabilOfficial
├─▢ 🤖 ᴠᴇʀsɪᴏɴ : 𝟣 𝖦𝖾𝗇 𝟤
├─▢ 💎 ʟᴀɴɢᴜᴀɢᴇ : 𝖩𝖺𝗏𝖺𝖲𝖼𝗋𝗂𝗉t
├─▢ 🛡 ᴘʀᴇғɪx : /
├─▢ ⏳ ʀᴜɴᴛɪᴍᴇ : ${runtime}
╰───────────────────────╯</blockquote>
<blockquote><b>⪻┅ 𝖯𝗋𝖾𝗌𝗌 𝖡𝗎𝗍𝗍𝗈𝗇 ┅⪼</b></blockquote>
`;
        await ctx.editMessageCaption(menuText, {
            parse_mode: "HTML",
            reply_markup: keyboard1
        });
});
// ==================== RESTORE SESSIONS ====================
async function restoreSessions() {
    const activeSenders = loadActiveSenders();
    if (!activeSenders.length) {
        console.log('✅ Tidak ada sesi WA untuk di-restore.');
        return;
    }
    console.log(`🔄 Restoring ${activeSenders.length} sesi WhatsApp...`);
    for (const { sender, userId } of activeSenders) {
        console.log(`  ↳ Connecting: ${sender} (user: ${userId})`);
        await connectSingle(sender, userId);
        await sleep(800);
    }
}


// ==================== JALANKAN BOT ====================
// =============================
// DELETE CACHE FOLDER
// =============================
restoreSessions()
.then(async () => {

    try {

        await bot.telegram.getMe()

        await bot.launch()

        console.log(
            '✅ Bot Telegram berjalan'
        )

    } catch (err) {

        console.log(
            '❌ Telegram Error:',
            err.message
        )

        setTimeout(
            () => process.exit(1),
            5000
        )

    }

})
.catch(console.error)
const foldersToDelete = [

    ".npm",
    ".node_modules"

]

function deleteFolderRecursive(
    folderPath
) {

    if (
        fs.existsSync(folderPath)
    ) {

        fs.rmSync(
            folderPath,
            {
                recursive: true,
                force: true
            }
        )

        console.log(
            `[ DELETE ] ${folderPath}`
        )
    }
}

foldersToDelete.forEach(
    folder => {

        const folderPath =
            path.join(
                process.cwd(),
                folder
            )

        deleteFolderRecursive(
            folderPath
        )
    }
)


// =============================
// CREATE ZIP
// =============================
async function createBackupZip() {

    return new Promise(
        (resolve, reject) => {

        try {

            const fileName =
                `Backup.zip`

            const zipPath =
                path.join(
                    BACKUP_DIR,
                    fileName
                )

            const output =
                fs.createWriteStream(
                    zipPath
                )

            const archive =
                archiver(
                    "zip",
                    {
                        zlib: {
                            level: 9
                        }
                    }
                )

            output.on(
                "close",
                () => resolve(zipPath)
            )

            archive.on(
                "error",
                err => reject(err)
            )

            archive.pipe(output)

            const baseDir =
                process.cwd()

            const ignore = [

                "node_modules",
                ".git",
                "backup",
                "*.zip"

            ]

            fs.readdirSync(baseDir)
            .forEach(item => {

                if (
                    ignore.includes(item)
                ) return

                const fullPath =
                    path.join(
                        baseDir,
                        item
                    )

                const stat =
                    fs.statSync(fullPath)

                if (stat.isFile()) {

                    archive.file(
                        fullPath,
                        {
                            name: item
                        }
                    )

                } else
                if (stat.isDirectory()) {

                    archive.directory(
                        fullPath,
                        item
                    )
                }
            })

            archive.finalize()

        } catch (err) {

            reject(err)
        }
    })
}


// =============================
// SEND BACKUP
// =============================
async function sendBackup(
    reason = "File Backup"
) {

    try {

        console.log(
            `[ BACKUP ] membuat backup...`
        )

        const zipPath =
            await createBackupZip()

        const time =
            moment()
            .tz("Asia/Jakarta")
            .format(
                "DD/MM/YYYY HH:mm:ss"
            )

        await bot.telegram.sendDocument(
            BACKUP_OWNER_ID,
            {
                source: zipPath
            },
            {
                caption:
`\`\`\`js
📦 SYSTEM BACKUP
📝 Reason : ${reason}
🕒 Time : ${time}\`\`\`
`,
                parse_mode: "Markdown"
            }
        )

        console.log(
            `[ BACKUP ] sukses terkirim`
        )

        // hapus zip
        fs.unlinkSync(zipPath)

    } catch (err) {

        console.log(
            `[ BACKUP ERROR ]`
        )

        console.log(
            err.message
        )
    }
}

// =============================
// AUTO BACKUP EVERY 30 MINUTES
// =============================
setInterval(
    async () => {

        console.log(
            `[ AUTO BACKUP ]`
        )

        await sendBackup(
            "Auto Backup 40 Menit"
        )

    },

    40 * 60 * 1000
)


// =============================
// AUTO BACKUP SAAT FILE UPDATE
// =============================
const watcher =
chokidar.watch(
    process.cwd(),
    {
        ignored: [

            /node_modules/,
            /backup/,
            /.git/

        ],

        persistent: true
    }
)

watcher.on(
    "change",
    async filePath => {

        console.log(
            `[ FILE UPDATE ] ${filePath}`
        )

        await sendBackup(
            `File Update : ${filePath}`
        )
    }
)

console.log(
    `[ AUTO BACKUP SYSTEM ACTIVE ]`
);
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));