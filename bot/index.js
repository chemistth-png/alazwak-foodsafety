
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

console.log('Telegram bot is running...');

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
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
      // Get user from DB
      const { data: user } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', msg.from.id)
        .single();

      if (!user) return;

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
      // Note: We're using the existing chat function logic but adapted for the bot
      // Since we don't have a user session token here, we'll use a service role approach or a simplified prompt
      
      const response = await axios.post(chatFunctionUrl, {
        messages: [{ role: 'user', content: text }],
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const botReply = response.data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من معالجة طلبك حالياً.";

      // Log bot reply
      await supabase.from('telegram_messages').insert({
        telegram_user_id: user.id,
        message_id: 0, // Bot messages don't have a telegram message_id in this context
        content: botReply,
        role: 'bot'
      });

      // Send reply to user
      bot.sendMessage(chatId, botReply, { parse_mode: 'Markdown' });

    } catch (err) {
      console.error('Error handling message:', err);
      bot.sendMessage(chatId, "عذراً، واجهت مشكلة في الرد على استفسارك. يرجى المحاولة لاحقاً.");
    }
  }
});

// Error handling for polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});
