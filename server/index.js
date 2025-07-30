import 'dotenv/config';
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import aiRouter from "./routes/ai.js";
import templatesRouter from "./routes/templates.js";
import gitRouter from "./routes/git.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/", (req, res) => {
  res.send("<h2>AI Code Editor Backend is running.</h2>");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/ai", aiRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/git", gitRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
