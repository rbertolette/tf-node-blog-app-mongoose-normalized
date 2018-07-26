"use strict";


const mongoose = require("mongoose");

// Define author schema
const authorSchema = mongoose.Schema({
  firstName: 'string',
  lastName: 'string',
  userName: {
    type: 'string',
    unique: true
  }
});

// Define comment schema.
const commentSchema = mongoose.Schema({ content: 'string' });


// NOTE: The blogpost seed data file didn't contain a created field. I used:
/**
 *  var mydate = new Date()
 *  db.blogposts.updateMany({}, {$set: {created: mydate}})
 */
// to create and populate the created field.

// Define blodPost schema, normalized with Author & Comments
const blogPostSchema = mongoose.Schema({
  title: 'string',
  content: 'string',
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  comments: [commentSchema],
  // nomgo 4 has an ability to store timestamps, but to keep this compaitible
  // I'm using at Date instead
  created: { type: Date, default: Date.now }
});


// // this is our schema to represent a post
// const postSchema = mongoose.Schema({
//   title: { type: String, required: true },
//   author: {
//     firstName: { type: String, required: true },
//     lastName: { type: String, required: true },
//   },
//   content: { type: String, required: true },
//   // nomgo 4 has an ability to store timestamps, but to keep this compaitible
//   // I'm using at Date instead
//   created: { type: Date, default: Date.now }
// });


// Add pre hook for findOne and find to populate the associated Author
blogPostSchema.pre('findOne', function(next) {
  this.populate('author');
  next();
});

blogPostSchema.pre('find', function(next) {
  this.populate('author');
  next();
});

// *virtuals* (http://mongoosejs.com/docs/guide.html#virtuals)
// creates a virtual (calculated) field from the author object
blogPostSchema.virtual("fullName").get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});


// this is an *instance method* which will be available on all instances
// of the model. This method will be used to return an object that only
// exposes *some* of the fields we want from the underlying data
blogPostSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.fullName,
    created: this.created.getTime().toString()
    // the tf solution used the following line

    // created: this.created

    // which results in something like:
    // "2018-07-22T00:15:53.723Z" instead of the instructions:
    // "1532218553723"
    // the line I used get the desired results.
  };
};

// Declare and export these models after all virtual fields have been defined.
const Author = mongoose.model('Author', authorSchema);
const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = { Author,  BlogPost };


// const Post = mongoose.model("Post", postSchema);

// module.exports = { Post };
