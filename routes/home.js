var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group');
var Board = require('../models/board');

router.get('/', function(req, res) {
	if (req.isAuthenticated()) {
		Board.find({}, function(error, boards) {
			if (error)
				throw error
			User.findById(req.user._id).exec(function (err, user) {
				if (error) 
					throw err
				var subscribedBoards = []
				for (var i=0; i<user.subscribedBoards.length; i++) {
					subscribedBoards.push(user.subscribedBoards[i].toString())
				}
				var renderedBoards = []
				for (var i=0; i<boards.length; i++) {
					if (subscribedBoards.indexOf(boards[i]._id.toString()) > -1) {
						renderedBoards.push({"subscribed": true, "board": boards[i]})
					} else {
						renderedBoards.push({"subscribed": false, "board": boards[i]})						
					}
				}
        res.render('authHome', {_id: req.user._id, admin: req.user.admin, firstName: user.firstName, lastName: user.lastName, boards: renderedBoards})																			
			})
		})
	} else {
		res.render('generalHome')
	}
});

module.exports = router;