const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database file path
const DB_FILE = path.join(__dirname, '..', 'database.json');

// Helper functions to read/write database
const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDB = { users: [], media: [], violations: [], analytics: { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 } };
      fs.writeJsonSync(DB_FILE, initialDB, { spaces: 2 });
      return initialDB;
    }
    const db = fs.readJsonSync(DB_FILE);
    if (!db.users) db.users = [];
    if (!db.media) db.media = [];
    if (!db.violations) db.violations = [];
    if (!db.analytics) db.analytics = { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 };
    return db;
  } catch (error) {
    return { users: [], media: [], violations: [], analytics: { totalUploads: 0, violationsCount: 0, deepfakeCount: 0 } };
  }
};

const writeDB = (data) => {
  fs.writeJsonSync(DB_FILE, data, { spaces: 2 });
};

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  try {
    if (id === 'GP-DEMO-99') {
      return done(null, {
        id: 'GP-DEMO-99',
        username: 'Demo User',
        email: 'demo@guardplay.ai',
        profilePicture: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        firstName: 'Demo',
        lastName: 'User',
        provider: 'demo'
      });
    }
    const db = readDB();
    const user = db.users.find(u => u.id === id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  proxy: true // Trust proxies if any
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth profile received:', profile.id, profile.displayName);

    const db = fs.readJsonSync(DB_FILE);
    if (!db.users) db.users = [];
    
    // Check if user already exists by Google ID
    let existingUser = db.users.find(u => u.googleId === profile.id);
    
    if (existingUser) {
      console.log('✅ Existing Google user found:', existingUser.username);
      return done(null, existingUser);
    }
    
    // Check if user exists with same email (for linking accounts)
    const email = profile.emails?.[0]?.value || '';
    if (email) {
      existingUser = db.users.find(u => u.email === email);
      
      if (existingUser) {
        console.log('🔗 Linking Google account to existing email:', email);
        existingUser.googleId = profile.id;
        existingUser.provider = 'google';
        fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
        return done(null, existingUser);
      }
    }
    
    // Create new user
    console.log('👤 Creating new user for:', profile.displayName);
    const newUser = {
      id: uuidv4(),
      googleId: profile.id,
      username: profile.displayName || `user_${profile.id}`,
      email: email,
      profilePicture: profile.photos?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      provider: 'google',
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
    
    console.log('✅ New Google user created successfully');
    return done(null, newUser);
    
  } catch (error) {
    console.error('❌ Google OAuth Strategy Error:', error);
    return done(error, null);
  }
}
));

module.exports = passport;
