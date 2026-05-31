# Let's Role Shared Library

This repository contains code shared across various Let's Role projects.

Please head over to the [starter project](https://gitlab.com/letsrole/starter) to learn more.

---

## Legacy documentation 
*The following documentation should be updated.*

### Game icons font generation

The game-icons font is commit in the git repository, but if you want to refresh the font,
run the following command `(cd shared && node icons/createFont.mjs)`
This command will :

- download the last updated font zip file and save it in `shared/icons/tmp` directory
- extract files into the `shared/icons/tmp` directory
- create the font files (`game-icons.ttf` and `woff, woff2, eot, svg` files) in `shared/icons/out/webfonts/` directory
- create the stylesheet files `shared/icons/out/game-icons.scss` and copy it into `next/sass/` directory
- create the Typescript icon list file `shared/icons/out/ga-list.ts` and copy it into `next/src/Models/Validation/System/Attribute/` directory for Icon value validation on System builder save
- remove the `shared/icons/tmp` directory

Please note to commit the file `shared/icons/out/codepoints.json` that saves the code for every icons in order to keep them from a font file version to an other one.

And least, the file `shared/icons/out/iconFileMap.json` saves the icon alias given to each icon file. This prevent to have an icon name change when an other icon with the same name arrives later in an other directory (as it generated an icon name with a suffix xxx-2 if it already exists. See `cultist` icons)
