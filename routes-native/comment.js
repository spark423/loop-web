var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event')
var Comment = require('../models/comment');

module.exports = function(passport) {
  router.delete('/comments/:id', passport.authenticate('jwt', { session: false }), function(req, res) {
	  Comment.findById(req.params.id, function(err, comment) {
		  if (err) {
        throw err;
      } else if (comment.source.kind === 'Post') {
        Post.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
          if (err) {
            throw err;
          }
          res.json({success: true});
        })        
      } else if (comment.source.kind === 'Event') {
        Event.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
          if (err) {
            throw err;
          }
          res.json({success: true});
        })                
      } else {
        Comment.findOneAndUpdate({_id: comment.source.item}, {$pull: {comments: req.params.id}}, function(err, board) {
          if (err) {
            throw err;
          }
          res.json({success: true});
        })                
      }
	  })
  })

  router.post('/comments/:id/comment', passport.authenticate('jwt', { session: false }), function(req, res) {
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

  return router;
}