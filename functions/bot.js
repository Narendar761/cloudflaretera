import { handle } from 'hono/cloudflare';
import { Telegraf } from 'telegraf';
import { Hono } from 'hono';

// Initialize Hono app
const app = new Hono();

// Initialize Telegraf bot
const bot = new Telegraf(env.BOT_TOKEN);

const teraboxUrlRegex = /^https?:\/\/(?:www\.)?(?:[\w-]+\.)?(terabox\.com|1024terabox\.com|teraboxapp\.com|terafileshare\.com|teraboxlink\.com|terasharelink\.com)\/(s|sharing)\/[\w-]+/i;

// Bot commands
bot.start(ctx => {
    ctx.replyWithPhoto(
        { url: 'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg' },
        {
            caption: '👋 Welcome to TeraBox Downloader Bot!\n\nSend me a TeraBox sharing link.',
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('📌 Join Channel', 'https://t.me/Opleech_WD')]
            ])
        }
    );
});

bot.on('text', async ctx => {
    const text = ctx.message.text.trim();
    if (!teraboxUrlRegex.test(text)) return;

    try {
        const msg = await ctx.reply('⏳ Processing...');
        
        // Using Cloudflare's fetch instead of axios
        const response = await fetch(`https://wdzone-terabox-api.vercel.app/api?url=${encodeURIComponent(text)}`, {
            timeout: 120000
        });
        
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        const file = data?.['📜 Extracted Info']?.[0];
        const link = file?.['🔽 Direct Download Link'];

        await ctx.deleteMessage(msg.message_id);

        if (link) {
            await ctx.reply(
                '✅ Download your file:',
                Markup.inlineKeyboard([
                    [Markup.button.url('🔗 Download Now', link)]
                ])
            );
        } else {
            await ctx.reply('❌ No downloadable link found.');
        }
    } catch (err) {
        console.error(err.message);
        await ctx.reply('❌ Failed to process the link.');
    }
});

// Webhook endpoint
app.post('/webhook', async (c) => {
    try {
        await bot.handleUpdate(c.req.json(), c.env.BOT_TOKEN);
        return c.text('OK');
    } catch (err) {
        console.error('Webhook error:', err);
        return c.text('Error', 500);
    }
});

// Health check endpoint
app.get('/', (c) => c.text('🤖 Bot is running!'));

// Set webhook endpoint
app.get('/set-webhook', async (c) => {
    try {
        const webhookUrl = `https://${c.env.WORKER_DOMAIN}/webhook`;
        const response = await fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
        return c.json(await response.json());
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

export default {
    fetch: handle(app)
};
