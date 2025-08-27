import express from "express";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
    methods: ["GET", "PUT", "DELETE", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "authorization"],
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //accept new standards
app.use(express.static("public"));

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () =>
  console.log(`app listening @ port http://localhost:${PORT}`),
);
