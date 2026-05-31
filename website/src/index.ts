import app from "./app";

const port = parseInt(process.env.PORT || "8080", 10);

app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Let's Role website listening on port: ${port}`);
  /* eslint-enable no-console */
});
