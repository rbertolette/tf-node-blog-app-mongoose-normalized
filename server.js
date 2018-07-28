"use strict";

const express = require("express");
const mongoose = require("mongoose");

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const { PORT, DATABASE_URL } = require("./config");
const { Author, BlogPost } = require("./models");

const app = express();
app.use(express.json());


/************
 * AUTHORS
 ************/

/**
 * Get all authors, no limit for now, as there are too few to worry about.
 */
app.get("/authors", (req, res) => {
  Author.find()
  // The next line could be uncommented to limit the number of blogposts returned
  //    .limit(10)
  // success callback: for each blogpost we got back, we'll
  // call the `.serialize` instance method in models.js
    .then(authors => {
      res.json({
        authors: authors.map(author => author.serialize())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: "Internal server error"});
    });
});

/**
 * Get info of one author by id
 */
app.get("/authors/:id", (req, res) => {
  Author
    // this is a convenience method Mongoose provides for searching
    // by the object _id property
    .findById(req.params.id)
    .then(author => res.json(author.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});



/**
 * Insert a new author
 */
app.post("/authors", (req, res) => {
  const requiredFields = ["firstName", "lastName",  "userName"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  // See models.js
  Author.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    userName: req.body.userName
  })
    .then(author => res.status(201).json(author.serialize()))
    // See blogposts below for a more elegant solution.
    .catch(err => {
      // Assume that the err is not a duplicate userName.
      let myErrMsg = "Internal server error";
      let myStatus = 500;
      // Validate that userName is unique
      if (err.errmsg.indexOf("duplicate key error") > -1) {
        myErrMsg = `The userName \`${req.body.userName}\` is already used.`;
        myStatus = 400;
      }
      res.status(myStatus).json({ message: myErrMsg });
    });
});

/**
 * Update an author
 */
app.put("/authors/:id", (req, res) => {
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
  const updateableFields = ["firstName", "lastName", "userName"];

  let myMsg = '';
  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Author
    .findOne({userName: toUpdate.userName || '', _id: {$ne: req.params.id} })
    .then(author => {
      if (author) {
        const message =
          `The userName \`${req.body.userName}\` is already in use.`;
        console.error(message);
        return res.status(400).json({ message: message });
      }
      else {
        Author
        // all key/value pairs in toUpdate will be updated -- that's what `$set` does
          .findByIdAndUpdate(req.params.id, { $set: toUpdate })
          .then(author => res.status(204).end())
          .catch(err => res.status(500).json({ message: "Internal server error" }));
      }
    })
});

/**
 * Delete an author
 */
app.delete('/authors/:id', (req, res) => {
  BlogPost
    .remove({ author: req.params.id })
    .then(() => {
      Author
        .findByIdAndRemove(req.params.id)
        .then(() => {
          console.log(`Deleted author with id \`${req.params.id}\` and all their blogposts.`);
          res.status(204).json({ message: 'success' });
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    });
});


/************
 * BLOGPOSTS
 ************/


/**
 * Get all blogposts, no limit for now, as there are too few to worry about.
 */
app.get("/posts", (req, res) => {
  BlogPost.find()
  // The next line could be uncommented to limit the number of blogposts returned
  //    .limit(10)
  // success callback: for each blogpost we got back, we'll
  // call the `.serialize` instance method in models.js
    .then(blogposts => {
      res.json({
        blogposts: blogposts.map(blogpost => blogpost.serialize())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: "Internal server error"});
    });
});

/**
 * Get info of one blogpost by id
 */
app.get("/posts/:id", (req, res) => {
  BlogPost
    .findById(req.params.id)
    .then(blogpost => res.json(blogpost.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

/**
 * Insert a new blogpost
 */
app.post("/posts", (req, res) => {
  const requiredFields = ["title", "content", "author_id"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  Author
    .findById(req.body.author_id)
    .then(author => {
      if (author) {
        console.log("hi again");
        // See models.js
        BlogPost.create({
          title: req.body.title,
          author: author._id,
          content: req.body.content
        })
          .then(blogPost => res.status(201).json({
            id: blogPost.id,
            author: `${author.firstName} ${author.lastName}`,
            content: blogPost.content,
            title: blogPost.title,
            comments: blogPost.comments
          })) // .then(
          //   blogpost => res.status(201).json(blogpost.serialize()))
          .catch(err => {
            const errMsg = `Something went wrong.`;
            console.log(errMsg);
            res.status(500).json({message: errMsg});
          })
      } else {
        const errMsg = `There's no author with the id: ${req.body.author_id}.`;
        console.log(errMsg);
        res.status(400).json({message: errMsg});
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: "Internal server error"});
    })
});

/**
 * Edit a blogpost
 */
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
  const updateableFields = ["title", "content"];

  updateableFields.forEach(field => {
    if (field in req.body) {
      // assume the field to be set is not part of author
      toUpdate[field] = req.body[field];
    }
  });

  BlogPost
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    // NOTE: the new: true is needed to refreash the result returned.
    .findByIdAndUpdate(req.params.id, { $set: toUpdate }, { new: true })
    .populate('author')
    .then(updatedPost => res.status(200).json({
      id: updatedPost.id,
      title: updatedPost.title,
      content: updatedPost.content,
      author: updatedPost.fullName
    }))
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});


/**
 * Delete a blogpost
 */
app.delete("/posts/:id", (req, res) => {
  BlogPost.findByIdAndRemove(req.params.id)
    .then(blogpost => res.status(204).end())
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
