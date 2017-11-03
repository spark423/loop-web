var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Comment = require('../models/comment');

router.get('/posts/create', function(req, res) {
	Board.find({}, function(err, boards) {
		if(err) throw err;
		var info = [];
		for(var i=0; i<boards.length; i++) {
			info.push({"name": boards[i].name, "_id": boards[i]._id});
		}
		res.render("create-a-new-post", {boards: info});
	})
})

router.post('/posts/create', function(req, res) {
  if (req.user) {
    var deleteFiles = req.body.deleteFiles.split(" ");
    deleteFiles.splice(deleteFiles.length-1, 1);
    for(var i=0; i<deleteFiles.length; i++) {
      for(var j=0; j<req.files.images.length; j++) {
        if(req.files.images[j].name == deleteFiles[i]) {
          req.files.images.splice(j,1);
          break;
        }
      }
    }
    if(req.files.images && req.files.images != '') {
      imgProc.convertImgs(req.files.images).then((imageStringArray)=>{
        var newPost = new Post({
          postedBy: req.user._id,
          board: req.body.board,
          title: req.body.title,
          text: req.body.text,
          images: imageStringArray
        });
        newPost.save(function(error, newPost) {
          if (error)
            throw error;
          User.findById(req.user._id, function(error, user) {
            if (error)
              throw error;
            user.posts.push(newPost._id)
            user.save(function(error, updatedUser) {
              if (error)
                throw error
              Board.findById(newPost.board, function(error, board) {
                if (error)
                  throw error;
                board.posts.push(newPost._id)
                board.save(function(error, updatedBoard) {
                  if (error)
                    throw error;
                  res.redirect('/boards/' + updatedBoard._id)
                })
              })
            })
          })
        })
      });
    } else {
      var newPost = new Post({
        postedBy: req.user._id,
        board: req.body.board,
        title: req.body.title,
        text: req.body.text
      });
      newPost.save(function(error, newPost) {
        if (error)
          throw error;
        User.findById(req.user._id, function(error, user) {
          if (error)
            throw error;
          user.posts.push(newPost._id)
          user.save(function(error, updatedUser) {
            if (error)
              throw error
            Board.findById(newPost.board, function(error, board) {
              if (error)
                throw error;
              board.posts.push(newPost._id)
              board.save(function(error, updatedBoard) {
                if (error)
                  throw error;
                res.redirect('/boards/' + updatedBoard._id)
              })
            })
          })
        })
      })
    }
  } else {
    var newPost = new Post({
      postedBy: req.user._id,
      postingGroup: req.body.postedBy,
      board: req.body.board,
      title: req.body.title,
      text: req.body.text
    })

    newPost.save(function(error, newPost) {
      if (error)
        throw error;
      User.findById(req.user._id, function(error, user) {
        if (error)
          throw error;
        user.posts.push(newPost._id)
        user.save(function(error, updatedUser) {
          if (error)
            throw error;
          Group.findById(req.body.postedBy, function(error, group) {
            if (error)
              throw error;
            group.posts.push(newPost._id)
            group.save(function(error, updatedGroup) {
              if (error)
                throw error
              Board.findById(newPost.board, function(error, board) {
                if (error)
                  throw error;
                board.posts.push(newPost._id)
                board.save(function(error, updatedBoard) {
                  if (error)
                    throw error;
                  res.redirect('/boards/' + updatedBoard._id);
                })
              })
            })
          })
        })
      })
    })
  }
})

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
