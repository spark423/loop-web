var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Challenge = require('../models/challenge');
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
router.post('/comments/:id/delete', function(req, res) {
	Comment.findById(req.params.id, function(error, comment) {
		if (error)
		  throw error
		console.log("Got here 1")
		if (comment.upperComment) {
			Comment.findById(comment.upperComment, function(error, upperComment) {
				if (error)
				  throw error;
				var comments = upperComment.comments
			  var index = comments.indexOf(comment._id) 
			  upperComment.comments = comments.slice(0, index).concat(comments.slice(index+1, comments.length))
			  upperComment.save(function(error, updatedComment) {
			  	if (error)
				  	throw error;
				  if (updatedComment.event) {
				 		Event.findById(updatedComment.event, function(error, event) {
				 			if (error)
			  				throw error;
			  			res.redirect('/boards/' + event.board)
			  		})
			  	} else {
				    Post.findById(updatedComment.post, function(error, post) {
				 		  if (error)
				 			  throw error;
			  		  res.redirect('/boards/' + post.board);
			  	  })
			  	}
			  })
			})
		} else if (comment.post) {
		  console.log("Got here 2")			
			Post.findById(comment.post, function(error, post) {
				if (error)
					throw error;
				var comments = post.comments
				var index = comments.indexOf(comment._id)
				post.comments = comments.slice(0, index).concat(comments.slice(index+1, comments.length))
				post.save(function(error, updatedPost) {
					if (error)
						throw error;
					res.redirect('/boards/' + updatedPost.board)
				})
			})
		} else if (comment.event) {
			Event.findById(comment.event, function(error, event) {
				if (error)
					throw error;
				var comments = event.comments
				var index = comments.indexOf(comment._id)
				event.comments = comments.slice(0, index).concat(comments.slice(index+1, comments.length))
				event.save(function(error, updatedEvent) {
					if (error)
						throw error;
					res.redirect('/boards/' + updatedEvent.board)
				})
			})
		} else {
			Challenge.findById(comment.challenge, function(error, challenge) {
				if (error)
					throw error;
				var comments = challenge.comments
				var index = comments.indexOf(comment._id)
				challenge.comments = comments.slice(0, index).concat(comments.slice(index+1, comments.length))
				challenge.save(function(error, updatedChallenge) {
					if (error)
						throw error;
					res.redirect('/boards/' + updatedChallenge.board)
				})
			})
		}
	})
})

//Commeting on comment
router.post('/comments/:id/comment', function(req, res) {
	var newComment = new Comment({
		postedBy: req.user._id,
		upperComment: req.params.id,
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
			})
		  Comment.findById(newComment.upperComment, function(error, upperComment) {
			  if (error)
				  throw error
			  upperComment.comments.push(newComment._id)
			  upperComment.save(function(error, updatedComment) {
				  if (error)
					  throw error;
					if (updatedComment.event) {
						console.log("EVENTS BRO")
						Event.findById(updatedComment.event, function(error, event) {
							if (error)
								throw error;
							res.redirect('/boards/' + event.board)
						})
					} else if (updatedComment.challenge) {
						console.log("CHALLENGES BRO")
						Challenge.findById(updatedComment.challenge, function(error, challenge) {
							if (error)
								throw error;
							res.redirect('/boards/' + challenge.board)
						})
					} else {
						console.log("POSTS BRO")
						Post.findById(updatedComment.post, function(error, post) {
							if (error)
								throw error;
				      res.redirect('/boards/' + post.board)
			      })
					}
			  })
		  })			
		})
	})
})


module.exports = router;