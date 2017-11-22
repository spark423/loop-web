var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Board = require('../models/board');
var Post = require('../models/post');
var Comment = require('../models/comment');
var Notification = require('../models/notification')
var Time = require('../models/time')

//Render create a post page
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

//Create post
router.post('/posts/create', function(req, res) {
  let newPost = new Post({
    postedBy: req.user._id,
    board: req.body.board,
    title: req.body.title,
    text: req.body.text
  })
  newPost.save(function(err, newPost) {
    if (err) {
      throw err;
    }
    Board.findOneAndUpdate({_id: req.body.board}, {$push: {contents: {"kind": "Post", "item": newPost._id}}}, function(err) {
      if (err) {
        throw err;
      }
      User.findOneAndUpdate({_id: req.user._id}, {$push: {posts: newPost._id}}, function(err) {
        if (err) {
          throw err;
        }
        res.redirect('/boards/' + req.body.board);
      })
    });
  });
})

//Redirect to board with post
router.get('/post/:id', function(req, res) {
	Post.findById(req.params.id, function(err, post) {
		Board.findById(post.board, function(err, board) {
			res.redirect('/boards/' + board._id + '#' + post._id);
		})
	})
})

router.get('/posts/:id/edit', function(req, res) {
	if(req.user) {
		Post.findById(req.params.id, function(err, post) {
			if(err) throw err;
			res.render('edit-post', {title: post.title, text: post.text, id: post._id});
		})
	} else {
		res.redirect('/');
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
router.post('/posts/:id', function(req, res) {
	Post.findById(req.params.id, function(err, post) {
		if (err) {
			throw err;
		} else {
			post.archive=true;
			post.save(function(err, updatedPost) {
				Board.findOneAndUpdate({_id: updatedPost.board}, {$pull: {contents: {item: req.params.id}}}, function(err, board) {
					if (err) {
						throw err;
					} else {
						res.redirect('/boards/' + board._id);
					}
				})
			})
		}
	})
})

//Follow a post
router.post('/posts/:id/follow', function(req, res) {
	Time.findOneAndUpdate({}, {$push: {follows: {createdAt: Date.now, post: req.params.id, user:req.user._id}}}, function(err, time) {
		if (err) {
			throw err;
		} else {
			Post.findOneAndUpdate({_id: req.params.id}, {$push: {followers: req.user._id}}, function(err, post) {
				if (err) {
					throw err;
				} else {
					User.findOneAndUpdate({_id: req.user._id}, {$push: {followingPosts: post._id}}, function(err, user) {
						if (err) {
							throw err;
						} else {
							res.redirect('back');
						}
					})
				}
			})
		}
	})
})

//Unfollow a post
router.post('/posts/:id/unfollow', function(req, res) {
	Time.findOneAndUpdate({}, {$pull: {follows: {post: req.params.id, user:req.user._id}}}, function(err, time) {
		if (err) {
			throw err;
		} else {
			Post.findOneAndUpdate({_id: req.params.id}, {$pull: {followers: req.user._id}}, function(err, post) {
				if (err) {
					throw err;
				} else {
					User.findOneAndUpdate({_id: req.user._id}, {$pull: {followingPosts: post._id}}, function(err, user) {
						if (err) {
							throw err;
						} else {
							res.redirect('back');
						}
					})
				}
			})
		}
	})
})

//Commenting on post
router.post('/posts/:id/comment', function(req, res) {
	let newComment = new Comment({
		postedBy: req.user._id,
		source: {"kind": 'Post', "item": req.params.id},
		text: req.body.text
	})
	newComment.save(function(err, comment) {
		Post.findOneAndUpdate({_id: req.params.id}, {$push: {comments: comment._id}}, function(err, post) {
			if (err) {
				throw err;
			} else {
				User.findOneAndUpdate({_id: req.user._id}, {$push: {comments: comment._id}}, function(err, currentUser) {
					if (err) {
						throw err;
					} else if (req.user._id==post.postedBy) {
						let notificationToFollowers = new Notification({
							type: 'Comment on Following Post',
							message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on the post \"" + post.title + "\" that you are following.",
							routeID: {
								kind: 'Post',
								item: post._id
							}
						})
						notificationToFollowers.save(function(err, notificationToFollowers) {
							if (err) {
								throw err;
							} else {
								let promises = post.followers.map(function(followerID) {
									return new Promise(function(resolve, reject) {
										User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
											if (err) {
												throw reject(err);
											} else {
												resolve();
											}
										})
									});
								});
								Promise.all(promises).then(function() {
									res.redirect('/boards/' + post.board);
								}).catch(console.error);
							}
						})
					}
					else {
						let notificationToPoster = new Notification({
							type: 'Comment on Created Post',
							message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on your post titled \"" + post.title + "\".",
							routeID: {
								kind: 'Post',
								item: post._id
							}
						})
						notificationToPoster.save(function(err, notificationToPoster) {
							User.findOneAndUpdate({_id: post.postedBy}, {$push: {notifications: notificationToPoster._id}}, function(err) {
								if (err) {
									throw err;
								} else {
									let notificationToFollowers = new Notification({
										type: 'Comment on Following Post',
										message: currentUser.firstName + " " + currentUser.lastName + " " + "commented on the post \"" + post.title + "\" that you are following.",
										routeID: {
											kind: 'Post',
											item: post._id
										}
									})
									notificationToFollowers.save(function(err, notificationToFollowers) {
										if (err) {
											throw err;
										} else {
											let promises = post.followers.map(function(followerID) {
												return new Promise(function(resolve, reject) {
													User.findOneAndUpdate({_id: followerID}, {$push: {notifications: notificationToFollowers._id}}, function(err) {
														if (err) {
															throw reject(err);
														} else {
															resolve();
														}
													})
												});
											});
											Promise.all(promises).then(function() {
												res.redirect('/boards/' + post.board);
											}).catch(console.error);
										}
									})
								}
							})
						})
					}
				})
			}
		})
	})
})

module.exports = router;
