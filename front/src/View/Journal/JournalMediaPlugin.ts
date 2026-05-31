import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import { ButtonView } from "@ckeditor/ckeditor5-ui";
import { container } from "../../DependencyInjection/Container";
import { Views } from "../../DependencyInjection/Views";
import { MediaView } from "../MediaView";
import { Editor } from "@ckeditor/ckeditor5-core";
import { Template } from "../Template";

export class JournalMediaPlugin extends Plugin {
  init() {
    const editor = this.editor as Editor;

    editor.ui.componentFactory.add("media", (locale) => {
      const view = new ButtonView(locale);

      view.set({
        label: Template.__("Media Manager"),
        tooltip: true,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M608 0H160a32 32 0 0 0-32 32v96h160V64h192v320h128a32 32 0 0 0 32-32V32a32 32 0 0 0-32-32zM232 103a9 9 0 0 1-9 9h-30a9 9 0 0 1-9-9V73a9 9 0 0 1 9-9h30a9 9 0 0 1 9 9zm352 208a9 9 0 0 1-9 9h-30a9 9 0 0 1-9-9v-30a9 9 0 0 1 9-9h30a9 9 0 0 1 9 9zm0-104a9 9 0 0 1-9 9h-30a9 9 0 0 1-9-9v-30a9 9 0 0 1 9-9h30a9 9 0 0 1 9 9zm0-104a9 9 0 0 1-9 9h-30a9 9 0 0 1-9-9V73a9 9 0 0 1 9-9h30a9 9 0 0 1 9 9zm-168 57H32a32 32 0 0 0-32 32v288a32 32 0 0 0 32 32h384a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32zM96 224a32 32 0 1 1-32 32 32 32 0 0 1 32-32zm288 224H64v-32l64-64 32 32 128-128 96 96z"/></svg>',
      });

      const getMediaView = (): MediaView => {
        return container.get<MediaView>(Views.Media);
      };

      view.on("execute", () => {
        getMediaView().openMediaManager((id: string, url: string) => {
          editor.model.change((writer) => {
            const imageElement = writer.createElement("imageBlock", {
              src: url,
            });

            editor.model.insertContent(
              imageElement,
              editor.model.document.selection
            );
          });
        });
      });

      return view;
    });
  }
}
