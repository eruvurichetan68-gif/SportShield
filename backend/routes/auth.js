const express = require('express');
const passport = require('../config/passport');
const router = express.Router();

// Google OAuth login route
router.get('/google', (req, res, next) => {
  console.log('🚀 Initiating Google OAuth login...');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Force account selection
  })(req, res, next);
});

// Google OAuth callback route
router.get('/google/callback', (req, res, next) => {
  console.log('🔄 Google OAuth callback received...');
  passport.authenticate('google', { 
    failureRedirect: '/?error=auth_failed',
    failureMessage: true 
  })(req, res, (err) => {
    if (err) {
      console.error('❌ Google OAuth callback error:', err);
      return res.redirect('/?error=auth_failed');
    }
    
    if (!req.user) {
      console.error('❌ No user in OAuth callback');
      return res.redirect('/?error=no_user');
    }
    
    console.log('✅ Google OAuth successful for user:', req.user.username);
    // Successful authentication, redirect to dashboard
    res.redirect('/dashboard.html');
  });
});

// Logout route
router.get('/logout', (req, res) => {
  console.log('🚪 Logging out user:', req.user?.username);
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.redirect('/?error=logout_failed');
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.redirect('/?error=logout_failed');
      }
      
      res.clearCookie('connect.sid');
      console.log('✅ User logged out successfully');
      res.redirect('/?logout=success');
    });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get current user info
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      provider: req.user.provider,
      createdAt: req.user.createdAt
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;
