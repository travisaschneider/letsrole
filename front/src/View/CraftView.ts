import { View } from "./View";
import { injectable } from "inversify";
import { DockableView, ViewOpenMode } from "./DockableView";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { Tree } from "../../shared/System/Tree";
import { View as SystemView } from "../../shared/System/Component/View";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { Template } from "./Template";
import { CraftSheet } from "../../shared/System/CraftSheet";
import { Popin } from "./Popin/Popin";
import { CraftRepository } from "../Repository/CraftRepository";
import { Repository } from "../DependencyInjection/Repository";
import { UserRepository } from "../Repository/UserRepository";
import { CraftItem } from "../../shared/Scene/SceneData";
import { CharacterSkinLoader } from "./Character/CharacterSkinLoader";
import { SharedAdapter } from "../../shared/System/SharedAdapter";
import { Translator } from "shared/System/Translator";

@injectable()
export class CraftView extends View {
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  protected skins: any[] = [];
  protected craftNames: any = {};
  protected params: any = {
    page: 1,
    q: null,
    type: null,
  };

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Content Crafting"),
      "fas fa-drafting-compass",
      TaskBarCategory.Content
    );

    const translator: Translator =
      SharedAdapter.container.get("SystemTranslator");

    const crafts = this.getTree()
      .getCrafts()
      .map((craft) => {
        return {
          ...craft,
          name: translator.translate(craft.name),
        };
      });

    this.view = new DockableView({
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      title: this.__("Content Crafting"),
      id: "craft",
      html: Template.render("craft/container.html.njk", {
        crafts: crafts,
      }),
      icon: "fas fa-drafting-compass",
      defaultConfiguration: {
        index: 5,
        hidden: false,
        minimized: true,
        mode: ViewOpenMode.DockRight,
      },
    });

    this.getTaskBarView().add(this.taskBarItem);
    this.getUi().register(this.view);

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      this.initialize();
    });

    EventDispatcher.on(Events.CRAFT_SKIN, (e) => {
      this.onSkinChange(e.cid, e.skin);
    });

    EventDispatcher.on("open-craft-avatar-popin", (e) => {
      this.openCraftAvatarPopin(e.url, e.cid, e.property);
    });
  }

  public onSkinChange(cid: number, skin: string) {
    const already: Popin = this.getPopinManager().get(
      "craft-" + cid.toString(10)
    );

    if (!already) {
      return;
    }

    const elt: HTMLElement = already.getElement();

    this.removeClassByPrefix(elt, "skin-");

    if (skin != null) {
      this.getSkinLoader().load(skin);
      elt.classList.add("skin-" + skin);
    }
  }

  public loadSkins(skins: any[]) {
    this.skins = skins;
  }

  public openCraftAvatarPopin(url: string, craftid: number, property: string) {
    const params: URLSearchParams = new URLSearchParams();
    params.set("craftid", craftid.toString(10));
    params.set("property", property);
    params.set("app", "1");

    const popin = this.getPopinManager().create({
      id: "craft-avatar-" + craftid.toString(),
      title: this.__("Edit craft avatar"),
      html: Template.render("character/edit-avatar.html.njk", {
        src: url + "?" + params.toString(),
      }),
      minWidth: 1170,
      width: 1170,
      minHeight: 820,
      canDock: false,
    });

    const avatarChangeCallback = (e) => {
      this.onCraftAvatarChange(e);
    };

    window.document.removeEventListener(
      "craft-avatar-change",
      avatarChangeCallback
    );
    window.document.addEventListener(
      "craft-avatar-change",
      avatarChangeCallback,
      false
    );

    popin.open();
  }

  public updateAvatar(cid: number, avatar: any) {
    this.view.container
      .querySelectorAll(
        '.craft-item-simple[data-id="' + cid.toString(10) + '"]'
      )
      .forEach((craft: HTMLElement) => {
        const avatarContainer: HTMLElement =
          craft.querySelector(".avatar-container");

        avatarContainer.innerHTML = Template.render(
          "craft/list/avatar.html.njk",
          {
            craft: {
              avatar: avatar.avatar,
            },
          }
        );
      });
  }

  public onCraftAvatarChange(e: CustomEvent) {
    const popinName: string = "craft-avatar-" + e.detail.craft;
    const popin = this.getPopinManager().get(popinName);

    if (popin) {
      popin.close();
      this.getPopinManager().delete(popinName);
    }

    const craftId: number = parseInt(e.detail.craft, 10);

    this.getClient().send("craft", "updateAvatar", {
      cid: craftId,
      property: e.detail.property,
    });
  }

  protected initialize() {
    EventDispatcher.on(Events.CRAFT_OPEN_SHEET, (e) => {
      const id: number = e.id;
      const token: CraftItem = e.token;

      this.open(id, token);
    });

    const craftTypes: SystemView[] = this.getTree().getCrafts();
    const translator: Translator =
      SharedAdapter.container.get("SystemTranslator");

    craftTypes.forEach((craftType: SystemView) => {
      this.craftNames[craftType.id] = translator.translate(craftType.name);
    });

    const craftType: HTMLSelectElement =
      this.view.container.querySelector(".create-craft-type");

    this.view.container
      .querySelector(".create-btn")
      .addEventListener("click", () => {
        const id: string = craftType.value;
        const view: SystemView = this.getTree().createView(
          id,
          null
        ) as SystemView;

        return this.create(view);
      });

    let searchTimeout = null;

    const searchInput: HTMLInputElement =
      this.view.container.querySelector(".search-input");

    searchInput.addEventListener("keyup", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        let q = searchInput.value;
        q = q.trim();

        if (q == "") {
          q = null;
        }

        this.params.q = q;
        this.lookup();
      }, 300);
    });

    const filter: HTMLSelectElement =
      this.view.container.querySelector(".filter-input");

    filter.addEventListener("change", () => {
      this.params.type = filter.value;

      if (this.params.type == "") {
        this.params.type = null;
      }

      this.lookup();
    });

    this.lookup();
  }

  public lookup() {
    this.getClient().get("craft", "lookup", this.params, (response: any) => {
      const container: HTMLElement =
        this.view.container.querySelector(".crafts-container");
      const res: any = response.result;

      container.innerHTML = Template.render("craft/list/simple.html.njk", {
        crafts: res.crafts,
        total: res.total,
        page: res.page,
        pages: res.pages,
        craftNames: this.craftNames,
        userId: this.getUserState().id,
      });

      container
        .querySelectorAll(".craft-item-simple")
        .forEach((item: HTMLElement) => {
          item.addEventListener("click", (e) => {
            e.preventDefault();
            const id: number = parseInt(item.dataset.id, 10);
            this.open(id);
          });

          item.addEventListener("dragstart", function (e) {
            e.dataTransfer.setData("source", "craft-manager");
            e.dataTransfer.setData("type", "craft");
            e.dataTransfer.setData("id", item.dataset.id);

            const url: string = "letsrole://craft/" + item.dataset.keyid;
            const title: string = item.dataset.title;

            const link: HTMLAnchorElement = document.createElement("a");
            link.href = url;
            link.textContent = title;

            e.dataTransfer.setData("text/html", link.outerHTML);
            e.stopImmediatePropagation();
          });
        });

      container
        .querySelectorAll(".pagination-page")
        .forEach((pageLink: HTMLAnchorElement) => {
          pageLink.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            const page: number = parseInt(pageLink.dataset.page, 10);
            this.params.page = page;
            this.lookup();
          });
        });

      $(container).find(".drop-craft").tooltip({
        trigger: "hover",
      });
    });
  }

  public openReadOnly(keyid: string) {
    const popin: Popin = this.getPopinManager().create({
      id: "craft-" + keyid,
      title: "Craft",
      className: "sheet",
      html: Template.render("craft/popin-readonly.html.njk", {
        html: this.__("Loading..."),
      }),
      canDock: false,
      canMinimize: false,
    });

    popin.on("init", () => {
      this.getClient().get(
        "craft",
        "find",
        {
          keyid: keyid,
        },
        (response: any) => {
          const craft: any = response.craft;

          const sheet = new CraftSheet(
            {
              id: craft.id,
              data: craft.data,
            },
            this.getTree(),
            craft.view,
            "craft-" + keyid
          );

          const view: SystemView = this.getTree().createView(
            craft.view,
            sheet
          ) as SystemView;

          view.readOnly = true;

          popin.getElement().querySelector(".craft-sheet-container").innerHTML =
            view.render();

          sheet.init();

          this.getCodeExecutor().init(view, sheet);

          craft.sheet = sheet;
        }
      );
    });

    popin.open();
  }

  public open(
    id: number | CraftSheet,
    token: CraftItem = null,
    background = false,
    cb: Function = null
  ) {
    const users = this.getUserRepository()
      .toArray()
      .filter((user: any) => {
        return user.id !== this.getUserState().id;
      });

    let sheet: CraftSheet = null;

    if (id instanceof CraftSheet) {
      sheet = id;
      id = id.id;
    }

    let popinId: string = "craft-" + id.toString(10);

    if (token) {
      popinId += "-" + token.key;
    }

    const popin: Popin = this.getPopinManager().create({
      id: popinId,
      title: "Craft",
      className: "sheet",
      html: Template.render("craft/popin.html.njk", {
        html: "Loading...",
      }),
      canDock: false,
      canMinimize: false,
      extraHeader: Template.render("craft/popin-header.html.njk", {
        users: users,
        canShare: users.length > 0,
      }),
    });

    popin.on("init", () => {
      popin
        .getElement()
        .querySelector(".delete-craft-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();

          if (confirm(this.__("Are you sure you want to delete this craft?"))) {
            this.getClient().send("craft", "deleteCraft", {
              id: id,
            });
            popin.close();
          }
        });

      popin
        .getElement()
        .querySelector(".clone-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();

          if (confirm(this.__("Are you sure you want to clone this craft?"))) {
            this.getClient().get(
              "craft",
              "cloneCraft",
              {
                id: id,
              },
              (response: any) => {
                this.open(response.id);
              }
            );
          }
        });

      popin
        .getElement()
        .querySelectorAll(".share-action")
        .forEach((shareBtn: HTMLElement) => {
          shareBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const uid: number = parseInt(shareBtn.dataset.userId, 10);

            if (shareBtn.classList.contains("bg-success")) {
              shareBtn.classList.remove("bg-success");
              shareBtn.classList.remove("text-white");
            } else {
              shareBtn.classList.add("bg-success");
              shareBtn.classList.add("text-white");
            }

            this.getClient().send("craft", "share", {
              id: id,
              userId: uid,
            });
          });
        });

      this.getCraftRepository()
        .find(id as number)
        .then((craft: any) => {
          if (!sheet) {
            this.getCraftRepository().attachSheet(craft);
            sheet = craft.sheet;
          }

          if (craft.createdBy != this.getUserState().id) {
            popin
              .getElement()
              .querySelectorAll(".delete-craft-btn, .craft-share-dropdown")
              .forEach((elt: HTMLElement) => {
                elt.classList.add("d-none");
              });

            const creator = this.getUserRepository().find(craft.createdBy);

            if (creator) {
              popin.getElement().querySelector("header .shared-by").innerHTML =
                Template.render("craft/shared-with.html.njk", {
                  user: creator,
                });
            }
          }

          popin.width = parseFloat(sheet.getView().width.toString()) + 70;
          popin.height = parseFloat(sheet.getView().height.toString()) + 40;

          popin.getElement().querySelector(".craft-sheet-container").innerHTML =
            sheet.getView().render();

          if (token) {
            craft.sheet.token = token;
          }

          craft.sheet.init();
          popin.title = craft.name;

          const renameBtn: HTMLElement = popin
            .getElement()
            .querySelector(".rename-craft-btn");

          if (renameBtn) {
            renameBtn.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const titleContainer: HTMLElement = popin
                .getElement()
                .querySelector("header h3");

              const input: HTMLInputElement = document.createElement("input");
              input.classList.add("craft-rename");
              input.value = titleContainer.textContent;
              input.type = "text";

              const submit: HTMLInputElement = document.createElement("input");
              submit.type = "submit";
              submit.classList.add("btn");
              submit.classList.add("btn-secondary");
              submit.value = this.__("Save");

              const form: HTMLFormElement = document.createElement("form");
              form.classList.add("d-flex");
              form.classList.add("align-items-center");
              form.append(input);
              form.append(submit);

              form.addEventListener("submit", (e) => {
                e.preventDefault();

                this.getCraftRepository().rename(id as number, input.value);

                this.getClient().send("craft", "updateName", {
                  id: id,
                  name: input.value,
                });

                titleContainer.innerText = input.value;
              });

              titleContainer.innerText = "";
              titleContainer.append(form);

              input.focus();
              input.select();
            });
          }

          if (sheet.getView().droppable) {
            const dropBtn: HTMLAnchorElement = popin
              .getElement()
              .querySelector(".drop-btn");
            dropBtn.classList.remove("d-none");

            dropBtn.addEventListener("dragstart", function (e) {
              e.dataTransfer.setData("keyid", craft.keyid);
              e.dataTransfer.setData("viewId", sheet.getView().id);
              e.dataTransfer.setData("data", JSON.stringify(craft.data));
            });
          }

          const skinContainer: HTMLElement = popin
            .getElement()
            .querySelector("#dropdownSkinContainer");

          if (craft.skin) {
            const skin = "skin-" + craft.skin;
            this.getSkinLoader().load(craft.skin);
            this.removeClassByPrefix(popin.getElement(), "skin-");
            popin.getElement().classList.add(skin);
          }

          if (craft.createdBy != this.getUserState().id) {
            skinContainer.classList.add("d-none");
          } else {
            $(skinContainer).on("show.bs.dropdown", () => {
              skinContainer.querySelector(".skin-menu").innerHTML =
                Template.render("character/skins.html.njk", {
                  skins: this.skins,
                });

              popin
                .getElement()
                .querySelectorAll("header .skin-btn")
                .forEach((skinButton: HTMLAnchorElement) => {
                  skinButton.addEventListener("click", (e) => {
                    e.preventDefault();
                    const skin: number = parseInt(skinButton.dataset.skin, 10);

                    this.getClient().send("craft", "skin", {
                      cid: craft.sheet.id,
                      skin: skin,
                    });
                  });
                });
            });
          }

          if (craft.sharedWith) {
            const sharedList: HTMLElement = popin
              .getElement()
              .querySelector("#shared-with-list");

            if (sharedList) {
              for (const userId of craft.sharedWith) {
                const sharedWithUser: HTMLElement = sharedList.querySelector(
                  '[data-user-id="' + userId.toString() + '"]'
                );
                sharedWithUser.classList.add("bg-success");
                sharedWithUser.classList.add("text-white");
              }
            }
          }

          if (cb) {
            cb(popin, sheet);
          }
        });
    });

    popin.open();

    if (background) {
      popin.sleep();
    }
  }

  protected generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected create(view: SystemView) {
    const translator: Translator =
      SharedAdapter.container.get("SystemTranslator");

    this.getClient().get(
      "craft",
      "create",
      {
        data: {},
        name: this.__("Untitled %{type}", {
          type: translator.translate(view.name),
        }),
        view: view.id,
      },
      (response) => {
        this.open(response.id);
      }
    );
  }

  protected getTree(): Tree {
    return container.get<Tree>("SystemTree");
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getCodeExecutor(): CodeExecutor {
    return container.get<CodeExecutor>(Services.CodeExecutor);
  }

  protected getCraftRepository(): CraftRepository {
    return container.get<CraftRepository>(Repository.Craft);
  }

  protected getUserRepository(): UserRepository {
    return container.get<UserRepository>(Repository.UserRepository);
  }

  protected getSkinLoader(): CharacterSkinLoader {
    return container.get<CharacterSkinLoader>(Services.CharacterSkinLoader);
  }
}
