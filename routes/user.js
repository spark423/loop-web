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

//View someone else's page
router.get('/users/:id', function(req, res) {
	if(req.user) {
		User.findById(req.params.id).populate([{path: 'adminGroups'}, {path: 'joinedGroups'}, {path: 'subscribedBoards'}]).exec(function(err, user) {
			if (err) throw err;
			res.render('profile-user',{
				"user": {
					id: user._id,
					blocked: user.blocked,
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					major: user.major,
					classYear: user.classYear,
					description: user.description,
					adminGroups: user.adminGroups,
					joinedGroups: user.joinedGroups,
					subscribedBoards: user.subscribedBoards
				}, self: req.user._id==user.id, admin: req.user.admin, helpers: {
						compare: function(lvalue, rvalue, options) {
							if (arguments.length < 3)
									throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

							var operator = options.hash.operator || "==";

							var operators = {
									'==':       function(l,r) { return l == r; },
									'===':      function(l,r) { return l === r; },
									'!=':       function(l,r) { return l != r; },
									'<':        function(l,r) { return l < r; },
									'>':        function(l,r) { return l > r; },
									'<=':       function(l,r) { return l <= r; },
									'>=':       function(l,r) { return l >= r; },
									'typeof':   function(l,r) { return typeof l == r; }
							}

							if (!operators[operator])
									throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

							var result = operators[operator](lvalue,rvalue);

							if( result ) {
									return options.fn(this);
							} else {
									return options.inverse(this);
							}
						}
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
		res.render('edit-profile', {id: req.user._id, description: req.user.description, admin: req.user.admin});
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

router.post('/user/:id/block', function(req, res) {
	User.findById(req.params.id, function(err, user) {
		if(err) throw err;
		user.blocked = true;
		user.save(function(err, updatedUser) {
			if(err) throw err;
			res.status(200);
		})
	})
})

router.post('/user/:id/unblock', function(req, res) {
	User.findById(req.params.id, function(err, user) {
		if(err) throw err;
		user.blocked = false;
		user.save(function(err, updatedUser) {
			if(err) throw err;
			res.status(200);
		})
	})
})

module.exports = router;
