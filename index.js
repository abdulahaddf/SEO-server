/* eslint-disable no-undef */
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5001;
require("dotenv").config();
const { MongoClient, ServerApiVersion, GridFSBucket, ObjectId } = require("mongodb");
const multer = require("multer");
const fs = require("fs");

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bd5bh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db, bucket;
let usersCollection = client.db("SEOpage").collection("Users");


async function run() {
  try {
    await client.connect();
    db = client.db("SEOpage");
    bucket = new GridFSBucket(db, { bucketName: "files" });
      // API to get all users
app.get("/users", async (req, res) => {
  try {
    const result = await usersCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching users", error: error.message });
  }
});


const storage = multer.memoryStorage(); 
const upload = multer({ storage }).array("files"); 

// API to upload multiple files
app.post("/upload/:userId", upload, (req, res) => {
  
  console.log(req)
const userId = req.params.userId; 
if (!userId || !ObjectId.isValid(userId)) {
  return res.status(400).send("Invalid user ID");
}

if (!req.files || req.files.length === 0) {
  return res.status(400).send("No files uploaded");
}

const fileIds = [];


req.files.forEach((file) => {
  const metadata = {
    userId: new ObjectId(userId), 
    originalName: file.originalname,
  };

  
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata,
  });


  uploadStream.end(file.buffer);

  uploadStream.on("finish", () => {
    fileIds.push(uploadStream.id);
  });

  uploadStream.on("error", (err) => {
    console.error("Error uploading file:", err);
    res.status(500).send({ message: "Error uploading file", error: err.message });
  });
});


res.status(200).send({
  message: "Files uploaded successfully!",
  fileIds,
});
});

// API to fetch all files for a specific user by userId
app.get("/files/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).send({ message: "Invalid user ID format" });
  }

  try {
    const files = await bucket
      .find({ "metadata.userId": new ObjectId(userId) })
      .toArray();

    res.status(200).json({ count: files.length, files });
  } catch (error) {
    console.error("Error fetching files:", error.message); // Detailed error logging
    res.status(500).send({ message: "Error fetching files", error: error.message });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


 

// Send a ping to confirm a successful connection
app.get("/", (req, res) => {
  res.send("SEO server listening");
});

// Start the server
app.listen(port, () => {
  console.log(`SEO server listening on port ${port}`);
});


