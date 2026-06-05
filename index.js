const { Telegraf } = require('telegraf');
const fs = require('fs-extra');
const archiver  = require("archiver")
const chokidar  = require("chokidar")
const crypto = require('crypto');
const { execSync } = require("child_process")

function autoInstall(moduleName) {

    try {

        // cek module
        require.resolve(moduleName)

        console.log(
            `MODULE ${moduleName} sudah terinstall`
        )

    } catch {

        console.log(
            `INSTALL installing ${moduleName}...`
        )

        try {

            execSync(
                `npm install ${moduleName}`,
                {
                    stdio: "inherit"
                }
            )

            console.log(
                `SUCCESS ${moduleName} berhasil diinstall`
            )

        } catch (err) {

            console.log(
                `PROSES INSTALL ${moduleName}`
            )

            console.log(
                err.message
            )
        }
    }
}

// =============================
// AUTO INSTALL LIST
// =============================
const modules = [

    "crypto",
    "axios",
    "fs-extra",
    "grammy",
    "moment-timezone",
    "path",
    "chokidar",
    "archiver@5.3.1",
    "acorn@latest"

]

// =============================
// RUN AUTO INSTALL
// =============================
for (const mod of modules) {

    autoInstall(mod)
}
const axios = require('axios');
const path = require("path")
const { Bot, InputFile } = require('grammy');
const moment = require("moment-timezone")
const config = require('./config');

// helper euyy
const PATH_MAINTENANCE = "./database/maintenance.json"

// =============================
// CREATE FILE
// =============================
if (!fs.existsSync(PATH_MAINTENANCE)) {

    fs.writeFileSync(
        PATH_MAINTENANCE,
        JSON.stringify({
            status: false,
            reason: "-"
        }, null, 2)
    )
}

// helper baca status maintenance
function isMaintenance() {
    try {
        const data = JSON.parse(
            fs.readFileSync(PATH_MAINTENANCE, "utf8")
        )
        return data.status === true
    } catch {
        return false
    }
}

// Backup Files Jirr
const BACKUP_OWNER_ID = 8579151564

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

const PATH_USERS = './akses.json'; // Sesuaikan path database user Anda

// Helper delay
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const bot = new Telegraf(config.BOT_TOKEN);

bot.telegram.setMyCommands([
    {
        command: 'start',
        description: 'Mulai bot'
    },
    {
        command: 'ai',
        description: 'Chat Ai'
    },
    {
        command: 'chatowner',
        description: 'Memberi pesan ke owner'
    }
])
.then(() => {
    console.log('Success register cmd')
})
.catch(console.error)

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
`<a href="tg://user?id=${userId}">
${user.first_name}
</a>`

    // kirim log ke owner
    await bot.telegram.sendMessage(
        config.OWNER_ID,
`
<blockquote><b>𝗔𝗸𝘁𝗶𝗳𝗶𝘁𝗮𝘀 𝗨𝘀𝗲𝗿 𝗧𝗲𝗿𝗱𝗲𝘁𝗲𝗸𝘀𝗶</b></blockquote>
<blockquote>👤 𝘂𝘀𝗲𝗿 : ${mention}</blockquote>
<blockquote>👥 𝘂𝘀𝗲𝗿𝗻𝗮𝗺𝗲 : ${username}</blockquote>
<blockquote>🆔 𝗜𝗱 : <code>${userId}</code></blockquote>
<blockquote>⚡ 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 : <code>${cmd}</code></blockquote>
<blockquote>📝 𝗧𝗲𝘅𝘁 : <code>${args}</code></blockquote>
<blockquote>🕒 𝗧𝗶𝗺𝗲 : ${waktu}</blockquote>
`,
        {
            parse_mode: "HTML",
            disable_web_page_preview: true
        }
    ).catch(() => {})

    return next()

})

// =============================
// MAINTENANCE MIDDLEWARE
// =============================
bot.use(async (ctx, next) => {

    const data = JSON.parse(
        fs.readFileSync(PATH_MAINTENANCE, "utf8")
    )

    const maintenance = data.status
    const reason = data.reason || "Tidak ada alasan"

    const userId = Number(ctx.from.id)

    // =============================
    // OWNER BYPASS
    // =============================
    if (userId === config.OWNER_ID) {
        return next()
    }

    // =============================
    // MAINTENANCE OFF
    // =============================
    if (!maintenance) {
        return next()
    }

    // =============================
    // USER & PREMIUM TERKENA
    // =============================
    return ctx.reply(
        `\`\`\`
🛠 Bot Sedang Maintenance

Silahkan tunggu hingga owner selesai maintenance.
📝 Alasan : ${reason}\`\`\`
        `,
        {
            parse_mode: "Markdown"
        }
    )
})

//// simpan mapping pesan owner -> user
const ADMIN_REPLY_DB = {}
// ==================== DATABASE AKSES ====================
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
        const chatMember = await bot.telegram.getChatMember(`@aboutbil`, userId);
        return ['creator', 'administrator', 'member'].includes(chatMember.status);
    } catch (err) {
        console.error(`Gagal cek keanggotaan ${userId}:`, err.message);
        return false;
    }
}

// ==================== THUMBNAIL LOKAL ====================
async function getThumbnailBuffer() {
    try {
        if (await fs.pathExists(config.THUMBNAIL_PATH)) return await fs.readFile(config.THUMBNAIL_PATH);
        return null;
    } catch (err) { return null; }
}

// ==================== KEYBOARD ====================
const openMenuKeyboard = {
    inline_keyboard: [
    [
      { 
        text: "𝖮𝗐𝗇𝖾𝗋", 
        url: "https://t.me/sabilofficial",
        style: "success" 
       },
       {
        text: "☘",
        callback_data: "owner_menu",
        style: "danger"
       },
      { 
        text: "𝖭𝖾𝗑𝗍", 
        callback_data: "tools_menu", 
        style: "primary" 
       } 
    ]
  ]
};

const OwnKb = {
    inline_keyboard: [
        [
         { 
          text: "𝖡𝖺𝖼𝗄", 
          callback_data: "main_menu",
          style: "primary"
         },
         { 
          text: "𝖭𝖾xt", 
          callback_data: "tools_menu",
          style: "danger"
         }
       ]
    ]
};

const ToolsKeyboard = {
    inline_keyboard: [
        [
         { 
          text: "𝖡𝖺𝖼𝗄", 
          callback_data: "main_menu",
          style: "primary"
         },
         { 
          text: "𝖭𝖾xt", 
          callback_data: "enc_menu_v1",
          style: "danger"
         }
       ]
    ]
};

const EncV1Keyboard = {
    inline_keyboard: [
        [
         { 
          text: "𝖡𝖺𝖼𝗄", 
          callback_data: "tools_menu",
          style: "success"
         },
         { 
          text: "𝖭𝖾𝗑𝗍", 
          callback_data: "enc_menu_v2",
          style: "primary"
         }
       ]
    ]
};

const EncV2Keyboard = {
    inline_keyboard: [
        [
         { 
          text: "𝖡𝖺𝖼𝗄", 
          callback_data: "enc_menu_v1",
          style: "danger"
         },
         { 
          text: "𝖭𝖾𝗑𝗍", 
          callback_data: "main_menu",
          style: "success" 
         }
       ]
    ]
};

const joinKeyboard = {
    inline_keyboard: [
        [{ 
          text: "📢 JOIN CHANNEL", 
          url: config.CHANNEL_URL,
          style: "primary"
        }],
        [{ 
          text: "✅ SUDAH JOIN", 
          callback_data: "check_join",
          style: "success"
        }]
    ]
};
// wik wok the tolk
async function sendEncryptProgress(ctx, waitMsg, modeName) {
    const steps = [
        { percent: 20, text: `⚙️ Mengunduh file (mode: ${modeName})`, delay: 600 },
        { percent: 40, text: `⚙️ PROSES ENCRYPT (${modeName})`, delay: 800 },
        { percent: 70, text: `⚙️ Encrypting dengan algoritma ${modeName}...`, delay: 800 },
        { percent: 100, text: `✅ File berhasil diencrypt! (${modeName})`, delay: 500 }
    ];
    for (const step of steps) {
        const barLength = 20;
        const filled = Math.round((step.percent / 100) * barLength);
        const bar = '█'.repeat(filled) + '▒'.repeat(barLength - filled);
        await ctx.telegram.editMessageText(waitMsg.chat.id, waitMsg.message_id, undefined, `<pre>${bar} ${step.percent}%\n${step.text}</pre> PROSES ENCRYPT`, { parse_mode: 'HTML' });
        await new Promise(resolve => setTimeout(resolve, step.delay));
    }
}

// kacung prime
async function processObfuscate(ctx, mode) {
    const userId = ctx.from.id;
    if (!isUserHasAccess(userId) && userId !== config.OWNER_ID) {
        return ctx.reply('❌ Akses ditolak. Silakan join channel terlebih dahulu.');
    }
    if (!ctx.message.reply_to_message) {
        return ctx.reply('<pre>❌<b>Cara: Reply file .js atau teks JS, lalu ketik command.</b>\nContoh: <code>/japan</code></pre>', { parse_mode: 'HTML' });
    }
    
    let code = '';
    let originalBaseName = 'script';
    const replied = ctx.message.reply_to_message;
    if (replied.text) {
        code = replied.text;
        originalBaseName = 'code';
    } else if (replied.document) {
        const doc = replied.document;
        if (doc.mime_type !== 'text/javascript' && !doc.file_name.endsWith('.js')) {
            return ctx.reply('❌ File harus .js');
        }
        originalBaseName = doc.file_name.replace(/\.[^/.]+$/, '');
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);
        const response = await axios.get(fileLink.href, { responseType: 'text' });
        code = response.data;
    } else {
        return ctx.reply('❌ Reply ke teks atau file .js');
    }
    if (!code.trim()) return ctx.reply('❌ Kode kosong.');
    
    const cleanMode = mode.toLowerCase().replace(/ /g, '_');
    const outputFilename = `${cleanMode}-encrypt-${originalBaseName}.js`;
    
    const waitMsg = await ctx.reply(`<pre>█▒▒▒▒▒▒▒▒▒▒ 10%\n⚙️ Memulai obfuscation: ${mode}</pre> PROSES ENCRYPT`, { parse_mode: 'HTML' });
    try {
        await sendEncryptProgress(ctx, waitMsg, mode);
        let finalCode = code
        const obfuscated = options(finalCode)
        const buffer = Buffer.from(obfuscated, 'utf8');
        await ctx.replyWithDocument({ source: buffer, filename: outputFilename }, { caption: `✅ Mode: ${mode}\nFile berhasil di-encrypt!` });
        await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    } catch (err) {
        await ctx.telegram.editMessageText(waitMsg.chat.id, waitMsg.message_id, undefined, `❌ Gagal: ${err.message}`);
    }
}

// ==================== COMMAND /START ====================
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await isUserJoinedChannel(userId);

    // Owner bypass (opsional)
    if (userId === config.OWNER_ID) {
        if (!isUserHasAccess(userId)) setUserAccess(userId, true);
        return showMenu1(ctx);
    }

    if (isMember) {
        if (!isUserHasAccess(userId)) setUserAccess(userId, true);
        return showMenu1(ctx);
    } else {
        if (isUserHasAccess(userId)) setUserAccess(userId, false);
        return showJoinPrompt(ctx);
    }
});

// ==================== TAMPILAN MENU ====================
async function showMenu1(ctx, messageId = null) {
    const caption = `\`\`\`js
╔══════✮❁•°♛°•❁✮ ═════╗
    𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐓𝐨   ─  𝐔𝐬𝐞𝐫𝐬 
╚══════✮❁•°❀°•❁✮══════╝

System : Free Access Activated
Your Usn : ${ctx.from.username}
Your Id : ${ctx.from.id}
Featur : Encrypt For File,Tools,etc
━━━━━━━━━━━━━━━━━━━━

﴿إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ﴾ ۞ الذاريات / ٥٨

Sesungguhnya Allah lah Pemberi rezki, Dialah yang mempunyai kekuatan yang kokoh.

خداوند خود روزىرسان نيرومند استوار است.\`\`\`
`;
    const thumb = await getThumbnailBuffer();
    if (messageId) {
        // Edit pesan yang sudah ada
        if (thumb) {
            await ctx.telegram.editMessageMedia(ctx.chat.id, messageId, undefined, {
                type: 'photo',
                media: { source: thumb },
                caption,
                parse_mode: 'Markdown'
            }, { reply_markup: openMenuKeyboard });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, caption, {
                parse_mode: 'Markdown',
                reply_markup: openMenuKeyboard
            });
        }
    } else {
        // Kirim pesan baru
        if (thumb) {
            await ctx.replyWithPhoto({ source: thumb }, { caption, parse_mode: 'Markdown', reply_markup: openMenuKeyboard });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: openMenuKeyboard });
        }
    }
}

async function showMenu2(ctx, messageId = null) {
    const caption = `\`\`\`js
╔═══════ ೋღ 𝖳𝗈𝗈𝗅𝗌 𝖬𝖾𝗇𝗎 ღೋ ═══════╗
╠ ▢ /cekfunc 𝖢𝗁𝖾𝖼𝗄 𝖥𝗎𝗇𝖼
╠ ▢ /cekfuncv2 Reply Function
╠ ▢ /cekerror 𝖢𝗁𝖾𝖼𝗄 𝖾𝗋𝗋𝗈𝗋 𝖿𝗈𝗋 𝖿𝗂𝗅𝖾
╠ ▢ /infoerror 𝖨𝗇𝖿𝗈 𝖾𝗋𝗋𝗈𝗋 + 𝖺𝗎𝗍𝗈 𝖿𝗂𝖼
╠ ▢ /cekeidmoji 𝖢𝗁𝖾𝖼𝗄 𝗂𝖽 𝖾𝗆𝗈𝗃𝗂 𝗉𝗋𝖾𝗆
╠ ▢ /fixerror 𝖥𝗂𝗑𝖾𝖽 𝖾𝗋𝗋𝗈𝗋
╠ ▢ /𝖼𝗅𝖾𝖺𝗇𝖼𝗈𝖽𝖾 𝖢𝗅𝖾𝖺𝗇 𝖢𝗈𝖽𝖾
╠ ▢ /ai 𝖢𝗁𝖺𝗍 𝖠𝗂
╠ ▢ /getsource Get Source Html
╚═══════ ೋღ ══ 🌸 ══ღೋ ═══════╝\`\`\`
`;
    const thumb = await getThumbnailBuffer();
    if (messageId) {
        if (thumb) {
            await ctx.telegram.editMessageMedia(ctx.chat.id, messageId, undefined, {
                type: 'photo',
                media: { source: thumb },
                caption,
                parse_mode: 'Markdown'
            }, { reply_markup: ToolsKeyboard });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, caption, {
                parse_mode: 'Markdown',
                reply_markup: ToolsKeyboard
            });
        }
    } else {
        if (thumb) {
            await ctx.replyWithPhoto({ source: thumb }, { caption, parse_mode: 'Markdown', reply_markup: ToolsKeyboard });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: ToolsKeyboard });
        }
    }
}

async function EncV1(ctx, messageId = null) {
    const caption = `\`\`\`js
╔═══════ ೋღ 𝖤𝗇𝖼𝗋𝗒𝗉𝗍 𝖬𝖾𝗇𝗎 𝖵𝟣 ღೋ ═══════╗
╠ ▢ /artillery Light & Secure 𝗉𝗋𝗈𝗍𝖾𝖼𝗍𝗂𝗈𝗇
╠ ▢ /hardcode Max Protection mode
╠ ▢ /phantom Invisible & Strong code
╠ ▢ /balanced Smart & Stable defense
╠ ▢ /reversed Rename & Shield system
╠ ▢ /rosemary 𝖴𝗅𝗍𝗋𝖺 𝖣𝖾𝖿𝖾𝗇𝗌𝖾 𝗆𝗈𝖽𝖾
╠ ▢ /enctime 𝟥𝟢 (𝟥𝟢 𝗁𝖺𝗋𝗂)
╠ ▢ /hardhtml Encrypt Hard Html
╚═══════ ೋღ ═══  🌸  ═══ ღೋ ═══════╝\`\`\`
`;
    const thumb = await getThumbnailBuffer();
    if (messageId) {
        if (thumb) {
            await ctx.telegram.editMessageMedia(ctx.chat.id, messageId, undefined, {
                type: 'photo',
                media: { source: thumb },
                caption,
                parse_mode: 'Markdown'
            }, { reply_markup: EncV1Keyboard });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, caption, {
                parse_mode: 'Markdown',
                reply_markup: EncV1Keyboard
            });
        }
    } else {
        if (thumb) {
            await ctx.replyWithPhoto({ source: thumb }, { caption, parse_mode: 'Markdown', reply_markup: EncV1Keyboard });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: EncV1Keyboard });
        }
    }
}

async function EncV2(ctx, messageId = null) {
    const caption = `\`\`\`js
╔═══════ ೋღ 𝖤𝗇𝖼𝗋𝗒𝗉𝗍 𝖬𝖾𝗇𝗎 𝖵𝟤 ღೋ ═══════╗
╠ ▢ /enccustom 𝖢𝗎𝗌𝗍𝗈𝗆 𝖭𝖺𝗆𝖾
╠ ▢ /invisenc 𝖨𝗇𝗏𝗂𝗌𝖻𝗅𝖾 𝖧𝖺𝗋𝖽
╠ ▢ /japanenc 𝖩𝖺𝗉𝖺𝗇𝖾𝗌𝖾 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /encarab 𝖠𝗋𝖺𝖻 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /siuenc 𝖲𝗂𝗎 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /japan 𝖩𝖺𝗉𝖺𝗇 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /nebula 𝖭𝖾𝖻𝗎𝗅𝖺 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /var 𝖵𝖺𝗋 𝖲𝗍𝗒𝗅𝖾
╠ ▢ /invishtml Encrypt Hmtl
╚═══════ ೋღ ═══  🌸  ═══ ღೋ ═══════╝\`\`\`
`;
    const thumb = await getThumbnailBuffer();
    if (messageId) {
        if (thumb) {
            await ctx.telegram.editMessageMedia(ctx.chat.id, messageId, undefined, {
                type: 'photo',
                media: { source: thumb },
                caption,
                parse_mode: 'Markdown'
            }, { reply_markup: EncV2Keyboard });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, caption, {
                parse_mode: 'Markdown',
                reply_markup: EncV2Keyboard
            });
        }
    } else {
        if (thumb) {
            await ctx.replyWithPhoto({ source: thumb }, { caption, parse_mode: 'Markdown', reply_markup: EncV2Keyboard });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: EncV2Keyboard });
        }
    }
}

async function showJoinPrompt(ctx) {
    const caption = `<blockquote>❌<b>Akses Ditolak</b></blockquote>
<blockquote><b>𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖩𝗈𝗂𝗇 𝖢𝗁𝖺𝗇𝗇𝖾𝗅 𝖮𝗐𝗇𝖾𝗋 𝖲𝖺𝗒𝖺 𝖴𝗇𝗍𝗎𝗄 𝖬𝖾𝗇𝗀𝖺𝗄𝗌𝖾𝗌 𝖡𝗈𝗍 𝖮𝖻𝖿</b></blockquote>.
Setelah join, ketik /start lagi untuk melanjutkan.`;
    const thumb = await getThumbnailBuffer();
    if (thumb) {
        await ctx.replyWithPhoto({ source: thumb }, { caption, parse_mode: 'HTML', reply_markup: joinKeyboard });
    } else {
        await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: joinKeyboard });
    }
}

// ==================== CALLBACK ====================
bot.action('check_join', async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await isUserJoinedChannel(userId);
    if (isMember) {
        setUserAccess(userId, true);
        await ctx.answerCbQuery('✅ Verifikasi berhasil! Ketik /start untuk melanjutkan.');
        await showMenu1(ctx);
    } else {
        await ctx.answerCbQuery('❌ Kamu belum join channel!', { show_alert: true });
    }
});

bot.action('open_menu', async (ctx) => {
    const messageId = ctx.callbackQuery.message.message_id;
    await showMenu1(ctx, messageId);
    await ctx.answerCbQuery();
});

bot.action('main_menu', async (ctx) => {
    const messageId = ctx.callbackQuery.message.message_id;
    await showMenu1(ctx, messageId);
    await ctx.answerCbQuery();
});

bot.action('enc_menu_v1', async (ctx) => {
    const messageId = ctx.callbackQuery.message.message_id;
    await EncV1(ctx, messageId);
    await ctx.answerCbQuery();
});

bot.action('enc_menu_v2', async (ctx) => {
    const messageId = ctx.callbackQuery.message.message_id;
    await EncV2(ctx, messageId);
    await ctx.answerCbQuery();
});

bot.action('tools_menu', async (ctx) => {
    const messageId = ctx.callbackQuery.message.message_id;
    await showMenu2(ctx, messageId);
    await ctx.answerCbQuery();
});

bot.action("owner_menu", async (ctx) => {

  // hanya owner
  if (Number(ctx.from.id) !== config.OWNER_ID) {

    return ctx.answerCbQuery(
      "✘ 𝖭𝗈 𝖭𝗈 𝖸𝖺𝗄.",
      {
        show_alert: true
      }
    )
  }

  await ctx.answerCbQuery()

  const cap =
`\`\`\`js
𝖬𝖾𝗇𝗎 𝖪𝗁𝗎𝗌𝗎𝗌 𝖮𝗐𝗇𝖾𝗋
─────────────────────────
( ✘ )𝖬𝖾𝗇𝗎 𝖪𝗁𝗎𝗌𝗎𝗌 𝖮𝗐𝗇𝖾𝗋

/broadcast – Reply Text
/maintenance – on/off|alasan<
─────────────────────────

𝖠𝖼𝖼𝖾𝗌𝗌 𝖮𝗇𝗅𝗒 𝖮𝗐𝗇𝖾𝗋 𝖨𝖽\`\`\`
`

  try {

    await ctx.editMessageCaption(
      cap,
      {
        parse_mode: "Markdown",
        reply_markup: OwnKb
      }
    )

  } catch {

    try {

      await ctx.editMessageText(
        cap,
        {
          parse_mode: "Markdown",
          reply_markup: OwnKb
        }
      )

    } catch {}
  }
});
// ==================== RANDOM ====================

function randomHex(length = 40) {
return crypto
.randomBytes(length)
.toString("hex")
}

function randomName(list) {

const extra = [
"ツ","々","〆","メ","ん","ฬ","刃","ฬ"
]

return (
list[
Math.floor(
Math.random() *
list.length
)
] +
extra[
Math.floor(
Math.random() *
extra.length
)
] +
Math.floor(
Math.random() * 99999
)
)

}

// ==================== GLOBAL CHAOS ====================

function chaosVars(total=500,names=[]){

let out = ``

for(let i=0;i<total;i++){

out += `
var ${randomName(names)}="${randomHex(80)}";
`

}

return out

}

// ==================== ARTILLERY ====================

function artilleryStyle(code){

const art = [
"つき","さくら","ほし","ゆき",
"ねこ","みず","かぜ","やみ"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(600,art)}

function ${randomName(art)}(){

const ${randomName(art)}="${b64}";

return Buffer
.from(
${randomName(art)},
"base64"
)
.toString()

}

eval(
${randomName(art)}()
)

})();
`

}

// ==================== HARDCORE ====================

function hardcoreStyle(code){

const hard = [
"悪魔","闇","無限","崩壊",
"零","死神","幻","滅"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(1000,hard)}

setInterval(()=>{

debugger

},1)

console.clear()

function ${randomName(hard)}(){

const ${randomName(hard)}="${b64}"

return Buffer
.from(
${randomName(hard)},
"base64"
)
.toString()

}

eval(
${randomName(hard)}()
)

})();
`

}

// ==================== PHANTOM ====================

function phantomStyle(code){

const names = [
"幻","幽霊","亡霊","影"
]

const hex =
Buffer
.from(code)
.toString("hex")

return `
(function(){

${chaosVars(400,names)}

function ${randomName(names)}(){

return Buffer
.from(
"${hex}",
"hex"
)
.toString()

}

eval(
${randomName(names)}()
)

})();
`

}

// ==================== BALANCED ====================

function balancedStyle(code){

const names = [
"均衡","静","風","月"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(300,names)}

const ${randomName(names)}="${b64}"

eval(
Buffer
.from(
${randomName(names)},
"base64"
)
.toString()
)

})();
`

}

// ==================== REVERSED ====================

function reversedStyle(code){

const names = [
"逆","反転","戻","終"
]

const rev =
code
.split("")
.reverse()
.join("")

return `
(function(){

${chaosVars(350,names)}

function ${randomName(names)}(){

return "${rev}"
.split("")
.reverse()
.join("")

}

eval(
${randomName(names)}()
)

})();
`

}

// ==================== ROSEMARY ====================

function rosemaryStyle(code){

const names = [
"薔薇","深夜","死","夢"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(800,names)}

setInterval(()=>{

debugger

},5)

console.clear()

function ${randomName(names)}(){

const ${randomName(names)}="${b64}"

return Buffer
.from(
${randomName(names)},
"base64"
)
.toString()

}

eval(
${randomName(names)}()
)

})();
`

}

// ==================== INVISIBLE ====================

function invisStyle(code){

const names = [
"透明","消失","空","無"
]

const uni =
escape(
Buffer
.from(code)
.toString("base64")
)

return `
(function(){

${chaosVars(500,names)}

function ${randomName(names)}(){

return Buffer
.from(
unescape("${uni}"),
"base64"
)
.toString()

}

eval(
${randomName(names)}()
)

})();
`

}

// ==================== JAPAN ====================

function japanStyle(code){

const jp = [
"つき",
"さくら",
"ほし",
"ねこ",
"そら",
"ゆき",
"みず",
"かぜ",
"れい",
"やみ",
"むげん",
"はな"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(1500,jp)}

function ${randomName(jp)}(){

${chaosVars(300,jp)}

const ${randomName(jp)}="${b64}"

return Buffer
.from(
${randomName(jp)},
"base64"
)
.toString()

}

eval(
${randomName(jp)}()
)

})();
`

}

// ==================== ARAB ====================

function arabStyle(code){

const ar = [
"سلام",
"قمر",
"نور",
"ليل",
"شمس",
"نار",
"روح",
"موت"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(900,ar)}

function ${randomName(ar)}(){

const ${randomName(ar)}="${b64}"

return Buffer
.from(
${randomName(ar)},
"base64"
)
.toString()

}

eval(
${randomName(ar)}()
)

})();
`

}

// ==================== SIU ====================

function siuStyle(code){

const siu = [
"SIUU","RONALDO","GOAL","CR7"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(600,siu)}

function ${randomName(siu)}(){

const ${randomName(siu)}="${b64}"

return Buffer
.from(
${randomName(siu)},
"base64"
)
.toString()

}

eval(
${randomName(siu)}()
)

})();
`

}

// ==================== NEBULA ====================

function nebulaStyle(code){

const neb = [
"星雲","宇宙","銀河","闇",
"ブラック","無限","ゼロ"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(2500,neb)}

setInterval(()=>{

debugger

},1)

console.clear()

function ${randomName(neb)}(){

${chaosVars(500,neb)}

const ${randomName(neb)}="${b64}"

return Buffer
.from(
${randomName(neb)},
"base64"
)
.toString()

}

eval(
${randomName(neb)}()
)

})();
`

}

// ==================== VAR ====================

function varStyle(code){

const names = [
"変数","乱数","無限","影",
"幻","闇","零"
]

return `
(function(){

${chaosVars(3000,names)}

${code}

})();
`

}

// ==================== CUSTOM ====================

function customStyle(code,name){

const names = [
"改造","極限","混乱","破壊",
"地獄","暗黒","虚無"
]

const b64 =
Buffer
.from(code)
.toString("base64")

return `
/*
${name}
*/
(function(){
${chaosVars(1200,names)}
function ${randomName(names)}(){
const ${randomName(names)}="${b64}"
return Buffer
.from(
${randomName(names)},
"base64"
)
.toString()
}
eval(
${randomName(names)}()
)
})();
`

}

// ==================== EXPIRED ====================

function timeLockStyle(code,days){

const names = [
"期限","終焉","時間","封印"
]

const expired =
Date.now() +
(Number(days) * 86400000)

const b64 =
Buffer
.from(code)
.toString("base64")

return `
(function(){

${chaosVars(700,names)}

const ${randomName(names)}="${expired}"

if(
Date.now() >
Number(
${randomName(names)}
)
){

console.log(
"Script Expired"
)

process.exit()

}

function ${randomName(names)}(){

const ${randomName(names)}="${b64}"

return Buffer
.from(
${randomName(names)},
"base64"
)
.toString()

}

eval(
${randomName(names)}()
)

})();
`

}

// COMMAND
// /artillery
bot.command(
'artillery',
(ctx)=>
processObfuscate(
ctx,
artilleryStyle,
'Artillery'
)
)

// /hardcore
bot.command(
'hardcore',
(ctx)=>
processObfuscate(
ctx,
hardcoreStyle,
'Hardcore'
)
)

// /phantom
bot.command(
'phantom',
(ctx)=>
processObfuscate(
ctx,
phantomStyle,
'Phantom'
)
)

// /balanced
bot.command(
'balanced',
(ctx)=>
processObfuscate(
ctx,
balancedStyle,
'Balanced'
)
)

// /reversed
bot.command(
'reversed',
(ctx)=>
processObfuscate(
ctx,
reversedStyle,
'Reversed'
)
)

// /rosemary
bot.command(
'rosemary',
(ctx)=>
processObfuscate(
ctx,
rosemaryStyle,
'Rosemary'
)
)

// /invisenc
bot.command(
'invisenc',
(ctx)=>
processObfuscate(
ctx,
invisStyle,
'InvisEnc'
)
)

// /japanenc
bot.command(
'japanenc',
(ctx)=>
processObfuscate(
ctx,
japanStyle,
'japanenc'
)
)

// /encarab
bot.command(
'encarab',
(ctx)=>
processObfuscate(
ctx,
arabStyle,
'encarab'
)
)

// /siuenc
bot.command(
'siuenc',
(ctx)=>
processObfuscate(
ctx,
siuStyle,
'siuenc'
)
)

// /japan
bot.command(
'japan',
(ctx)=>
processObfuscate(
ctx,
japanStyle,
'Japan'
)
)

// /nebula
bot.command(
'nebula',
(ctx)=>
processObfuscate(
ctx,
nebulaStyle,
'Nebula'
)
)

// /var
bot.command(
'var',
(ctx)=>
processObfuscate(
ctx,
varStyle,
'Var'
)
)

// /enctime
bot.command(
'enctime',
async(ctx)=>{

const days =
ctx.message.text
.split(' ')[1]

if(!days){

return ctx.reply(
'❌ Example : /enctime 30'
)

}

await processObfuscate(
ctx,
(code)=>timeLockStyle(code, days),
'EncTime'
)

}
)

// /enccustom
bot.command(
'enccustom',
async(ctx)=>{

const text =
ctx.message.text
.split(' ')
.slice(1)
.join(' ')

if(!text){

return ctx.reply(
'❌ Example : /enccustom SabilOfficial'
)

}

await processObfuscate(
ctx,
(code)=>customStyle(code, text),
'EncCustom'
)

}
)

// ==================== HARDHTML ====================

bot.command("hardhtml", async (ctx) => {

try {

if (!ctx.message.reply_to_message?.document) {
return ctx.reply("Reply file html.");
}

const file =
await ctx.telegram.getFile(
ctx.message.reply_to_message.document.file_id
)

const link = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(link)

const html = res.data

const b64 =
Buffer
.from(html)
.toString("base64")

let anti = ""

for(let i=0;i<800;i++){

anti += `
var _${randomHex(8)}="${randomHex(50)}";
`

}

const result = `
<!-- HARDHTML -->

<script>

${anti}

setInterval(()=>{
debugger
},1)

eval(
atob(
"${b64}"
)
)

</script>
`

await ctx.replyWithDocument({
source: Buffer.from(result),
filename: "hardhtml.html"
})

} catch(e){

ctx.reply(String(e))

}

})

// ==================== INVISHTML ====================

bot.command("invishtml", async (ctx) => {

try {

if (!ctx.message.reply_to_message?.document) {
return ctx.reply("Reply file html.");
}

const file =
await ctx.telegram.getFile(
ctx.message.reply_to_message.document.file_id
)

const link = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(link)

const html = res.data

const uni =
escape(
Buffer
.from(html)
.toString("base64")
)

const result = `
<!-- INVISIBLE HTML -->

<script>

eval(
atob(
unescape(
"${uni}"
)
)
)

</script>
`

await ctx.replyWithDocument({
source: Buffer.from(result),
filename: "invishtml.html"
})

} catch(e){

ctx.reply(String(e))

}

})

// ==================== GETSOURCE ====================

bot.command("getsource", async (ctx) => {

try {

const url =
ctx.message.text
.split(" ")
.slice(1)
.join(" ")

if(!url){
return ctx.reply(
"Example:\n/getsource https://example.com"
)
}

const res =
await axios.get(url)

const html = res.data

await ctx.replyWithDocument({
source: Buffer.from(html),
filename: "source.html"
})

} catch(e){

ctx.reply(String(e))

}

})

// ==================== CEKFUNC ====================

bot.command("cekfunc", async (ctx) => {

try {

if (!ctx.message.reply_to_message?.document) {
return ctx.reply("Reply file js.");
}

const file =
await ctx.telegram.getFile(
ctx.message.reply_to_message.document.file_id
)

const link = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(link)

const code = res.data

const func =
(code.match(/function\s+[A-Za-z0-9_$]+\s*\(/g) || [])

.join("\n")

if(!func){
return ctx.reply("Tidak ada function.")
}

ctx.reply(
`Found Function:\n\n${func}`
)

} catch(e){

ctx.reply(String(e))

}

})

// ==================== CEKERROR ====================

bot.command("cekerror", async (ctx) => {

try {

if (
!ctx.message.reply_to_message
) {
return ctx.reply(
"Reply file .js atau code."
)
}

let code = ""
let fileName = "code.js"

// ================= FILE =================

if (
ctx.message.reply_to_message.document
) {

const doc =
ctx.message.reply_to_message.document

fileName =
doc.file_name || "file.js"

const file =
await ctx.telegram.getFile(
doc.file_id
)

const url =
`https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(url)

code = res.data

}

// ================= TEXT =================

else if (
ctx.message.reply_to_message.text
) {

code =
ctx.message.reply_to_message.text

}

// ================= INVALID =================

else {

return ctx.reply(
"Reply file .js atau code."
)

}

const lines =
code.split("\n")

const size =
(
Buffer.byteLength(code)
/
1024
)
.toFixed(1)

let syntaxErr =
"Tidak ada"

let runtimeErr =
"Tidak ada"

let lineErr = "?"
let colErr = "?"

let snippet = ""

let detected = []
let suggest = []

// ================= SYNTAX CHECK =================

try {

new Function(code)

} catch(err){

syntaxErr =
err.message

const stack =
err.stack || ""

const match =
stack.match(
/<anonymous>:(\d+):(\d+)/
)

if(match){

lineErr =
match[1]

colErr =
match[2]

const lineNum =
parseInt(lineErr)

const start =
Math.max(
0,
lineNum - 3
)

const end =
Math.min(
lines.length,
lineNum + 2
)

snippet =
lines
.slice(start,end)
.map((v,i)=>{

const ln =
start + i + 1

const mark =
ln == lineNum
? "👉"
: " "

return `${mark} ${ln} | ${v}`

})
.join("\n")

}

}

// ================= RUNTIME CHECK =================

try {

require("vm")
.runInNewContext(
code,
{},
{
timeout:1000
}
)

} catch(err){

runtimeErr =
err.message

}

// ================= DETECT =================

if(
code.includes("fs.")
&&
!code.includes("require('fs')")
&&
!code.includes('require("fs")')
){

detected.push(
"Module fs digunakan tapi tidak di-require"
)

suggest.push(
"Tambahkan:\nconst fs = require('fs')"
)

}

if(
code.includes("axios.")
&&
!code.includes("require('axios')")
&&
!code.includes('require("axios")')
){

detected.push(
"Module axios digunakan tapi tidak di-require"
)

suggest.push(
"Tambahkan:\nconst axios = require('axios')"
)

}

if(
code.includes("eval(eval(")
){

detected.push(
"Nested eval terdeteksi"
)

suggest.push(
"Hindari eval(eval())"
)

}

if(
code.includes("while(true)")
){

detected.push(
"Infinite loop terdeteksi"
)

suggest.push(
"Ganti while(true)"
)

}

// ================= MESSAGE =================

const result = `
🧪 CekError JavaScript Analyzer

━━━━━━━━━━━━━━━━━━

📄 File : ${fileName}
📦 Ukuran : ${size} KB
📏 Baris : ${lines.length}

━━━━━━━━━━━━━━━━━━

❌ SYNTAX ERROR
\`\`\`js
📍 Line ${lineErr}, Column ${colErr}\`\`\`

${syntaxErr}

📌 Cuplikan

\`\`\`javascript
${snippet || "Tidak ada"}
\`\`\`

⚙️ Runtime Check
\`\`\`js
${runtimeErr}\`\`\`

🧠 Deteksi Masalah
\`\`\`js
${detected.length
? detected.map(v=>`• ${v}`).join("\n")
: "Tidak ada"
}\`\`\`

🛠️ Saran Perbaikan
\`\`\`js
${suggest.length
? suggest.map(v=>`• ${v}`).join("\n")
: "Tidak ada"
}\`\`\`

━━━━━━━━━━━━━━━━━━

✨ Analisis selesai
`

ctx.reply(
result,
{
parse_mode:"Markdown"
}
)

} catch(e){

ctx.reply(
String(e)
)

}

})
// ==================== INFOERROR ====================

bot.command("infoerror", async (ctx) => {

try {

if (!ctx.message.reply_to_message?.document) {
return ctx.reply("Reply file js.");
}

const file =
await ctx.telegram.getFile(
ctx.message.reply_to_message.document.file_id
)

const link = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(link)

let code = res.data

let info = []

if(code.includes("eval(eval(")){
info.push("Nested eval detected")
}

if(code.includes("debugger")){
info.push("Debugger detected")
}

if(code.includes("while(true)")){
info.push("Infinite loop detected")
}

if(code.length > 500000){
info.push("File too large")
}

if(info.length < 1){
info.push("No problem detected")
}

ctx.reply(
`INFO ERROR:\n\n- ${info.join("\n- ")}`
)

} catch(e){

ctx.reply(String(e))

}

})

// ==================== FIXFUNC ====================

bot.command("fixfunc", async (ctx) => {

try {

if (!ctx.message.reply_to_message?.document) {
return ctx.reply("Reply file js.");
}

const file =
await ctx.telegram.getFile(
ctx.message.reply_to_message.document.file_id
)

const link = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`

const res =
await axios.get(link)

let code = res.data

code = code
.replace(/debugger;/g,"")
.replace(/while\s*\(\s*true\s*\)/g,"while(false)")
.replace(/eval\(eval\(/g,"eval(")

await ctx.replyWithDocument({
source: Buffer.from(code),
filename: "fixed.js"
})

} catch(e){

ctx.reply(String(e))

}

})

// =============================
// CMD BACKUP
// =============================
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

// =============================
// CMD CHATADMIN
// =============================
bot.command(
    "chatowner",
    async (ctx) => {

        const userId =
            Number(ctx.from.id)

        // owner tidak bisa
        if (userId === config.OWNER_ID) {

            return ctx.reply(
                "Command ini hanya untuk user."
            )
        }

        // aktifkan mode chat
        ADMIN_REPLY_DB[userId] = {
            waiting : true
        }

        // button cancel
        const kb = {
            inline_keyboard: [
                [
                    {
                        text: "❌ Batalkan",
                        callback_data: "cancel_chat_admin",
                        style: "danger"
                    }
                ]
            ]
        }

        // kirim ke user
        await ctx.reply(
`
<blockquote><b>💬 CHAT OWNER</b></blockquote>
<blockquote><b>Silahkan kirim pesan anda untuk owner.</b></blockquote>
<blockquote><b>Pesan akan langsung diteruskan ke owner.</b></blockquote>
`,
            {
                parse_mode: "HTML",
                reply_markup: kb
            }
        )

    }
)


// =============================
// CANCEL CHAT
// =============================
bot.action(
    "cancel_chat_admin",
    async (ctx) => {

        const userId =
            Number(ctx.from.id)

        delete ADMIN_REPLY_DB[userId]

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

    }
)


// =============================
// USER MESSAGE → OWNER
// =============================
bot.on(
    "text",
    async (ctx, next) => {

        const userId =
            Number(ctx.from.id)

        // skip owner
        if (userId === config.OWNER_ID) {
            return next()
        }

        // bukan user chatadmin
        if (!ADMIN_REPLY_DB[userId]) {
            return next()
        }

        // skip command
        if (
            ctx.message.text.startsWith("/")
        ) {

            return next()
        }

        // waktu
        const waktu =
            new Date()
            .toLocaleString(
                "id-ID"
            )

        // kirim ke owner
        const sent =
            await bot.telegram.sendMessage(
                config.OWNER_ID,
`
<blockquote><b>📩 PESAN USER</b></blockquote>
<blockquote><b>👤 Username : @${ctx.from.username || "Tidak ada"}

🆔 ID : <code>${userId}</code>

🕒 Waktu :${waktu} </b></blockquote>
<blockquote><b>📝 Pesan</b> : <pre>${ctx.message.text}</pre></blockquote>
`,
                {
                    parse_mode: "HTML"
                }
            ).catch(() => null)

        // simpan message mapping
        if (sent) {

            ADMIN_REPLY_DB[
                sent.message_id
            ] = userId
        }

        // notif user
        await ctx.reply(
`
<blockquote><b>✅ Pesan Berhasil Dikirim</b></blockquote>
<blockquote><b>Tunggu hingga owner membalas pesan anda.</b></blockquote>
`,
            {
                parse_mode: "HTML"
            }
        )

    }
)


// =============================
// OWNER REPLY → USER
// =============================
bot.on(
    "text",
    async (ctx, next) => {

        const ownerId =
            Number(ctx.from.id)

        // hanya owner
        if (ownerId !== config.OWNER_ID) {
            return next()
        }

        const reply =
            ctx.message.reply_to_message

        // harus reply
        if (!reply) {
            return next()
        }

        // skip command
        if (
            ctx.message.text.startsWith("/")
        ) {

            return next()
        }

        // ambil target user
        const targetUser =
            ADMIN_REPLY_DB[
                reply.message_id
            ]

        // tidak ada target
        if (!targetUser) {
            return next()
        }

        // kirim balasan
        await bot.telegram.sendMessage(
            targetUser,
`
<blockquote><b>💬 BALASAN</b></blockquote>
<pre>${ctx.message.text}</pre>
`,
            {
                parse_mode: "HTML"
            }
        ).catch(() => {})

        // notif owner
        await ctx.reply(
            "✅ Balasan berhasil dikirim."
        ).catch(() => {})

    }
)

// ==================== COMMAND /BROADCAST ====================
bot.command('broadcast', async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // Hanya owner
    if (userId !== config.OWNER_ID) {
        return ctx.reply('⚠️ <b>Akses Ditolak!</b> Hanya Owner.', { parse_mode: 'HTML' });
    }

    // Cek database user
    if (!fs.existsSync(PATH_USERS)) {
        return ctx.reply('❌ Database user tidak ditemukan.', { parse_mode: 'HTML' });
    }

    // Baca file dengan format object { "users": { "id": true, ... } }
    let usersData = { users: {} };
    try {
        usersData = JSON.parse(fs.readFileSync(PATH_USERS, 'utf8'));
        // Jika masih format array lama, konversi ke object (opsional)
        if (Array.isArray(usersData)) {
            const newUsers = { users: {} };
            usersData.forEach(id => { newUsers.users[id] = true; });
            usersData = newUsers;
            fs.writeFileSync(PATH_USERS, JSON.stringify(usersData, null, 2));
        }
        // Pastikan struktur sesuai
        if (!usersData.users) usersData.users = {};
    } catch (err) {
        return ctx.reply(`❌ Error membaca database: ${err.message}`, { parse_mode: 'HTML' });
    }

    // Ambil semua ID user dari object
    const users = Object.keys(usersData.users); // array of user IDs
    if (users.length === 0) {
        return ctx.reply('⚠️ Belum ada user terdaftar.');
    }

    // Harus reply ke pesan yang akan di-broadcast
    const reply = ctx.message.reply_to_message;
    if (!reply) {
        return ctx.reply('💡 Cara pakai: Reply pesan yang ingin dikirim ke semua user, lalu ketik /broadcast', { parse_mode: 'HTML' });
    }

    // Kirim pesan progress awal
    let progressMsg = await ctx.reply(
        `📡 <b>Memulai Broadcast...</b>\n\n<pre>█▒▒▒▒▒▒▒▒▒10%</pre>
`,
        { parse_mode: 'HTML' }
    );

    let success = 0, failed = 0;
    const total = users.length;

    for (let i = 0; i < total; i++) {
        const targetUserId = parseInt(users[i]); // konversi ke number
        try {
            await ctx.telegram.copyMessage(targetUserId, chatId, reply.message_id);
            success++;
        } catch (err) {
            failed++;
        }

        // Update progress setiap 10 user atau di akhir
        if ((i + 1) % 10 === 0 || (i + 1) === total) {
            const pct = Math.round(((i + 1) / total) * 100);
            const filled = Math.round(pct / 40);
            const bar = '█'.repeat(filled) + '▒'.repeat(10 - filled);

            await ctx.telegram.editMessageText(
                chatId,
                progressMsg.message_id,
                undefined,
                `📡 <b>Mengirim Broadcast... (${i + 1}/${total})</b>\n\n<pre>${bar}  ${pct}%</pre>\n\n✅ Berhasil: ${success}  ❌ Gagal: ${failed}`,
                { parse_mode: 'HTML' }
            ).catch(() => {});
        }
        await new Promise(resolve => setTimeout(resolve, 50)); // jeda 50ms
    }

    // Hapus pesan progress
    await ctx.telegram.deleteMessage(chatId, progressMsg.message_id).catch(() => {});

    // Kirim laporan akhir
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
    await ctx.reply(
        `📢 <b>Broadcast Selesai</b>\n\n✅ Sukses: ${success} user\n❌ Gagal: ${failed} user\n👥 Total: ${total} user\n🕐 Waktu: ${timeStr}\n\n<code>Created By @sabilofficial ─ Project Test Func</code>`,
        { parse_mode: 'HTML' }
    );
});
// =============================
// MAINTENANCE COMMAND
// =============================
bot.command("maintenance", async (ctx) => {

    const userId = Number(ctx.from.id)

    // owner only
    if (userId !== config.OWNER_ID) {
        return ctx.reply("❌ Khusus owner.")
    }

    const text = ctx.message.text

    // ambil args
    const args = text.split(" ").slice(1).join(" ")

    // kalau kosong
    if (!args) {
        return ctx.reply(`\`\`\`js
📌 Maintenance Mode

/maintenance on|update system
/maintenance off|maintenance selesai\`\`\`
            `,
            {
                parse_mode: "Markdown"
            }
        )
    }

    // split on/off dan alasan
    const [mode, ...reasonArray] = args.split("|")

    const input = mode.trim().toLowerCase()

    const reason = reasonArray.join("|").trim() || "Tidak ada alasan"

    // =============================
    // ON
    // =============================
    if (input === "on") {

        fs.writeFileSync(
            PATH_MAINTENANCE,
            JSON.stringify({
                status: true,
                reason
            }, null, 2)
        )

        return ctx.reply(
            `\`\`\`js
🛠 Maintenance Enabled

📌 Status : ON
📝 Alasan : ${reason}\`\`\`
            `,
            {
                parse_mode: "Markdown"
            }
        )
    }

    // =============================
    // OFF
    // =============================
    if (input === "off") {

        fs.writeFileSync(
            PATH_MAINTENANCE,
            JSON.stringify({
                status: false,
                reason
            }, null, 2)
        )

        return ctx.reply(
            `\`\`\`
✅ Maintenance Disabled

📌 Status : OFF
📝 Keterangan : ${reason}\`\`\`
            `,
            {
                parse_mode: "Markdown"
            }
        )
    }

    // invalid
    return ctx.reply(
        `\`\`\`
✘ Format Salah

/maintenance on|alasan
/maintenance off|alasan\`\`\`
        `,
        {
            parse_mode: "Markdown"
        }
    )
})
// ==================== COMMAND /CLAUDE ====================
bot.command('ai', async (ctx) => {

    const chatId = ctx.chat.id;
    const ownerId = config.OWNER_ID;
    const sessionFp = path.join(__dirname, './database/ai.json');

    // Cek maintenance (jika fungsi isMaintenance ada)
    if (typeof isMaintenance === 'function' && isMaintenance() && chatId !== ownerId) {
        return ctx.reply('🛠 Bot sedang maintenance.');
    }

    // Ambil teks setelah /claude
    const q = ctx.message.text.replace(/^\/ai\s*/, '').trim();
    if (!q) {
        return ctx.reply('💬 Masukkan pertanyaan setelah /ai');
    }

    // Kirim pesan "sedang memproses..."
    const waitMsg = await ctx.reply('Waiting...');

    // Fungsi load/save session
    const loadAI = () => {
        try {
            if (!fs.existsSync(sessionFp)) {
                fs.writeJsonSync(sessionFp, {});
                return {};
            }
            return fs.readJsonSync(sessionFp);
        } catch (e) {
            console.error('[AI-SESS-ERR]', e.message);
            return {};
        }
    };
    const saveAI = (data) => {
        try {
            fs.writeJsonSync(sessionFp, data, { spaces: 2 });
        } catch (e) {
            console.error('[AI-SAVE-ERR]', e.message);
        }
    };
    const getSession = (uid, db) => {
        if (!db[uid]) db[uid] = [];
        return db[uid];
    };

    try {
        const uid = ctx.from.id.toString();
        const aiDb = loadAI();
        const sess = getSession(uid, aiDb);

        sess.push({ role: 'user', content: q });
        if (sess.length > 20) aiDb[uid] = sess.slice(-10);

        const systemPrompt = `
Aturan format jawaban:
- Gunakan Markdown Telegram sederhana (bold, bullet).
- Dilarang menggunakan tabel.
- Jika penjelasan biasa, pakai teks dan bullet saja.
- Jika ada kode, gunakan blok kode (\`\`\`) sesuai bahasa.
- Jangan gunakan emoji berlebihan.
- Langsung to the point, jangan ulang pertanyaan user.
- Pastikan output aman untuk Telegram tanpa error parse.
Session Memory:
- Lihat history chat terakhir (max 10 pesan).
- Lanjutkan konteks percakapan sebelumnya.
- Ingat detail yang sudah disebutkan user.`.trim();

        const chatHistory = [
            { role: 'system', content: systemPrompt },
            ...sess.slice(-10),
        ];

        const { data } = await axios.post(
            'https://aliicia.my.id/api/chatgpt',
            { message: chatHistory },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let ans = (data?.response || 'Gagal mendapatkan jawaban.')
            .replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        sess.push({ role: 'assistant', content: ans });
        saveAI(aiDb);

        // Fungsi split untuk memotong pesan > 4000 karakter (batas aman Telegram 4096)
        const splitResponse = (text, maxLen = 4000) => {
            const parts = [];
            const codeRx = /```[\s\S]*?```/g;
            const segs = [];
            let lastIdx = 0, m;

            while ((m = codeRx.exec(text)) !== null) {
                if (m.index > lastIdx) segs.push({ t: 'text', v: text.substring(lastIdx, m.index) });
                segs.push({ t: 'code', v: m[0] });
                lastIdx = m.index + m[0].length;
            }
            if (lastIdx < text.length) segs.push({ t: 'text', v: text.substring(lastIdx) });

            let cur = '';
            for (const seg of segs) {
                if ((cur.length + seg.v.length) <= maxLen) {
                    cur += seg.v;
                } else {
                    if (cur.trim()) parts.push(cur.trim());
                    if (seg.t === 'code' && seg.v.length > maxLen) {
                        const inner = seg.v.substring(3, seg.v.length - 3);
                        const lang = (seg.v.match(/^```(\w+)/) || ['', ''])[1];
                        const lines = inner.split('\n');
                        let chunk = `\`\`\`${lang}\n`;
                        for (const ln of lines) {
                            if ((chunk.length + ln.length + 1) > maxLen - 3) {
                                chunk += '```';
                                parts.push(chunk);
                                chunk = `\`\`\`${lang}\n${ln}\n`;
                            } else {
                                chunk += ln + '\n';
                            }
                        }
                        if (chunk.trim() !== `\`\`\`${lang}`) {
                            chunk += '```';
                            cur = chunk;
                        } else {
                            cur = '';
                        }
                    } else {
                        cur = seg.v;
                    }
                }
            }
            if (cur.trim()) parts.push(cur.trim());
            return parts;
        };

        const chunks = splitResponse(ans, 4000);
        // Hapus pesan "sedang memproses..."
        await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
        // Kirim setiap bagian
        for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
        }
    } catch (err) {
        console.error('[AI-ERR]', err.message);
        await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
        ctx.reply('❌ Terjadi error: ' + err.message);
    }
})

bot.command("cekfuncv2", async (ctx) => {
try {

if (!ctx.message.reply_to_message)
return ctx.reply("Reply function JavaScript yang ingin dicek.")

const text =
ctx.message.reply_to_message.text ||
ctx.message.reply_to_message.caption

if (!text)
return ctx.reply("Pesan yang direply tidak berisi kode.")

let acorn
try {
acorn = require("acorn")
} catch {
return ctx.reply("Module acorn belum terinstall.\nInstall dengan: npm install acorn")
}

try {

acorn.parse(text, {
ecmaVersion: "latest",
sourceType: "module",
locations: true
})

return ctx.reply(`🔎 Mengecek syntax function...

Asekk Ga ada Error Cuy Di Func Nya 
By @sabilOfficial`)

} catch (err) {

const lines = text.split("\n")
const line = err.loc.line
const column = err.loc.column

const start = Math.max(0, line - 3)
const end = Math.min(lines.length, line + 2)

const snippet = lines.slice(start, end).map((l, i) => {
const num = start + i + 1
return num === line
? `👉 ${num} | ${l}`
: `   ${num} | ${l}`
}).join("\n")

return ctx.reply(`Yahhh Func Error Ni Fixed Dong

${err.message}
Line ${line}:${column}

📌 Cuplikan:
\`\`\`javascript
${snippet}
\`\`\`

 By @sabilofficial`)

}

} catch (e) {
console.error(e)
ctx.reply("Terjadi error saat mengecek function.")
}

});

bot.command("cekidemoji", async (ctx) => {
  const targetMsg = ctx.message.reply_to_message;

  if (!targetMsg) {
    return ctx.reply(`
<tg-emoji emoji-id="5852812849780362931">❌</tg-emoji> <b>Reply pesan yang berisi emoji premium.</b>

<b>Contoh:</b>
- User kirim emoji premium
- Reply emoji tersebut dengan command <code>/cekidemoji</code>
    `, {
      parse_mode: "HTML"
    });
  }

  const emojis = [];

  // dari text
  if (targetMsg.entities) {
    targetMsg.entities.forEach((entity) => {
      if (entity.type === "custom_emoji") {
        emojis.push({
          id: entity.custom_emoji_id
        });
      }
    });
  }

  // dari caption (foto/video)
  if (targetMsg.caption_entities) {
    targetMsg.caption_entities.forEach((entity) => {
      if (entity.type === "custom_emoji") {
        emojis.push({
          id: entity.custom_emoji_id
        });
      }
    });
  }

  if (emojis.length === 0) {
    return ctx.reply(`
<tg-emoji emoji-id="5852812849780362931">❌</tg-emoji> <b>Tidak ada custom emoji terdeteksi.</b>

Gunakan command ini dengan reply ke pesan yang berisi emoji premium Telegram.
    `, {
      parse_mode: "HTML"
    });
  }

  let result = `<blockquote><b><tg-emoji emoji-id="5289594654176606759">✨</tg-emoji><tg-emoji emoji-id="5287412269624358128">✨</tg-emoji><tg-emoji emoji-id="5289864047410314050">✨</tg-emoji><tg-emoji emoji-id="5290014366970706894">✨</tg-emoji>
╔══════════════════╗
   CUSTOM EMOJI FOUND
╚══════════════════╝</b></blockquote>
`;

  emojis.forEach((e, i) => {
    result += `<blockquote><b><tg-emoji emoji-id="5334890573281114250">✨</tg-emoji>Id Emoji ${i + 1}</b>
<code>${e.id}</code>
<tg-emoji emoji-id="5085022089103016925">✨</tg-emoji><b>Format Pakai:</b>
<code>&lt;tg-emoji emoji-id="${e.id}"&gt;✨&lt;/tg-emoji&gt;</code></blockquote>
`;
  });

  result += `<blockquote><b>━━━━━━━━━━━━━━━━━━━━</b>
<b>Total Emoji:</b> ${emojis.length}</blockquote>
`;

  ctx.reply(result, {
    parse_mode: "HTML"
  });
});
// kontol up
// ==================== JALANKAN ====================
// =============================
// DELETE CACHE FOLDER
// =============================
const foldersToDelete = [

    ".npm",
    ".node_modules",
    ".package-lock.json"

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
`
<blockquote><b>📦 SYSTEM BACKUP</b></blockquote>
<blockquote><b>📝 Reason : ${reason}</b></blockquote>
<blockquote><b>🕒 Time : ${time}</b></blockquote>
`,
                parse_mode: "HTML"
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
            "Auto Backup 30 Menit"
        )

    },

    30 * 60 * 1000
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
bot.launch().then(() => console.log('✅ Bot obfuscator berjalan'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));