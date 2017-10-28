var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Request = require('../models/request')

module.exports = function(passport) {

  // Retrieve registration page
  router.get('/signup', function(req, res) {
    res.render('register', {message: req.flash('signupMessage')});
  });

  router.post('/signup', passport.authenticate('local-register', {
      successRedirect : '/signup-password', // redirect to the create password page
      failureRedirect : '/signup', // redirect back to the signup page if there is an error
      failureFlash : true // allow flash messages
    })
  );


  // Retrieve create password page
  router.get('/signup-password', function(req, res) {
    res.render('create-password', {user: req.user, firstName: req.user.firstName, message: req.flash('signupMessage')});
  });

  router.post('/signup-password', passport.authenticate('local-signup', {
      successRedirect : '/home',
      failureRedirect : '/signup-password',
      failureFlash : true // allow flash messages
    })
  );

  // Retrieve login page
  router.get('/login', function(req, res) {
    if(req.user) {
      res.redirect('home');
    }
    else {
      res.render('index', {message: req.flash('loginMessage')});
    }
  });

  // Processs the login form
  router.post('/login', passport.authenticate('local-login', {
    successRedirect : '/home', // redirect to the main page
    failureRedirect : '/login' // redirect back to the login page if there is an error
  }));

  // Logout
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  // Retrieve settings page
  router.get('/settings', function(req, res) {
    res.render('settings', {email: req.user.email, message: req.flash('settingsMessage')})
  });

  // Process settings page
  router.post('/settings', passport.authenticate('local-settings', {
    successRedirect : '/login', // redirect to the login page
    failureRedirect : '/settings', // redirect back to the login page if there is an error
    failureFlash : true // allow flash messages
  }));

  return router;
};
