var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Group = require('../models/group')
var Board = require('../models/board');
var Post = require('../models/post');
var Event = require('../models/event');
var Challenge = require('../models/challenge')
var Notification = require('../models/notification')
var Comment = require('../models/comment');

router.get('/feed', function(req, res) {
  Board.find({}, function(err, boards) {
    var posts=[];
    var events=[];
    console.log(boards[3].posts[16].comments);
    for(var i=0; i<boards.length; i++) {
      console.log(boards[i]);
      if(boards[i].posts) {
        console.log("going through posts");
      for(var j=0; j<boards[i].posts.length; j++) {
        var comments=[];
        console.log(boards[i].posts[j])
        console.log("COMMENTS", boards[i].posts[j].comments)
        if(boards[i].posts[j].comments) {
          console.log("going through comments");
        for(var k=0; k<boards[i].posts[j].comments.length; k++) {
          console.log(boards[i].posts[j].comments[k]);
          var commentsOfComments = [];
          if(boards[i].posts[j].comments[k].comments) {
            console.log("going through comments of comments");
          for(var l=0; l<boards[i].posts[j].comments[k].comments.length; l++) {
            commentsOfComments.push({"comment": {
            "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l]._id,
              "postedBy": {
                "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy._id,
                "name": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy.firstName + " " + boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].postedBy.lastName
              },
              "createdAt": moment(boards.posts[boards[i].posts.length-1-j].comments[k].comments[l].createdAt).format('LLL'),
              "text": boards[i].posts[boards[i].posts.length-1-j].comments[k].comments[l].text
            }})
            console.log(commentsOfComments);
          }
        }
          comments.push({"comment": {
            "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k]._id,
            "postedBy": {
              "_id": boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy._id,
              "name": boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy.firstName + " " + boards[i].posts[boards[i].posts.length-1-j].comments[k].postedBy.lastName
            },
            "createdAt": moment(boards[i].posts[boards[i].posts.length-1-j].comments[k].createdAt).format('LLL'),
            "text": boards[i].posts[boards[i].posts.length-1-j].comments[k].text,
            "comments": commentsOfComments
          }})
          console.log(comments);
        }
        posts.push({"post": {
          "_id": board.posts[board.posts.length-1-i]._id,
          "title": board.posts[board.posts.length-1-i].title,
          "postedBy":  {
            "_id": board.posts[board.posts.length-1-i].postedBy._id,
            "name": board.posts[board.posts.length-1-i].postedBy.firstName + ' ' + board.posts[board.posts.length-1-i].postedBy.lastName
          },
          "board": board,
          "createdAt": moment(board.posts[board.posts.length-1-i].createdAt).format('LLL'),
          "text": board.posts[board.posts.length-1-i].text,
          "comments": comments
        }})
        console.log(posts);
      }
      }
    }
    }
    res.render('feed', {posts: posts, 	helpers: {
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
      }})
  })
})




module.exports = router;
