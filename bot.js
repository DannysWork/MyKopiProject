const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('./server');

// Check if bot token is provided
if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.log('⚠️  Telegram bot token not configured. Bot features will be disabled.');
    console.log('   To enable Telegram bot, add your bot token to .env file');
    module.exports = { 
        notifyTelegram: async () => {
            console.log('Telegram notification skipped - bot not configured');
        }
    };
    return;
}

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Status messages
const statusMessages = {
  pending: '⏳ Your order has been received and is waiting to be prepared.',
  preparing: '☕ We\'re now preparing your order!',
  ready: '✅ Your order is ready for pickup!',
  completed: '🎉 Order completed. Thank you for choosing KopiSahaja!',
  cancelled: '❌ Your order has been cancelled.'
};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
Welcome to KopiSahaja Order Tracker! ☕

To track your order, please use:
/track [order_id]

Example: /track abc123-def456

You'll receive automatic updates when your order status changes.
  `;
  bot.sendMessage(chatId, welcomeMessage);
});

// Track order command
bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const orderId = match[1].trim();
  
  try {
    // Get order details
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      bot.sendMessage(chatId, '❌ Order not found. Please check your order ID.');
      return;
    }
    
    const order = orders[0];
    
    // Update telegram_chat_id for future notifications
    await pool.execute(
      'UPDATE orders SET telegram_chat_id = ? WHERE id = ?',
      [chatId.toString(), orderId]
    );
    
    // Get order items
    const [items] = await pool.execute(
      `SELECT oi.*, d.name as drink_name 
       FROM order_items oi 
       JOIN drinks d ON oi.drink_id = d.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    // Format order details
    let orderDetails = `📋 *Order Details*\n\n`;
    orderDetails += `Order ID: \`${orderId}\`\n`;
    orderDetails += `Customer: ${order.customer_name}\n`;
    orderDetails += `Status: ${order.status.toUpperCase()}\n\n`;
    
    orderDetails += `*Items:*\n`;
    items.forEach(item => {
      orderDetails += `• ${item.drink_name} (${item.size})\n`;
      orderDetails += `  Quantity: ${item.quantity}\n`;
      orderDetails += `  Sugar: ${item.sugar_level}, Ice: ${item.ice_level}\n\n`;
    });
    
    orderDetails += `💰 *Total: SGD ${order.total_amount.toFixed(2)}*\n\n`;
    orderDetails += statusMessages[order.status];
    
    bot.sendMessage(chatId, orderDetails, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error tracking order:', error);
    bot.sendMessage(chatId, '❌ Error tracking order. Please try again later.');
  }
});

// Function to send notifications (called from server.js)
async function notifyTelegram(chatId, orderId, status) {
  try {
    const message = `
🔔 *Order Update*

Your order \`${orderId}\` status has been updated:

${statusMessages[status]}
    `;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
*KopiSahaja Bot Commands:*

/start - Welcome message
/track [order_id] - Track your order
/help - Show this help message

For any issues, please contact our staff at the counter.
  `;
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

console.log('✅ Telegram bot started successfully!');

module.exports = { notifyTelegram }; 