// Middleware to protect routes - ensures user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // For API routes, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }
  
  // For web routes, redirect to login page
  res.redirect('/?login_required=true');
};

// Middleware to check if user is NOT authenticated (for login pages)
const ensureNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  
  // If already authenticated, redirect to dashboard
  res.redirect('/dashboard.html');
};

// Middleware for API routes that returns JSON instead of redirect
const ensureAuthenticatedAPI = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please login to access this API endpoint'
  });
};

module.exports = {
  ensureAuthenticated,
  ensureNotAuthenticated,
  ensureAuthenticatedAPI
};
