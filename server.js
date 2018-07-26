"use strict";

const express = require("express");
const mongoose = require("mongoose");

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const { PORT, DATABASE_URL } = require("./config");
const { Post } = require("./models");

const app = express();
app.use(express.json());

/**
 * Get all posts, no limit for now, as there are
 */
app.get("/posts", (req, res) => {
  Post.find()
  // The next line could be uncommented to limit the number of posts returned
  //    .limit(10)
  // success callback: for each post we got back, we'll
  // call the `.serialize` instance method in models.js
    .then(posts => {
      res.json({
        posts: posts.map(post => post.serialize())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: "Internal server error"});
    });
});

/**
 * Get info of one post by id
 */
app.get("/posts/:id", (req, res) => {
  Post
    // this is a convenience method Mongoose provides for searching
    // by the object _id property
    .findById(req.params.id)
    .then(restaurant => res.json(restaurant.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

/**
 * Insert a new post
 */
app.post("/posts", (req, res) => {
  const requiredFields = ["title", "author",  "content"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
    else if (field == "author"){
      const authorFields = ['firstName', 'lastName'];
      for (let j = 0; j< authorFields.length; j++){
        const authorField = authorFields[j];
        if (!(authorField in req.body.author)){
          const message = `Missing author.\`${authorField}\` in request body`;
          console.error(message);
          return res.status(400).send(message);
        }
      }
    }

  }
  // See models.js
  Post.create({
    title: req.body.title,
    author: {
      firstName: req.body.author.firstName,
      lastName: req.body.author.lastName,
    },
    content: req.body.content
  })
    .then(post => res.status(201).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.put("/posts/:id", (req, res) => {
  // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
  }

  // we only support a subset of fields being updateable.
  // if the user sent over any of the updatableFields, we udpate those values
  // in document
  const toUpdate = {};
  const updateableFields = ["title", "author", "content"];

  updateableFields.forEach(field => {
    if (field in req.body) {
      // assume the field to be set is not part of author
      let myField = field;
      if (field == "author"){
        const authorFields = ['firstName', 'lastName'];
        authorFields.forEach(authorField => {
          if (authorField in req.body.author){
            // Set the field for names to update in the author object
            myField = "author." + authorField;
            toUpdate[myField] = req.body.author[authorField];
          }
        })
      }
      else {
        toUpdate[myField] = req.body[field];
      }
    }
  });

  Post
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    .findByIdAndUpdate(req.params.id, { $set: toUpdate })
    .then(post => res.status(204).end())
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

app.delete("/posts/:id", (req, res) => {
  Post.findByIdAndRemove(req.params.id)
    .then(post => res.status(204).end())
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

// catch-all endpoint if client makes request to non-existent endpoint
app.use("*", function(req, res) {
  res.status(404).json({ message: "Not Found" });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(
      databaseUrl,
      err => {
        if (err) {
          return reject(err);
        }
        server = app
          .listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            reject(err);
          });
      }
    );
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing server");
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };
