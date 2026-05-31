import { View } from "./View";
import { injectable } from "inversify";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { CharacterSheet, SheetItem } from "../../shared/System/CharacterSheet";
import { Tree } from "../../shared/System/Tree";
import { Component } from "../../shared/System/Component/Component";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { EventDispatcher } from "../Event/EventDispatcher";
import {
  CustomActionType,
  QuickBarCustomItem,
  QuickBarIcon,
  QuickBarItem,
  QuickBarItemList,
  QuickBarJournalItem,
  QuickBarSheetItem,
  QuickBarSoundItem,
} from "../../shared/QuickBarData";
import { Template } from "./Template";
import { CharacterView } from "./CharacterView";
import { SoundPlayer } from "./Sound/SoundPlayer";
import { PersistedState } from "../State/PersistedState";
import { States } from "../DependencyInjection/State";
import { CharacterState } from "../State/CharacterState";
import { IconPack } from "../../shared/IconPackData";
import { CraftRepository } from "../Repository/CraftRepository";
import { CraftView } from "./CraftView";
import { CraftSheet } from "../../shared/System/CraftSheet";
import { journalIcons, JournalView } from "./JournalView";
import { DiceRollerConfigType, DiceRollerView } from "./DiceRollerView";
import { DiceRollerVisibility } from "../../shared/DiceRoller";
import { JournalIcon } from "../../shared/Journal";
import { RollEvent } from "../Event/Events";
import { DiceIcon } from "../../shared/DiceData";

@injectable()
export class QuickBarView extends View {
  protected container: HTMLElement;
  protected itemsContainter: HTMLElement;
  protected visible = true;
  protected items: QuickBarItemList = {};
  protected open = true;
  protected toggleIcon: HTMLElement;

  protected taskBarItem: TaskBarItem;

  protected soundRegistry: Map<number, HTMLAudioElement> = new Map<
    number,
    HTMLAudioElement
  >();

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Quick Bar"),
      "fas fa-bolt",
      TaskBarCategory.Main
    );
    this.getTaskBarView().add(this.taskBarItem);
    this.taskBarItem.activate();

    this.container = document.getElementById("quickbar");
    this.itemsContainter = this.container.querySelector(".items");
    const app = document.getElementById("app");
    app.classList.add("quickbar-open");

    this.taskBarItem.onClick(() => {
      if (this.visible) {
        this.closeQuickBar();
        this.taskBarItem.desactivate();
      } else {
        this.openQuickBar();
        this.taskBarItem.activate();
      }
    });

    for (let n = 0; n < 10; n++) {
      this.addEmpty(n);
    }

    this.initToggle();
  }

  public closeQuickBar() {
    this.container.classList.add("closed");
    this.toggleIcon.classList.remove("fa-caret-down");
    this.toggleIcon.classList.add("fa-caret-up");
    this.open = false;
    this.visible = false;
    this.getPersistedState().set("quickbar-open", this.open);

    const app = document.getElementById("app");
    app.classList.remove("quickbar-open");

    this.taskBarItem.desactivate();
  }

  public openQuickBar() {
    this.container.classList.remove("closed");
    this.toggleIcon.classList.remove("fa-caret-up");
    this.toggleIcon.classList.add("fa-caret-down");
    this.open = true;
    this.visible = true;
    this.getPersistedState().set("quickbar-open", this.open);

    const app = document.getElementById("app");
    app.classList.add("quickbar-open");

    this.taskBarItem.activate();
  }

  protected initToggle() {
    const toggle: HTMLElement = this.container.querySelector(".toggle");

    toggle.innerHTML = '<i class="fas fa-caret-down"></i>';
    this.toggleIcon = toggle.querySelector(".fas");

    toggle.addEventListener("click", (e) => {
      if (this.open) {
        this.closeQuickBar();
      } else {
        this.openQuickBar();
      }
    });

    const state = this.getPersistedState().get("quickbar-open");

    if (state === null || state === true) {
      this.openQuickBar();
    } else {
      this.closeQuickBar();
    }
  }

  protected initCustomPopin(popin: Popin, id: string, index: number) {
    popin.on("init", () => {
      const elt: HTMLElement = popin.getElement();
      const submitBtn: HTMLButtonElement = elt.querySelector(".submit-btn");
      const titleElt: HTMLInputElement = elt.querySelector(
        '[name="title"]'
      ) as HTMLInputElement;
      const typeElt: HTMLSelectElement = elt.querySelector(
        '[name="type"]'
      ) as HTMLSelectElement;
      const formulaElt: HTMLInputElement = elt.querySelector(
        '[name="formula"]'
      ) as HTMLInputElement;
      const diceRollerBtn: HTMLAnchorElement =
        elt.querySelector(".btn-dice-roller");

      diceRollerBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getDiceRollerView().open({
          type: DiceRollerConfigType.QuickBar,
          callback(formula: string, visibility: DiceRollerVisibility) {
            formulaElt.value = formula;
            typeElt.value = visibility;
          },
        });
      });

      submitBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const type: CustomActionType = typeElt.value as CustomActionType;
        let title: string = titleElt.value;
        let formula: string = formulaElt.value;
        let hasError = false;

        formula = formula.trim();
        title = title.trim();

        formulaElt.classList.remove("is-invalid");

        if (formula == "") {
          formulaElt.classList.add("is-invalid");
          hasError = true;
        }

        if (
          type !== CustomActionType.Normal &&
          type !== CustomActionType.Gm &&
          type !== CustomActionType.GmOnly
        ) {
          typeElt.classList.add("is-invalid");
          hasError = true;
        }

        if (title == "") {
          title = null;
        }

        if (hasError) {
          return;
        }

        let icon = null;

        if (this.items[id]) {
          if (this.items[id].icon) {
            icon = this.items[id].icon;
          }
        }

        this.items[id] = {
          id: id,
          title: title,
          type: type,
          formula: formula,
          position: index,
        };

        if (icon) {
          this.items[id].icon = icon;
        }

        this.addCustom(id);
        this.save();

        popin.close();
      });
    });
  }

  protected refresh(id: string) {
    const item = this.items[id];

    if (!item) {
      return;
    }

    if (item["journalKey"]) {
      this.addJournal(id);
    } else if (item["path"] == undefined && item["formula"] == undefined) {
      this.addSound(id);
    } else if (item["path"]) {
      this.addLink(id);
    } else {
      this.addCustom(id);
    }
  }

  public load(quickbar: QuickBarItemList) {
    setTimeout(() => {
      // legacy, removing old quickbar items
      const allowed = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

      for (const id in quickbar) {
        if (allowed.indexOf(id) === -1) {
          delete quickbar[id];
        }
      }

      this.items = quickbar;

      let i = 0;

      for (const id in this.items) {
        if (this.items[id]["journalKey"]) {
          this.addJournal(id);
        } else if (
          this.items[id]["path"] == undefined &&
          this.items[id]["formula"] == undefined
        ) {
          this.addSound(id);
        } else if (this.items[id]["path"]) {
          const item: QuickBarSheetItem = this.items[id] as QuickBarSheetItem;

          if (item.characterId) {
            this.getCharacterRepository()
              .get(item.characterId)
              .then((sheet: CharacterSheet) => {
                return this.addLink(id);
              });
          } else if (item.craftId) {
            this.getCraftRepository()
              .find(item.craftId)
              .then((craft: any) => {
                this.getCraftRepository().attachSheet(craft);
                return this.addLink(id);
              });
          }
        } else {
          this.addCustom(id);
        }

        i++;
      }
    }, 1000);
  }

  public save() {
    this.getClient().send("quickbar", "save", {
      items: this.items,
    });
  }

  protected createElement(index: number): HTMLElement {
    const empty = document.createElement("section");
    empty.classList.add("quickbar-item");
    empty.style.order = index.toString(10);
    empty.dataset.index = index.toString(10);

    return empty;
  }

  public addEmpty(index: number) {
    const empty = this.rebuildElementAt(index);
    const inside: HTMLAnchorElement = document.createElement("a");
    inside.href = "#";

    this.initDragDrop(index, inside);

    $(inside).popover({
      container: "body",
      content: Template.render("quickbar/tooltip/empty.html.njk"),
      html: true,
      placement: "top",
      title: this.__("Quick Bar Slot #%{index}", {
        index: (index + 1).toString(10),
      }),
      trigger: "hover",
      offset: "0, 20px",
    });

    inside.addEventListener("click", (e) => {
      e.preventDefault();

      const popin: Popin = this.getPopinManager().create({
        id: "quickbar-create",
        title: this.__("Add a custom action"),
        html: Template.render("quickbar/custom.html.njk"),
        width: 350,
        height: 380,
        canDock: false,
        canMinimize: false,
      });

      const id: string = this.generateId(index);

      this.initCustomPopin(popin, id, index);

      popin.open();
    });

    empty.appendChild(inside);
    this.itemsContainter.appendChild(empty);
  }

  protected initDragDrop(index: number, link: HTMLAnchorElement) {
    link.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    link.addEventListener("dragenter", (e) => {
      link.classList.add("drag-enter");
    });

    link.addEventListener("dragleave", (e) => {
      link.classList.remove("drag-enter");
    });

    link.addEventListener("drop", (e) => {
      e.preventDefault();

      link.classList.remove("drag-enter");

      const type: string = e.dataTransfer.getData("type");

      if (type == "formula") {
        const formula: string = e.dataTransfer.getData("formula");
        let visibility: CustomActionType = e.dataTransfer.getData(
          "visibility"
        ) as CustomActionType;

        if (!visibility) {
          visibility = CustomActionType.Normal;
        }

        const itemId: string = this.generateId(index);

        const item: QuickBarCustomItem = {
          id: itemId,
          position: index,
          title: this.__("Untitled"),
          formula: formula,
          type: visibility,
        };

        this.items[itemId] = item;

        this.refresh(itemId);
        this.save();
      }

      if (type == "journal" || type == "page") {
        const keyId: string = e.dataTransfer.getData("keyid");
        const title: string = e.dataTransfer.getData("title");
        const icon: JournalIcon = e.dataTransfer.getData("icon") as JournalIcon;

        if (!keyId) {
          return;
        }

        const itemId: string = this.generateId(index);

        const item: QuickBarJournalItem = {
          id: itemId,
          position: index,
          title: title,
          journalKey: keyId,
          journalIcon: icon,
        };

        this.items[itemId] = item;

        this.refresh(itemId);
        this.save();
      }

      if (type == "sheet-element") {
        const path: string = e.dataTransfer.getData("path");
        let characterId: number;
        let craftId: number;

        if (e.dataTransfer.getData("characterId")) {
          characterId = parseInt(e.dataTransfer.getData("characterId"), 10);
        } else {
          craftId = parseInt(e.dataTransfer.getData("craftId"), 10);
        }

        if (craftId) {
          this.getCraftRepository()
            .find(craftId)
            .then((craft: any) => {
              this.getCraftRepository().attachSheet(craft);

              const id: string = this.generateId(index);

              const item: QuickBarSheetItem = {
                id: id,
                path: path,
                craftId: craft.id,
                position: index,
              };

              this.items[id] = item;

              this.refresh(id);
              this.save();
            });
        } else {
          this.getCharacterRepository()
            .get(characterId)
            .then((sheet: CharacterSheet) => {
              const id: string = this.generateId(index);

              const item: QuickBarSheetItem = {
                id: id,
                path: path,
                characterId: sheet.character.id,
                position: index,
              };

              this.items[id] = item;

              this.refresh(id);
              this.save();
            });
        }
      }

      if (type == "sound") {
        const sfxId: number = parseInt(e.dataTransfer.getData("id"), 10);
        const subtype: string = e.dataTransfer.getData("subtype");

        if (subtype === "recording") {
          return;
        }

        const itemId: string = this.generateId(index);

        this.getClient().get(
          "sound",
          "loadSound",
          {
            sid: sfxId,
          },
          (response) => {
            const sfx = response.sfx;
            let item: any;

            if (this.items[itemId]) {
              item = this.items[itemId];
            } else {
              item = {
                id: itemId,
                position: index,
              };
            }

            item.sound = {
              title: sfx.title,
              id: sfx.id,
              path: sfx.path,
            };

            this.items[itemId] = item;

            this.refresh(itemId);
            this.save();
          }
        );
      }
    });
  }

  protected rebuildElementAt(index: number): HTMLElement {
    const created: HTMLElement = this.createElement(index);
    const old: HTMLElement = this.getElementAt(index);

    if (!old) {
      this.itemsContainter.appendChild(created);
    } else {
      this.itemsContainter.replaceChild(created, old);
    }

    return created;
  }

  protected getElementAt(index: number): HTMLElement {
    return this.itemsContainter.querySelector(
      'section[data-index="' + index.toString(10) + '"]'
    );
  }

  public addCustom(id: string) {
    const item: QuickBarCustomItem = this.items[id] as QuickBarCustomItem;
    const index: number = item.position;
    let title: string = item.title;
    let formula: string = item.formula;
    const type: CustomActionType = item.type;
    const icon: QuickBarIcon = item.icon;

    this.rebuildElementAt(index);

    if (!title) {
      title = this.__("Untitled");
    }

    if (!formula) {
      formula = "";
    }

    const element: HTMLElement = this.getElementAt(index);

    const inside: HTMLAnchorElement = document.createElement("a");
    inside.classList.add("item-default");
    inside.href = "#";

    if (item.sound) {
      this.addSoundIcon(inside);
    }

    this.initDragDrop(index, inside);

    if (icon) {
      const iconImg: HTMLImageElement = document.createElement("img");
      const path: string = this.getPathForIcon(icon);
      iconImg.src = window["configuration"].cdnReadUrl + "/" + path;

      inside.appendChild(iconImg);
    }

    element.appendChild(inside);

    $(inside).popover({
      container: "body",
      content: Template.render("quickbar/tooltip/custom.html.njk", {
        title: title,
        formula: formula,
      }),
      html: true,
      placement: "top",
      title: title,
      trigger: "hover",
      offset: "0, 20px",
    });

    inside.addEventListener("click", (e) => {
      e.preventDefault();

      let character: any;

      if (this.getCharacterState().isEnabled()) {
        character = this.getCharacterState().sheet.character;
      }

      const rollIcon: DiceIcon = icon && icon.path ? (icon as DiceIcon) : null;

      const event: RollEvent = {
        expression: formula,
        title: title,
        visibility: type,
        cid: character ? character.id : null,
        icon: rollIcon,
      };

      EventDispatcher.emit("roll", event);

      if (item.sound) {
        this.runSound(index, item.sound.path);
      }
    });

    this.initContextualMenu(inside, item);
  }

  protected addJournalIcon(inside: HTMLElement) {
    const icon: HTMLElement = document.createElement("span");
    icon.classList.add("journal-icon");

    inside.append(icon);
  }

  protected addSoundIcon(inside: HTMLElement) {
    const icon: HTMLElement = document.createElement("span");
    icon.classList.add("sound-icon");

    inside.append(icon);
  }

  protected initContextualMenu(inside: HTMLAnchorElement, item: QuickBarItem) {
    inside.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      const contextualContainer: HTMLElement =
        document.getElementById("contextual");

      const id: string = item.id;
      let html;

      if (item["journalKey"]) {
        html = Template.render("quickbar/contextual/journal.html.njk", {
          item: item,
        });
      } else if (item["path"] == undefined && item["formula"] == undefined) {
        html = Template.render("quickbar/contextual/sound.html.njk", {
          item: item,
        });
      } else if (item["path"]) {
        html = Template.render("quickbar/contextual/link.html.njk", {
          item: item,
        });
      } else {
        html = Template.render("quickbar/contextual/custom.html.njk", {
          item: item,
        });
      }

      contextualContainer.innerHTML = html;

      const menu: HTMLElement =
        contextualContainer.querySelector(".dropdown-menu");
      menu.style.pointerEvents = "auto";
      menu.style.position = "absolute";
      menu.style.left = e.clientX.toString(10) + "px";
      menu.style.top = (e.clientY - menu.clientHeight).toString(10) + "px";

      const updateBtn = menu.querySelector(".update-btn");
      const soundBtn = menu.querySelector(".sound-btn");

      if (updateBtn) {
        updateBtn.addEventListener("click", (e) => {
          e.preventDefault();

          const myItem = item as QuickBarCustomItem;

          const popin: Popin = this.getPopinManager().create({
            id: "edit-quickbar-" + id,
            title: this.__("Edit Quick Bar action"),
            html: Template.render("quickbar/custom.html.njk", {
              id: id,
              title: myItem.title,
              type: myItem.type,
              formula: myItem.formula,
            }),
            width: 400,
            height: 350,
            canDock: false,
            canMinimize: false,
          });

          this.initCustomPopin(popin, id, myItem.position);

          popin.open();

          menu.remove();
        });
      }

      if (soundBtn) {
        soundBtn.addEventListener("click", (e) => {
          e.preventDefault();

          delete item.sound;

          this.refresh(id);
          this.save();

          menu.remove();
        });
      }

      menu.querySelector(".icon-btn").addEventListener("click", (e) => {
        e.preventDefault();

        const iconPopin: Popin = this.getPopinManager().create({
          id: "icon-quickbar-" + id,
          title: this.__("Choose Icon"),
          html: Template.render("quickbar/icon.html.njk", {}),
          width: 565,
          height: 500,
          canDock: false,
          canMinimize: false,
        });

        iconPopin.on("init", () => {
          const selector: HTMLSelectElement = iconPopin
            .getElement()
            .querySelector("#pack-selector");
          const iconsContainer: HTMLElement = iconPopin
            .getElement()
            .querySelector("#icons");

          this.getClient().get("quickbar", "iconPacks", {}, (response: any) => {
            const packs: IconPack[] = response.packs;

            for (const pack of packs) {
              const option: HTMLOptionElement =
                document.createElement("option");
              option.value = pack.id.toString(10);

              let title: string = pack.name;

              if (pack.shared_by) {
                title += this.__(" -- shared by %{username}", {
                  username: pack.shared_by,
                });
              }

              option.innerText = title;

              selector.append(option);
            }

            selector.dispatchEvent(new Event("change"));
          });

          selector.addEventListener("change", (e: Event) => {
            iconsContainer.innerText = this.__("Loading...");

            this.getClient().get(
              "quickbar",
              "loadIconPack",
              {
                id: selector.value,
              },
              (response: any) => {
                const pack: IconPack = response.pack;

                iconsContainer.innerHTML = Template.render(
                  "quickbar/icon-list.html.njk",
                  {
                    pack: pack,
                  }
                );

                iconsContainer
                  .querySelectorAll(".icon")
                  .forEach((icon: HTMLAnchorElement) => {
                    icon.addEventListener("click", (e) => {
                      e.preventDefault();

                      const pack: string = icon.dataset.pack;
                      const path: string = icon.dataset.path;

                      this.items[id].icon = {
                        pack: pack,
                        path: path,
                      };

                      this.refresh(id);
                      this.save();
                      iconPopin.close();
                    });
                  });
              }
            );
          });
        });

        iconPopin.open();

        menu.remove();
      });

      menu.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.preventDefault();
        this.delete(id, item.position);

        menu.remove();
      });
    });
  }

  protected delete(id: string, index: number) {
    delete this.items[id];
    this.addEmpty(index);

    this.save();
  }

  public async addLink(id: string) {
    const item: QuickBarSheetItem = this.items[id] as QuickBarSheetItem;
    const isCraft = !!item.craftId;

    let character: any;
    let sheet: CharacterSheet | CraftSheet;

    if (isCraft) {
      character = await this.getCraftRepository().findCached(item.craftId);
      sheet = character.sheet;
    } else {
      sheet = await this.getCharacterRepository().get(item.characterId);
      character = sheet.character;
    }

    const path: string = item.path;
    const index: number = item.position;
    const icon: QuickBarIcon = item.icon;

    const displayElement = () => {
      const topElement: SheetItem = sheet.getSheetItem(path);
      const widget: Component = topElement.component;
      const title: string = widget["quickBarLabel"]
        ? widget["quickBarLabel"]
        : topElement.element.innerText;

      this.rebuildElementAt(index);

      const element: HTMLElement = this.getElementAt(index);

      const inside: HTMLAnchorElement = document.createElement("a");
      inside.classList.add("item-default");
      inside.href = "#";

      if (item.sound) {
        this.addSoundIcon(inside);
      }

      this.initDragDrop(index, inside);

      if (icon) {
        const iconImg: HTMLImageElement = document.createElement("img");
        const path: string = this.getPathForIcon(icon);
        iconImg.src = window["configuration"].cdnReadUrl + "/" + path;

        inside.appendChild(iconImg);
      }

      element.appendChild(inside);

      $(inside).popover({
        container: "body",
        content: Template.render("quickbar/tooltip/custom.html.njk", {
          title: title,
        }),
        html: true,
        placement: "top",
        title: title,
        trigger: "hover",
        offset: "0, 20px",
      });

      inside.addEventListener("click", (e) => {
        e.preventDefault();

        const event: Event = new CustomEvent("click", {
          bubbles: true,
          composed: true,
          detail: {
            quickbar: true,
            icon: icon,
          },
        });

        if (icon && icon.path) {
          sheet.setTemporaryRollIcon(icon as DiceIcon);
        }

        topElement.element.dispatchEvent(event);

        if (item.sound) {
          this.runSound(index, item.sound.path);
        }
      });

      this.initContextualMenu(inside, item);
    };

    if (isCraft) {
      // load the sheet structure
      this.getCraftView().open(sheet as CraftSheet, null, true, displayElement);
    } else {
      this.getCharacterView().display(
        sheet as CharacterSheet,
        true,
        displayElement
      );
    }
  }

  public addJournal(id: string) {
    const item: QuickBarJournalItem = this.items[id] as QuickBarJournalItem;
    const index: number = item.position;
    const icon: QuickBarIcon = item.icon;

    this.rebuildElementAt(index);

    const element: HTMLElement = this.getElementAt(index);

    const inside: HTMLAnchorElement = document.createElement("a");
    inside.classList.add("item-journal");
    inside.href = "#";

    this.initDragDrop(index, inside);

    if (item.journalIcon) {
      for (const journalIcon of journalIcons) {
        if (journalIcon.type === item.journalIcon) {
          inside.style.backgroundColor = "#262626";
          inside.style.backgroundImage = `url("${journalIcon.svgUrl}")`;
          inside.style.backgroundPosition = `50% 50%`;
          inside.style.backgroundSize = `70% 70%`;
          this.addJournalIcon(inside);
          break;
        }
      }
    }

    if (icon) {
      const iconImg: HTMLImageElement = document.createElement("img");
      const path: string = this.getPathForIcon(icon);
      iconImg.src = window["configuration"].cdnReadUrl + "/" + path;

      inside.appendChild(iconImg);
      this.addJournalIcon(inside);
    }

    element.appendChild(inside);

    $(inside).popover({
      container: "body",
      content: Template.render("quickbar/tooltip/journal.html.njk", {
        title: item.title,
      }),
      html: true,
      placement: "top",
      title: item.title,
      trigger: "hover",
      offset: "0, 20px",
    });

    inside.addEventListener("click", (e) => {
      e.preventDefault();

      return this.getJournalView().openPage({
        id: item.journalKey,
        title: item.title,
        edit: false,
      });
    });

    this.initContextualMenu(inside, item);
  }

  public addSound(id: string) {
    const item: QuickBarSoundItem = this.items[id] as QuickBarSoundItem;
    const index: number = item.position;
    const icon: QuickBarIcon = item.icon;

    if (!item.sound) {
      return;
    }

    this.rebuildElementAt(index);

    const element: HTMLElement = this.getElementAt(index);

    const inside: HTMLAnchorElement = document.createElement("a");
    inside.classList.add("item-sound");
    inside.href = "#";

    this.initDragDrop(index, inside);

    if (icon) {
      const iconImg: HTMLImageElement = document.createElement("img");
      const path: string = this.getPathForIcon(icon);
      iconImg.src = window["configuration"].cdnReadUrl + "/" + path;

      inside.appendChild(iconImg);
      this.addSoundIcon(inside);
    }

    element.appendChild(inside);

    $(inside).popover({
      container: "body",
      content: Template.render("quickbar/tooltip/sound.html.njk", {
        title: item.sound.title,
      }),
      html: true,
      placement: "top",
      title: item.sound.title,
      trigger: "hover",
      offset: "0, 20px",
    });

    inside.addEventListener("click", (e) => {
      e.preventDefault();

      this.runSound(index, item.sound.path);
    });

    this.initContextualMenu(inside, item);
  }

  protected runSound(index: number, path: string) {
    if (this.soundRegistry.has(index)) {
      const audio: HTMLAudioElement = this.soundRegistry.get(index);
      this.getSoundPlayer().dispatchStop(audio.dataset.key);
      this.soundRegistry.delete(index);
      return;
    }

    this.getSoundPlayer()
      .dispatch(path, (audio: HTMLElement) => {
        this.soundRegistry.delete(index);
      })
      .then((element: HTMLAudioElement) => {
        this.soundRegistry.set(index, element);
      });
  }

  protected getPathForIcon(icon: QuickBarIcon): string {
    if (icon.path) {
      return icon.path;
    } else if (icon.id) {
      return "static/skill/" + icon.id + ".jpg"; // old icons compatibility
    }
  }

  protected generateId(index: number): string {
    return index.toString(10);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getCraftRepository(): CraftRepository {
    return container.get<CraftRepository>(Repository.Craft);
  }

  protected getCharacterView(): CharacterView {
    return container.get<CharacterView>(Views.Character);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }

  protected getJournalView(): JournalView {
    return container.get<JournalView>(Views.Encyclopedia);
  }

  protected getTree(): Tree {
    return container.get<Tree>("SystemTree");
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getSoundPlayer(): SoundPlayer {
    return container.get<SoundPlayer>(Services.SoundPlayer);
  }

  protected getPersistedState(): PersistedState {
    return container.get<PersistedState>(States.Persisted);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getDiceRollerView(): DiceRollerView {
    return container.get<DiceRollerView>(Views.DiceRoller);
  }
}
