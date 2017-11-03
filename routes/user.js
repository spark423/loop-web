var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Challenge = require('../models/challenge');

router.get('/userinfo', function(req, res) {
	var info = [];
	info.push({"firstName": req.user.firstName, "lastName": req.user.lastName, "_id": req.user._id});
	res.send(info);
})

//Retrieve User Page
router.get('/users/:id', function(req, res) {
	if (req.user._id.toString() === req.params.id) {
		//Viewing one's own page
		User.findById(req.user._id).populate('joinedGroups').populate('hiddenGroups').populate('acceptedChallenges').populate('hiddenChallenges').exec(function(error, user) {
			if (error)
				throw error;
			var hiddenGroupsId = []
			var groups = [];
			for (var i=0; i<user.hiddenGroups.length; i++) {
				hiddenGroupsId.push(user.hiddenGroups[i]._id.toString())
			}
			console.log("Hidden groups", hiddenGroupsId)
			for (var i=0; i<user.joinedGroups.length; i++) {
				if (hiddenGroupsId.indexOf(user.joinedGroups[i]._id.toString()) === -1) {
					groups.push({"public": true, "group": user.joinedGroups[i]})
				} else {
					groups.push({"public": false, "group": user.joinedGroups[i]})
				}
			}
			var hiddenChallengesId = []
			var challenges = [];
			for (var i=0; i<user.hiddenChallenges.length; i++) {
				hiddenChallengesId.push(user.hiddenChallenges[i]._id.toString())
			}
			console.log("Hidden challenges", hiddenChallengesId)
			for (var i=0; i<user.acceptedChallenges.length; i++) {
				if (hiddenChallengesId.indexOf(user.acceptedChallenges[i]._id.toString()) === -1) {
					challenges.push({"public": true, "challenge": user.acceptedChallenges[i]})
				} else {
					challenges.push({"public": false, "challenge": user.acceptedChallenges[i]})
				}
			}
			res.render('profile-user', {
				                  self: true,
				                  _id: req.user._id,
				                  firstName: user.firstName,
				                  lastName: user.lastName,
				                  email: user.username,
				                  description: user.description,
				                  major: user.major,
				                  classYear: user.classYear,
				                  groups: groups,
				                  challenges: challenges
				                })

		})
	} else {
		//Viewing someone else's page
		User.findById(req.params.id).populate('joinedGroups').populate('hiddenGroups').populate('acceptedChallenges').populate('hiddenChallenges').exec(function(error, user) {
			if (error)
				throw error;
			console.log("OTHER")
			var publicGroups = [];
			var hiddenGroupsId = []
			for (var i=0; i<user.hiddenGroups.length; i++) {
				hiddenGroupsId.push(user.hiddenGroups[i]._id.toString())
			}
			console.log("Hidden groups", hiddenGroupsId)
			for (var i=0; i<user.joinedGroups.length; i++) {
				if (hiddenGroupsId.indexOf(user.joinedGroups[i]._id.toString()) === -1) {
					publicGroups.push(user.joinedGroups[i])
				}
				console.log(hiddenGroupsId.indexOf(user.joinedGroups[i]._id.toString()) === -1)
			}
			var publicChallenges = [];
			var hiddenChallengesId = []
			for (var i=0; i<user.hiddenChallenges.length; i++) {
				hiddenChallengesId.push(user.hiddenChallenges[i]._id.toString())
			}
			console.log("Hidden challenges", hiddenChallengesId)
			for (var i=0; i<user.acceptedChallenges.length; i++) {
				if (hiddenChallengesId.indexOf(user.acceptedChallenges[i]._id.toString()) === -1) {
					publicChallenges.push(user.acceptedChallenges[i])
				}
				console.log(hiddenChallengesId.indexOf(user.acceptedChallenges[i]._id.toString()) === -1)
			}
			res.render('profile-user', {
				                  self: false,
				                  firstName: user.firstName,
				                  lastName: user.lastName,
				                  email: user.username,
				                  description: user.description,
				                  publicGroups: publicGroups,
				                  publicChallenges: publicChallenges
				                })
		})
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
