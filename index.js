/* eslint-disable no-undef */
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, GridFSBucket, ObjectId } = require("mongodb");
const multer = require("multer");
const fs = require("fs");

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jp8yltl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db, bucket;

// Set up MongoDB connection and GridFSBucket for file storage
async function connectDB() {
  try {
    // Connect to the MongoDB client
    await client.connect();

    // Set the database and bucket (GridFS)
    db = client.db("SEOpage");
    bucket = new GridFSBucket(db, { bucketName: "files" });

    console.log("Connected to MongoDB and GridFS setup complete");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Run the DB connection
connectDB().catch(console.dir);

const usersCollection = client.db("SEOpage").collection("Users");
// API to get all users
app.get("/users", async (req, res) => {
    try {
      const result = await usersCollection.find().toArray();
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Error fetching users", error: error.message });
    }
  });

// File upload middleware setup
const storage = multer.memoryStorage(); // Use memory storage to keep file data in memory
const upload = multer({ storage }).array("files"); // Use .array() to handle multiple files

// API to upload multiple files to MongoDB using GridFS, associated with a user
app.post("/upload/:userId", upload, (req, res) => {
    console.log(req)
  const userId = req.params.userId; // Get userId from URL parameter
  if (!userId || !ObjectId.isValid(userId)) {
    return res.status(400).send("Invalid user ID");
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded");
  }

  const fileIds = [];

  // Iterate over each uploaded file and store it in GridFS with userId metadata
  req.files.forEach((file) => {
    const metadata = {
      userId: new ObjectId(userId), // Store the userId in the file's metadata
      originalName: file.originalname,
    };

    // Create a stream to upload the file to MongoDB GridFS
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata,
    });

    // Upload file data to GridFS
    uploadStream.end(file.buffer);

    uploadStream.on("finish", () => {
      fileIds.push(uploadStream.id);
    });

    uploadStream.on("error", (err) => {
      console.error("Error uploading file:", err);
      res.status(500).send({ message: "Error uploading file", error: err.message });
    });
  });

  // Send a response once all files have been uploaded
  res.status(200).send({
    message: "Files uploaded successfully!",
    fileIds,
  });
});

// API to fetch all files for a specific user by userId
app.get("/files/:userId", async (req, res) => {
  const userId = req.params.userId; // Get userId from URL parameter
//   console.log(userId)
  if (!userId) {
    return res.status(400).send("Invalid user ID");
  }

  try {
    // Find files associated with the user
    const files = await bucket
      .find({ "metadata.userId": new ObjectId(userId) })
      .toArray();
      
   

    // Send the list of file metadata to the client
    res.status(200).json(files.length);
  } catch (error) {
    res.status(500).send({ message: "Error fetching files", error: error.message });
  }
});

// Send a ping to confirm a successful connection
app.get("/", (req, res) => {
  res.send("SEO server listening");
});

// Start the server
app.listen(port, () => {
  console.log(`SEO server listening on port ${port}`);
});


