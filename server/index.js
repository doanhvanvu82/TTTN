import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { createServer } from "http";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import dbConnection from "./utils/connectDB.js";
import routes from "./routes/index.js";

dotenv.config();

const port = process.env.PORT || 8282;

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API is running....");
});

app.use(routeNotFound);
app.use(errorHandler);

dbConnection();

server.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
});
