import { injectable } from "inversify";
import { View } from "./View";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { View as SystemView } from "../../shared/System/Component/View";
import { Tree } from "../../shared/System/Tree";
import { Popin } from "./Popin/Popin";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { BookCraftSheet } from "../../shared/System/BookCraftSheet";
import { CraftView } from "./CraftView";

@injectable()
export class BookView extends View {
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;
  protected books: any[];
  protected searchInput: HTMLInputElement;
  protected goBackBtn: HTMLAnchorElement;

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Book"),
      "fas fa-books",
      TaskBarCategory.Content
    );

    this.view = new DockableView({
      id: "books",
      title: this.__("Books"),
      html: Template.render("book/dock.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      icon: "fas fa-books",
      defaultConfiguration: {
        index: 10,
        hidden: true,
        minimized: false,
        mode: ViewOpenMode.DockRight,
      },
    });

    this.getUi().register(this.view);
    this.getTaskBarView().add(this.taskBarItem);

    this.initDock();
  }

  protected initDock() {
    this.searchInput = this.view.container.querySelector(".search-input");
    this.goBackBtn = this.view.container.querySelector(".go-back-btn");

    let searchTimeout: any = null;

    this.searchInput.addEventListener("keyup", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        this.search(this.searchInput.value);
      }, 250);
    });

    this.goBackBtn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      this.displayBooksIndex();
    });
  }

  public search(q: string, bookId: number = null, page = 1) {
    this.getClient().get(
      "book",
      "search",
      {
        q: q,
        page: page,
      },
      (response) => {
        this.renderListing(response);

        this.getContent()
          .querySelectorAll(".page-action")
          .forEach((pageLink: HTMLAnchorElement) => {
            pageLink.addEventListener("click", (e) => {
              e.preventDefault();
              const newPage: number = parseInt(pageLink.dataset.page, 10);

              this.search(q, bookId, newPage);
            });
          });
      }
    );
  }

  public displayBooksIndex() {
    this.searchInput.placeholder = this.__("Find anything...");
    this.searchInput.style.height = "auto";
    this.goBackBtn.classList.add("d-none");

    this.getContent().innerHTML = Template.render("book/list.html.njk", {
      books: this.books,
    });

    this.getContent()
      .querySelectorAll(".book-entry")
      .forEach((book: HTMLElement) => {
        book.addEventListener("click", (e) => {
          const id: number = parseInt(book.dataset.id, 10);
          this.displayBook(id);
        });
      });
  }

  public displayBook(id: number, page = 1) {
    const book: any = this.getBookData(id);
    this.searchInput.placeholder = this.__("Find in %{book}...", {
      book: book.name,
    });
    this.searchInput.style.height = "100%";
    this.goBackBtn.classList.remove("d-none");

    this.getClient().get(
      "book",
      "listing",
      {
        id: id,
        page: page,
      },
      (response) => {
        this.renderListing(response);

        this.getContent()
          .querySelectorAll(".page-action")
          .forEach((pageLink: HTMLAnchorElement) => {
            pageLink.addEventListener("click", (e) => {
              e.preventDefault();
              const newPage: number = parseInt(pageLink.dataset.page, 10);

              this.displayBook(id, newPage);
            });
          });
      }
    );
  }

  public renderListing(response: any) {
    const craftTypes: SystemView[] = this.getTree().getCrafts();
    const craftViews: any = {};

    craftTypes.forEach((craftType: SystemView) => {
      craftViews[craftType.id] = craftType;
    });

    const vars = response;
    vars.craftViews = craftViews;
    vars.hasPrevious = false;
    vars.hasNext = false;
    vars.previousPage = 1;
    vars.nextPage = 1;

    if (response.page > 1) {
      vars.hasPrevious = true;
      vars.previousPage = response.page - 1;
    }

    if (response.page < response.pages) {
      vars.hasNext = true;
      vars.nextPage = response.page + 1;
    }

    this.getContent().innerHTML = Template.render(
      "book/content.html.njk",
      vars
    );

    this.getContent()
      .querySelectorAll(".book-item")
      .forEach((item: HTMLElement) => {
        const type: string = item.dataset.type;

        item.addEventListener("click", (e) => {
          e.preventDefault();
          switch (type) {
            case "craft": {
              const id: number = parseInt(item.dataset.id, 10);
              this.openCraft(id);
              break;
            }
          }
        });

        if (type === "craft" && item.querySelector(".drop-craft")) {
          item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("source", "book-craft-manager");
            e.dataTransfer.setData("type", "book-craft");
            e.dataTransfer.setData("id", item.dataset.id);
          });
        }
      });

    this.getContent()
      .querySelectorAll(".clone-craft")
      .forEach((cloneBtn: HTMLElement) => {
        cloneBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          const id: number = parseInt(cloneBtn.dataset.id, 10);

          this.cloneCraft(id);
        });
      });

    $(this.getContent().querySelectorAll(".with-tooltip")).tooltip({
      boundary: "window",
      container: "body",
    });
  }

  public openCraft(id: number) {
    const popin: Popin = this.getPopinManager().create({
      id: "book-craft-" + id.toString(10),
      title: "Craft",
      className: "sheet",
      html: Template.render("book/craft-popin.html.njk", {
        html: this.__("Loading..."),
      }),
      canDock: false,
      canMinimize: false,
    });

    popin.on("init", () => {
      this.getClient().get(
        "book",
        "loadCraft",
        {
          id: id,
        },
        (response) => {
          const craft: any = response.craft;
          popin.title = craft.name;

          craft.sheet = new BookCraftSheet(craft, this.getTree(), craft.view);

          const view: SystemView = this.getTree().createView(
            craft.view,
            craft.sheet
          ) as SystemView;
          view.readOnly = true;

          popin.width = parseFloat(view.width.toString()) + 40;
          popin.height = parseFloat(view.height.toString()) + 40;
          popin.getElement().querySelector(".craft-sheet-container").innerHTML =
            view.render();

          craft.sheet.init();

          const actions: HTMLElement = popin
            .getElement()
            .querySelector(".book-actions");

          actions.innerHTML = Template.render("book/craft-actions.html.njk", {
            craft: craft,
            view: view,
          });

          const cloneBtn: HTMLElement = actions.querySelector(".clone-btn");
          const dropBtn: HTMLElement = actions.querySelector(".drop-btn");
          const tokenBtn: HTMLElement = actions.querySelector(".token-btn");

          if (cloneBtn) {
            cloneBtn.addEventListener("click", (e) => {
              e.preventDefault();
              this.cloneCraft(id);
              popin.close();
            });
          }

          if (dropBtn) {
            console.log("json stringinfy", craft.data);
            dropBtn.addEventListener("dragstart", (e) => {
              e.dataTransfer.setData("bookcraftid", id.toString(10));
              e.dataTransfer.setData("viewId", view.id);
              e.dataTransfer.setData("data", JSON.stringify(craft.data));
            });
          }

          if (tokenBtn) {
            tokenBtn.addEventListener("dragstart", (e) => {
              e.dataTransfer.setData("source", "book-craft-manager");
              e.dataTransfer.setData("type", "book-craft");
              e.dataTransfer.setData("id", id.toString(10));
            });
          }
        }
      );
    });

    popin.open();
  }

  public cloneCraft(id: number) {
    this.getClient().get(
      "book",
      "cloneCraft",
      {
        id: id,
      },
      (response) => {
        this.getCraftView().open(response.id);
      }
    );
  }

  public setBooks(books: any[]) {
    this.books = books;

    if (books.length === 0) {
      this.view.hide();
      return;
    }

    this.displayBooksIndex();
  }

  protected getBookData(id: number): any | null {
    for (const i in this.books) {
      if (this.books[i].id === id) {
        return this.books[i];
      }
    }

    return null;
  }

  protected getContent(): HTMLElement {
    return this.view.container.querySelector(".books-content");
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getTree(): Tree {
    return container.get<Tree>("SystemTree");
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }
}
