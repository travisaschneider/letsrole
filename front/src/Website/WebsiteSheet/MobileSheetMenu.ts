import { RollMode, WebsiteSheet } from "../website-sheet";
import { Translator } from "../../../shared/System/Translator";
import { DiceResult } from "../../../shared/DiceResult";
import { DiceUtil } from "../../View/Dice/DiceUtil";
import { CodeExecutor } from "../../../shared/System/CodeExecutor";
import { SharedAdapter } from "../../../shared/System/SharedAdapter";

export class MobileSheetMenu {
  protected container: HTMLElement;
  protected button: HTMLElement;
  protected isOpen = false;
  protected cid: number;

  public connectedTable: string;
  protected connectedTableName: string;

  protected eventSource: EventSource;
  public sid: number;

  public constructor(protected websiteSheet: WebsiteSheet) {
    this.container = document.getElementById("mobile-menu");
    this.button = document.getElementById("menu-btn");
    this.cid = window["character"].id;

    this.init();
  }

  protected init() {
    window["applyDiceSkin"] = this.applyDiceSkin.bind(this);
    window["joinTableByScan"] = this.joinTableByScan.bind(this);

    const offlineSwitch: HTMLInputElement =
      this.container.querySelector("#offline-switch");

    const actions: NodeListOf<HTMLAnchorElement> =
      this.container.querySelectorAll("a[data-action]");

    if (offlineSwitch) {
      offlineSwitch.addEventListener("change", (e: Event) => {
        let mode: RollMode = RollMode.Virtual;

        if (offlineSwitch.checked) {
          mode = RollMode.Offline;
        }

        this.websiteSheet.setRollMode(mode);
      });
    }

    actions.forEach((action: HTMLAnchorElement) => {
      this.initAction(action);
    });

    this.button.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        this.open();
      } else {
        this.close();
      }
    });

    const select: HTMLSelectElement = this.container.querySelector(
      ".sheet-locale-picker"
    );

    if (select) {
      select.addEventListener("change", (e: Event) => {
        const locale: string = select.value;
        this.close();

        this.setLocale(locale);
      });
    }
  }

  public setCurrentLocale(locale: string) {
    const picker: HTMLSelectElement = this.container.querySelector(
      ".sheet-locale-picker"
    );

    if (picker) {
      picker.value = locale;
    }
  }

  protected async setLocale(locale: string) {
    const translator: Translator = this.websiteSheet.translator;

    if (translator.hasTranslation(locale)) {
      return this.websiteSheet.setTranslation(
        locale,
        translator.getTranslation(locale)
      );
    }

    const defaultLocale: string = this.websiteSheet.getConfiguration(
      "systemDefaultLocale"
    );

    if (locale === defaultLocale) {
      this.websiteSheet.setTranslation(defaultLocale, {});
      return;
    }

    const response = await fetch(`/system/translation/${this.sid}/${locale}`);
    const translation = await response.json();

    if (translation && translation.translations) {
      this.websiteSheet.setTranslation(locale, translation.translations);
    }
  }

  protected cleanup() {
    const submenu = this.container.querySelector(".submenu");

    if (submenu) {
      submenu.remove();
    }

    this.showMainMenu();
  }

  protected close() {
    this.container.classList.remove("open");
    this.button.classList.remove("open");
    this.isOpen = false;
  }

  protected open() {
    this.cleanup();
    this.container.classList.add("open");
    this.button.classList.add("open");
    this.isOpen = true;
  }

  protected initAction(link: HTMLAnchorElement) {
    const action: MobileMenuAction = link.dataset.action as MobileMenuAction;

    link.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      switch (action) {
        case MobileMenuAction.Connect:
          return this.openConnectPicker();
        case MobileMenuAction.Disconnect:
          return this.disconnect();
        case MobileMenuAction.SheetSkin:
          return this.openSheetSkinPicker();
        case MobileMenuAction.DiceSkin:
          return this.openDicePicker();
        case MobileMenuAction.Share:
          return this.openShare();
        case MobileMenuAction.Rename:
          return this.openRename();
        case MobileMenuAction.DiceLog:
          return this.openDiceLog();
        case MobileMenuAction.ChangeAvatar:
          return this.openChangeAvatar();
        case MobileMenuAction.DiceRoll:
          return this.openDiceRoll();
      }
    });
  }

  protected getMainMenu(): HTMLUListElement {
    return this.container.querySelector(".main-menu");
  }

  protected hideMainMenu() {
    this.getMainMenu().classList.add("d-none");
  }

  protected showMainMenu() {
    this.getMainMenu().classList.remove("d-none");
  }

  public async openDiceLog() {
    this.hideMainMenu();

    const container: HTMLElement = document.createElement("div");
    container.classList.add("submenu", "log-container");

    const response: DiceLogResponse = await this.loadDiceLog(0);
    this.getMainMenu().insertAdjacentElement("afterend", container);

    this.renderDiceLog(response, container);
  }

  protected async loadDiceLog(ts = 0): Promise<DiceLogResponse> {
    const tsStr = ts.toString(10);
    let url = `/roll/history/${this.cid}/${tsStr}`;

    if (this.connectedTable) {
      url += "/table/" + this.connectedTable;
    }

    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
    };

    const rawResponse: Response = await fetch(url, {
      headers: headers,
    });
    const response: DiceLogResponse = await rawResponse.json();

    return response;
  }

  protected renderDiceLog(response: DiceLogResponse, container: HTMLElement) {
    for (const request of response.rolls) {
      this.log(request, container);
    }

    if (response.nextPage) {
      const nextContainer: HTMLElement = document.createElement("div");
      nextContainer.classList.add("next-page-container");

      const nextLink: HTMLAnchorElement = document.createElement("a");
      nextLink.href = "#";
      nextLink.classList.add("load-next-page", "btn", "btn-secondary");
      nextLink.innerText = "More...";

      nextLink.addEventListener("click", async (e: MouseEvent) => {
        e.preventDefault();

        nextContainer.remove();
        const nextResponse: DiceLogResponse = await this.loadDiceLog(
          response.nextTs
        );
        this.renderDiceLog(nextResponse, container);
      });

      nextContainer.append(nextLink);
      container.append(nextContainer);
    }
  }

  public log(request: any, container: HTMLElement) {
    const rollId: string =
      "dice-roll-" + this.websiteSheet.generateRandomString(16);
    const containerId: string =
      "dice-log-" + this.websiteSheet.generateRandomString(16);

    const vars = {
      ...{
        name: request.name,
        id: rollId,
        container_id: containerId,
      },
      ...request,
    };

    const rolledAt = parseInt(request.rolled_at, 10);
    const rolledDate = new Date(rolledAt);
    const dateLocale = window["locale"] ?? "en-GB";

    vars.date_rolled_at = rolledDate.toLocaleString(dateLocale);

    if (vars.name && !vars.title) {
      vars.title = vars.name;
    }

    if (request.icon) {
      vars.iconPath =
        window["configuration"].cdnReadUrl + "/" + request.icon.path;
    }

    if (!vars.dice_result) {
      const diceResult: DiceResult = new DiceResult(
        request.result,
        request.formula,
        request.name,
        request.visibility
      );

      vars.dice_result = diceResult;
    }

    const codeExecutor: CodeExecutor = SharedAdapter.codeExecutor;
    const criticals = codeExecutor.getCriticalHits(vars.dice_result);

    vars.custom = codeExecutor.hasCustomRoll();

    const getCriticalType = (
      dimension: number,
      value: number
    ): string | null => {
      return DiceUtil.getCriticalType(criticals, dimension, value);
    };

    vars.getCriticalType = getCriticalType;

    const html = this.websiteSheet.render("dice/log.html.njk", vars);

    container.insertAdjacentHTML("beforeend", html);
    const current: HTMLElement = container.querySelector(`#${containerId}`);
    const visibility: HTMLElement = current.querySelector(".visibility");

    if (vars.custom) {
      const customRender: HTMLElement = current.querySelector(".custom-roll");
      codeExecutor.roll(vars.dice_result, customRender);
    }

    if (visibility) {
      $(visibility).tooltip({
        trigger: "hover",
      });
    }

    this.websiteSheet.renderActions(current, request);
  }

  public async openRename() {
    this.hideMainMenu();

    const html = this.websiteSheet.render("mobile/menu-rename.html.njk", {
      name: this.websiteSheet.sheet.name,
    });

    let isSaving = false;

    this.getMainMenu().insertAdjacentHTML("afterend", html);

    const input: HTMLInputElement =
      this.container.querySelector('input[name="name"]');
    const form: HTMLFormElement = this.container.querySelector("form");

    const save = () => {
      if (isSaving) {
        return;
      }

      isSaving = true;

      const newName: string = input.value.trim();
      input.blur();
      this.close();

      if (!newName || newName.length > 64) {
        return false;
      }

      this.websiteSheet.rename(newName);
      this.container.querySelector("h1").innerText = newName;

      const data: URLSearchParams = new URLSearchParams();
      data.set("name", newName);

      fetch(`/api/character/rename/${this.cid}`, {
        headers: {
          Accept: "application/json",
          AuthKey: this.websiteSheet.getAuthKey(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        method: "POST",
        body: data.toString(),
      });
    };

    input.addEventListener("change", (e: Event) => {
      e.preventDefault();
      save();
    });

    form.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      save();
    });

    if (input) {
      input.select();
      input.focus();
    }
  }

  protected async openShare() {
    this.close();

    const url = `/api/character/share/${this.cid}`;
    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
    };
    const response: Response = await fetch(url, {
      headers: headers,
    });

    const shareData: any = await response.json();

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          action: "share",
          data: shareData,
        })
      );
    }
  }

  protected async openChangeAvatar() {
    this.close();

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          action: "avatar",
        })
      );
    }
  }

  protected async openDiceRoll() {
    this.close();

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          action: "dice-roll",
          diceId: this.websiteSheet.currentDice.id,
          dicePath: this.websiteSheet.currentDice.path,
          cid: this.cid,
          tableId: this.connectedTable,
        })
      );
    }
  }

  protected async openDicePicker() {
    this.hideMainMenu();

    let url = `/api/dice/skins`;

    if (this.connectedTable) {
      url += `?tid=${this.connectedTable}`;
    }

    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
    };

    const response: Response = await fetch(url, {
      headers: headers,
    });

    const dice: DiceSkin[] = await response.json();

    const html = this.websiteSheet.render("mobile/menu-dice-skin.html.njk", {
      dice: dice,
    });

    this.getMainMenu().insertAdjacentHTML("afterend", html);

    const list: HTMLUListElement = this.container.querySelector(".dice-skins");

    list
      .querySelectorAll("a[data-path]")
      .forEach((diceLink: HTMLAnchorElement) => {
        diceLink.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          const owned: boolean = diceLink.dataset.owned == "1";
          const id: number = parseInt(diceLink.dataset.id, 10);
          const path: string = diceLink.dataset.path;
          const name = diceLink.textContent.trim();

          if (owned) {
            this.applyDiceSkin(id, path, "Owned dice");
          } else {
            if (window.ReactNativeWebView) {
              const revenuecat_product_id: string = diceLink.dataset.catid;

              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  action: "buy-dice",
                  revenuecat_product_id: revenuecat_product_id,
                  id: id,
                  path: path,
                  name: name,
                })
              );
            }
          }

          this.close();
        });
      });
  }

  protected initSSE(tid: string, name: string) {
    const authKey: string = this.websiteSheet.getAuthKey();
    const url = `/api/character/sse/${this.cid}/${tid}?AuthKey=${authKey}`;

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(url);
    this.connectedTable = tid;
    this.connectedTableName = name;

    this.eventSource.addEventListener("message", (event) => {
      const roll = JSON.parse(event.data);
      console.log(roll);

      roll.dice = roll.result;

      const { diceResult, dices, values } = DiceUtil.fromRequest(roll);

      const diceSkin: DiceSkin = {
        id: WebsiteSheet.DefaultDiceId,
        path: WebsiteSheet.DefaultDicePath,
        name: "Default",
        thumb_path: null,
      };

      if (roll.diceSkinId && roll.diceSkinPath) {
        diceSkin.id = roll.diceSkinId;
        diceSkin.path = roll.diceSkinPath;
        diceSkin.name = "Custom dice";
      }

      this.websiteSheet.loadDice(diceSkin, () => {
        this.websiteSheet.throw(
          dices,
          values,
          () => {
            return;
          },
          diceSkin.id
        );
      });

      setTimeout(() => {
        this.websiteSheet.displayResult(roll);
      }, 1200);
    });

    this.eventSource.addEventListener("open", () => {
      console.log("SSE connected");

      this.onConnect();
    });

    this.eventSource.addEventListener("error", (e) => {
      console.error(e);
      this.onDisconnect();
    });
  }

  protected disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.connectedTable = undefined;
    this.connectedTableName = undefined;

    this.onDisconnect();
  }

  protected onConnect() {
    document.getElementById("connect-action").classList.add("d-none");
    const disconnectContainer: HTMLElement =
      document.getElementById("disconnect-action");
    disconnectContainer.classList.remove("d-none");
    const name: HTMLSpanElement =
      disconnectContainer.querySelector("#table-name");
    name.innerText = this.connectedTableName;
  }

  protected onDisconnect() {
    document.getElementById("connect-action").classList.remove("d-none");
    document.getElementById("disconnect-action").classList.add("d-none");
  }

  protected applyDiceSkin(id: number, path: string, name: string) {
    this.websiteSheet.loadDice(
      {
        id: id,
        path: path,
        name: name,
      },
      () => {
        this.websiteSheet.diceId = id;
      }
    );

    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
      Accept: "application/json",
    };

    fetch(`/api/character/set_skin_dice/${this.cid}/${id}`, {
      headers: headers,
      method: "POST",
    }).then(() => {
      console.debug("Character dice skin saved");
    });
  }

  protected async openConnectPicker() {
    this.close();

    const url = `/api/character/tables/${this.cid}`;
    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
    };

    const response: Response = await fetch(url, {
      headers: headers,
    });

    const tables: any[] = await response.json();

    const html: string = this.websiteSheet.render(
      "mobile/tables-picker.html.njk",
      {
        tables: tables,
      }
    );

    const picker: HTMLElement = document.getElementById("mobile-table-picker");

    const closePicker = () => {
      picker.innerHTML = "";
      picker.classList.add("d-none");
    };

    picker.innerHTML = html;
    picker.classList.remove("d-none");

    picker.querySelector(".btn-copy").addEventListener("click", async (e) => {
      e.preventDefault();

      const url: string = prompt("URL");
      const joined = await this.joinTable(url);

      if (joined) {
        alert("You have successfully joined this table.");
        return this.openConnectPicker();
      }
    });

    picker.querySelector(".btn-qrcode").addEventListener("click", (e) => {
      e.preventDefault();

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            action: "scan",
          })
        );
      }
    });

    picker.querySelector(".btn-cancel").addEventListener("click", (e) => {
      e.preventDefault();
      closePicker();
    });

    picker
      .querySelectorAll(".table-entry")
      .forEach((tableEntry: HTMLElement) => {
        tableEntry.addEventListener("click", () => {
          const id: string = tableEntry.dataset.id;
          let name: string;

          for (const table of tables) {
            if (table.id == id) {
              name = table.name;
              break;
            }
          }

          this.initSSE(id, name);

          const button = tableEntry.querySelector("a");
          button.classList.remove("btn-primary");
          button.classList.add("btn-success");
          button.innerText = button.dataset.connected;

          setTimeout(() => {
            closePicker();
          }, 800);
        });
      });
  }

  protected async joinTableByScan(url: string) {
    const joined = await this.joinTable(url);

    if (joined) {
      alert("You have successfully joined this table.");
      return this.openConnectPicker();
    }
  }

  protected async joinTable(url: string): Promise<boolean> {
    let id: string;
    let secret: string;

    try {
      const result = this.parseUrl(url);
      id = result.id;
      secret = result.secret;
    } catch (e) {
      alert("Invalid URL");

      return false;
    }

    const joinUrl = `/join/proceed/${id}/${secret}/mobile`;
    const importUrl = `/table/import/${id}/${this.cid}?mobile=true`;
    const params = {
      headers: {
        AuthKey: this.websiteSheet.getAuthKey(),
      },
    };

    try {
      const response = await fetch(joinUrl, params);
      const joinTable = await response.text();
      const importResponse = await fetch(importUrl, params);
      const result = await importResponse.text();

      return true;
    } catch (e) {
      alert("An error occurred");
    }

    return false;
  }

  protected parseUrl(url: string) {
    const regex = /join\/([^/]+)\/([^/]+)/gm;
    const matches = [...url.matchAll(regex)];
    const tableId: string = matches[0][1];
    const secret: string = matches[0][2];

    if (!tableId || !secret) {
      throw "Invalid URL";
    }

    return {
      id: tableId,
      secret: secret,
    };
  }

  protected async openSheetSkinPicker() {
    this.hideMainMenu();

    let url = `/api/character/skin_sheet/${this.cid}`;

    if (this.connectedTable) {
      url += `?tid=${this.connectedTable}`;
    }

    const headers = {
      AuthKey: this.websiteSheet.getAuthKey(),
    };

    const response: Response = await fetch(url, {
      headers: headers,
    });
    const sheets: SheetSkin[] = await response.json();
    const html = this.websiteSheet.render("mobile/menu-sheet-skin.html.njk", {
      sheets: sheets,
    });

    this.getMainMenu().insertAdjacentHTML("afterend", html);

    const list: HTMLUListElement = this.container.querySelector(".sheet-skins");

    list
      .querySelectorAll("a[data-path]")
      .forEach((sheetLink: HTMLAnchorElement) => {
        sheetLink.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          const id: number = parseInt(sheetLink.dataset.id, 10);
          const path: string = sheetLink.dataset.path;

          this.websiteSheet.loadSkin(path);

          const saveUrl = `/api/character/set_skin_sheet/${this.cid}/${id}`;

          fetch(saveUrl, {
            headers: {
              ...{
                Accept: "application/json",
              },
              ...headers,
            },
            method: "POST",
          });

          this.close();
        });
      });
  }
}

enum MobileMenuAction {
  Connect = "connect",
  Disconnect = "disconnect",
  SheetSkin = "sheet-skin",
  DiceSkin = "dice-skin",
  Rename = "rename",
  Share = "share",
  Delete = "delete",
  Locale = "locale",
  DiceLog = "dice-log",
  ChangeAvatar = "avatar",
  DiceRoll = "dice-roll",
}

interface Skin {
  id: number;
  name: string;
  thumb_path: string;
  path: string;
}

interface DiceLogResponse {
  nextPage: boolean;
  nextTs: number | null;
  rolls: DiceLogRoll[];
}

interface DiceLogRoll {
  user_id: number;
  character_id: number;
  rolled_at: number;
  formula: string;
  icon: string | null;
  name: string | null;
  result: any;
  visibility: string;
}

type SheetSkin = Skin;
type DiceSkin = Skin;
