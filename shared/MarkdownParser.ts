import { IconLib } from "./IconList";

const TAGS = {
  "": ["<em>", "</em>"],
  _: ["<strong>", "</strong>"],
  "*": ["<strong>", "</strong>"],
  "~": ["<s>", "</s>"],
  "\n": ["<br />"],
  " ": ["<br />"],
  "-": ["<hr />"],
};

/** Outdent a string based on the first indented line's leading whitespace
 *	@private
 */
function outdent(str: string) {
  return str.replace(RegExp("^" + (str.match(/^(\t| )+/) || "")[0], "gm"), "");
}

/** Encode special attribute characters to HTML entities in a String.
 *	@private
 */
function encodeAttr(str: string) {
  return (str + "")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class MarkdownParser {
  public static parse(md: string, prevLinks: any = null) {
    /* eslint-disable-next-line no-useless-escape */
    const tokenizer =
      /((?:^|\n+)(?:\n---+|\* \*(?: \*)+)\n)|(?:^``` *(\w*)\n([\s\S]*?)\n```$)|((?:(?:^|\n+)(?:\t|  {2,}).+)+\n*)|((?:(?:^|\n)([>*+-]|\d+\.)\s+.*)+)|(?:!\[([^\]]*?)\]\(([^)]+?)\))|(\[)|(\](?:\(([^)]+?)\))?)|(?:(?:^|\n+)([^\s].*)\n(-{3,}|={3,})(?:\n+|$))|(?:(?:^|\n+)(#{1,6})\s*(.+)(?:\n+|$))|(?:`([^`].*?)`)|:[\w-]+:|( {2}\n\n*|\n{2,}|__|\*\*|[_*]|~~)/gm;
    const context: any[] = [];
    const links = prevLinks || {};

    let out = "",
      last = 0,
      chunk,
      prev,
      token,
      inner,
      t;

    function tag(token: string) {
      const desc = TAGS[token[1] || ""];
      const end = context[context.length - 1] == token;
      if (!desc) return token;
      if (!desc[1]) return desc[0];
      if (end) context.pop();
      else context.push(token);

      return desc[Number(end) | 0];
    }

    function flush() {
      let str = "";
      while (context.length) str += tag(context[context.length - 1]);
      return str;
    }

    md = md
      .replace(/^\[(.+?)\]:\s*(.+)$/gm, (s, name, url) => {
        links[name.toLowerCase()] = url;
        return "";
      })
      .replace(/^\n+|\n+$/g, "");

    while ((token = tokenizer.exec(md))) {
      prev = md.substring(last, token.index);
      last = tokenizer.lastIndex;
      chunk = token[0];
      if (prev.match(/[^\\](\\\\)*\\$/)) {
        // escaped
      } else if (token[8]) {
        // notation ![text](iconName)
        let iconName = encodeAttr(token[8]);
        const icParts = iconName.split("_");
        let iconLib = IconLib._default_;

        if (icParts.length > 1 && icParts[0] in IconLib) {
          iconLib = IconLib[icParts[0]];
          iconName = icParts[1];
        }

        chunk = `<i class="${iconLib.baseSelector} ${iconLib.classPrefix}${iconName}"></i>`;
      } else if (token[17] || token[1]) {
        chunk = tag(token[17] || "--");
      }
      out += prev;
      out += chunk;
    }

    return (out + md.substring(last) + flush()).replace(/^\n+|\n+$/g, "");
  }
}
