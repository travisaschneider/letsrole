import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import extract from "unzipper";
import webfontsGenerator from "@vusion/webfonts-generator";
import { fileURLToPath } from "url";

const BASE_URL =
  "https://game-icons.net/archives/svg/zip/000000/transparent/game-icons.net.svg.zip";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORK_DIR = `${CURRENT_DIR}/tmp`;
const OUT_DIR = `${CURRENT_DIR}/out`;
const ZIP_FILE = `${WORK_DIR}/icons.zip`;
const SVG_DIR = `${WORK_DIR}/svg`;
const FONT_DIR = `${OUT_DIR}/webfonts`;
const ICON_PATH_MAPPING_FILE = `${OUT_DIR}/iconFileMap.json`;
const CODE_POINT_FILE = `${OUT_DIR}/codepoints.json`;
const NEXT_PATH = path.resolve(`${CURRENT_DIR}/../../next`);
const NEXT_ICON_NAME_VALIDATOR_PATH = path.resolve(
  `${NEXT_PATH}/src/Models/Validation/System/Attribute/`
);
const NEXT_ICON_FONT_PATH = path.resolve(`${NEXT_PATH}/sass/`);

let lostIcons = {};
let newIcons = {};

const forbiddenCodePoints = {
  __forbidden__1: 65056, // icon is shifted on the left
  __forbidden__2: 65057, // icon is shifted on the left
  __forbidden__3: 65058, // icon is shifted on the left
  __forbidden__4: 65059, // icon is shifted on the left
  __forbidden__5: 65060, // icon is shifted on the left
  __forbidden__6: 65061, // icon is shifted on the left
  __forbidden__7: 65062, // icon is shifted on the left
  __forbidden__8: 65063, // icon is shifted on the left
  __forbidden__9: 65064, // icon is shifted on the left
  __forbidden__10: 65065, // icon is shifted on the left
  __forbidden__11: 65066, // icon is shifted on the left
  __forbidden__12: 65067, // icon is shifted on the left
  __forbidden__13: 65068, // icon is shifted on the left
  __forbidden__14: 65069, // icon is shifted on the left
  __forbidden__15: 65070, // icon is shifted on the left
  __forbidden__16: 65071, // icon is shifted on the left
  __forbidden__17: 65575, // not decoded
  __forbidden__18: 65440, // invisible
  __forbidden__19: 65520, // invisible
  __forbidden__20: 65521, // invisible
  __forbidden__21: 65522, // invisible
  __forbidden__22: 65523, // invisible
  __forbidden__23: 65524, // invisible
  __forbidden__24: 65525, // invisible
  __forbidden__25: 65526, // invisible
  __forbidden__26: 65527, // invisible
  __forbidden__27: 65528, // invisible
};

const tidyUp = async () => {
  fs.rmSync(WORK_DIR, { recursive: true });
  console.log("Lost icons");
  for (let path in lostIcons) {
    console.log(`${lostIcons[path]} (${path})`);
  }
  console.log("New icons");
  for (let path in newIcons) {
    console.log(`${newIcons[path]} (${path})`);
  }
};

const iconFont = async () => {
  return new Promise((resolve, reject) => {
    const codepoints = fs.existsSync(CODE_POINT_FILE)
      ? JSON.parse(fs.readFileSync(CODE_POINT_FILE))
      : forbiddenCodePoints;

    webfontsGenerator(
      {
        files: fs.readdirSync(SVG_DIR).map((file) => `${SVG_DIR}/${file}`),
        dest: FONT_DIR,
        fontName: "game-icons",
        css: true,
        cssDest: path.join(OUT_DIR, "game-icons.scss"),
        templateOptions: {
          classPrefix: "ga-",
          baseSelector: ".ga",
        },
        cssTemplate: `${CURRENT_DIR}/template.css.hbs`,
        cssFontsUrl: '" + $assetPath + "/fonts',
        types: ["eot", "woff2", "woff", "ttf"],
        startCodepoint: 0xe000,
        codepoints: codepoints,
        normalize: true,
        ligature: false,
        html: false,
        htmlDest: `${OUT_DIR}/game-icons.html`,
      },
      (error) => {
        if (error) {
          reject(error);
        } else {
          fs.writeFileSync(
            CODE_POINT_FILE,
            JSON.stringify(codepoints, false, 2)
          );

          if (fs.existsSync(NEXT_ICON_FONT_PATH)) {
            fs.copyFileSync(
              `${OUT_DIR}/game-icons.scss`,
              NEXT_ICON_FONT_PATH + "/game-icons.scss"
            );
          }

          resolve();
        }
      }
    );
  });
};

const extractZip = async () => {
  if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR);

  const iconNamePathMapping = fs.existsSync(ICON_PATH_MAPPING_FILE)
    ? JSON.parse(fs.readFileSync(ICON_PATH_MAPPING_FILE))
    : {};

  const iconCounts = {};

  for (let iconPath in iconNamePathMapping) {
    const name = path.basename(iconPath, path.extname(iconPath));

    if (!(name in iconCounts)) {
      iconCounts[name] = 0;
    }

    iconCounts[name]++;
  }

  lostIcons = { ...iconNamePathMapping };
  newIcons = {};

  return new Promise((resolve, reject) => {
    const jsListContent = [];

    const allFiles = fs
      .createReadStream(ZIP_FILE)
      .pipe(extract.Parse())
      .on("entry", async (entry) => {
        if (!entry.path.includes(".svg")) return;

        let name;

        if (entry.path in iconNamePathMapping) {
          name = iconNamePathMapping[entry.path];
          delete lostIcons[entry.path];
        } else {
          name = path.basename(entry.path, path.extname(entry.path));

          if (iconCounts[name]) {
            iconCounts[name]++;
            name = `${name}-${iconCounts[name]}`;
          } else {
            iconCounts[name] = 1;
          }

          iconNamePathMapping[entry.path] = name;
          newIcons[entry.path] = name;
        }

        jsListContent.push("ga_" + name);

        const fileData = await entry.buffer();

        fs.writeFileSync(`${SVG_DIR}/${name}.svg`, fileData);
      });

    allFiles.on("finish", () => {
      const sortedList = jsListContent.sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0
      );

      fs.writeFileSync(
        `${OUT_DIR}/ga-list.ts`,
        "export const gaIconList: Array<string> = " +
          JSON.stringify(sortedList, false, 2) +
          ";"
      );
      fs.writeFileSync(
        ICON_PATH_MAPPING_FILE,
        JSON.stringify(iconNamePathMapping, false, 2)
      );

      if (fs.existsSync(NEXT_ICON_NAME_VALIDATOR_PATH)) {
        fs.copyFileSync(
          `${OUT_DIR}/ga-list.ts`,
          NEXT_ICON_NAME_VALIDATOR_PATH + "/ga-list.ts"
        );
      }

      resolve();
    });

    allFiles.on("error", reject);
  });
};

const downloadZip = async () => {
  const res = await fetch(BASE_URL);
  const fileStream = fs.createWriteStream(ZIP_FILE);

  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

const prepare = async () => {
  if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
};

prepare()
  .then(() => console.log("Setup done"))
  .then(downloadZip)
  .then(() => console.log("Zip downloaded"))
  .then(extractZip)
  .then(() => console.log("Zip extracted"))
  .then(iconFont)
  .then(() => console.log("Webfont created"))
  .then(tidyUp)
  .then(() => console.log("Cleaned up"))
  .catch((e) => {
    console.error(e);
  })
  .finally(() => console.log("Finished"));
