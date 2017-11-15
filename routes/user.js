var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');

//Get user info for sidenav
router.get('/userinfo', function(req, res) {
	var info = [];
	info.push({"firstName": req.user.firstName, "lastName": req.user.lastName, "_id": req.user._id});
	res.send(info);
})

//View Own user page
router.get('/user', function(err, user) {
	if(req.user) {
		User.findById(req.user._id, function(err, user) {
			if (err)  {
				throw err;
			} else {
				res.render('profile-user', {
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
	} else {
		res.redirect('/');
	}
})

//View someone else's page
router.get('/users/:id', function(req, res) {
	if(req.user) {
		User.findById(req.params.id, function(err, user) {
			if (err) throw err;
			res.render('profile-user',{
				"user": {
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					major: user.major,
					classYear: user.classYear
				}
			})
		})
	} else {
		res.redirect('/');
	}
});

//Render edit profile page
router.get('/user/edit', function(req, res) {
	if(req.user) {
		res.render('edit-profile');
	} else {
		res.redirect('/');
	}
})

//update user page
router.post('/users/:id/edit', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		if (req.body.major) {
		   user.major = req.body.major;
		}
		if (req.body.classYear) {
		   user.classYear = req.body.classYear;
		}
		if (req.body.description) {
		   user.description = req.body.description;
		}
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			res.redirect('/users/' + updatedUser._id)
		})
	})
})

module.exports = router;
