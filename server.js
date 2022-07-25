const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const passport = require('passport');
const { Strategy } = require('passport-google-oauth20');
const cookieSession = require('cookie-session');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const AUTH_OPTIONS = {
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
};

const config = {
  cookie_key_1: process.env.COOKIE_KEY_1,
  cookie_key_2: process.env.COOKIE_KEY_2,
}

function verifyCallback(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  cb(null, profile);
}

passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

// save the session in a cookie
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

// read the session from the cookie
passport.deserializeUser((id, cb) => {
  // User.findById(user).then((user) => {
  //   cb(null, user);
  // });
  cb(null, id);
});

const app = express();

app.use(helmet());

app.use(cookieSession({
  name: 'session',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  keys: [ config.cookie_key_1, config.cookie_key_2 ],
}));
app.use(passport.initialize());
app.use(passport.session());

function checkLoggedIn(req, res, next) {
  console.log(`Current user: ${req.user}`);
  const isLoggedIn = false; // TODO: replace with real logic
  if (!isLoggedIn) {
    return res.status(401).json({ error: 'You must log in!' });
  }
  next();
}

app.get('/auth/google', passport.authenticate('google', { scope: ['email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/failure',
  successRedirect: '/',
  session: true,
}),
  (req, res) => {
    console.log('Google auth callback');
  });

app.get('/auth/logout', (req, res) => { });

app.get('/secret', checkLoggedIn, (req, res) => {
  return res.send('Your personal secret value is: 42!');
});

app.get('/failure', (req, res) => {
  return res.send('Authentication failed!');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
}, app).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
})
