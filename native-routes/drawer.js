var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var User = require('../models/user');
var Board = require('../models/board');
var Group = require('../models/group');

module.exports = function(passport) {
  router.put('/subscription', passport.authenticate('jwt', { session: false }), function(req, res) {
    Time.findOneAndUpdate({}, {$push: {follows: {createdAt: Date.now(), board: req.params.id, user:req.user._id}}}, function(err, time) {
      if (err) {
        throw err;
      } else {
        let subscribedBoards = req.body.subscribedBoards.map(function(boardId) {
          return mongoose.Types.ObjectId(boardId);
        })
        User.findOneAndUpdate({_id: req.user._id}, {$set: {subscribedBoards: subscribedBoards}},function(err,user) {
          if (err) {
            throw err;
          } else {
            res.json({"success": true})
          }
        })        
      }
    })    
  }); 

  router.get('/drawer', passport.authenticate('jwt', { session: false }), function(req, res) {
    Board.find({}, function(err, boards) {
      if (err) {
        throw err;
      }
      let boardsArray = boards.map(function(board) {
        return {"id": board._id, "name": board.name, "asset": board.asset, "unsubscribable": board.unsubscribable, "subscribed": req.user.subscribedBoards.indexOf(board._id) > -1}
      })
      Group.find({}, function(err, groups) {
        if (err) {
          throw err;
        }
        let groupsArray = groups.map(function(group) {
          return {"id": group._id, "name": group.name}
        });
        res.json({boards: boardsArray, groups: groupsArray});       
      })
    })
  });     
  return router;
}

