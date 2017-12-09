var passport = require('passport');
var LocalStrategy   = require('passport-local').Strategy;
var User = require('../models/user');
var Group = require('../models/group');
//Passport session setup ============================================================================================================================================================

//Serialization
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

//Deserialization
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Sign Up =================================================================================================================================================================
passport.use('local-register', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'adminID',
  passReqToCallback : true
},
function(req, username, password, done) {
  process.nextTick(function() {
    User.findOne({ 'username' : username}, function(err, user) {
      if (err)
        return done(err);
      if (user) {
        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
      } else if(req.body.adminID != 100) {
        return done(null, false, req.flash('signupMessage', 'You must enter a valid Administrator ID.'));
      } else if(!username.includes("@haverford.edu")) {
        return done(null, false, req.flash('signupMessage', 'Your username must be a valid Haverford email address.'));
      } else {
        var newUser = new User({
          username : username,
          firstName : req.body.firstName,
          lastName : req.body.lastName
        })
        console.log(newUser);
        return done(null, newUser);
        /*var newUser = new User()
          newUser.username = username,
          newUser.password = "temp",
          newUser.firstName = "temp",
     	    newUser.lastName = "temp"
          newUser.save(function(err) {
          	if (err)
              throw err;
            return done(null, newUser);
        });*/
      }
    });
  });
}));
//Create-Password ===================================================================================================================================================================
passport.use('local-signup', new LocalStrategy({
    usernameField : 'confirmPassword',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
	function(req, username, password, done) {
    // Asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {
      // Find a user whose email is the same as the forms email and check to see if the user trying to login has made an account
        if (req.body.password !== req.body.confirmPassword) {
      	  return done(null, false, req.flash('signupMessage', 'Passwords do not match.'));
        } else {
          //If there is no user with the credential, create the user and set the credential
          /*User.findById(req.user._id, function (err, user) {
            if (err)
              return done(err);
            user.password = user.hashPassword(password);
            user.save(function (err, updatedUser) {
              if (err)
                return done(err);
              return done(null, updatedUser);
            });
          });*/
          var newUser = new User()
            newUser.username = req.body.username,
            newUser.password = newUser.hashPassword(req.body.password),
            newUser.firstName = req.body.firstName,
            newUser.lastName = req.body.lastName,
            newUser.admin = true,
            newUser.classYear = "",
            newUser.major= "",
            newUser.blocked = false
            newUser.save(function(err) {
              if (err)
                throw err;
              return done(null, newUser);
          });
        }
      });
}));

//Login =============================================================================================================================================================================
passport.use('local-login', new LocalStrategy({
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
	function(req, username, password, done) {
    // Asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {
      // Find a user whose email is the same as the forms email and check to see if the user trying to sign up already exists
      User.findOne({ 'username' :  username }, function(err, user) {
        // If there are any errors, return the error
        if (err)
          return done(err);
        if (!user) {
          return done(null, false, req.flash('loginMessage', 'There is no user with that email.'));
        } else if (!user.validatePassword(password)) {
          return done(null, false, req.flash('loginMessage', 'Password is incorrect.'));
        } else {
          //Found the user and logs the user in
          return done(null, user);
        }
      });
    });
}));

//Settings =========================================================================================================================================================================
passport.use('local-settings', new LocalStrategy({
    usernameField : 'newPassword',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },
  function(req, username, password, done) {
    // Asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {
      // Find a user whose email is the same as the forms email and check to see if the user trying to sign up already exists
      if (!req.user.validatePassword(password)) {
        console.log("wrong current password");
        return done(null, false, req.flash('settingsMessage', 'Current password is incorrect.'));
      } else if (req.body.newPassword !== req.body.confirmPassword) {
        console.log("passwords dont match");
        return done(null, false, req.flash('settingsMessage', 'Passwords do not match.'));
      } else {
        console.log("success");
        //Find the user and update the password
        User.findById(req.user._id, function (err, user) {
          if (err)
            return done(err);
          user.password = user.hashPassword(req.body.newPassword);
          user.save(function (err, updatedUser) {
            if (err)
              return done(err);
            return done(null, updatedUser);
          });
        });
      }
    });
}));

//Export passport ===================================================================================================================================================================
module.exports = passport;
