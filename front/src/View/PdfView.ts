import { injectable } from "inversify";
import { View } from "./View";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { JournalView } from "./JournalView";
import { Editor } from "./Journal/EditorManager";

@injectable()
export class PdfView extends View {
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  protected lookupParams: any = {
    page: 1,
    q: null,
    type: null,
  };

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("PDF Library"),
      "fas fa-file-pdf",
      TaskBarCategory.Content
    );

    this.view = new DockableView({
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      title: this.__("PDF Library"),
      id: "pdf",
      html: Template.render("pdf/container.html.njk", {}),
      icon: "fas fa-file-pdf",
      defaultConfiguration: {
        index: 7,
        hidden: true,
        minimized: true,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getTaskBarView().add(this.taskBarItem);
    this.getUi().register(this.view);

    document.body.addEventListener("click", (e: MouseEvent) => {
      if ($(e.target).parents(".pdf-popover").length === 0) {
        this.closeAllPopovers();
      }
    });

    const popover: any = $.fn.popover;

    popover.Constructor.Default.whiteList.input = [
      "class",
      "placeholder",
      "type",
    ];
    popover.Constructor.Default.whiteList.form = ["action", "method", "class"];
    popover.Constructor.Default.whiteList.button = ["class", "type"];

    this.initDock();
  }

  protected initDock() {
    const searchInput: HTMLInputElement =
      this.view.container.querySelector(".search-input");

    let searchTimeout: any = null;

    searchInput.addEventListener("keyup", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        let val: string = searchInput.value;
        val = val.trim();

        if (!val) {
          val = null;
        }

        this.lookupParams.q = val;
        this.load();
      }, 500);
    });
  }

  public closeAllPopovers() {
    document
      .querySelectorAll(".pdf-entry")
      .forEach((entry: HTMLAnchorElement) => {
        $(entry).popover("hide");
      });
  }

  public load() {
    this.getClient().get("pdf", "lookup", this.lookupParams, (response) =>
      this.lookup(response)
    );
  }

  public lookup(response: any) {
    const container: HTMLElement = this.view.container.querySelector(
      ".pdf-lookup-container"
    );
    const index: any = {};

    for (const pdf of response.pdfs) {
      index[pdf.id] = pdf;

      if (pdf.published_at) {
        pdf.published_at = new Date(pdf.published_at).toLocaleDateString(
          window["locale"]
        );
      }

      if (pdf.locale) {
        const languageNames = new Intl.DisplayNames([window["locale"]], {
          type: "language",
        });
        pdf.locale_name = languageNames.of(pdf.locale);
      }
    }

    container.innerHTML = Template.render("pdf/lookup.html.njk", {
      pdfs: response.pdfs,
      pages: response.pages,
      page: response.page,
      total: response.total,
    });

    container
      .querySelectorAll(".pagination-page")
      .forEach((pageLink: HTMLAnchorElement) => {
        pageLink.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();
          const page: number = parseInt(pageLink.dataset.page, 10);

          this.lookupParams.page = page;
          this.load();
        });
      });

    container.querySelectorAll(".pdf-entry").forEach((entry: HTMLElement) => {
      const pdf: any = index[entry.dataset.id];

      $(entry).popover({
        container: "body",
        content: Template.render("pdf/popover.html.njk", {
          pdf: pdf,
        }),
        html: true,
        placement: "left",
        title: pdf.title,
        boundary: "window",
        customClass: "pdf-popover",
      });

      $(entry).on("shown.bs.popover", () => {
        const popId: string = entry.attributes["aria-describedby"].value;
        const popOver: HTMLElement = document.getElementById(popId);
        const searchForm: HTMLFormElement = popOver.querySelector(
          "form.pdf-search-form"
        );
        const searchInput: HTMLInputElement = <HTMLInputElement>(
          searchForm.querySelector(".pdf-search")
        );

        searchForm.addEventListener("submit", (e: Event) => {
          e.preventDefault();

          const q: string = searchInput.value;

          this.openPdfPopin(parseInt(entry.dataset.id, 10), pdf.title, q);
          this.closeAllPopovers();
        });

        popOver
          .querySelectorAll(".pdf-file")
          .forEach((pdfFile: HTMLElement) => {
            pdfFile.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const fileId: number = parseInt(pdfFile.id.split("-").pop(), 10);

              this.openReadPopin(pdf.id, fileId);
              this.closeAllPopovers();
            });
          });

        searchInput.focus();
      });

      entry.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.closeAllPopovers();
        $(entry).popover("show");
      });
    });
  }

  public openPdfPopin(pdfId: number, title: string, q: string = null) {
    const popinId: string = "pdf-" + pdfId.toString(10);

    let popin: Popin = this.getPopinManager().get(popinId);

    const search = (query: string) => {
      this.getClient().get(
        "pdf",
        "search",
        {
          pdfid: pdfId,
          q: query,
        },
        (response: any) => {
          const elt: HTMLElement = popin.getElement();
          const main: HTMLElement = elt.querySelector("main");
          const content: HTMLElement = main.querySelector(".pdf-content");

          content.innerHTML = Template.render("pdf/search-result.html.njk", {
            result: response.result,
          });

          content
            .querySelectorAll(".page-btn")
            .forEach((pageBtn: HTMLAnchorElement) => {
              pageBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                const fileId: number = parseInt(pageBtn.dataset.fileid, 10);
                const page: number = parseInt(pageBtn.dataset.page, 10);

                this.openPage(pdfId, fileId, page);
              });
            });

          content
            .querySelectorAll(".full-btn")
            .forEach((pageBtn: HTMLAnchorElement) => {
              pageBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                const fileId: number = parseInt(pageBtn.dataset.fileid, 10);
                const page: number = parseInt(pageBtn.dataset.page, 10);

                this.openReadPopin(pdfId, fileId, page);
              });
            });
        }
      );
    };

    const display = () => {
      const elt: HTMLElement = popin.getElement();
      const main: HTMLElement = elt.querySelector("main");
      popin.title = title;

      this.getClient().get(
        "pdf",
        "files",
        {
          pdfid: pdfId,
        },
        (response: any) => {
          main.innerHTML = Template.render("pdf/search.html.njk", {
            files: response.files,
          });

          main
            .querySelector("form.pdf-search-form")
            .addEventListener("submit", (e) => {
              e.preventDefault();

              const input: HTMLInputElement = <HTMLInputElement>(
                main.querySelector('input[type="search"]')
              );
              const query: string = input.value;
              search(query);
            });

          main.querySelectorAll(".pdf-file").forEach((file: HTMLElement) => {
            file.addEventListener("click", (e: MouseEvent) => {
              if (file.dataset.id) {
                e.preventDefault();
                const fileId: number = parseInt(file.dataset.id, 10);

                this.openReadPopin(pdfId, fileId);
              } else {
                // download
              }
            });
          });

          if (q != null) {
            const input: HTMLInputElement = <HTMLInputElement>(
              main.querySelector('input[type="search"]')
            );
            input.value = q;
            search(q);
          }
        }
      );
    };

    if (!popin) {
      popin = this.getPopinManager().create({
        id: popinId,
        title: title,
        height: 750,
        canDock: false,
        canMinimize: false,
      });

      popin.on("init", () => {
        display();
      });
    } else {
      display();
    }

    popin.open();
  }

  public openReadPopin(pdfId: number, fileId: number, page: number = null) {
    const popinId: string = "pdf-" + pdfId.toString(10);

    let popin: Popin = this.getPopinManager().get(popinId);

    const display = () => {
      this.getClient().get(
        "pdf",
        "file",
        {
          pdfid: pdfId,
          fileid: fileId,
        },
        (response: any) => {
          const main: HTMLElement = popin.getElement().querySelector("main");

          popin.title = response.file.filename;

          main.innerHTML = Template.render("pdf/read.html.njk", {
            pdf: response.pdf,
            file: response.file,
            page: page,
          });

          main
            .querySelector(".back-btn")
            .addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              this.openPdfPopin(response.pdf.id, response.pdf.title);
            });

          main
            .querySelector("form.pdf-search-form")
            .addEventListener("submit", (e) => {
              e.preventDefault();

              const input: HTMLInputElement = <HTMLInputElement>(
                main.querySelector('input[type="search"]')
              );
              const query: string = input.value;

              this.openPdfPopin(pdfId, response.pdf.title, query);
            });
        }
      );
    };

    if (!popin) {
      popin = this.getPopinManager().create({
        id: popinId,
        height: 750,
        canDock: false,
        canMinimize: false,
      });

      popin.on("init", () => {
        display();
      });
    } else {
      display();
    }

    popin.open();
  }

  public openPage(pdfId: number, fileId: number, page: number) {
    const popinId: string = "pdf-" + pdfId.toString(10);

    let popin: Popin = this.getPopinManager().get(popinId);

    const display = () => {
      this.getClient().get(
        "pdf",
        "file",
        {
          pdfid: pdfId,
          fileid: fileId,
        },
        (response: any) => {
          const main: HTMLElement = popin.getElement().querySelector("main");

          popin.title = response.file.filename;

          main.innerHTML = Template.render("pdf/page.html.njk", {
            pdf: response.pdf,
            file: response.file,
            page: page,
          });

          main
            .querySelector(".back-btn")
            .addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              this.openPdfPopin(response.pdf.id, response.pdf.title);
            });

          main
            .querySelector(".share-btn")
            .addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              this.createJournalPage(
                response.file.filename,
                pdfId,
                fileId,
                page
              );
            });

          main
            .querySelectorAll(".page-btn")
            .forEach((pageBtn: HTMLAnchorElement) => {
              pageBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                const page: number = parseInt(pageBtn.dataset.page, 10);

                this.openPage(pdfId, fileId, page);
              });
            });
        }
      );
    };

    if (!popin) {
      popin = this.getPopinManager().create({
        id: popinId,
        height: 750,
        canDock: false,
        canMinimize: false,
      });

      popin.on("init", () => {
        display();
      });
    } else {
      display();
    }

    popin.open();
  }

  public createJournalPage(
    title: string,
    pdfId: number,
    fileId: number,
    page: number
  ) {
    const src: string =
      window["configuration"]["pdfUrl"] + `/page/${fileId}/${page}/image`;

    this.getJournalView().openCreateImage(
      title,
      (popin: Popin, editor: Editor) => {
        fetch(src, {
          credentials: "include",
        })
          .then((res: Response) => {
            return res.arrayBuffer();
          })
          .then((buf: ArrayBuffer) => {
            return new File([buf], "pdf-page.jpg", { type: "image/jpeg" });
          })
          .then((file: File) => {
            editor.insertImageFile(file);
          });
      }
    );
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getJournalView(): JournalView {
    return container.get<JournalView>(Views.Encyclopedia);
  }
}

export enum PdfOpenMode {
  Content = "content",
  Search = "search",
}
