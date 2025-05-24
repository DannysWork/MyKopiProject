require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add headers for Google OAuth
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Custom routes BEFORE static files to override default serving
// Serve main page with Google Client ID
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Replace the meta tag content with the actual Google Client ID
  indexHtml = indexHtml.replace(
    '<meta name="google-client-id" content="">',
    `<meta name="google-client-id" content="${process.env.GOOGLE_CLIENT_ID || ''}">`
  );
  
  res.send(indexHtml);
});

// Serve auth page with Google Client ID
app.get('/auth.html', (req, res) => {
  const authPath = path.join(__dirname, 'public', 'auth.html');
  let authHtml = fs.readFileSync(authPath, 'utf8');
  
  // Replace the meta tag content with the actual Google Client ID
  authHtml = authHtml.replace(
    '<meta name="google-client-id" content="">',
    `<meta name="google-client-id" content="${process.env.GOOGLE_CLIENT_ID || ''}">`
  );
  
  res.send(authHtml);
});

app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize admin user
async function initializeAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.execute(
      'INSERT IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)',
      [process.env.ADMIN_USERNAME, hashedPassword]
    );
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}

// Middleware to verify user token
function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join-order', (orderId) => {
    socket.join(orderId);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes

// User Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;
  
  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ? OR (username IS NOT NULL AND username = ?)',
      [email, username || '']
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate username if not provided
    const finalUsername = username || email.split('@')[0];
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, phone, auth_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [finalUsername, email, hashedPassword, firstName, lastName, phone, 'email']
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, username: finalUsername, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: result.insertId, 
        username: finalUsername, 
        email, 
        firstName, 
        lastName, 
        phone 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0 || !await bcrypt.compare(password, users[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profilePicture: user.profile_picture
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
  console.log('Google OAuth request received');
  const { credential } = req.body;
  
  if (!credential) {
    console.error('No credential provided in request');
    return res.status(400).json({ error: 'No credential provided' });
  }
  
  console.log('Credential received, length:', credential.length);
  
  try {
    console.log('Starting Google token verification...');
    console.log('Using Client ID:', process.env.GOOGLE_CLIENT_ID);
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    console.log('Google token verified successfully');
    
    const payload = ticket.getPayload();
    console.log('Payload received from Google:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name
    });
    
    const googleId = payload.sub;
    const email = payload.email;
    const firstName = payload.given_name;
    const lastName = payload.family_name;
    const profilePicture = payload.picture;
    const username = payload.email.split('@')[0]; // Generate username from email
    
    console.log('Checking if user exists in database...');
    
    // Check if user exists with this Google ID
    let [users] = await pool.execute(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );
    
    console.log('Database query completed, users found:', users.length);
    
    let user;
    
    if (users.length === 0) {
      console.log('Creating new user...');
      // Create new user
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, google_id, first_name, last_name, profile_picture, auth_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, email, googleId, firstName, lastName, profilePicture, 'google']
      );
      
      console.log('New user created with ID:', result.insertId);
      
      user = {
        id: result.insertId,
        username,
        email,
        google_id: googleId,
        first_name: firstName,
        last_name: lastName,
        profile_picture: profilePicture,
        auth_method: 'google'
      };
    } else {
      console.log('User exists, updating if needed...');
      // Update existing user with Google info if they don't have it
      user = users[0];
      
      if (!user.google_id) {
        console.log('Linking Google account to existing user...');
        // User exists with email but no Google ID - link accounts
        await pool.execute(
          'UPDATE users SET google_id = ?, profile_picture = COALESCE(profile_picture, ?), auth_method = ? WHERE id = ?',
          [googleId, profilePicture, user.auth_method === 'email' ? 'both' : 'google', user.id]
        );
        user.google_id = googleId;
        user.auth_method = user.auth_method === 'email' ? 'both' : 'google';
      }
      
      // Update profile picture if not set
      if (!user.profile_picture && profilePicture) {
        console.log('Updating profile picture...');
        await pool.execute(
          'UPDATE users SET profile_picture = ? WHERE id = ?',
          [profilePicture, user.id]
        );
        user.profile_picture = profilePicture;
      }
    }
    
    console.log('Generating JWT token...');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('JWT token generated successfully');
    
    res.json({ 
      token, 
      user: { 
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profilePicture: user.profile_picture
      } 
    });
    
    console.log('Google OAuth login completed successfully');
  } catch (error) {
    console.error('Google OAuth error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Google authentication failed: ' + error.message });
  }
});

// Get User Profile
app.get('/api/auth/profile', verifyUser, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, phone, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profilePicture: user.profile_picture,
      createdAt: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update User Profile
app.put('/api/auth/profile', verifyUser, async (req, res) => {
  const { firstName, lastName, phone } = req.body;
  
  try {
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
      [firstName, lastName, phone, req.user.userId]
    );
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload Profile Picture
app.post('/api/auth/profile/picture', verifyUser, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const profilePictureUrl = `/uploads/${req.file.filename}`;
    
    // Update user's profile picture in database
    await pool.execute(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePictureUrl, req.user.userId]
    );
    
    res.json({ 
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Request Password Reset
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token
    await pool.execute(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, expiresAt]
    );
    
    // In a real application, you would send an email here
    // For now, we'll just return the token (for demo purposes)
    res.json({ 
      message: 'Password reset token generated',
      resetToken: resetToken // In production, this would be sent via email
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    // Verify reset token
    const [resets] = await pool.execute(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (resets.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const reset = resets[0];
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, reset.email]
    );
    
    // Delete used reset token
    await pool.execute(
      'DELETE FROM password_resets WHERE token = ?',
      [token]
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get all available drinks
app.get('/api/drinks', async (req, res) => {
  try {
    const [drinks] = await pool.execute('SELECT * FROM drinks WHERE available = TRUE');
    res.json(drinks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drinks' });
  }
});

// Create new order (updated to support authenticated users)
app.post('/api/orders', async (req, res) => {
  console.log('Received order request:', req.body);
  
  const { customerName, customerPhone, customerEmail, items, notes } = req.body;
  
  // Validate required fields
  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const orderId = uuidv4();
  
  // Check if user is authenticated
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  let userInfo = { customerName, customerPhone, customerEmail };
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
      
      // Get user info from database
      const [users] = await pool.execute(
        'SELECT first_name, last_name, phone, email FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        const user = users[0];
        userInfo = {
          customerName: `${user.first_name} ${user.last_name}`.trim() || customerName,
          customerPhone: user.phone || customerPhone,
          customerEmail: user.email || customerEmail
        };
      }
    } catch (error) {
      // Token invalid, continue as guest
      console.log('Invalid token, proceeding as guest');
    }
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      // Validate item fields
      if (!item.drinkId || !item.quantity || !item.size || !item.sugarLevel || !item.iceLevel) {
        throw new Error('Invalid item data: Missing required fields');
      }
      
      // Validate size
      if (!['small', 'medium', 'large'].includes(item.size)) {
        throw new Error(`Invalid size value: ${item.size}`);
      }
      
      // Validate sugar level
      if (!['0%', '25%', '50%', '75%', '100%'].includes(item.sugarLevel)) {
        throw new Error(`Invalid sugar level value: ${item.sugarLevel}`);
      }
      
      // Validate ice level
      if (!['no ice', 'less ice', 'normal ice', 'extra ice'].includes(item.iceLevel)) {
        throw new Error(`Invalid ice level value: ${item.iceLevel}`);
      }
      
      const priceMultiplier = item.size === 'small' ? 0.8 : item.size === 'large' ? 1.2 : 1;
      totalAmount += item.price * priceMultiplier * item.quantity;
    }
    
    console.log('Creating order with data:', {
      orderId,
      userId,
      customerName: userInfo.customerName,
      customerPhone: userInfo.customerPhone,
      customerEmail: userInfo.customerEmail,
      totalAmount,
      notes
    });
    
    // Create order
    await connection.execute(
      'INSERT INTO orders (id, user_id, customer_name, customer_phone, customer_email, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderId, userId, userInfo.customerName, userInfo.customerPhone, userInfo.customerEmail, totalAmount, notes]
    );
    
    // Add order items
    for (const item of items) {
      const priceMultiplier = item.size === 'small' ? 0.8 : item.size === 'large' ? 1.2 : 1;
      const itemPrice = item.price * priceMultiplier;
      
      console.log('Adding order item:', {
        orderId,
        drinkId: item.drinkId,
        quantity: item.quantity,
        size: item.size,
        sugarLevel: item.sugarLevel,
        iceLevel: item.iceLevel,
        itemPrice
      });
      
      await connection.execute(
        'INSERT INTO order_items (order_id, drink_id, quantity, size, sugar_level, ice_level, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.drinkId, item.quantity, item.size, item.sugarLevel, item.iceLevel, itemPrice]
      );
    }
    
    await connection.commit();
    
    // Emit order to admin dashboard
    io.emit('new-order', { orderId, customerName: userInfo.customerName, totalAmount });
    
    res.json({ orderId, message: 'Order placed successfully' });
  } catch (error) {
    console.error('Error creating order:', error);
    await connection.rollback();
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    connection.release();
  }
});

// Get order status
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const [items] = await pool.execute(
      `SELECT oi.*, d.name as drink_name 
       FROM order_items oi 
       JOIN drinks d ON oi.drink_id = d.id 
       WHERE oi.order_id = ?`,
      [req.params.orderId]
    );
    
    res.json({ order: orders[0], items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const [users] = await pool.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0 || !await bcrypt.compare(password, users[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: users[0].id, username: users[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all orders (admin) - updated to include user profile pictures
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, u.profile_picture, u.first_name, u.last_name 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin)
app.put('/api/admin/orders/:orderId/status', verifyAdmin, async (req, res) => {
  const { status } = req.body;
  
  try {
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.orderId]
    );
    
    // Get order details for notification
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.orderId]
    );
    
    // Emit status update to customer
    io.to(req.params.orderId).emit('status-update', { status });
    
    // Trigger Telegram notification if chat ID exists
    if (orders[0]?.telegram_chat_id) {
      const { notifyTelegram } = require('./bot');
      notifyTelegram(orders[0].telegram_chat_id, req.params.orderId, status);
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PowerBI analytics endpoint
app.get('/api/analytics/orders', verifyAdmin, async (req, res) => {
  try {
    const [orderData] = await pool.execute(`
      SELECT 
        o.id,
        o.customer_name,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at,
        d.name as drink_name,
        d.category as drink_category,
        oi.quantity,
        oi.size,
        oi.price as item_price,
        u.username,
        u.email
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN drinks d ON oi.drink_id = d.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    res.json(orderData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Initialize server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('GOOGLE_CLIENT_ID loaded:', process.env.GOOGLE_CLIENT_ID ? 'YES' : 'NO');
  console.log('GOOGLE_CLIENT_ID value:', process.env.GOOGLE_CLIENT_ID);
  await initializeAdmin();
  
  // Start Telegram bot
  require('./bot');
});

module.exports = { pool, io }; 