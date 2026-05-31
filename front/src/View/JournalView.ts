import { View } from "./View";
import { injectable } from "inversify";
import { PopinManager } from "./Popin/PopinManager";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { TableState } from "../State/TableState";
import { States } from "../DependencyInjection/State";
import { UserState } from "../State/UserState";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { CraftView } from "./CraftView";
import { Editor, EditorManager } from "./Journal/EditorManager";
import { ChatEmitter } from "../Emitter/ChatEmitter";
import { Emitters } from "../DependencyInjection/Emitters";
import {
  FolderData,
  JournalIcon,
  JournalPermission,
  JournalSharing,
  PageData,
} from "../../shared/Journal";
import {
  MediaValidation,
  MediaValidationScope,
  MediaValidationStatus,
} from "./Media/MediaValidation";
import { BasicCharacter, BasicUser } from "../../shared/User";

@injectable()
export class JournalView extends View {
  protected static readonly SaveContentInterval: number = 10000;
  protected static readonly PreferencesStorageKey: string =
    "journal-preferences";

  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  // cached data
  protected everyone: BasicUser[];
  protected sharing: SharingCache = {
    folders: null,
    entries: null,
  };
  protected indexes: JournalIndexes = {
    [JournalScope.Owned]: [],
    [JournalScope.Shared]: [],
  };
  protected activeFolder: number;

  public init() {
    this.taskBarItem = new TaskBarItem(
      this.__("Journal"),
      "fas fa-book",
      TaskBarCategory.Content
    );

    this.view = new DockableView({
      id: "journal",
      title: this.__("Journal"),
      html: Template.render("journal/dock.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockLeft,
      icon: "fas fa-book",
      defaultConfiguration: {
        index: 3,
        hidden: false,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getTaskBarView().add(this.taskBarItem);
    this.getUi().register(this.view);

    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      return this.initView();
    });

    EventDispatcher.on(Events.JOURNAL_OPEN, (event: { keyid: string }) => {
      return this.openPage({
        id: event.keyid,
      });
    });
  }

  protected tokenize(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  protected async search(
    index: JournalIndex,
    query: string
  ): Promise<number[]> {
    const pageIds: number[] = [];
    const search: string[] = this.tokenize(query).split(" ");

    index.forEach((entry: JournalIndexEntry) => {
      search.forEach((term: string) => {
        if (entry.tokens.includes(term)) {
          pageIds.push(entry.id);
        }
      });
    });

    const uniqueIds: number[] = [...new Set(pageIds)];

    return Promise.resolve(uniqueIds);
  }

  protected async index(root: FolderData): Promise<JournalIndex> {
    const index: JournalIndex = [];

    const inspect = (folder: FolderData) => {
      if (folder.pages) {
        for (const page of folder.pages) {
          let keywords = page.title;

          if (page.tags && Array.isArray(page.tags)) {
            keywords += " " + page.tags.join(" ");
          }

          index.push({
            id: page.id,
            tokens: this.tokenize(keywords),
          });
        }
      }

      if (folder.folders) {
        for (const child of folder.folders) {
          inspect(child);
        }
      }
    };

    inspect(root);

    return Promise.resolve(index);
  }

  public async loadList(
    scope: JournalScope = JournalScope.Owned
  ): Promise<HTMLElement> {
    return new Promise((resolve: Function) => {
      this.getClient().get(
        "journal",
        <string>scope,
        {},
        async (data: { root: FolderData; everyone?: BasicUser[] }) => {
          if (data.everyone) {
            this.everyone = data.everyone;
          }

          if (scope === JournalScope.Owned) {
            this.buildSharingCache(data.root);
          }

          const container: HTMLElement = this.view.container.querySelector(
            `#${scope}-tab #journal-tree`
          );

          this.indexes[scope] = await this.index(data.root);
          this.activeFolder = this.getActiveFolder(scope);

          container.innerHTML = Template.render("journal/root.html.njk", {
            root: data.root,
            state: this.getFoldersState(scope),
            active: this.activeFolder,
            get_icon_path: this.getIconPath,
            get_shared_with: this.getSharedWith.bind(this),
            is_shared: this.isShared,
            scope: scope,
          });

          await this.initList(container, scope);

          return resolve(container);
        }
      );
    });
  }

  protected isShared(sharing: JournalSharing): boolean {
    if (!sharing) {
      return false;
    }

    if (sharing.table && sharing.table !== JournalPermission.None) {
      return true;
    }

    if (sharing.users && Object.keys(sharing.users).length) {
      return true;
    }

    return false;
  }

  protected getSharedWith(sharing: JournalSharing): SharedWithItem[] {
    const items: SharedWithItem[] = [];

    if (!sharing) {
      return items;
    }

    if (sharing.table && sharing.table !== JournalPermission.None) {
      let name = this.__("Everyone can read");

      if (sharing.table === JournalPermission.Write) {
        name = this.__("Everyone can edit");
      }

      items.push({
        name: name,
        permission: sharing.table,
      });
    }

    const getUser = (userId: number): BasicUser => {
      for (const user of this.everyone) {
        if (user.id === userId) {
          return user;
        }
      }

      return null;
    };

    if (sharing.users) {
      for (const userId in sharing.users) {
        const user: BasicUser = getUser(parseInt(userId, 10));

        if (!user) {
          continue;
        }

        const item: SharedWithItem = {
          name: user.username,
          permission: sharing.users[userId],
        };

        if (user.characters) {
          const characters: string = user.characters
            .map((character: BasicCharacter) => character.name)
            .join(", ");

          item.subtitle = characters;
        }

        items.push(item);
      }
    }

    return items;
  }

  protected savePreferences() {
    const preferences: JournalPreferences = this.getBlankPreferences();
    const previousPreferences: JournalPreferences = this.getPreferences();

    const parseFolders = (root: HTMLElement): JournalFolderIndex => {
      const state: JournalFolderIndex = {};

      root.querySelectorAll(".folder-item").forEach((folder: HTMLLIElement) => {
        const link: HTMLAnchorElement = folder.querySelector(":scope > a");
        const id: number = parseInt(link.dataset.id, 10);
        state[id] = folder.classList.contains("open");
      });

      return state;
    };

    const container: HTMLElement = this.view.container;
    const scopes: JournalScope[] = [JournalScope.Owned, JournalScope.Shared];

    for (const scope of scopes) {
      const tabLink: HTMLAnchorElement = container.querySelector(
        `.tabs a[href="#${scope}"]`
      );

      if (tabLink && tabLink.classList.contains("active")) {
        preferences.activeTab = scope;
      }

      const scopedRoot: HTMLElement = container.querySelector(
        `#${scope}-tab #journal-tree .root`
      );

      if (!scopedRoot) {
        if (previousPreferences[scope]) {
          preferences[scope] = previousPreferences[scope];
        }

        continue;
      }

      const active: HTMLLIElement = scopedRoot.querySelector(
        ".folder-item.active"
      );

      if (active) {
        const activeLink: HTMLAnchorElement =
          active.firstElementChild as HTMLAnchorElement;
        const activeId: number = parseInt(activeLink.dataset.id, 10);
        preferences[scope].active = activeId;
      } else {
        preferences[scope].active = null;
      }

      preferences[scope].folders = parseFolders(scopedRoot);
    }

    localStorage.setItem(
      JournalView.PreferencesStorageKey,
      JSON.stringify(preferences)
    );
  }

  protected getFoldersState(scope: JournalScope): JournalFolderIndex {
    const preferences: JournalPreferences = this.getPreferences();

    return preferences[scope].folders;
  }

  protected getActiveFolder(scope: JournalScope): number | null {
    const preferences: JournalPreferences = this.getPreferences();

    return preferences[scope].active;
  }

  protected getPreferences(): JournalPreferences {
    const data: string = localStorage.getItem(
      JournalView.PreferencesStorageKey
    );

    if (data) {
      try {
        const preferences: JournalPreferences = JSON.parse(data);

        return preferences;
      } catch (e) {
        return this.getBlankPreferences();
      }
    }

    return this.getBlankPreferences();
  }

  protected getBlankPreferences(): JournalPreferences {
    return {
      activeTab: JournalScope.Owned,
      [JournalScope.Owned]: {
        folders: {},
      },
      [JournalScope.Shared]: {
        folders: {},
      },
    };
  }

  public async openFolder(
    scope: JournalScope,
    id?: number
  ): Promise<HTMLLIElement> {
    const container: HTMLElement = this.view.container.querySelector(
      `#${scope}-tab #journal-tree`
    );

    let folder: HTMLAnchorElement;

    if (id) {
      folder = container.querySelector(
        `a[data-type="folder"][data-id="${id}"]`
      );
    } else {
      folder = container.querySelector(".root > li > a");
    }

    const li: HTMLLIElement = folder.parentElement as HTMLLIElement;
    let parent: HTMLElement = li;
    let n = 0;
    const MaxDepth = 128;

    while (!parent.classList.contains("root")) {
      if (parent.classList.contains("folder-item")) {
        parent.classList.remove("closed");
        parent.classList.add("open");
      }

      parent = parent.parentElement;

      if (n++ > MaxDepth) {
        break;
      }
    }

    li.classList.remove("closed");
    li.classList.add("open");

    return Promise.resolve(li);
  }

  protected async initList(
    container: HTMLElement,
    scope: JournalScope = JournalScope.Owned
  ): Promise<HTMLElement> {
    await this.initFolderList(container, scope);

    if (scope === JournalScope.Owned) {
      await this.initOwnPagesList(container);
    } else if (scope === JournalScope.Shared) {
      await this.initSharedPagesList(container);
    }

    await this.initSharePopover(container);

    return Promise.resolve(container);
  }

  protected async initSharePopover(container: HTMLElement) {
    const sharingIcons: NodeListOf<HTMLElement> =
      container.querySelectorAll(".sharing-icon");

    sharingIcons.forEach((sharingIcon: HTMLElement) => {
      $(sharingIcon).popover({
        html: true,
        boundary: "window",
        placement: "top",
        trigger: "hover",
        customClass: "folder-sharing-popover",
        content: sharingIcon.querySelector(".sharing-content").innerHTML,
        title: this.__("This folder is shared with:"),
      });
    });
  }

  protected async initFolderList(container: HTMLElement, scope: JournalScope) {
    const folderLinks: NodeListOf<HTMLAnchorElement> =
      container.querySelectorAll(".folder-item > a");

    const activateFolder = (folderLink: HTMLAnchorElement) => {
      const id: number = parseInt(folderLink.dataset.id, 10);

      if (!isNaN(id)) {
        this.activeFolder = id;
      }

      const folderClasses: DOMTokenList = folderLink.parentElement.classList;

      folderLinks.forEach((link: HTMLAnchorElement) =>
        link.parentElement.classList.remove("active")
      );

      folderClasses.add("active");
    };

    folderLinks.forEach((folderLink: HTMLAnchorElement) => {
      const isRoot: boolean = folderLink.dataset.id ? false : true;
      const id: number = parseInt(folderLink.dataset.id, 10);

      folderLink.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        activateFolder(folderLink);
        const li: HTMLLIElement = folderLink.parentElement as HTMLLIElement;

        if (li.classList.contains("open")) {
          li.classList.remove("open");
          li.classList.add("closed");
        } else {
          this.openFolder(scope, id);
        }

        this.savePreferences();
      });

      folderLink.addEventListener("dragstart", (e: DragEvent) => {
        e.dataTransfer.setData("source", "journal");
        e.dataTransfer.setData("type", "folder");
        e.dataTransfer.setData("id", id.toString(10));
      });

      if (scope === JournalScope.Owned) {
        folderLink.addEventListener("contextmenu", (e: MouseEvent) => {
          e.preventDefault();

          const html: string = Template.render(
            "journal/folder-contextual.html.njk",
            {
              left: e.pageX,
              top: e.pageY,
              isRoot: isRoot,
            }
          );

          const contextual: HTMLElement = document.getElementById("contextual");
          contextual.innerHTML = html;

          activateFolder(folderLink);

          const displayShareUsers = () => {
            const sharing: JournalSharing = this.getSharingCache("folder", id);

            const userContainer: HTMLElement = contextual.querySelector(
              ".folder-share-users"
            );

            const users: BasicUser[] = this.getEveryoneButMe();
            const isTableShared: boolean =
              sharing &&
              sharing.table &&
              sharing.table !== JournalPermission.None;

            userContainer.innerHTML = Template.render(
              "journal/share-contextual.html.njk",
              {
                users: users,
                is_table_shared: () => {
                  return isTableShared;
                },
                is_user_shared: (user: BasicUser) => {
                  if (!sharing || !sharing.users) {
                    return false;
                  }

                  const permissions: JournalPermission = sharing.users[user.id];

                  if (!permissions) {
                    return false;
                  }

                  if (permissions !== JournalPermission.None) {
                    return true;
                  }

                  return false;
                },
              }
            );

            const shareTable: HTMLAnchorElement = userContainer.querySelector(
              '[data-action="share-table"]'
            );
            const shareUsers: NodeListOf<HTMLAnchorElement> =
              userContainer.querySelectorAll('[data-action="share"]');

            shareTable.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const permission: JournalPermission = isTableShared
                ? JournalPermission.None
                : JournalPermission.Read;

              this.getClient().get(
                "journal",
                "grantFolderTable",
                {
                  folderId: id,
                  permission: permission,
                },
                () => {
                  closeMenu();
                  this.loadList();
                }
              );
            });

            shareUsers.forEach((shareUser: HTMLAnchorElement) => {
              shareUser.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                const userId: number = parseInt(shareUser.dataset.userId, 10);
                let permission: JournalPermission = JournalPermission.Read;

                if (shareUser.classList.contains("enabled")) {
                  permission = JournalPermission.None;
                }

                this.getClient().get(
                  "journal",
                  "grantFolderUser",
                  {
                    folderId: id,
                    userId: userId,
                    permission: permission,
                  },
                  () => {
                    closeMenu();
                    this.loadList();
                  }
                );
              });
            });
          };

          const closeMenu = () => {
            contextual.innerHTML = "";
          };

          contextual
            .querySelectorAll("[data-action]")
            .forEach((actionLink: HTMLAnchorElement) => {
              actionLink.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                const action: JournalFolderAction = actionLink.dataset
                  .action as JournalFolderAction;

                const li: HTMLLIElement = <HTMLLIElement>(
                  folderLink.parentElement
                );

                switch (action) {
                  case JournalFolderAction.CreateFolder:
                    closeMenu();
                    return this.createFolder(li);

                  case JournalFolderAction.Rename:
                    closeMenu();
                    return this.renameFolder(li);

                  case JournalFolderAction.Delete:
                    closeMenu();
                    return this.deleteFolder(li);

                  case JournalFolderAction.CreateEntry:
                    closeMenu();
                    return this.openCreatePage(id);

                  case JournalFolderAction.Upload:
                    closeMenu();
                    return this.uploadInFolder(id);
                    break;

                  case JournalFolderAction.ShowShareUsers:
                    return displayShareUsers();
                }
              });
            });
        });
      }

      if (scope === JournalScope.Owned) {
        folderLink.addEventListener("dragenter", (e: DragEvent) => {
          e.preventDefault();
          folderLink.classList.add("drag");
        });

        folderLink.addEventListener("dragleave", () => {
          folderLink.classList.remove("drag");
        });

        folderLink.addEventListener("dragover", (e: DragEvent) => {
          e.preventDefault();
          folderLink.classList.add("drag");
          e.dataTransfer.dropEffect = "move";
        });

        folderLink.addEventListener("drop", (e: DragEvent) => {
          e.preventDefault();
          folderLink.classList.remove("drag");

          const source: string = e.dataTransfer.getData("source");
          const type: string = e.dataTransfer.getData("type");
          const droppedId: number = parseInt(e.dataTransfer.getData("id"), 10);

          if (source !== "journal") {
            return;
          }

          if (type === "page") {
            return this.getClient().get(
              "journal",
              "changeFolder",
              {
                id: droppedId,
                folderId: id,
              },
              () => this.loadList(scope)
            );
          }

          if (type === "folder") {
            return this.getClient().get(
              "journal",
              "moveFolder",
              {
                parentId: id,
                folderId: droppedId,
              },
              () => this.loadList(scope)
            );
          }
        });
      }
    });
  }

  protected uploadInFolder(folderId: number) {
    const fileInput: HTMLInputElement =
      this.view.container.querySelector("#journal-file");

    fileInput.click();
  }

  protected async initSharedPagesList(
    container: HTMLElement
  ): Promise<HTMLElement> {
    const pageLinks: NodeListOf<HTMLAnchorElement> =
      container.querySelectorAll(".page-item > a");

    pageLinks.forEach((pageLink: HTMLAnchorElement) => {
      const id: number = parseInt(pageLink.dataset.id, 10);
      const keyId: string = pageLink.dataset.keyid;

      pageLink.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const title: string = pageLink
          .querySelector(".page-title")
          .textContent.trim();

        this.openPage({
          id: id,
          title: title,
        });
      });
    });

    return container;
  }

  protected async initOwnPagesList(
    container: HTMLElement
  ): Promise<HTMLElement> {
    const pageLinks: NodeListOf<HTMLAnchorElement> =
      container.querySelectorAll(".page-item > a");

    pageLinks.forEach((pageLink: HTMLAnchorElement) => {
      const id: number = parseInt(pageLink.dataset.id, 10);
      const keyId: string = pageLink.dataset.keyid;
      const title: string = pageLink.querySelector(".page-title").textContent;

      pageLink.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const title: string = pageLink
          .querySelector(".page-title")
          .textContent.trim();

        this.openPage({
          id: id,
          title: title,
        });
      });

      pageLink.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();

        const html: string = Template.render(
          "journal/entry-contextual.html.njk",
          {
            left: e.pageX,
            top: e.pageY,
          }
        );

        const contextual: HTMLElement = document.getElementById("contextual");
        contextual.innerHTML = html;

        const displayShareUsers = () => {
          const sharing: JournalSharing = this.getSharingCache("entry", id);

          const userContainer: HTMLElement = contextual.querySelector(
            ".folder-share-users"
          );

          const users: BasicUser[] = this.getEveryoneButMe();
          const isTableShared: boolean =
            sharing &&
            sharing.table &&
            sharing.table !== JournalPermission.None;

          userContainer.innerHTML = Template.render(
            "journal/share-contextual.html.njk",
            {
              users: users,
              is_table_shared: () => {
                return isTableShared;
              },
              is_user_shared: (user: BasicUser) => {
                if (!sharing || !sharing.users) {
                  return false;
                }

                const permissions: JournalPermission = sharing.users[user.id];

                if (!permissions) {
                  return false;
                }

                if (permissions !== JournalPermission.None) {
                  return true;
                }

                return false;
              },
            }
          );

          const shareTable: HTMLAnchorElement = userContainer.querySelector(
            '[data-action="share-table"]'
          );
          const shareUsers: NodeListOf<HTMLAnchorElement> =
            userContainer.querySelectorAll('[data-action="share"]');

          shareTable.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();

            const permission: JournalPermission = isTableShared
              ? JournalPermission.None
              : JournalPermission.Read;

            this.getClient().get(
              "journal",
              "grantTable",
              {
                id: id,
                permission: permission,
              },
              () => {
                closeMenu();
                this.loadList();
              }
            );
          });

          shareUsers.forEach((shareUser: HTMLAnchorElement) => {
            shareUser.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const userId: number = parseInt(shareUser.dataset.userId, 10);
              let permission: JournalPermission = JournalPermission.Read;

              if (shareUser.classList.contains("enabled")) {
                permission = JournalPermission.None;
              }

              this.getClient().get(
                "journal",
                "grantUser",
                {
                  id: id,
                  userId: userId,
                  permission: permission,
                },
                () => {
                  closeMenu();
                  this.loadList();
                }
              );
            });
          });
        };

        const closeMenu = () => {
          contextual.innerHTML = "";
        };

        contextual
          .querySelectorAll("[data-action]")
          .forEach((actionLink: HTMLAnchorElement) => {
            actionLink.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const action: JournalEntryAction = actionLink.dataset
                .action as JournalEntryAction;

              const li: HTMLLIElement = <HTMLLIElement>pageLink.parentElement;

              switch (action) {
                case JournalEntryAction.ShowShareUsers: {
                  displayShareUsers();
                  break;
                }

                case JournalEntryAction.Open: {
                  closeMenu();

                  return this.openPage({
                    id: id,
                  });
                }

                case JournalEntryAction.Rename: {
                  closeMenu();

                  return this.renameEntry(li);
                }

                case JournalEntryAction.Delete: {
                  closeMenu();

                  if (
                    confirm(this.__("Do you really want to delete this entry?"))
                  ) {
                    this.getClient().get(
                      "journal",
                      "remove",
                      {
                        id: id,
                      },
                      () => this.loadList()
                    );
                  }

                  break;
                }

                case JournalEntryAction.Reveal: {
                  closeMenu();

                  this.getClient().get(
                    "journal",
                    "show",
                    {
                      id: id,
                    },
                    () => {
                      return this.loadList();
                    }
                  );

                  break;
                }
              }
            });
          });
      });

      pageLink.addEventListener("dragstart", (e: DragEvent) => {
        e.dataTransfer.setData("source", "journal");
        e.dataTransfer.setData("type", "page");
        e.dataTransfer.setData("id", id.toString(10));
        e.dataTransfer.setData("keyid", keyId);
        e.dataTransfer.setData("title", title);
        e.dataTransfer.setData("icon", pageLink.dataset.icon);
      });
    });

    return Promise.resolve(container);
  }

  protected renameEntry(entry: HTMLLIElement) {
    const input: HTMLInputElement = document.createElement("input");
    input.classList.add("entry-input");

    const link: HTMLAnchorElement =
      entry.firstElementChild as HTMLAnchorElement;
    const titleSpan: HTMLSpanElement = link.querySelector(".page-title");
    const entryId: number = parseInt(link.dataset.id, 10);
    const title: string = titleSpan.textContent.trim();

    link.draggable = false;
    input.value = title;

    const rename = () => {
      const title: string = input.value.trim();

      if (!title) {
        return;
      }

      this.getClient().get(
        "journal",
        "save",
        {
          id: entryId,
          values: {
            title: title,
          },
        },
        (response: any) => {
          link.draggable = true;

          return this.loadList(JournalScope.Owned);
        }
      );
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        rename();
      }
    });

    input.addEventListener("blur", () => {
      rename();
    });

    titleSpan.replaceWith(input);
    input.focus();
  }

  protected renameFolder(folder: HTMLLIElement) {
    const input: HTMLInputElement = document.createElement("input");
    input.classList.add("folder-input");

    const link: HTMLAnchorElement =
      folder.firstElementChild as HTMLAnchorElement;
    const folderId: number = parseInt(link.dataset.id, 10);
    const nameSpan: HTMLSpanElement = link.querySelector(".folder-name");
    const name: string = nameSpan.textContent.trim();

    link.draggable = false;
    input.value = name;

    const rename = () => {
      const name: string = input.value.trim();

      if (!name) {
        return;
      }

      this.getClient().get(
        "journal",
        "renameFolder",
        {
          name: name,
          folderId: folderId,
        },
        async (response: any) => {
          link.draggable = true;

          await this.loadList(JournalScope.Owned);
          await this.openFolder(JournalScope.Owned, folderId);
        }
      );
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        rename();
      }
    });

    input.addEventListener("blur", () => {
      rename();
    });

    nameSpan.replaceWith(input);
    input.focus();
  }

  protected createFolder(parent: HTMLLIElement) {
    let parentId: number = null;
    let ul: HTMLUListElement = null;

    const link: HTMLAnchorElement =
      parent.firstElementChild as HTMLAnchorElement;

    if (link.dataset.id) {
      parentId = parseInt(link.dataset.id, 10);
    }

    const children: HTMLCollection = parent.children;

    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === "UL") {
        ul = children[i] as HTMLUListElement;
        break;
      }
    }

    if (!ul) {
      ul = document.createElement("ul");
      parent.append(ul);
    }

    parent.classList.remove("closed");
    parent.classList.add("open");
    parent.classList.add("has-children");

    const newLi: HTMLLIElement = document.createElement("li");
    newLi.classList.add("folder-edit");
    newLi.classList.add("closed");

    const icon: HTMLSpanElement = document.createElement("span");
    icon.classList.add("folder");

    const input: HTMLInputElement = document.createElement("input");
    input.classList.add("folder-input");

    newLi.append(icon);
    newLi.append(input);

    ul.append(newLi);

    const clear = () => {
      newLi.remove();
    };

    const create = () => {
      const name: string = input.value.trim();
      clear();

      if (!name) {
        return;
      }

      this.getClient().get(
        "journal",
        "createFolder",
        {
          name: name,
          parentId: parentId,
        },
        async (response: any) => {
          const folderId: number = response.folderId;

          await this.loadList(JournalScope.Owned);
          await this.openFolder(JournalScope.Owned, folderId);
        }
      );
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        create();
      }
    });

    input.addEventListener("blur", () => {
      create();
    });

    input.focus();
  }

  protected async deleteFolder(parent: HTMLLIElement): Promise<void> {
    const link: HTMLAnchorElement =
      parent.firstElementChild as HTMLAnchorElement;

    const id: number = parseInt(link.dataset.id, 10);

    if (!id) {
      return;
    }

    if (
      confirm(
        this.__(
          "Are you sure you want to delete this folder? All folders and entries inside will be deleted."
        )
      )
    ) {
      this.getClient().get(
        "journal",
        "deleteAllFolder",
        {
          folderId: id,
        },
        (response) => {
          this.loadList(JournalScope.Owned);
        }
      );
    }
  }

  protected initSearch(scope: JournalScope) {
    const tab: HTMLElement = this.view.container.querySelector(
      "#" + scope.toString() + "-tab"
    );

    const searchInput: HTMLInputElement = tab.querySelector(".search input");

    searchInput.addEventListener("keyup", async () => {
      const query: string = searchInput.value.trim();
      const tree: HTMLElement = tab.querySelector("#journal-tree");
      const searchResult: HTMLElement = tab.querySelector("#journal-search");

      if (!query) {
        tree.classList.remove("d-none");
        searchResult.classList.add("d-none");

        return;
      }

      const ids: number[] = await this.search(this.indexes[scope], query);
      const noResult: HTMLElement = searchResult.querySelector(".no-result");

      if (ids.length) {
        noResult.classList.add("d-none");
      } else {
        noResult.classList.remove("d-none");
      }

      const searchRoot: HTMLUListElement = searchResult.querySelector(".root");
      const elements: HTMLLIElement[] = [];

      ids.forEach((id: number) => {
        const element: HTMLAnchorElement = tree.querySelector(
          "[data-type='page'][data-id='" + id.toString(10) + "']"
        );

        if (element) {
          const parent: HTMLLIElement = element.parentElement as HTMLLIElement;
          elements.push(parent);
        }
      });

      tree.classList.add("d-none");
      searchResult.classList.remove("d-none");
      searchRoot.innerHTML = "";

      elements.forEach((element: HTMLLIElement) => {
        searchRoot.append(element.cloneNode(true));
      });

      if (scope === JournalScope.Owned) {
        await this.initOwnPagesList(searchRoot);
      }
    });
  }

  protected initUpload() {
    const fileInput: HTMLInputElement =
      this.view.container.querySelector("#journal-file");

    const form: HTMLFormElement = this.view.container.querySelector(
      "#journal-upload-form"
    );

    fileInput.addEventListener("change", (e: Event) => {
      e.preventDefault();

      const errors: UploadError[] = this.validateFiles(fileInput);
      this.hideUploadErrors();

      if (errors.length) {
        this.displayUploadErrors(errors);
        return;
      }

      const formData: FormData = new FormData(form);

      return this.processUpload(formData);
    });
  }

  protected async processUpload(formData: FormData) {
    const url: string = window["configuration"]["cdnUrl"] + "/upload";
    const container: HTMLElement = this.view.container;
    const progressContainer: HTMLElement = container.querySelector(
      ".journal-upload-progress"
    );
    const progress: HTMLElement =
      progressContainer.querySelector(".progress-inside");

    $.ajax({
      url: url,
      type: "POST",
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      xhrFields: {
        withCredentials: true,
      },
      crossDomain: true,
      xhr: function () {
        const myXhr: XMLHttpRequest = $.ajaxSettings.xhr();

        if (myXhr.upload) {
          progressContainer.classList.remove("d-none");

          myXhr.upload.addEventListener(
            "progress",
            function (e: ProgressEvent) {
              if (e.lengthComputable) {
                progress.style.width =
                  ((e.loaded / e.total) * 100).toString(10) + "%";
              }
            },
            false
          );
        }

        return myXhr;
      },
      success: (data) => {
        const response = JSON.parse(data);
        const media: any = response[0];
        const filename: string = media.filename;

        this.hideUploadProgress();

        if (filename.endsWith("pdf")) {
          this.createPdfPage(media.filename, media.id);
        } else {
          const url: string =
            window["configuration"].cdnReadUrl + "/" + media.path;

          this.createMediaPage(url);
        }
      },
      error: (jqXHR, textStatus, errorThrown) => {
        const error: UploadError = {
          message: this.__("An error occurred while sending your files."),
          code: jqXHR.status,
        };

        this.hideUploadProgress();

        this.displayUploadErrors([error]);
      },
    });
  }

  protected displayUploadErrors(errors: UploadError[]) {
    const container: HTMLElement =
      this.view.container.querySelector(".journal-errors");

    container.innerHTML = Template.render("journal/errors.html.njk", {
      errors: errors,
    });

    container.classList.remove("d-none");

    container.addEventListener("click", () => this.hideUploadErrors(), {
      once: true,
    });

    setTimeout(() => {
      this.hideUploadErrors();
    }, 9000);
  }

  protected hideUploadErrors() {
    const container: HTMLElement =
      this.view.container.querySelector(".journal-errors");

    container.classList.add("d-none");
    container.innerHTML = "";
  }

  protected hideUploadProgress() {
    this.view.container
      .querySelector(".journal-upload-progress")
      .classList.add("d-none");
  }

  protected validateFiles(input: HTMLInputElement): UploadError[] {
    const files: FileList = input.files;
    const length: number = files.length;
    const errors: UploadError[] = [];
    const validator: MediaValidation = new MediaValidation();

    for (let i = 0; i < length; i++) {
      const file: File = files.item(i);
      const status: MediaValidationStatus = validator.validate(
        file,
        MediaValidationScope.Journal
      );

      if (status.error) {
        errors.push({
          message: status.message,
          code: status.code,
        });
      }
    }

    return errors;
  }

  protected initToolbar() {
    const container: HTMLElement = this.view.container;
    const newEntryBtn: HTMLAnchorElement =
      container.querySelector(".new-journal-btn");
    const uploadBtn: HTMLAnchorElement = container.querySelector(
      ".upload-journal-btn"
    );
    const fileInput: HTMLInputElement =
      container.querySelector("#journal-file");
    const newFolderBtn: HTMLAnchorElement =
      container.querySelector(".new-folder-btn");

    if (newEntryBtn) {
      newEntryBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        return this.openCreatePage(this.activeFolder);
      });
    }

    if (uploadBtn) {
      uploadBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        fileInput.click();
      });
    }

    if (newFolderBtn) {
      newFolderBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        let parent: HTMLLIElement = container.querySelector(
          "#owned-tab .folder-item.active"
        );

        if (!parent) {
          parent = container.querySelector("#owned-tab .root > li.folder-item");
        }

        return this.createFolder(parent);
      });
    }
  }

  protected enableTabScope(scope: JournalScope) {
    const view: HTMLElement = this.view.container;
    const tabLinks: NodeListOf<HTMLAnchorElement> =
      view.querySelectorAll(".tabs .tab");
    const pane: HTMLElement = view.querySelector(`.tab-content#${scope}-tab`);
    const activeTab: HTMLAnchorElement = view.querySelector(
      `.tabs a[href="#${scope}"]`
    );

    tabLinks.forEach((tabLink: HTMLAnchorElement) =>
      tabLink.classList.remove("active")
    );

    activeTab.classList.add("active");

    view
      .querySelectorAll(".tab-content")
      .forEach((pane: HTMLElement) => pane.classList.add("d-none"));

    pane.classList.remove("d-none");
  }

  protected initDockTabs() {
    const view: HTMLElement = this.view.container;

    const tabLinks: NodeListOf<HTMLAnchorElement> =
      view.querySelectorAll(".tabs .tab");

    tabLinks.forEach((tabLink: HTMLAnchorElement) => {
      tabLink.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const scope: JournalScope = tabLink.hash.substring(1) as JournalScope;
        this.enableTabScope(scope);

        return this.loadList(scope).then(() => {
          this.savePreferences();
        });
      });
    });
  }

  protected initView() {
    this.initDockTabs();
    this.initToolbar();

    this.initSearch(JournalScope.Owned);
    this.initSearch(JournalScope.Shared);

    this.initHelp();
    this.initRefresh();
    this.initUpload();

    const preferences: JournalPreferences = this.getPreferences();
    const scope: JournalScope = preferences.activeTab ?? JournalScope.Owned;

    this.enableTabScope(scope);

    return this.loadList(scope);
  }

  protected initRefresh() {
    const pane: HTMLElement = this.view.container.querySelector("#shared-tab");
    const refreshBtn: HTMLAnchorElement = pane.querySelector("a.refresh");

    refreshBtn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      return this.loadList(JournalScope.Shared);
    });
  }

  protected initHelp() {
    const helpIcon: HTMLAnchorElement =
      this.view.container.querySelector(".help-icon");

    $(helpIcon).popover({
      html: true,
      boundary: "window",
      trigger: "click",
      customClass: "journal-help",
      content: Template.render("journal/help.html.njk"),
      title: this.__("Need help with the journal?"),
    });
  }

  protected createMediaPage(mediaUrl: string) {
    this.getClient().get(
      "journal",
      "create",
      {
        folderId: this.activeFolder,
        mediaUrl: mediaUrl,
      },
      (response) => {
        return this.openPage({
          id: response.id,
          edit: true,
        });
      }
    );
  }

  protected createPdfPage(title: string, mediaId: number) {
    this.getClient().get(
      "journal",
      "createPdf",
      {
        folderId: this.activeFolder,
        title: title,
        mediaId: mediaId,
      },
      (response) => {
        return this.openPage({
          id: response.id,
          title: title,
          edit: true,
        });
      }
    );
  }

  public static buildPopinId(pageId: string | number): string {
    return "journal-page-" + pageId.toString();
  }

  public async updateIcon(id: number, icon: JournalIcon) {
    const popin: Popin = this.getPopinManager().get(
      JournalView.buildPopinId(id)
    );

    if (!popin) {
      return;
    }

    popin.icon = this.getIconPath(icon);

    const page: PageData = popin.page;

    if (!page) {
      return;
    }

    page.icon = icon;

    const icons: NodeListOf<HTMLAnchorElement> = popin
      .getElement()
      .querySelectorAll(".pane-edit .icons .icon");

    icons.forEach((htmlIcon: HTMLAnchorElement) => {
      if (htmlIcon.dataset.icon == icon) {
        htmlIcon.classList.add("active");
      } else {
        htmlIcon.classList.remove("active");
      }
    });
  }

  protected getIconPath(icon: JournalIcon): string {
    let iconPath: string = null;

    journalIcons.forEach((journalIcon: JournalIconItem) => {
      if (journalIcon.type === icon) {
        iconPath = journalIcon.icon;
      }
    });

    if (!iconPath) {
      iconPath = journalIcons[0].icon;
    }

    return iconPath;
  }

  public async openPage(configuration: OpenPageConfiguration): Promise<Popin> {
    const popin: Popin = this.getPopinManager().create({
      id: JournalView.buildPopinId(configuration.id),
      title: configuration.title ?? this.__("New entry"),
      html:
        '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i>' +
        this.__("Loading...") +
        "</div>",
      taskbar: false,
      canDock: false,
      icon: "fas fa-page",
      width: 600,
      height: 500,
    });

    popin.className = "journal-popin";

    popin.mode = PagePopinMode.Read;

    popin.on("resize", () => {
      this.resizeEditor(popin);
    });

    popin.on("init", () => {
      const onLoaded = (response: PageLoadedData) => {
        configuration.data = response;

        const popinIcon: string = this.getIconPath(response.page.icon);
        const page: PageData = response.page;
        const isOwner: boolean = page.author_id == this.getUserState().id;
        const canEdit: boolean =
          this.getPagePermission(page.sharing, isOwner) ===
          JournalPermission.Write;

        popin.title = page.title;
        popin.page = page;
        popin.icon = popinIcon;
        popin.originalIcon = popinIcon;

        this.initPage(popin);
        this.onSharingUpdate(page.id, page.sharing, isOwner);

        if (configuration.edit && canEdit) {
          this.displayPopinEdit(popin, configuration.onReady);
        } else {
          this.displayPopinView(popin, configuration.onReady);
        }
      };

      let loader: Promise<PageLoadedData>;

      if (typeof configuration.id === "string") {
        loader = this.loadFromKey(configuration.id);
      } else {
        loader = this.load(configuration.id);
      }

      loader.then((data: PageLoadedData) => {
        onLoaded(data);
      });
    });

    popin.open();

    return Promise.resolve(popin);
  }

  protected resizeEditor(popin: Popin) {
    const ckMain: HTMLElement = popin
      .getElement()
      .querySelector(".ck.ck-editor__main");

    if (!ckMain) {
      return;
    }

    const height: string = popin.getElement().style.height;

    ckMain.style.height = `calc(${height} - 275px)`;
  }

  protected initPage(popin: Popin) {
    const page: PageData = popin.page;

    const main: HTMLElement = popin.getElement().querySelector("main");

    main.innerHTML = Template.render("journal/entry.html.njk", {
      page: page,
    });

    main.querySelectorAll(".tabs a").forEach((tab: HTMLAnchorElement) => {
      tab.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        const pane: string = tab.dataset.pane;
        const activeTab: HTMLAnchorElement =
          main.querySelector(".tabs a.active");
        const activePane: string = activeTab.dataset.pane;

        if (tab.classList.contains("active")) {
          return;
        }

        const displayView = () => {
          switch (pane) {
            case "view":
              this.displayPopinView(popin);
              break;
            case "edit":
              this.displayPopinEdit(popin);
              break;
            case "share":
              this.displayPopinShare(popin);
              break;
          }
        };

        if (activePane === "edit" && popin.editor) {
          const titleElement: HTMLInputElement = popin
            .getElement()
            .querySelector('[name="title"]');
          const tagsElement: HTMLInputElement = popin
            .getElement()
            .querySelector('[name="tags"]');
          const editor: Editor = popin.editor;

          page.title = titleElement.value;
          page.content = editor.getData();
          page.tags = tagsElement.value.split(",");

          this.saveContents(
            page.id,
            {
              content: page.content,
              title: page.title,
              tags: tagsElement.value,
            },
            () => {
              editor.destroy().then(() => displayView());
            }
          );
        } else {
          displayView();
        }
      });
    });
  }

  public display(id: number) {
    this.load(id).then((data: PageLoadedData) => {
      return this.openPage({
        id: id,
        data: data,
        title: data.page.title,
      });
    });
  }

  protected load(id: number): Promise<PageLoadedData> {
    return new Promise((resolve: Function) => {
      this.getClient().get(
        "journal",
        "load",
        {
          id: id,
        },
        (response: PageLoadedData) => {
          return resolve(response);
        }
      );
    });
  }

  protected loadFromKey(keyid: string): Promise<PageLoadedData> {
    return new Promise((resolve: Function) => {
      this.getClient().get(
        "journal",
        "loadFromKey",
        {
          keyid: keyid,
        },
        (response: PageLoadedData) => {
          return resolve(response);
        }
      );
    });
  }

  protected enablePopinPane(popin: Popin, pane: string): HTMLElement {
    const main: HTMLElement = popin.getElement().querySelector("main");

    main.querySelectorAll(".tab-panes .pane").forEach((pane: HTMLElement) => {
      pane.innerHTML = "";
      pane.classList.remove("active");
    });

    main.querySelectorAll(".tabs a").forEach((tab: HTMLAnchorElement) => {
      tab.classList.remove("active");
    });

    const footer: HTMLElement = main.querySelector(".journal-footer");
    footer.innerHTML = "";
    footer.classList.add("d-none");

    const tabPane: HTMLElement = main.querySelector(`.tab-panes .pane-${pane}`);
    const tab: HTMLAnchorElement = main.querySelector(
      `.tabs a[data-pane="${pane}"]`
    );

    tabPane.classList.add("active");
    tab.classList.add("active");

    return tabPane;
  }

  protected initPageLinks(popin: Popin) {
    popin
      .getElement()
      .querySelectorAll(".pane-view .content a")
      .forEach((link: HTMLAnchorElement) => {
        const href: string = link.href;

        if (href.startsWith("letsrole://")) {
          const path: string = href.substr(11);
          const arr: string[] = path.split("/");

          if (arr.length != 2) {
            return;
          }

          const type: string = arr[0];
          const keyid: string = arr[1];

          if (type == "roll") {
            link.innerHTML =
              '<i class="fas fa-dice-d20 journal-roll-icon"></i> ' +
              link.innerText;
          }

          link.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();

            switch (type) {
              case "journal":
                this.openPage({
                  id: keyid,
                });
                break;
              case "roll":
                this.roll(keyid, link.textContent);
                break;
              case "craft":
                this.getCraftView().openReadOnly(keyid);
                break;
            }
          });
        }
      });
  }

  protected initPageTables(popin: Popin) {
    popin
      .getElement()
      .querySelectorAll(".pane-view .content table")
      .forEach((table: HTMLTableElement) => {
        const roll: HTMLAnchorElement = document.createElement("a");

        roll.href = "#";
        roll.innerHTML =
          '<i class="fas fa-dice-d20"></i> ' + this.__("Roll table");
        roll.classList.add("roll-table-btn");

        roll.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          const lines: NodeListOf<HTMLElement> = table.querySelectorAll("tr");
          const lineCount: number = lines.length;

          this.getClient().get(
            "dice",
            "random",
            {
              dimension: lineCount,
              count: 1,
            },
            (response: any) => {
              lines.forEach((entry: HTMLElement) => {
                entry.classList.remove("line-rolled");
              });

              const result: number = response.indexes[0];

              const line: HTMLElement = lines.item(result);
              line.classList.add("line-rolled");

              roll.innerHTML =
                `<i class="fas fa-dice-d20"></i> ` +
                this.__("You rolled %{roll}. Roll again?", {
                  roll: (result + 1).toString(10),
                });
            }
          );
        });

        table.parentNode.insertBefore(roll, table.nextSibling);
      });
  }

  protected displayPopinShare(popin: Popin) {
    popin.mode = PagePopinMode.Share;

    const page: PageData = popin.page;
    const tabPane: HTMLElement = this.enablePopinPane(popin, "share");

    tabPane.innerHTML = Template.render("journal/share-loading.html.njk");

    const container: HTMLElement = tabPane.querySelector(".share-content");
    const footer: HTMLElement = popin
      .getElement()
      .querySelector(".journal-footer");

    this.getClient().get("user", "everyone", {}, (response) => {
      this.everyone = response.users;
      const users: BasicUser[] = this.getEveryoneButMe();

      container.innerHTML = Template.render("journal/share.html.njk", {
        page: page,
        users: users,
        get_avatar: (user: BasicUser): string => {
          if (user) {
            if (user.characters && user.characters.length) {
              const first: BasicCharacter = user.characters[0];

              if (first.avatar) {
                return first.avatar;
              }
            }
          }

          return "static/default-avatar.png";
        },
      });

      $(container).find(".reveal").tooltip({
        trigger: "hover",
        placement: "right",
        boundary: "window",
      });

      footer.innerHTML = Template.render("journal/share-footer.html.njk", {
        page: page,
        users: users,
      });

      footer.classList.remove("d-none");

      $(footer).find(".btn-reveal").tooltip({
        trigger: "hover",
        placement: "right",
        boundary: "window",
      });

      container.querySelectorAll(".reveal").forEach((reveal: HTMLElement) => {
        const beforeReveal: string = reveal.innerHTML;

        reveal.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();
          const userId: number = parseInt(reveal.dataset.userId, 10);

          this.getClient().get(
            "journal",
            "show",
            {
              id: page.id,
              userId: userId,
            },
            (response: { sharing: JournalSharing }) => {
              page.sharing = response.sharing;
              reveal.classList.add("bg-success");
              reveal.textContent = this.__("Revealed!");

              setTimeout(() => {
                reveal.innerHTML = beforeReveal;
                reveal.classList.remove("bg-success");
              }, 1500);

              return this.updateSharing(popin);
            }
          );
        });
      });

      const globalReveal: HTMLElement = footer.querySelector(".btn-reveal");
      const beforeGlobalReveal: string = globalReveal.innerHTML;

      globalReveal.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().get(
          "journal",
          "show",
          {
            id: page.id,
          },
          (response: { sharing: JournalSharing }) => {
            page.sharing = response.sharing;
            globalReveal.classList.add("bg-success");
            globalReveal.textContent = this.__("Revealed!");

            setTimeout(() => {
              globalReveal.innerHTML = beforeGlobalReveal;
              globalReveal.classList.remove("bg-success");
            }, 1500);

            return this.updateSharing(popin);
          }
        );
      });

      const readTableInput: HTMLInputElement = footer.querySelector(
        ".btn-share-read input"
      );

      const writeTableInput: HTMLInputElement = footer.querySelector(
        ".btn-share-write input"
      );

      const grantTable = (permission: JournalPermission) => {
        this.getClient().get(
          "journal",
          "grantTable",
          {
            id: page.id,
            permission: permission,
          },
          (response: { sharing: JournalSharing }) => {
            page.sharing = response.sharing;

            return this.updateSharing(popin);
          }
        );
      };

      const grantUser = (userId: number, permission: JournalPermission) => {
        this.getClient().get(
          "journal",
          "grantUser",
          {
            id: page.id,
            userId: userId,
            permission: permission,
          },
          (response: { sharing: JournalSharing }) => {
            page.sharing = response.sharing;

            return this.updateSharing(popin);
          }
        );
      };

      readTableInput.addEventListener("change", (e: Event) => {
        const permission: JournalPermission = readTableInput.checked
          ? JournalPermission.Read
          : JournalPermission.None;

        grantTable(permission);
      });

      writeTableInput.addEventListener("change", (e: Event) => {
        let permission: JournalPermission = JournalPermission.None;

        if (writeTableInput.checked) {
          permission = JournalPermission.Write;
        } else if (readTableInput.checked) {
          permission = JournalPermission.Read;
        }

        grantTable(permission);
      });

      container
        .querySelectorAll(".share-table .read input")
        .forEach((read: HTMLInputElement) => {
          read.addEventListener("change", (e: Event) => {
            const userId: number = parseInt(read.dataset.userId, 10);

            if (page.sharing) {
              if (
                page.sharing.table === JournalPermission.Read ||
                page.sharing.table === JournalPermission.Write
              ) {
                // already shared to the whole table, disable updating
                read.checked = true;
                return;
              }
            }

            const permission: JournalPermission = read.checked
              ? JournalPermission.Read
              : JournalPermission.None;

            grantUser(userId, permission);
          });
        });

      container
        .querySelectorAll(".share-table .write input")
        .forEach((write: HTMLInputElement) => {
          write.addEventListener("change", (e: Event) => {
            const userId: number = parseInt(write.dataset.userId, 10);

            if (page.sharing) {
              if (page.sharing.table === JournalPermission.Write) {
                // already shared to the whole table, disable updating
                write.checked = true;
                return;
              }
            }

            let permission: JournalPermission = JournalPermission.None;

            const read: HTMLInputElement = write
              .closest(".perm-col")
              .querySelector(".read input");

            if (write.checked) {
              permission = JournalPermission.Write;
            } else {
              if (read.checked) {
                permission = JournalPermission.Read;
              }
            }

            grantUser(userId, permission);
          });
        });

      this.updateSharing(popin);
    });
  }

  protected updateSharing(popin: Popin) {
    const page: PageData = popin.page;
    const sharing: JournalSharing = page.sharing;

    const tableRead: HTMLElement = popin
      .getElement()
      .querySelector(".journal-footer .btn-share-read");

    const tableWrite: HTMLElement = popin
      .getElement()
      .querySelector(".journal-footer .btn-share-write");

    let gr = false; // global read
    let gw = false; // global write

    tableRead.classList.remove("global");

    if (sharing.table) {
      if (
        sharing.table === JournalPermission.Read ||
        sharing.table === JournalPermission.Write
      ) {
        gr = true;
      }

      if (sharing.table === JournalPermission.Write) {
        gr = true;
        gw = true;

        tableRead.classList.add("global");
      }
    }

    tableRead.querySelector("input").checked = gr;
    tableWrite.querySelector("input").checked = gw;

    popin
      .getElement()
      .querySelectorAll(".permission-entry")
      .forEach((entry: HTMLElement) => {
        const userId: number = parseInt(entry.dataset.userId, 10);
        const readContainer: HTMLElement = entry.querySelector(".read");
        const writeContainer: HTMLElement = entry.querySelector(".write");
        const read: HTMLInputElement = entry.querySelector(".read input");
        const write: HTMLInputElement = entry.querySelector(".write input");
        let r = false;
        let w = false;

        readContainer.classList.remove("global");
        writeContainer.classList.remove("global");

        if (sharing.table) {
          if (
            sharing.table === JournalPermission.Write ||
            sharing.table === JournalPermission.Read
          ) {
            r = true;
            readContainer.classList.add("global");
          }

          if (sharing.table === JournalPermission.Write) {
            w = true;
            writeContainer.classList.add("global");
          }
        }

        if (sharing.users && sharing.users[userId]) {
          const permission: JournalPermission = sharing.users[userId];

          if (
            permission === JournalPermission.Read ||
            permission === JournalPermission.Write
          ) {
            r = true;
          }

          if (permission === JournalPermission.Write) {
            w = true;
          }
        }

        read.checked = r;
        write.checked = w;
      });
  }

  protected displayPopinView(popin: Popin, cb: Function = null) {
    popin.mode = PagePopinMode.Read;
    popin.height = 500;
    popin.width = 600;

    const page: PageData = popin.page;

    const html: string = Template.render("journal/read.html.njk", {
      page: page,
    });

    const tabPane: HTMLElement = this.enablePopinPane(popin, "view");

    tabPane.innerHTML = html;

    const container: HTMLElement = tabPane.querySelector(".content");

    if (page.type == "pdf") {
      container.innerHTML = Template.render("journal/pdf.html.njk", {
        page: page,
      });

      popin.onHtmlUpdate();

      return;
    }

    this.initPageLinks(popin);
    this.initPageTables(popin);

    popin.onHtmlUpdate();
  }

  protected roll(formula: string, title = "") {
    return this.getChatEmitter().roll(formula, null, title);
  }

  protected async displayPopinEdit(popin: Popin, cb: Function = null) {
    popin.mode = PagePopinMode.Write;
    popin.height = 550;
    popin.closeOver();

    const page: PageData = popin.page;

    const html: string = Template.render("journal/edit.html.njk", {
      page: page,
      tagsAsString: page.tags.join(", "),
      isAuthor: page.author_id == this.getUserState().id,
      icons: journalIcons,
    });

    const pane: HTMLElement = this.enablePopinPane(popin, "edit");

    pane.innerHTML = html;

    const popinElement: HTMLElement = popin.getElement();
    const editorContainer: HTMLElement = popinElement.querySelector(".content");
    const titleElement: HTMLInputElement =
      popinElement.querySelector('[name="title"]');
    const tagsElement: HTMLInputElement =
      popinElement.querySelector('[name="tags"]');
    const icons: NodeListOf<HTMLAnchorElement> =
      pane.querySelectorAll(".icons .icon");

    icons.forEach((htmlIcon: HTMLAnchorElement) => {
      htmlIcon.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        const icon: JournalIcon = htmlIcon.dataset.icon as JournalIcon;

        this.getClient().send("journal", "changeIcon", {
          id: page.id,
          icon: icon,
        });
      });
    });

    titleElement.addEventListener("change", () => {
      this.saveContents(
        page.id,
        {
          title: titleElement.value,
        },
        () => {
          popin.title = titleElement.value;
        }
      );
    });

    tagsElement.addEventListener("change", () => {
      this.saveContents(
        page.id,
        {
          tags: tagsElement.value,
        },
        () => {
          return;
        }
      );
    });

    let editor: Editor;

    if (page.type == "editor") {
      editor = await this.getEditorManager().create(editorContainer);
      this.resizeEditor(popin);

      editor.onSave((data: string) => {
        return new Promise((resolve: Function, reject: Function) => {
          this.saveContents(
            page.id,
            {
              content: data,
              title: titleElement.value,
              tags: tagsElement.value,
            },
            () => {
              resolve();
            }
          );
        });
      });

      popin.editor = editor;
    }

    popin.onHtmlUpdate();

    if (cb) {
      cb(popin, editor);
    }
  }

  protected saveContents(id: number, values: any, callback: Function) {
    const popin: Popin = this.getPopinManager().get(
      "journal-page-" + id.toString()
    );

    const previousTitle: string = popin.title;
    popin.icon = "fas fa-spinner fa-spin";

    setTimeout(() => {
      popin.icon = popin.originalIcon;
    }, 750);

    this.getClient().get(
      "journal",
      "save",
      {
        id: id,
        values: values,
      },
      callback
    );
  }

  public openCreatePage(folderId: number = null): Promise<Popin> {
    return new Promise((resolve: Function) => {
      this.getClient().get(
        "journal",
        "create",
        {
          folderId: folderId,
          title: this.__("New entry"),
        },
        (response) => {
          this.loadList(JournalScope.Owned).catch((e) => console.error(e));

          return resolve(
            this.openPage({
              id: response.id,
              title: this.__("New entry"),
              edit: true,
            })
          );
        }
      );
    });
  }

  public openCreateImage(title: string, onReady: Function = null) {
    this.getClient().get(
      "journal",
      "create",
      {
        folderId: null,
        title: title,
      },
      (response) => {
        return this.openPage({
          id: response.id,
          title: title,
          edit: true,
          onReady: onReady,
        });
      }
    );
  }

  public async onSharingUpdate(
    id: number,
    sharing: JournalSharing,
    isOwner: boolean
  ) {
    const pagePermission: JournalPermission = this.getPagePermission(
      sharing,
      isOwner
    );
    const popin: Popin = this.getPopinManager().get(
      JournalView.buildPopinId(id)
    );

    if (!popin) {
      return;
    }

    const container: HTMLElement = popin.getElement();
    const tabs: HTMLElement = container.querySelector("nav.tabs");

    switch (pagePermission) {
      case JournalPermission.None:
        if (popin.editor) {
          try {
            await (<Editor>popin.editor).destroy();
          } catch (e) {
            console.error("Could not destroy journal editor");
          }
        }

        popin.close(true);
        break;

      case JournalPermission.Read:
        tabs.classList.add("d-none");
        this.displayPopinView(popin);
        break;

      case JournalPermission.Write:
        tabs.classList.remove("d-none");
        break;
    }

    if (!isOwner) {
      const shareTab: HTMLLIElement = tabs
        .querySelector('[data-pane="share"]')
        .closest("li");

      shareTab.classList.add("d-none");
    }
  }

  protected getPagePermission(
    sharing: JournalSharing,
    isOwner = false
  ): JournalPermission {
    let permission: JournalPermission = JournalPermission.None;

    if (isOwner) {
      return JournalPermission.Write;
    }

    if (sharing.table) {
      if (sharing.table === JournalPermission.Write) {
        return JournalPermission.Write;
      }
    }

    const uid: number = this.getUserState().id;

    if (sharing.users && sharing.users[uid]) {
      permission = sharing.users[uid];

      if (permission === JournalPermission.Write) {
        return permission;
      }
    }

    if (sharing.table && permission === JournalPermission.None) {
      if (sharing.table === JournalPermission.Read) {
        permission = JournalPermission.Read;
      }
    }

    return permission;
  }

  public update(id: number, values: any) {
    const popin: Popin = this.getPopinManager().get(
      "journal-page-" + id.toString()
    );

    if (!popin) {
      return;
    }

    const $element = popin.getjQueryElement();

    if (values.title) {
      popin.title = values.title;
      $element.find('input[name="title"]').val(values.title);
    }

    if (values.tags) {
      $element.find('input[name="tags"]').val(values.tags);
    }
  }

  protected buildSharingCache(data: FolderData) {
    const cache: SharingCache = {
      folders: {},
      entries: {},
    };

    const inspect = (folder: FolderData) => {
      cache.folders[folder.id] = folder.sharing;

      if (folder.pages) {
        for (const page of folder.pages) {
          cache.entries[page.id] = page.sharing;
        }
      }

      if (folder.folders) {
        for (const subfolder of folder.folders) {
          inspect(subfolder);
        }
      }
    };

    inspect(data);

    this.sharing = cache;
  }

  protected getSharingCache(
    type: "folder" | "entry",
    id: number
  ): JournalSharing {
    if (type === "folder") {
      return this.sharing.folders?.[id];
    }

    if (type === "entry") {
      return this.sharing.entries?.[id];
    }

    return null;
  }

  protected getEveryoneButMe(): BasicUser[] {
    if (!this.everyone) {
      return [];
    }

    const meId: number = this.getUserState().id;

    return this.everyone.filter((user: BasicUser) => {
      return user.id !== meId;
    });
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTableState(): TableState {
    return container.get<TableState>(States.Table);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }

  protected getEditorManager(): EditorManager {
    return container.get<EditorManager>(Services.EditorManager);
  }

  protected getChatEmitter(): ChatEmitter {
    return container.get<ChatEmitter>(Emitters.Chat);
  }
}

enum PagePopinMode {
  Read = "read",
  Write = "write",
  Share = "share",
}

interface UploadError {
  message: string;
  code: number;
}

enum JournalVisibility {
  Table = "table",
  All = "all",
}

enum JournalScope {
  Owned = "owned",
  Shared = "shared",
}

type JournalIndex = Array<JournalIndexEntry>;

interface ScopedSharingCache {
  [id: number]: JournalSharing;
}

interface SharingCache {
  folders: ScopedSharingCache;
  entries: ScopedSharingCache;
}

interface JournalIndexEntry {
  id: number;
  tokens: string;
}

interface JournalIndexes {
  [JournalScope.Owned]: JournalIndex;
  [JournalScope.Shared]: JournalIndex;
}

interface OpenPageConfiguration {
  id: number | string;
  data?: PageLoadedData;
  title?: string;
  edit?: boolean;
  onReady?: Function;
}

interface PageLoadedData {
  page: PageData;
  permissions: JournalPermission;
}

interface JournalPreferences {
  activeTab: JournalScope;
  [JournalScope.Owned]: JournalScopePreferences;
  [JournalScope.Shared]: JournalScopePreferences;
}

interface JournalFolderIndex {
  [id: number]: boolean;
}

interface JournalScopePreferences {
  folders: JournalFolderIndex;
  active?: number;
}

enum JournalFolderAction {
  CreateFolder = "create-folder",
  Rename = "rename",
  Delete = "delete",
  CreateEntry = "create-entry",
  Upload = "upload",
  ShowShareUsers = "show-share-users",
}

enum JournalEntryAction {
  Open = "open",
  Rename = "rename",
  Reveal = "reveal",
  Delete = "delete",
  ShowShareUsers = "show-share-users",
}

interface JournalIconItem {
  type: JournalIcon;
  icon: string;
  svgUrl: string;
}

export const journalIcons: JournalIconItem[] = [
  {
    type: JournalIcon.Page,
    icon: "fas fa-file-alt",
    svgUrl: "/assets/img/journal/file-alt-solid-fixed.svg",
  },
  {
    type: JournalIcon.Note,
    icon: "fas fa-book",
    svgUrl: "/assets/img/journal/book-solid-fixed.svg",
  },
  {
    type: JournalIcon.Person,
    icon: "fas fa-user-circle",
    svgUrl: "/assets/img/journal/user-circle-solid-fixed.svg",
  },
  {
    type: JournalIcon.Place,
    icon: "fas fa-map-marker-alt",
    svgUrl: "/assets/img/journal/map-marker-alt-solid-fixed.svg",
  },
  {
    type: JournalIcon.Clue,
    icon: "fas fa-search",
    svgUrl: "/assets/img/journal/search-solid-fixed.svg",
  },
];

interface SharedWithItem {
  name: string;
  subtitle?: string;
  permission: JournalPermission;
}
