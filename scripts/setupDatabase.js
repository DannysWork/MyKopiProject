require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(100) UNIQUE,
        phone VARCHAR(20),
        profile_picture VARCHAR(255),
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        auth_method ENUM('email', 'google', 'both') DEFAULT 'email',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (google_id),
        INDEX (email)
      )
    `);

    // Create password_resets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (email),
        INDEX (token)
      )
    `);

    // Create drinks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS drinks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50),
        image_url VARCHAR(255),
        available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table (updated to include user_id)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(100),
        telegram_chat_id VARCHAR(50),
        status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create order_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(36),
        drink_id INT,
        quantity INT NOT NULL,
        size ENUM('small', 'medium', 'large') DEFAULT 'medium',
        sugar_level ENUM('0%', '25%', '50%', '75%', '100%') DEFAULT '100%',
        ice_level ENUM('no ice', 'less ice', 'normal ice', 'extra ice') DEFAULT 'normal ice',
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (drink_id) REFERENCES drinks(id)
      )
    `);

    // Create admin_users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample drinks
    const sampleDrinks = [
      ['Artisan Cold Brew', 'Smooth, slow-steeped coffee served over ice', 5.50, 'Coffee', '/images/cold-brew.jpg'],
      ['Matcha Oat Latte', 'Ceremonial grade matcha with creamy oat milk', 6.50, 'Specialty', '/images/matcha-latte.jpg'],
      ['Single Origin Pour Over', 'Hand-crafted coffee from rotating origins', 6.00, 'Coffee', '/images/pour-over.jpg'],
      ['Lavender Honey Latte', 'Espresso with house-made lavender syrup and local honey', 6.50, 'Specialty', '/images/lavender-latte.jpg'],
      ['Nitro Cold Brew', 'Cold brew infused with nitrogen for a creamy texture', 6.00, 'Coffee', '/images/nitro-cold-brew.jpg'],
      ['Turmeric Golden Latte', 'Anti-inflammatory blend with coconut milk', 5.50, 'Wellness', '/images/golden-latte.jpg'],
      ['Classic Cappuccino', 'Double shot with perfectly steamed milk foam', 4.50, 'Coffee', '/images/cappuccino.jpg'],
      ['Iced Chai Latte', 'Spiced chai with your choice of milk', 5.00, 'Tea', '/images/chai-latte.jpg']
    ];

    // Check if drinks already exist
    const [existingDrinks] = await connection.execute('SELECT COUNT(*) as count FROM drinks');
    if (existingDrinks[0].count === 0) {
      for (const drink of sampleDrinks) {
        await connection.execute(
          'INSERT INTO drinks (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)',
          drink
        );
      }
      console.log('Sample drinks inserted successfully');
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 