var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Challenge = require('../models/challenge')
var Comment = require('../models/comment');

//Editing challenge
router.put('/challenges/:id', function(req, res) {
	Challenge.findById(req.params.id, function(error, challenge) {
		if (error)
			throw error;
		challenge.deadline = req.body.deadline
		challenge.text = req.body.text
		challenge.save(function(error, updatedChallenge) {
			if (error)
				throw error;
			res.redirect('/boards/'+updatedChallenge.board)
		})
	})
})

//Deleting challenge
router.delete('/challenges/:id', function(req, res) {
	Challenge.findById(req.params.id, function(error, challenge) {
		if (error)
			throw error;
		Board.findById(challenge.board, function(error, board) {
			if (error)
				throw error;
			var boardChallenges = board.challenges
			var index = boardChallenges.indexOf(challenge._id)
			boardChallenges = boardChallenges.slice(0, index).concat(boardChallenges.slice(index+1, boardChallenges.length))
			board.challenges = boardChallenges
			board.save(function(error, updatedBoard) {
				if (error)
					throw error;
				res.redirect('/boards/'+updatedBoard._id)
			})
		})
	})
})

//Commenting on challenge
router.post('/challenges/:id/comment', function(req, res) {
	var newComment = new Comment({
		postedBy: req.user._id,
		challenge: req.params.id,
		text: req.body.text
	})
	newComment.save(function(error, newComment) {
		if (error)
			throw error;
		Challenge.findById(newComment.challenge, function(error, challenge) {
			if (error)
				throw error;
			var comments = challenge.comments
			comments.push(newComment._id)
			challenge.comments = comments
			challenge.save(function(error, updatedChallenge) {
				if (error)
					throw error;
				res.redirect('/boards/' + updatedChallenge.board)
			})
		})
	})
})

//Accepting challenge
router.post('/challenges/:id/accept', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		user.acceptedChallenges.push(req.params.id)
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			Challenge.findById(req.params.id, function(error, challenge) {
				if (error)
					throw error;
				challenge.acceptedUsers.push(req.user._id)
				challenge.save(function(error, updatedChallenge) {
					if (error)
						throw error;
					res.redirect('/boards/' + updatedChallenge.board)
				})
			})
		})
	})
})

//Hide accepted challenge from board
router.post('/challenges/:id/hide', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		user.hiddenChallenges.push(req.params.id)
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			res.redirect('/users/' + req.user._id)
		})
	})
})

//Make accepted challenge public
router.post('/challenges/:id/public', function(req, res) {
	User.findById(req.user._id, function(error, user) {
		if (error)
			throw error;
		var hiddenChallenges = user.hiddenChallenges
		var index = hiddenChallenges.indexOf(req.params.id)
		user.hiddenChallenges = hiddenChallenges.slice(0, index).concat(hiddenChallenges.slice(index+1, hiddenChallenges.length))
		user.save(function(error, updatedUser) {
			if (error)
				throw error;
			res.redirect('/users/' + req.user._id)
		})
	})
})

module.exports = router;