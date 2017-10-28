var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Comment = require('../models/comment');

//Editing post
router.post('/posts/:id/edit', function(req, res) {
	Post.findById(req.params.id, function(error, post) {
		if (error)
			throw error;
		if (req.body.title) {
			post.title = req.body.title
		}
		if (req.body.text) {
			post.text = req.body.text
		}
		post.save(function(error, updatedPost) {
			if (error)
				throw error;
			res.redirect('/boards/'+updatedPost.board)
		})
	})
})

//Deleting post
router.post('/posts/:id/delete', function(req, res) {
	Post.findById(req.params.id, function(error, post) {
		if (error)
			throw error;
		Board.findById(post.board, function(error, board) {
			if (error)
				throw error;
			var boardPosts = board.posts
			var index = boardPosts.indexOf(post._id)
			board.posts = boardPosts.slice(0, index).concat(boardPosts.slice(index+1, boardPosts.length))
			board.save(function(error, updatedBoard) {
				if (error)
					throw error;
				res.redirect('/boards/'+updatedBoard._id)
			})
		})
	})
})

//Commenting on post
router.post('/posts/:id/comment', function(req, res) {
	var newComment = new Comment({
		postedBy: req.user._id,
		post: req.params.id,
		text: req.body.text
	})
	newComment.save(function(error, newComment) {
		if (error)
			throw error;
		User.findById(req.user._id, function(error, user) {
			if (error)
				throw error;
			user.comments.push(newComment._id)
			user.save(function(error, updatedUser) {
				if (error)
					throw error;
				Post.findById(newComment.post, function(error, post) {
					if (error)
						throw error;
					post.comments.push(newComment._id)
					post.save(function(error, updatedPost) {
						if (error)
							throw error;
						res.redirect('/boards/' + updatedPost.board)
					})
				})				
			})
		})
	})
})

module.exports = router;