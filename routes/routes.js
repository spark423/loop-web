var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Request = require('../models/request')

module.exports = function(passport) {

  // Retrieve registration page
  router.get('/signup', function(req, res) {
    res.render('register', {message: req.query.message});
  });

  router.post('/signup', function(req, res) {
    User.findOne({'username': req.body.username}, function(err, user) {
      if (err)
        return done(err);
      if (user) {
        var message = encodeURIComponent('That email is already taken');
        res.redirect('/signup/?message=' + message)
      } else if(req.body.adminID != 100) {
        var message = encodeURIComponent('You must enter a valid Administrator ID.');
        res.redirect('/signup/?message=' + message)
      } else if(!req.body.username.includes("@haverford.edu")) {
        var message = encodeURIComponent('Your username must be a valid Haverford email address.');
        res.redirect('/signup/?message=' + message)
      } else {
        res.redirect('/signup-password/?username=' + req.body.username + '&firstName=' + req.body.firstName + '&lastName=' + req.body.lastName);
      }
    })
  });


  // Retrieve create password page
  router.get('/signup-password', function(req, res) {
    res.render('create-password', {username: req.query.username, firstName: req.query.firstName, lastName: req.query.lastName, message: req.flash('signupMessage')});
  });

  router.post('/signup-password', passport.authenticate('local-signup', {
      successRedirect : '/',
      failureRedirect : '/signup-password',
      failureFlash : true // allow flash messages
    })
  );

  // Retrieve login page
  router.get('/', function(req, res) {
    if(req.user) {
      res.render('home');
    }
    else {
      res.render('index', {message: req.flash('loginMessage')});
    }
  });

  // Processs the login form
  router.post('/login', passport.authenticate('local-login', {
    successRedirect : '/home', // redirect to the main page
    failureRedirect : '/' // redirect back to the login page if there is an error
  }));

  // Logout
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  // Retrieve settings page
  router.get('/settings', function(req, res) {
    res.render('settings', {email: req.user.email, message: req.flash('settingsMessage')})
  });

  // Process settings page
  router.post('/settings', passport.authenticate('local-settings', {
    successRedirect : '/', // redirect to the login page
    failureRedirect : '/settings', // redirect back to the login page if there is an error
    failureFlash : true // allow flash messages
  }));

  return router;
};
