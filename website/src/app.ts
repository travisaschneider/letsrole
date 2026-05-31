import express, { NextFunction, Request, Response } from "express";
import nunjucks from "nunjucks";
import morgan from "morgan";
import cors from "cors";
import home from "./controller/home";
import table from "./controller/table";
import play from "./controller/play";
import cdn from "./controller/cdn";
import fileupload from "express-fileupload";

function notFound(req: Request, res: Response, next: NextFunction) {
  res.status(404);
  next(new Error(`🔍 - Not Found - ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: err.stack,
  });
}

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileupload());
app.use(express.static("public"));
app.use("/assets", express.static("public"));
app.use("/medias", express.static("medias"));

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  noCache: true,
});

app.use("/", home);
app.use("/table", table);
app.use("/play", play);
app.use("/cdn", cdn);

app.use(notFound);
app.use(errorHandler);

export default app;
