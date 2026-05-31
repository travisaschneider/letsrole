export class Cdn {
  public static toUrl(path: string): string {
    return window["configuration"]["cdnReadUrl"] + "/" + path;
  }
}
