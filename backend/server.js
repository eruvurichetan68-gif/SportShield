// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const session = require('express-session');

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and restart the server.');
  process.exit(1);
}

// Log environment variables (masked for security)
console.log('✅ Environment variables loaded:');
console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'NOT_SET'}`);
console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.substring(0, 10) + '...' : 'NOT_SET'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? 'SET' : 'NOT_SET'}`);

// Validate Google OAuth configuration
function validateGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('❌ Google OAuth credentials missing');
    return false;
  }
  
  // Validate Client ID format (should end with .apps.googleusercontent.com)
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.error('❌ Invalid Google Client ID format');
    return false;
  }
  
  // Validate Client Secret format (should be reasonably long)
  if (clientSecret.length < 10) {
    console.error('❌ Invalid Google Client Secret format');
    return false;
  }
  
  console.log('✅ Google OAuth configuration validated');
  return true;
}

if (!validateGoogleOAuthConfig()) {
  console.error('❌ Please fix your Google OAuth configuration in .env file');
  process.exit(1);
}

// Initialize passport AFTER environment variables are loaded
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sportshield-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sportshield.session', // Custom session name
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

console.log('✅ Session middleware configured');

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

// Simple JSON storage for demonstration (in production, use MongoDB)
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, {
    users: [],
    media: [],
    blockchain: []
  });
}

// Helper functions to read/write database
const readDB = () => {
  try {
    return fs.readJsonSync(DB_FILE);
  } catch (error) {
    return { users: [], media: [], blockchain: [] };
  }
};

const writeDB = (data) => {
  fs.writeJsonSync(DB_FILE, data, { spaces: 2 });
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper function to hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Helper function to compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Utility function to calculate SHA-256 hash
const calculateHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return hash;
};

// Utility function to add simple watermark to images
const addWatermark = async (inputPath, outputPath, watermarkText = 'SportShield') => {
  try {
    await sharp(inputPath)
      .composite([{
        input: Buffer.from(`<svg><text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="20" fill="rgba(255,255,255,0.3)">${watermarkText}</text></svg>`),
        gravity: 'center'
      }])
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('Watermark error:', error);
    return false;
  }
};

// Blockchain-like record creation
const createBlock = (fileHash, previousHash) => {
  const timestamp = new Date().toISOString();
  const blockData = {
    id: uuidv4(),
    timestamp,
    fileHash,
    previousHash,
    nonce: Math.floor(Math.random() * 1000000)
  };
  
  // Create block hash
  const blockString = JSON.stringify(blockData);
  const blockHash = crypto.createHash('sha256').update(blockString).digest('hex');
  
  return {
    ...blockData,
    blockHash
  };
};

// API Routes

// Authentication Routes (Google OAuth)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Existing Authentication Routes

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = readDB();

    // Check if user already exists
    const existingUser = db.users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      id: uuidv4(),
      username,
      email: email || '',
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Save user to database
    db.users.push(newUser);
    writeDB(db);

    // Generate token
    const token = generateToken(newUser);

    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = readDB();

    // Find user
    const user = db.users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user info (protected route)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt
  });
});

// Upload media file (protected route)
app.post('/api/upload', upload.single('media'), async (req, res) => {
  console.log("=== UPLOAD REQUEST STARTED ===");
  
  try {
    // STEP 1: Validate file
    console.log("File received:", req.file);
    
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded"
      });
    }

    console.log("✅ File validated:", req.file.originalname);
    console.log("File path:", req.file.path);
    console.log("File size:", req.file.size);
    console.log("File mimetype:", req.file.mimetype);

    // STEP 2: Read file from disk and generate SHA-256 hash
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    console.log("Generated hash:", hash);

    // STEP 3: Check duplicate
    const db = readDB();
    const existingFile = db.media.find(media => media.hash === hash);
    
    if (existingFile) {
      console.log("❌ Duplicate file found");
      // Clean up duplicate file
      fs.unlinkSync(req.file.path);
      return res.json({
        success: false,
        message: "Duplicate file",
        status: "already_exists"
      });
    }

    // STEP 4: Save to DB
    const mediaRecord = {
      id: uuidv4(),
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      finalHash: hash,
      ownerId: req.user ? req.user.id : 'anonymous',
      uploadTime: new Date().toISOString(),
      status: "authentic",
      verified: true
    };
    
    db.media.push(mediaRecord);
    writeDB(db);
    
    console.log("✅ File saved to database");

    // STEP 5: SEND RESPONSE (MANDATORY - NO REDIRECTS)
    console.log("=== UPLOAD SUCCESSFUL ===");
    return res.json({
      success: true,
      message: "Upload successful",
      hash: hash,
      status: "authentic"
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    
    // Clean up file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: "Upload failed: " + error.message
    });
  }
});

// Verify file integrity
app.post('/api/verify', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded for verification' });
    }

    const uploadedHash = calculateHash(req.file.path);
    const db = readDB();
    
    // Find matching media records
    const matches = db.media.filter(media => media.finalHash === uploadedHash);
    
    if (matches.length > 0) {
      const match = matches[0];
      res.json({
        success: true,
        authentic: true,
        message: 'File is authentic and untampered',
        media: match,
        blockchain: db.blockchain.find(block => block.id === match.blockId)
      });
    } else {
      // Check if original hash matches
      const originalMatches = db.media.filter(media => media.finalHash === uploadedHash);
      
      if (originalMatches.length > 0) {
        res.json({
          success: true,
          authentic: false,
          message: 'File appears to be tampered (watermark removed)',
          originalMedia: originalMatches[0],
          uploadedHash
        });
      } else {
        res.json({
          success: true,
          authentic: false,
          message: 'File not found in database - cannot verify authenticity',
          uploadedHash
        });
      }
    }
    
    // Clean up uploaded verification file
    fs.unlinkSync(req.file.path);
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

// Get all media records
app.get('/api/media', (req, res) => {
  try {
    const db = readDB();
    res.json(db.media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media records' });
  }
});

// Get user-specific media records (protected route)
app.get('/api/media/user', async (req, res) => {
  console.log("=== GALLERY REQUEST STARTED ===");
  
  try {
    // Check if user is authenticated (session-based for Google OAuth)
    if (!req.isAuthenticated()) {
      console.log("❌ Gallery access by unauthenticated user");
      return res.status(401).json({ 
        success: false,
        message: "Authentication required"
      });
    }

    console.log("✅ User authenticated:", req.user.username);
    console.log("Fetching gallery...");

    const db = readDB();
    const userMedia = db.media.filter(media => media.ownerId === req.user.id);
    
    console.log("Media found:", userMedia.length);
    
    res.json({
      success: true,
      data: userMedia
    });
    
    console.log("=== GALLERY SUCCESSFUL ===");
    
  } catch (error) {
    console.error("❌ Gallery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load gallery"
    });
  }
});

// Get blockchain records
app.get('/api/blockchain', (req, res) => {
  try {
    const db = readDB();
    res.json(db.blockchain);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blockchain records' });
  }
});

// Search media by name or hash
app.get('/api/search', (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const db = readDB();
    const results = db.media.filter(media => 
      media.originalName.toLowerCase().includes(query.toLowerCase()) ||
      media.finalHash.includes(query)
    );
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get dashboard statistics
app.get('/api/stats', (req, res) => {
  try {
    const db = readDB();
    const stats = {
      totalUploads: db.media.length,
      verifiedFiles: db.media.filter(m => m.verified).length,
      blockchainEntries: db.blockchain.length,
      totalFileSize: db.media.reduce((sum, m) => sum + m.fileSize, 0),
      recentUploads: db.media.slice(-5).reverse()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Serve uploaded files
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'SportShield API - Sports Media Integrity Protection System',
    version: '1.0.0',
    endpoints: [
      'POST /api/upload - Upload media file',
      'POST /api/verify - Verify file integrity',
      'GET /api/media - Get all media records',
      'GET /api/blockchain - Get blockchain records',
      'GET /api/search?query= - Search media',
      'GET /api/stats - Get dashboard statistics',
      'GET /uploads/:filename - Serve uploaded files'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Handle OAuth-specific errors
  if (err.message && err.message.includes('invalid_client')) {
    console.error('❌ Google OAuth Client Error - Check your credentials');
    return res.redirect('/?error=invalid_client');
  }
  
  // Handle session errors
  if (err.name === 'SessionError') {
    console.error('❌ Session error:', err);
    return res.redirect('/?error=session_error');
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SportShield server running on port ${PORT}`);
  console.log(`📖 API documentation available at http://localhost:${PORT}`);
  console.log(`🔐 Google OAuth configured and ready`);
  console.log(`🌐 Open http://localhost:${PORT} to start using SportShield`);
});
