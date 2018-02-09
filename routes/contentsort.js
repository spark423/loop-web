var remainder = function(i, j, board, posts, events, user) {
  if (j===events.length) {
    let remainderPosts = []
    posts.slice(i).forEach(function(post) {
      var comments = []
      post.comments.forEach(function(comment) {
        comments.push({
          own: user._id.toString() === comment.postedBy.id.toString(),
          createdAt: comment.createdAt,
          postedBy: {
            _id: comment.postedBy.userId.toString(),
            username: comment.username,
            firstName: comment.firstName,
            lastName: comment.lastName
          },
          text: comment.text
        })
      })
      remainderPosts.push({
        own: user._id.toString() === post.postedBy.id.toString(),
        following: user.followingPosts.includes(post._id.toString()),
        createdAt: post.createdAt,
        postedBy: {
          _id: post.postedBy.userId,
          username: post.postedBy.username,
          firstName: post.postedBy.firstName,
          lastName: post.postedBy.lastName
        },
        title: post.title + " From " + board.name + " Board",
        text: post.text,
        comments: comments
      })
    })
    return remainderPosts
  } else {
    let remainderEvents = []
    events.slice(j).forEach(function(event) {
      let comments = []
      event.comments.forEach(function(comment) {
        comments.push({
          own: user._id.toString() === comment.postedBy.id.toString(),
          createdAt: comment.createdAt,
          postedBy: {
            _id: comment.postedBy.userId.toString(),
            username: comment.username,
            firstName: comment.firstName,
            lastName: comment.lastName
          },
          text: comment.text
        })
      })
      remainderEvents.push({
        createdAt: event.createdAt,
        date: event.date,
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
        title: event.title + " From " + board.name + " Board",
        description: event.description || "",
        comments: comments
      })
    })
    return remainderEvents
  }
}

module.exports = function(board, posts, events, user) {
  let i = 0;
  let j = 0;
  let contents = []
  while (i !== posts.length && j !== events.length) {
    if (posts[i].createdAt >= events[j].EventDetailUpdatedDate) {
      let comments = []
      posts[i].comments.forEach(function(err, comment) {
        comments.push({
          own: user._id.toString() === comment.postedBy.userId.toString(),
          createdAt: comment.createdAt,
          postedBy: {
            _id: comment.postedBy.userId.toString(),
            username: comment.username,
            firstName: comment.firstName,
            lastName: comment.lastName
          },
          text: comment.text
        })
      })
      contents.push({
        own: user._id.toString() === posts[i].postedBy.userId.toString(),
        following: user.followingPosts.includes(posts[i]._id),
        postedBy: {
          _id: posts[i].postedBy.userId,
          username: posts[i].postedBy.username,
          firstName: posts[i].postedBy.firstName,
          lastName: posts[i].postedBy.lastName
        },
        createdAt: posts[i].createdAt,
        title: posts[i].title + " From " + board.name + " Board",
        text: posts[i].text,
        comments: comments
      });
      i ++;
    } else {
      let comments = []
      events[j].comments.forEach(function(err, comment) {
        comments.push({
          own: user._id.toString() === comment.postedBy.userId.toString(),
          createdAt: comment.createdAt,
          postedBy: {
            _id: comment.postedBy.userId.toString(),
            username: comment.username,
            firstName: comment.firstName,
            lastName: comment.lastName
          },
          text: comment.text
        })
      })
      contents.push({
        createdAt: events[j].createdAt,
        date: events[j].date,
        startTime: events[j].startTime || "",
        endTime: events[j].endTime || "",
        location: events[j].location || "",
        title: events[j].title + " From " + board.name + " Board",
        description: events[j].description || "",
        comments: comments
      })
      j ++;
    }
  }
  return contents.concat(remainder(i,j,board,posts,events,user))
}
