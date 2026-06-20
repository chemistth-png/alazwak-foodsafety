
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const chatFunctionUrl = process.env.CHAT_FUNCTION_URL;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Please check TELEGRAM_BOT_TOKEN, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Telegram bot with polling
const bot = new TelegramBot(token, { polling: true });

console.log('Telegram bot is starting...');

// Helper to check if bot is enabled
async function isBotEnabled() {
  try {
    const { data, error } = await supabase
      .from('telegram_settings')
      .select('value')
      .eq('key', 'bot_status')
      .single();
    
    if (error) return true; // Default to enabled if setting missing
    return data.value.enabled !== false;
  } catch (e) {
    return true;
  }
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const { id, username, first_name, last_name, language_code } = msg.from;

  try {
    // Upsert user in telegram_users table
    const { data: user, error } = await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: id,
        username,
        first_name,
        last_name,
        language_code,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (error) throw error;

    // Get welcome message from settings
    const { data: settings } = await supabase
      .from('telegram_settings')
      .select('value')
      .eq('key', 'welcome_message')
      .single();

    const welcomeMsg = settings?.value?.ar || "مرحباً بك في بوت الأذواق لسلامة الغذاء. كيف يمكنني مساعدتك اليوم؟";
    bot.sendMessage(chatId, welcomeMsg);

  } catch (err) {
    console.error('Error in /start:', err);
    bot.sendMessage(chatId, "عذراً، حدث خطأ أثناء بدء التشغيل. يرجى المحاولة لاحقاً.");
  }
});

// Handle incoming messages
bot.on('message', async (msg) => {
  // Ignore commands and non-text messages
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    // Check if bot is enabled
    if (!(await isBotEnabled())) {
      console.log('Bot is currently disabled in settings.');
      return;
    }

    // Get or create user from DB
    let { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('telegram_id', msg.from.id)
      .single();

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: msg.from.id,
          username: msg.from.username,
          first_name: msg.from.first_name,
          last_name: msg.from.last_name,
          language_code: msg.from.language_code
        })
        .select('id')
        .single();
      
      if (createError) throw createError;
      user = newUser;
    }

    // Log user message
    await supabase.from('telegram_messages').insert({
      telegram_user_id: user.id,
      message_id: msg.message_id,
      content: text,
      role: 'user'
    });

    // Send typing indicator
    bot.sendChatAction(chatId, 'typing');

    // Call the smart agent (chat function)
    // We pass the message in the format expected by the Edge Function
    const response = await axios.post(chatFunctionUrl, {
      messages: [{ role: 'user', content: text }],
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30s timeout for AI response
    });

    const botReply = response.data.choices?.[0]?.message?.content || 
                     response.data.content || // Fallback for different response formats
                     "عذراً، لم أتمكن من معالجة طلبك حالياً.";

    // Log bot reply
    await supabase.from('telegram_messages').insert({
      telegram_user_id: user.id,
      message_id: 0, 
      content: botReply,
      role: 'bot'
    });

    // Send reply to user
    bot.sendMessage(chatId, botReply, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Error handling message:', err.message);
    if (err.code === 'ECONNABORTED') {
      bot.sendMessage(chatId, "عذراً، استغرق الرد وقتاً طويلاً. يرجى المحاولة مرة أخرى.");
    } else {
      bot.sendMessage(chatId, "عذراً، واجهت مشكلة في الرد على استفسارك. يرجى المحاولة لاحقاً.");
    }
  }
});

// Error handling for polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('Telegram bot is ready and polling for messages.');
