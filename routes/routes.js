var express = require('express');
var router = express.Router();
var User = require('../models/user');
var jwt = require('jsonwebtoken');
var async = require('async');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var bcrypt = require('bcrypt-nodejs');
var secret = process.env.secret;
var username = process.env.api_user;
var password = process.env.api_key;
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Office = require('../models/office');
var Tag = require('../models/tag');

var crypto = require('crypto'),
    algorithm = 'aes192',
    pass = 'd6F3Efeq';

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,pass)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,pass)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

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
        if(req.body.token) {
          res.redirect('/invited/' + req.body.token + '/?message=' + message)
        } else {
          res.redirect('/signup/?message=' + message)
        }
      } else if(req.body.adminID != 100 && !req.body.token) {
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
      successRedirect : '/add-tags',
      failureRedirect : '/student-signup-password',
      failureFlash : true // allow flash messages
    })
  );

  // Retrieve create password page
  router.get('/signup-password', function(req, res) {
    if(Object.keys(req.query).length==3) {
      res.render('create-password', {username: req.query.username, firstName: req.query.firstName, lastName: req.query.lastName, message: req.flash('signupMessage')});
    } else {
      res.redirect('/');
    }
  });

  router.post('/signup-password', passport.authenticate('local-signup', {
      successRedirect : '/add-office',
      failureRedirect : '/signup-password',
      failureFlash : true // allow flash messages
    })
  );

  router.get('/add-tags', function(req, res) {
    if(req.user) {
      User.findById(req.user._id).populate('tags').exec(function(err, user) {
        Tag.find({}, function(err, tags) {
          console.log(user.tags);
          console.log(user);
          res.render('tags', {tags: tags, userTags: user.tags});
        })
      })
    } else {
      res.redirect('/');
    }
  })

  router.post('/add-tags', function(req, res) {
    var tagsList = req.body.tags.split(',');
    let tags = tagsList.map(async function(tag) {
      if (tag.match(/^[0-9a-fA-F]{24}$/)) {
        let foundTag = await Tag.findById(tag);
        if(foundTag) {
          if(foundTag.followers.indexOf(req.user._id)==-1) {
            foundTag.followers.push(req.user._id);
            return foundTag.save();
          } else {
            return foundTag;
          }
        }
      } else {
          let newTag = new Tag({
            name: tag,
            followers: [req.user._id]
          })
          return newTag.save();
        }
    })
    Promise.all(tags).then(function(tags) {
      User.findOneAndUpdate({_id: req.user._id}, {$set: {'tags': tags}}, function(err, user) {
        if(err) throw err;
        res.redirect('/');
      })
    })
  })

  router.get('/invite-users', function(req, res) {
    if(req.user) {
      if(req.user.admin) {
        let boardsPromise = Board.find({'archive': false, 'active': true}, function(err, boards) {
          if(err) throw err;
        });
        let groupsPromise = Group.find({'archive': false, 'active': true}, function(err, groups) {
          if(err) throw err;
        })
        Promise.all([boardsPromise, groupsPromise]).then(function([boards, groups]) {
          res.render('invite-users', {boards: boards, groups: groups})
        })
      } else {
        res.redirect('/');
      }
    } else {
      res.redirect('/');
    }
  })

  router.get('/invite-more-users', function(req, res) {
    if(req.user) {
      if(req.user.admin) {
        let boardsPromise = Board.find({'archive': false, 'active': true}, function(err, boards) {
          if(err) throw err;
        });
        let groupsPromise = Group.find({'archive': false, 'active': true}, function(err, groups) {
          if(err) throw err;
        })
        Promise.all([boardsPromise, groupsPromise]).then(function([boards, groups]) {
          res.render('invite-more-users', {boards: boards, groups: groups})
        })
      } else {
        res.redirect('/');
      }
    } else {
      res.redirect('/');
    }
  })

  router.post('/invite-users', function(req, res) {
    if(req.user.admin) {
      console.log(req.body);
      if(Array.isArray(req.body.email)) {
        console.log("array")
        console.log(req.body.email);
        console.log(req.body.email[0]);
        for(var i=0; i<req.body.email.length; i++) {
          console.log("entered for loop");
          async.waterfall([
            function(done) {
              var iterator = i;
              return done(null, iterator);
            },
            function(iterator, done) {
              var user_email = req.body.email[iterator];
              User.findOne({username: user_email}, function(err, user) {
                if(user) {
                  return;
                } else {
                  var permission = req.body.permission[iterator];
                  console.log(permission);
                  if(permission=="custom") {
                    var postBlockedBoards = req.body.postBlockedBoards[iterator];
                    var viewBlockedBoards = req.body.viewBlockedBoards[iterator];
                    var postBlockedGroups = req.body.postBlockedGroups[iterator];
                    var viewBlockedGroups = req.body.viewBlockedGroups[iterator];
                    var token = postBlockedBoards.toString() + "?" + viewBlockedBoards.toString() + "?" + postBlockedGroups.toString() + "?" + viewBlockedGroups.toString();
                  } else if(permission=="admin") {
                    var token = encrypt("admin");
                  } else if(permission=="student"){
                    var token = encrypt("student");
                  } else if(permission=="outside"){
                    var token = encrypt("outside");
                  }
                }
                console.log(token);
                done(null, iterator, token);
              })
            },
            function(iterator, token, done) {
              let options = {
                auth: {
                  api_user: username,
                  api_key: password
                }
              }
              console.log("iterator: ", iterator);
              console.log("token: ", token);
              let client = nodemailer.createTransport(sgTransport(options));
              var user = req.body.email[iterator];
              let email = {
                from: 'support@theuniversityloop.com',
                to: user,
                subject: ' Password Reset',
                text: 'Link: http://localhost:3000/invited/' + token
               };
               console.log("email");
               console.log(email);
               client.sendMail(email, function(err){
                 console.log("sent");
                 if(err) throw err;
               })
            }
          ], function(err) {
            if(err) throw err;
          })
        } res.redirect('/add-tags');
      } else {
        User.findOne({username: req.body.email}, function(err, user) {
          if(user) {
            console.log("user exists");
            res.redirect('/');
          } else {
            let options = {
              auth: {
                api_user: username,
                api_key: password
              }
            }
            let client = nodemailer.createTransport(sgTransport(options));
            if(req.body.permission=="custom") {
              console.log("custom");
              var token = req.body.postBlockedBoards.toString() + "?" + req.body.viewBlockedBoards.toString() + "?" + req.body.postBlockedGroups.toString() + "?" + req.body.viewBlockedGroups.toString();
              token = encrypt(token);
              let email = {
                from: 'support@theuniversityloop.com',
                to: req.body.email,
                subject: 'Join Loop!',
                text: 'You are invited to join Haverford College\'s Community Loop!\n\n' +
                'Please click on the link to sign up to connect your community organization with students and administrators.\n\n' +
                'Link: http://loop-web-env.us-east-2.elasticbeanstalk.com/invited/' + token
               };
               client.sendMail(email, function(err){
                 console.log("here5");
                 if(err) throw err;
                 res.redirect('/add-tags');
               })
            } else if(req.body.permission=="admin") {
              console.log("admin");
              var token = encrypt("admin");
              let email = {
                from: 'support@theuniversityloop.com',
                to: req.body.email,
                subject: 'Join Loop!',
                text: 'You are invited to join your institution\'s Community Loop on behalf of ' + req.user.firstName + ' ' + req.user.lastName + ' (' + req.user.username + ')' + '!\n\n' +
                'Please click on the link to sign up as an administrator.\n\n' +
                'Link: http://loop-web-env.us-east-2.elasticbeanstalk.com/invited/' + token
               };
               client.sendMail(email, function(err){
                 console.log("here5");
                 if(err) throw err;
                 res.redirect('/add-tags');
               })
            } else if(req.body.permission=="student"){
              console.log("student");
              var token = encrypt("student");
              let email = {
                from: 'support@theuniversityloop.com',
                to: req.body.email,
                subject: 'Join Loop!',
                text: 'You are invited to join Haverford College\'s Community Loop!\n\n' +
                'Please click on the link to sign up and join your school\'s network.\n\n' +
                'Link: http://loop-web-env.us-east-2.elasticbeanstalk.com/invited/' + token
               };
               client.sendMail(email, function(err){
                 console.log("here5");
                 if(err) throw err;
                 res.redirect('/add-tags');
               })
            } else if(req.body.permission=="outside"){
              console.log("outside");
              var token = encrypt("outside");
              let email = {
                from: 'support@theuniversityloop.com',
                to: req.body.email,
                subject: 'Join Loop!',
                text: 'You are invited to join Haverford College\'s Community Loop!\n\n' +
                'Please click on the link to sign up to connect your community organization with students and administrators.\n\n' +
                'Link: http://loop-web-env.us-east-2.elasticbeanstalk.com/invited/' + token
               };
               client.sendMail(email, function(err){
                 console.log("here5");
                 if(err) throw err;
                 res.redirect('/add-tags');
               })
            }
          }
        })
      }
    } else {
      res.redirect('/');
    }
  })

  router.get('/invited/:token', function(req, res) {
    var token = decrypt(req.params.token);
    if(token=="admin") {
      res.render('invited-admin', {token: encrypt(token)});
    } else if (token=="student") {
      res.render('student-register');
    } else if (token=="outside") {
      res.render('invited-org');
    } else {
      res.render('invited-org', {token: req.params.token});
    }
  })

  router.post('/outside-signup', function(req, res) {
    User.findOne({'username': req.body.username}, function(err, user) {
      if (err)
        return done(err);
      if (user) {
        var message = encodeURIComponent('That email is already taken');
        if(req.body.token) {
          res.redirect('/invited/' + req.body.token + '/?message=' + message)
        } else {
          res.redirect('/signup/?message=' + message)
        }
      } else {
        console.log(req.body);
        res.redirect('/invited-password/?username=' + req.body.username + '&firstName=' + req.body.firstName + '&lastName=' + req.body.lastName + '&token=' + req.body.token);
      }
    })
  })

  router.get('/invited-password', function(req, res) {
    if(Object.keys(req.query).length==4) {
      res.render('create-password', {outside: true, username: req.query.username, firstName: req.query.firstName, lastName: req.query.lastName, token: req.query.token, message: req.flash('signupMessage')});
    } else {
      res.redirect('/');
    }
  })

  router.post('/outside-signup-password', passport.authenticate('local-outside-signup', {
      successRedirect : '/add-tags',
      failureRedirect : '/invited-password',
      failureFlash : true // allow flash messages
    })
  );

  router.get('/add-office', function(req, res) {
    if(req.user) {
      if(req.user.admin) {
        Office.find({private: 'false'}).populate('tags').exec(function(err, offices) {
          Tag.find({}, function(err, tags) {
            console.log(offices);
            console.log(offices.length);
            if(offices.length==0) {
              res.render('offices', {offices: offices, tags: tags, check: true});
            } else {
              res.render('offices', {offices: offices, tags: tags, check: false});
            }
          })
        })
      } else {
        res.redirect('/');
      }
    } else {
      res.redirect('/');
    }
  })

  router.post('/add-office', function(req, res) {
    console.log(req.body);
    console.log(req.body.check=='true');
    if(req.user.admin) {
      if(req.body.check=='true') {
        console.log("here");
        let college = new Office({
          name: "Haverford College",
          private: true,
          members: [req.user._id]
        })
        college.save(function(err, savedCollege) {
          console.log("saved");
          User.findOneAndUpdate({_id: req.user._id}, {$push: {office: savedCollege._id}}, function(err, user) {
            if(err) throw err;
          })
        });
      }
      Office.findById(req.body.office, function(err, office) {
            if(office) {
              var tagsList = req.body.tags.split(',');
              let tags = tagsList.map(async function(tag) {
                let foundTag = await Tag.findOne({name: tag});
                if(foundTag) {
                  return Promise.resolve(tag);
                } else if(tag!=""){
                  let newTag = new Tag({
                    name: tag
                  })
                  return newTag.save();
                }
              });
              Promise.all(tags).then(function(tags) {
                office.members.push(req.user._id);
                office.tags = tags;
                office.save(function(err, savedOffice) {
                  res.redirect('/invite-users')
                });
              })
            } else {
              var tagsList = req.body.tags.split(',');
              let tags = tagsList.map(async function(tag) {
                let foundTag = await Tag.findOne({name: tag});
                if(foundTag) {
                  return Promise.resolve(tag);
                } else {
                  let newTag = new Tag({
                    name: tag
                  })
                  return newTag.save();
                }
              });
              Promise.all(tags).then(function(tags) {
                console.log(tags.length);
                console.log(tags);
                if(tags[0]!='') {
                  let newOffice = new Office({
                    name: req.body.office,
                    members: [req.user._id],
                    tags: tags
                  })
                  newOffice.validateSync();
                  newOffice.save(function(err, savedOffice) {
                    if(err) throw err;
                    User.findById(req.user._id, function(err, user) {
                      if(err) throw err;
                      user.title = req.body.title;
                      user.division = req.body.division;
                      user.office.push(savedOffice._id);
                      user.save(function(err, savedUser){
                        res.redirect('/invite-users')
                      })
                    })
                  });
                } else {
                  let newOffice = new Office({
                    name: req.body.office,
                    members: [req.user._id]
                  });
                  console.log(newOffice);
                  console.log("here1");
                  newOffice.save(function(err, savedOffice) {
                    console.log("here2");
                    if(err) throw err;
                    User.findById(req.user._id, function(err, user) {
                      if(err) throw err;
                      user.title = req.body.title;
                      user.division = req.body.division;
                      user.office.push(savedOffice._id);
                      user.save(function(err, savedUser){
                        res.redirect('/invite-users')
                      })
                    })
                  });
                }
              })
            }
        })
    } else {
      res.redirect('/');
    }
  })

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
            User.findById(req.user._id).populate('blocking').exec(function(err, user) {
              if(err) throw err;
              res.render('settings', {message: req.flash('settingsMessage'), boards: boards, groups: groups, admin: req.user.admin, user: user})
            })
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
        console.log(username);
        console.log(password);
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
