"use strict";

const mongoose = require("mongoose");

// this is our schema to represent a post
const postSchema = mongoose.Schema({
  title: { type: String, required: true },
  author: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  content: { type: String, required: true },
  // nomgo 4 has an ability to store timestamps, but to keep this compaitible
  // I'm using at Date instead
  created: { type: Date, default: Date.now }
});

// *virtuals* (http://mongoosejs.com/docs/guide.html#virtuals)
// creates a virtual (calculated) field from the author object
postSchema.virtual("fullName").get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

// this is an *instance method* which will be available on all instances
// of the model. This method will be used to return an object that only
// exposes *some* of the fields we want from the underlying data
postSchema.methods.serialize = function() {
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

// note that all instance methods and virtual properties on our
// schema must be defined *before* we make the call to `.model`.
const Post = mongoose.model("Post", postSchema);

module.exports = { Post };
