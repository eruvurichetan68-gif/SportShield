const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs-extra');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://sport-shield.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'guardplay-session-secret',
  resave: false,
  saveUninitialized: false,
  name: 'guardplay.session',
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes Integration
app.use('/auth', authRoutes);

// Serve static files from root (frontend)
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

// Simple JSON storage
const DB_FILE = path.join(__dirname, 'database.json');

const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], media: [], violations: [], analytics: { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 } };
    }
    const data = fs.readJsonSync(DB_FILE);
    if (!data.violations) data.violations = [];
    if (!data.analytics) data.analytics = { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 };
    if (!data.media) data.media = [];
    return data;
  } catch (error) {
    return { users: [], media: [], violations: [], analytics: { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 } };
  }
};

const writeDB = (data) => {
  fs.writeJsonSync(DB_FILE, data, { spaces: 2 });
};

// Log DB Connection
console.log("DB Connected");

// Authentication Middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'guardplay-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Utility function to calculate SHA-256 hash
const calculateHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Watermarking with Sharp
const addWatermark = async (inputPath, userEmail) => {
  const ext = path.extname(inputPath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return inputPath;

  const outputPath = inputPath.replace(/(\.[\w\d]+)$/, '-protected$1');
  const watermarkText = `GuardPlay | ${userEmail}`;
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    const svgImage = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: rgba(255, 255, 255, 0.5); font-size: ${Math.floor(width/15)}px; font-weight: bold; font-family: sans-serif; }
        </style>
        <text x="50%" y="90%" text-anchor="middle" class="title">${watermarkText}</text>
      </svg>
    `;

    await image
      .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
      .toFile(outputPath);
    
    return outputPath;
  } catch (err) {
    console.error('Watermarking failed:', err);
    return inputPath;
  }
};

// --- API ROUTES ---

// 1. Upload Route
app.post('/api/upload', ensureAuthenticated, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const hash = calculateHash(req.file.path);
    const db = readDB();
    
    // Check duplicate
    const existingFile = db.media.find(m => m.hash === hash);
    if (existingFile) {
      fs.unlinkSync(req.file.path);
      return res.status(200).json({ success: true, hash, status: "Protected", message: "Asset already registered" });
    }

    const userEmail = req.user.email;
    const ownerId = req.user.id;
    
    // Watermarking
    const processedPath = await addWatermark(req.file.path, userEmail);
    if (processedPath !== req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    const fileName = path.basename(processedPath);

    const asset = {
      id: uuidv4(),
      filename: fileName,
      originalName: req.file.originalname,
      hash: hash,
      ownerId: ownerId,
      ownerEmail: userEmail,
      uploadTime: new Date().toISOString(),
      status: "Protected",
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    db.media.push(asset);
    db.analytics.totalUploads = (db.analytics.totalUploads || 0) + 1;
    writeDB(db);

    res.json({
      success: true,
      hash,
      status: "Protected"
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Alias for requirement
app.post('/upload', ensureAuthenticated, (req, res) => res.redirect(307, '/api/upload'));

// 2. Gallery Route
app.get('/api/gallery', ensureAuthenticated, (req, res) => {
  try {
    const db = readDB();
    res.json({ success: true, data: db.media });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Requirement: GET /gallery
app.get('/gallery', ensureAuthenticated, (req, res) => {
  try {
    const db = readDB();
    const assets = db.media.map(m => ({
      filename: m.filename,
      hash: m.hash,
      owner: m.ownerEmail,
      status: m.status
    }));
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// 3. Violation Detection (Verify)
app.post('/api/verify', ensureAuthenticated, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const uploadedHash = calculateHash(req.file.path);
    const db = readDB();
    
    const original = db.media.find(m => m.hash === uploadedHash);
    
    fs.unlinkSync(req.file.path);

    if (original) {
      return res.json({
        success: true,
        match: true,
        violation: {
          filename: original.originalName,
          confidence: 100
        },
        authenticityScore: 100,
        isDeepfake: false
      });
    }

    // Mismatch/Deepfake simulation
    const isDeepfake = Math.random() > 0.8;
    return res.json({
      success: true,
      match: false,
      isDeepfake: isDeepfake,
      authenticityScore: isDeepfake ? 12 : 88
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});

// Alias for requirement
app.post('/verify', ensureAuthenticated, (req, res) => res.redirect(307, '/api/verify'));

// 4. Violation Dashboard
app.get('/api/violations', ensureAuthenticated, (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.violations });
});

// 5. Automated Takedown
app.post('/api/takedown/:id', ensureAuthenticated, (req, res) => {
  const db = readDB();
  const violation = db.violations.find(v => v.id === req.params.id);
  if (violation) {
    violation.status = "Takedown Sent";
    writeDB(db);
    res.json({ success: true, message: "DMCA Notice Sent" });
  } else {
    res.status(404).json({ success: false, message: "Violation not found" });
  }
});

// 6. Analytics
app.get('/api/analytics', ensureAuthenticated, (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.analytics });
});

// 7. Simulated Violation Generator
app.post('/api/simulate-violation', ensureAuthenticated, (req, res) => {
  const db = readDB();
  if (!db.media || db.media.length === 0) return res.status(400).json({ message: "No assets to violate" });
  
  const randomAsset = db.media[Math.floor(Math.random() * db.media.length)];
  const isDeepfake = Math.random() > 0.7;
  
  const violation = {
    id: uuidv4(),
    assetId: randomAsset.id,
    filename: randomAsset.originalName,
    platform: ["Twitter", "YouTube", "TikTok", "Facebook"][Math.floor(Math.random() * 4)],
    confidence: (Math.random() * 9 + 90).toFixed(2),
    deepfake: isDeepfake,
    timestamp: new Date().toISOString(),
    status: "Detected"
  };
  
  db.violations.push(violation);
  db.analytics.violationsCount = (db.analytics.violationsCount || 0) + 1;
  if (isDeepfake) db.analytics.deepfakeCount = (db.analytics.deepfakeCount || 0) + 1;
  writeDB(db);
  
  res.json({ success: true, violation });
});

// Helper for static files
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/uploads')) return next();
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 GuardPlay AI DRM server running on port ${PORT}`);
});
