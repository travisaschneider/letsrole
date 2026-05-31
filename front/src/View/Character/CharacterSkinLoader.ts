import { injectable } from "inversify";

@injectable()
export class CharacterSkinLoader {
  protected statuses: Map<string, boolean> = new Map<string, boolean>();

  public load(skin: string) {
    if (this.statuses.get(skin)) {
      return;
    }

    const head = document.getElementsByTagName("head")[0];
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "/assets/css/character-skin/" + skin + "/sheet.css";
    link.media = "all";

    head.appendChild(link);

    this.statuses.set(skin, true);
  }
}
