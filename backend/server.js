const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());


// =========================
// CREATE Word
// =========================
app.post("/words", async (req, res) => {
  try {
    const { text, meaning, example, partOfSpeech } = req.body;

    const newWord = await prisma.word.create({
      data: { text, meaning, example, partOfSpeech },
    });

    res.status(201).json({
      status: "success",
      data: newWord,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =========================
// GET all words
// =========================
app.get("/words", async (req, res) => {
  try {
    const words = await prisma.word.findMany();

    res.status(200).json({
      status: "success",
      count: words.length,
      data: words,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =========================
// GET single word
// =========================
app.get("/words/:id", async (req, res) => {
  try {
    const word = await prisma.word.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!word) {
      return res.status(404).json({
        status: "fail",
        message: "Word not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: word,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =========================
// UPDATE word
// =========================
app.put("/words/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { text, meaning, example, partOfSpeech } = req.body;

    const updatedWord = await prisma.word.update({
      where: { id },
      data: { text, meaning, example, partOfSpeech },
    });

    res.status(200).json({
      status: "success",
      data: updatedWord,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =========================
// DELETE word
// =========================
app.delete("/words/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.word.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =========================
// Start Server + Database connection
// =========================
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to database!");

    app.listen(3000, () => {
      console.log("🚀 Server is running on port 3000");
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1);
  }
}

startServer();
