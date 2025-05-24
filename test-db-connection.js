require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing MySQL connection...\n');
    
    // Read password from .env
    const password = process.env.DB_PASSWORD;
    
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Password: ${password ? '[Hidden]' : '[Empty]'}`);
    console.log(`Database: ${process.env.DB_NAME}\n`);
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        
        console.log('✅ Successfully connected to MySQL!');
        
        // Try to create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`✅ Database '${process.env.DB_NAME}' is ready!`);
        
        await connection.end();
        
        console.log('\n🎉 Your MySQL configuration is correct!');
        console.log('You can now run: npm run setup-db');
        
    } catch (error) {
        console.error('❌ Connection failed!');
        console.error(`Error: ${error.message}\n`);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('📝 Possible solutions:');
            console.log('1. Make sure your MySQL root password is correct in the .env file');
            console.log('2. If you forgot your password, you may need to reset it');
            console.log('3. Common default passwords to try: root, password, admin, or leave it empty');
            console.log('\nTo reset MySQL password, see:');
            console.log('https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html');
        }
    }
}

testConnection(); 