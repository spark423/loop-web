var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Comment = require('../models/comment')

//Editing comment
router.post('/comments/:id/edit', function(req, res) {
	Comment.findById(req.params.id, function(error, comment) {
		if (error)
			throw error
		if (req.body.text) {
			comment.text = req.body.text
		}
		comment.save(function(error, updatedComment) {
			if (error)
				throw error;
			if (updatedComment.upperComment) {
				Comment.findById(updatedComment.upperComment, function(error, upperComment) {
					if (error)
						throw error;
					if (upperComment.event) {
						Event.findById(upperComment.event, function(error, event) {
							if (error)
								throw error;
							res.redirect('/boards/' + event.board)
						})
					} else {
					  Post.findById(upperComment.post, function(error, post) {
						  if (error)
							  throw error;
						  res.redirect('/boards/' + post.board)
					  })
					}
				})
			} else if (updatedComment.event) {
				Event.findById(updatedComment.event, function(error, event) {
					if (error)
						throw error;
					res.redirect('/boards/' + event.board)
				})
			} else {
			  Post.findById(updatedComment.post, function(error, post) {
			  	if (error)
				  	throw error;
				  res.redirect('/boards/' + post.board)
			  })
			}
		})
	})
})


//Deleting comment
router.post('/comments/:id', function(req, res) {
	Comment.findById(req.params.id, function(err, comment) {
		if (err) {
			throw err;
		} else if (comment.source.kind === 'Post') {
			Post.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.board);
			})
		} else if (comment.source.kind === 'Event') {
			Event.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.board);
			})
		} else {
			Comment.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
				if (err) {
					throw err;
				}
				res.redirect('/boards/' + board.source.item.source.item.board);
			})
		}
	})
})

//Commeting on comment
router.post('/comments/:id/comment', function(req, res) {
	let newComment = new Comment({
		postedBy: req.user._id,
		source: {"kind": 'Comment', "item": req.params.id},
		text: req.body.text
	})
	newComment.save(function(err, newComment) {
		if (err) {
			throw err;
		}
		Comment.findOneAndUpdate({_id: req.params.id}, {$push: {comments: newComment._id}}, function(err, board) {
			if (err) {
				throw err;
			}
			User.findOneAndUpdate({_id: req.user._id}, {$push: {comments: newComment._id}}, function(err, user) {
				if (err) {
					throw err;
				}
				res.json({success: true})
			})
		});
	})
})

module.exports = router;
