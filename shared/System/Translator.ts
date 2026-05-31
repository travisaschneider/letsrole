import { injectable } from "inversify";
import { Tree } from "./Tree";
import { View } from "./Component/View";
import { Component } from "./Component/Component";
import { CharacterSheet } from "./CharacterSheet";

export interface Translations {
  [locale: string]: Translation;
}

export interface Translation {
  [message: string]: string;
}

@injectable()
export class Translator {
  protected _messages: string[] = [];
  protected _translations: Translations = {};
  protected _current = "en";
  protected _defaultLocale = "en";

  public translate(message: string, locale: string = null) {
    if (!locale) {
      locale = this.current;
    }

    if (!this._translations[locale]) {
      return message;
    }

    if (!this._translations[locale][message]) {
      return message;
    }

    return this._translations[locale][message];
  }

  public set current(current: string) {
    this._current = current;
  }

  public get current(): string {
    return this._current;
  }

  public set messages(messages: string[]) {
    this._messages = messages;
  }

  public get messages() {
    return this._messages;
  }

  public get defaultLocale(): string {
    return this._defaultLocale;
  }

  public set defaultLocale(locale: string) {
    this._defaultLocale = locale;
  }

  public setEntry(locale: string, message: string, translation: string) {
    if (translation == "") {
      delete this._translations[locale][message];
      return;
    }

    if (this._messages.indexOf(message) < 0) {
      console.log(`Unknow message ${message}`);
      return;
    }

    if (!translation) {
      translation = "";
    }

    this._translations[locale][message] = translation;
  }

  public setTranslation(locale: string, translation: Translation) {
    if (Array.isArray(translation)) {
      translation = {};
    }

    this._translations[locale] = translation;
  }

  public getTranslation(locale: string): Translation {
    return this._translations[locale];
  }

  public getTranslations(): Translations {
    return this._translations;
  }

  public hasTranslation(locale: string): boolean {
    return this._translations[locale] !== undefined;
  }

  public getFullTranslation(locale: string): any[] {
    const translations = [];
    const already = this.getTranslation(locale);

    this.messages.forEach((message: string) => {
      let value = "";

      if (already[message]) {
        value = already[message];
      }

      const hash = this.hash(message).toString(10);

      translations.push({
        hash: hash,
        source: message,
        translation: value,
      });
    });

    return translations;
  }

  protected hash(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash;
  }

  public addMessage(message: string, before = false) {
    if (this._messages.indexOf(message) < 0) {
      if (before) {
        this._messages.unshift(message);
        return;
      }

      this._messages.push(message);
    }
  }

  public removeAt(index: number) {
    this._messages.splice(index, 1);
  }

  public extractMessages(tree: Tree): string[] {
    const all: string[] = [];
    const sheet: CharacterSheet = new CharacterSheet({}, tree, null);

    tree.viewSources.forEach((viewSource: any) => {
      const view: View = tree.createView(viewSource.id, sheet);

      if (view.craft && all.indexOf(view.name) < 0) {
        all.push(view.name);
      }

      const components = view.flatten();

      for (const j in components) {
        const component: Component = components[j];
        const messages: string[] = component.extractMessages();

        messages.forEach((message: string) => {
          if (message === null || message === undefined) {
            return;
          }

          if (message !== "" && all.indexOf(message) < 0) {
            all.push(message);
          }
        });
      }
    });

    return all;
  }
}
