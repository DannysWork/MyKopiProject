# KopiSahaja - Hipster Coffee Ordering System

A modern, user-friendly coffee ordering website with real-time order tracking via web and Telegram bot.

## Features

- 🎨 Hipster-themed UI with smooth animations
- 🛒 Shopping cart functionality
- 📱 Real-time order tracking
- 🤖 Telegram bot integration for order updates
- 📊 PowerBI-ready data export
- 👨‍💼 Admin dashboard for order management
- 📱 Mobile-responsive design

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a MySQL database and update the `.env` file with your credentials:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

Run the database setup script:
```bash
npm run setup-db
```

### 3. Telegram Bot Setup
1. Create a new bot on Telegram via @BotFather
2. Get your bot token
3. Add the token to your `.env` file

### 4. Start the Server
```bash
npm run dev
```

The website will be available at `http://localhost:3000`

## Admin Access
- Navigate to `/admin` to access the admin dashboard
- Default credentials are in your `.env` file

## PowerBI Integration
Order data is available via the API endpoint:
- `GET /api/analytics/orders` - Returns order data in PowerBI-compatible format

## Project Structure
```
KopiSahaja/
├── public/             # Frontend files
│   ├── index.html      # Main customer page
│   ├── admin.html      # Admin dashboard
│   ├── css/           # Stylesheets
│   └── js/            # Client-side JavaScript
├── scripts/           # Setup scripts
├── server.js          # Main server file
├── bot.js            # Telegram bot
└── README.md         # This file
``` 