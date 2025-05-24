# KopiSahaja Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- Telegram account (for bot features)

## Step 1: Environment Setup

1. Create a `.env` file by copying the example:
```bash
copy .env.example .env
```

2. Edit `.env` and update the following:
   - `DB_PASSWORD`: Your MySQL root password
   - `SESSION_SECRET`: A random string (e.g., generate at https://randomkeygen.com/)
   - `JWT_SECRET`: Another random string
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token (see Step 4)
   - `ADMIN_PASSWORD`: Choose a secure admin password

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Database Setup

1. Make sure MySQL is running
2. Run the database setup script:
```bash
npm run setup-db
```

This will:
- Create the database
- Create all necessary tables
- Insert sample coffee drinks

## Step 4: Telegram Bot Setup (Optional)

1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "KopiSahaja Orders")
4. Choose a username (must end with 'bot', e.g., "KopiSahajaBot")
5. Copy the token provided by BotFather
6. Paste the token in your `.env` file

## Step 5: Start the Application

```bash
npm run dev
```

The application will be available at:
- Customer Website: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin

## Default Admin Credentials
- Username: `admin`
- Password: (whatever you set in `.env`)

## Mobile Access

To access the admin dashboard on your phone:
1. Find your computer's IP address:
   - Windows: Run `ipconfig` in command prompt
   - Look for IPv4 Address (e.g., 192.168.1.100)
2. On your phone, navigate to: `http://[YOUR-IP]:3000/admin`
3. Make sure your phone is on the same WiFi network

## PowerBI Integration

To connect PowerBI to your order data:

1. In PowerBI Desktop, click "Get Data" → "Web"
2. Enter URL: `http://localhost:3000/api/analytics/orders`
3. In Advanced settings, add header:
   - Name: `Authorization`
   - Value: `Bearer [YOUR-ADMIN-TOKEN]`
4. Click OK to import data

To get your admin token:
1. Login to admin dashboard
2. Open browser developer tools (F12)
3. Go to Application/Storage → Local Storage
4. Copy the `adminToken` value

## Troubleshooting

### Database Connection Error
- Check if MySQL is running
- Verify your MySQL password in `.env`
- Ensure the database user has proper permissions

### Telegram Bot Not Responding
- Verify the bot token is correct
- Check if the bot is not already running elsewhere
- Try restarting the application

### Cannot Access from Phone
- Ensure both devices are on the same network
- Check Windows Firewall settings
- Try using your computer's local IP instead of localhost

## Production Deployment

For production deployment, consider:
1. Using environment variables instead of `.env` file
2. Setting up HTTPS with SSL certificates
3. Using a process manager like PM2
4. Setting up a reverse proxy with Nginx
5. Using a managed database service 