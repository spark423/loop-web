var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/user');

module.exports = function(passport) {
	router.get('/users/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
		User.findById(req.params.id, function(err, user) {
			if (err) throw err;
			res.json({
				"user": {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          major: user.major,
          classYear: user.classYear
        }				
		  })
		})
	})

	router.get('/user', function(err, user) {
		User.findById(req.user._id, passport.authenticate('jwt', { session: false }), function(err, user) {
			if (err)  {
				throw err;
			} else {
			  res.json({
				  "user": {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            major: user.major,
            classYear: user.classYear
          }				
		    })
			}
		})		
	})

	return router;
}