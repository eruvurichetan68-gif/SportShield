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
    return fs.readJsonSync(DB_FILE);
  } catch (error) {
    return { users: [], media: [], blockchain: [] };
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
  scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth profile received:', {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value
    });

    const db = readDB();
    
    // Check if user already exists by Google ID
    let existingUser = db.users.find(u => u.googleId === profile.id);
    
    if (existingUser) {
      console.log('✅ Existing Google user found:', existingUser.username);
      return done(null, existingUser);
    }
    
    // Check if user exists with same email (for linking accounts)
    if (profile.emails && profile.emails[0]) {
      existingUser = db.users.find(u => u.email === profile.emails[0].value);
      
      if (existingUser) {
        console.log('🔗 Linking Google account to existing user:', existingUser.username);
        // Link Google account to existing user
        existingUser.googleId = profile.id;
        existingUser.profilePicture = profile.photos?.[0]?.value || existingUser.profilePicture;
        existingUser.provider = 'google';
        writeDB(db);
        return done(null, existingUser);
      }
    }
    
    // Create new user
    console.log('👤 Creating new Google user');
    const newUser = {
      id: uuidv4(),
      googleId: profile.id,
      username: profile.displayName || `user_${profile.id}`,
      email: profile.emails?.[0]?.value || '',
      profilePicture: profile.photos?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      provider: 'google',
      createdAt: new Date().toISOString()
    };
    
    // Save user to database
    db.users.push(newUser);
    writeDB(db);
    
    console.log('✅ New Google user created successfully:', newUser.username);
    return done(null, newUser);
    
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return done(error, null);
  }
}
));

module.exports = passport;
