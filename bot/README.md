
# Alazwak Food Safety Telegram Bot

This is the backend polling server for the Alazwak Food Safety Telegram bot.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   CHAT_FUNCTION_URL=your_supabase_chat_function_url
   ```

3. Run the bot:
   ```bash
   node index.js
   ```

## Features

- **Automated Responses**: Uses the app's smart agent logic to answer food safety questions.
- **User Management**: Tracks subscribers in the `telegram_users` table.
- **Message Logging**: Logs all interactions in the `telegram_messages` table.
- **Admin Control**: Settings can be managed via the app's Telegram Management dashboard.
- **Arabic Support**: Fully localized for Arabic-speaking users.
