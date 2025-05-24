# Create .env file with environment variables

$envContent = @"
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=kopisahaja

# Server Configuration
PORT=3000
SESSION_SECRET=your_session_secret_here_change_this_$(Get-Random)

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_change_this_$(Get-Random)

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
"@

# Create .env file
$envContent | Out-File -FilePath ".env" -Encoding utf8

# Also create .env.example
$envContent | Out-File -FilePath ".env.example" -Encoding utf8

Write-Host "Created .env and .env.example files successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Please update the following in your .env file:" -ForegroundColor Yellow
Write-Host "1. DB_PASSWORD - Your MySQL root password" -ForegroundColor Yellow
Write-Host "2. TELEGRAM_BOT_TOKEN - Your Telegram bot token (optional)" -ForegroundColor Yellow
Write-Host "3. ADMIN_PASSWORD - Choose a secure admin password" -ForegroundColor Yellow 