import { injectable } from "inversify";
import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor";
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials";
import UploadAdapter from "@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter";
import Autoformat from "@ckeditor/ckeditor5-autoformat/src/autoformat";
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold";
import Autosave from "@ckeditor/ckeditor5-autosave/src/autosave";
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic";
import BlockQuote from "@ckeditor/ckeditor5-block-quote/src/blockquote";
import EasyImage from "@ckeditor/ckeditor5-easy-image/src/easyimage";
import Heading from "@ckeditor/ckeditor5-heading/src/heading";
import Image from "@ckeditor/ckeditor5-image/src/image";
import ImageCaption from "@ckeditor/ckeditor5-image/src/imagecaption";
import ImageStyle from "@ckeditor/ckeditor5-image/src/imagestyle";
import ImageToolbar from "@ckeditor/ckeditor5-image/src/imagetoolbar";
import ImageUpload from "@ckeditor/ckeditor5-image/src/imageupload";
import Link from "@ckeditor/ckeditor5-link/src/link";
import List from "@ckeditor/ckeditor5-list/src/list";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph";
import CloudServices from "@ckeditor/ckeditor5-cloud-services/src/cloudservices";
import Alignment from "@ckeditor/ckeditor5-alignment/src/alignment";
import Font from "@ckeditor/ckeditor5-font/src/font";
import Table from "@ckeditor/ckeditor5-table/src/table.js";
import TableCellProperties from "@ckeditor/ckeditor5-table/src/tablecellproperties";
import TableProperties from "@ckeditor/ckeditor5-table/src/tableproperties";
import TableToolbar from "@ckeditor/ckeditor5-table/src/tabletoolbar";
import MediaEmbed from "@ckeditor/ckeditor5-media-embed/src/mediaembed";
import Clipboard from "@ckeditor/ckeditor5-clipboard/src/clipboard";
import { JournalUploadAdapter } from "./JournalUploadAdapter";
import { JournalRollPlugin } from "./JournalRollPlugin";
import { JournalMediaPlugin } from "./JournalMediaPlugin";

@injectable()
export class EditorManager {
  public constructor() {
    ClassicEditor.builtinPlugins = [
      Essentials,
      UploadAdapter,
      Clipboard,
      Autosave,
      Autoformat,
      Bold,
      Italic,
      BlockQuote,
      EasyImage,
      Heading,
      Image,
      ImageCaption,
      ImageStyle,
      ImageToolbar,
      ImageUpload,
      Link,
      List,
      Paragraph,
      CloudServices,
      Alignment,
      Font,
      Table,
      TableCellProperties,
      TableProperties,
      TableToolbar,
      MediaEmbed,
      JournalRollPlugin,
      JournalMediaPlugin,
    ];
  }

  public create(container: HTMLElement): Promise<any> {
    const JournalUploadPlugin = function (editor: any) {
      editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
        return new JournalUploadAdapter(loader);
      };
    };

    return ClassicEditor.create(container, {
      toolbar: [
        {
          label: "Styles",
          icon: "text",
          items: ["heading", "bold", "italic", "alignment", "fontColor"],
        },
        "bulletedList",
        "blockQuote",
        "|",
        "link",
        "mediaEmbed",
        "insertTable",
        "imageUpload",
        "roll",
        "media",
        "|",
        "undo",
        "redo",
      ],
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      mediaEmbed: {
        previewsInData: true,
      },
      autosave: {
        waitingTime: 5000, // in ms
        save(editor) {
          if (editor.custominstance) {
            return editor.custominstance.saveFunction(
              editor.getData(),
              editor.custominstance
            );
          }
        },
      },
      extraPlugins: [JournalUploadPlugin],
    } as unknown).then((editor: any) => {
      return new Editor(editor);
    });
  }
}

export class Editor {
  protected ckeditor: any;

  public saveFunction: Function;
  public isEdited = false;

  public constructor(ckeditor: any) {
    this.ckeditor = ckeditor;
    this.initEvents();
    this.ckeditor.custominstance = this;
  }

  public insertImageFile(file: File) {
    this.ckeditor.execute("uploadImage", {
      file: file,
    });
  }

  protected initEvents() {
    this.ckeditor.model.document.on("change:data", (evt, data) => {
      this.isEdited = true;
    });
  }

  public onSave(save: Function) {
    this.saveFunction = save;
  }

  public getData(): string {
    return this.ckeditor.getData();
  }

  public destroy(): Promise<void> {
    try {
      return this.ckeditor
        .destroy()
        .then(() => {
          this.ckeditor.ui.view.toolbar.element.remove();
          this.ckeditor.ui.view.editable.element.remove();
          this.ckeditor = null;
        })
        .catch((e) => {
          console.error(e);
        });
    } catch (e) {
      console.error(e);
    }
  }

  public saved() {
    this.isEdited = false;
  }
}
