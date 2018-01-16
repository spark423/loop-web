var express = require('express');
var router = express.Router();
var User = require('../models/user');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var async = require('async');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var secret = process.env.secret;
var username = process.env.api_user;
var password = process.env.api_key;
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');

module.exports = function(passport) {

  router.get('/register', function(req, res) {
    res.render('preregister');
  });

  // Retrieve registration page
  router.get('/signup', function(req, res) {
    res.render('register', {message: req.query.message});
  });

  router.get('/student-signup', function(req, res) {
    res.render('student-register');
  });

  router.post('/student-signup', function(req, res) {
    User.findOne({'username': req.body.username}, function(err, user) {
      if (err)
        return done(err);
      if (user) {
        var message = encodeURIComponent('That email is already taken');
        res.redirect('/student-signup/?message=' + message)
      } else {
        res.redirect('/student-signup-password/?username=' + req.body.username + '&firstName=' + req.body.firstName + '&lastName=' + req.body.lastName + '&major=' + req.body.major + '&class=' + req.body.class);
      }
    })
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
      /*} else if(!req.body.username.includes("@haverford.edu")) {
        var message = encodeURIComponent('Your username must be a valid Haverford email address.');
        res.redirect('/signup/?message=' + message)*/
      } else {
        res.redirect('/signup-password/?username=' + req.body.username + '&firstName=' + req.body.firstName + '&lastName=' + req.body.lastName);
      }
    })
  });

  router.get('/student-signup-password', function(req, res) {
    if(Object.keys(req.query).length==5) {
      res.render('create-password', {student: true, username: req.query.username, firstName: req.query.firstName, lastName: req.query.lastName, major: req.query.major, class: req.query.class, message: req.flash('signupMessage')});
    } else {
      console.log(req.query);
      res.redirect('/');
    }
  });

  router.post('/student-signup-password', passport.authenticate('local-student-signup', {
      successRedirect : '/',
      failureRedirect : '/student-signup-password',
      failureFlash : true // allow flash messages
    })
  );

  // Retrieve create password page
  router.get('/signup-password', function(req, res) {
    if(req.query.length==3) {
      res.render('create-password', {username: req.query.username, firstName: req.query.firstName, lastName: req.query.lastName, message: req.flash('signupMessage')});
    } else {
      res.redirect('/');
    }
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
      res.redirect('/home');
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
    if(req.user) {
      Board.find({}, function(err, boards){
        if(err) throw err;
        Group.find({}, function(err, groups) {
          if(err) throw err;
          res.render('settings', {message: req.flash('settingsMessage'), boards: boards, groups: groups})
        })
      })
    }
    else {
      res.redirect('/');
    }
  });

  // Process settings page
  router.post('/settings', passport.authenticate('local-settings', {
    successRedirect : '/', // redirect to the login page
    failureRedirect : '/settings', // redirect back to the login page if there is an error
  }));

  router.get('/reset', function(req, res) {
    res.render('reset');
  })

  router.get('/forgot-password', function(req, res) {
    res.render('forgot-password');
  })

  router.post('/forgot', function(req, res) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        console.log(req.body);
        console.log(req.body.username);
        User.findOne({ username: req.body.username }, function(err, user) {
          if (!user) {
            console.log("no account");
            //res.send(401, {success: false, message: 'No account with that email address exists.'});
           return;
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        let options = {
    	    auth: {
    		    api_user: username,
            api_key: password
          }
        }

        let client = nodemailer.createTransport(sgTransport(options));

        let email = {
          from: 'support@theuniversityloop.com',
          to: user.username,
          subject: ' Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Paste the following token ' + token + ' into the token field to set a new password.\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
         };
        client.sendMail(email, function(err){
      	  done(err)
        });
      }
    ], function(err) {
      if (err) throw err;
      console.log("success");
      res.send({success: true})
    });
  })

  router.post('/reset', function(req, res) {
    async.waterfall([
      function(done) {
        console.log(req.body);
        User.findOne({ resetPasswordToken: req.body.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            res.json(401, {success: false, message: 'Password reset token is invalid or has expired.'});
          } else if (req.body.newPassword !== req.body.confirmNewPassword) {
          	res.json(401, {success: false, message: "Passwords don't match."})
          } else {
            user.password = user.hashPassword(req.body.newPassword);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(function(err) {
              done(err, user);
            });
          }
        });
      },
      function(user, done) {
        let options = {
          auth: {
    		    api_user: username,
            api_key: password
          }
        }

        let client = nodemailer.createTransport(sgTransport(options));

        let email = {
          from: 'support@theuniversityloop.com',
          to: user.username,
          subject: 'Successful Password Reset',
          text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.username + ' has just been changed. Login with your new password\n'
        };
        client.sendMail(email, function(err){
      	  done(err)
        });
      }
    ], function(err) {
      if (err) throw err;
      console.log("success");
      res.send({success: true});
    });
  });

  return router;
};
