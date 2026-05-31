import { View } from "../Component/View";
import { CharacterSheet } from "../CharacterSheet";
import { ObjectPath } from "../../Util/ObjectPath";
import { Label } from "../Component/Label";
import { Choice } from "../Component/Choice";
import { CharacterSheetContext } from "./CharacterSheetContext";
import { Component } from "../Component/Component";
import { ComputedEvent } from "./Event/ComputedEvent";
import { TooltipPlacement } from "../Component/TooltipPlacement";

export function ComponentContext(
  view: View,
  sheet: CharacterSheet,
  path: string
) {
  const getElement = () => {
    return sheet.getElement(path);
  };

  /* eslint-disable-next-line @typescript-eslint/no-this-alias */
  const t = this;

  const getComponent = () => {
    return view.find(path);
  };

  this.value = (value: any) => {
    if (value === undefined) {
      if (ObjectPath.has(sheet.computed, path)) {
        return ObjectPath.get(sheet.computed, path);
      }

      return sheet.getValue(path);
    } else {
      sheet.persist(path, value);
      sheet.update(path, value);
    }
  };

  this.rawValue = () => {
    return sheet.getRawValue(path);
  };

  this.virtualValue = (value: any) => {
    if (value === undefined) {
      if (ObjectPath.has(sheet.computed, path)) {
        return ObjectPath.get(sheet.computed, path);
      }

      return null;
    } else {
      sheet.setComputedValue(path, value);
    }
  };

  this.find = (id: string) => {
    return new ComponentContext(view, sheet, path + "." + id);
  };

  this.parent = () => {
    const current = getComponent();
    const parent = current.parent;

    if (!parent) {
      return null;
    }

    return new ComponentContext(view, sheet, parent.id);
  };

  this.text = (text: string) => {
    const element: HTMLElement = getElement();
    const component: Component | null = getComponent();

    if (text === undefined) {
      if (component instanceof Choice) {
        return component.getSelectedLabel();
      }

      return element.innerText;
    }

    element.innerText = text;

    if (component instanceof Label) {
      component.text = text;
    }
  };

  this.index = () => {
    const closest: HTMLElement = getElement().closest(
      '[data-widget-type="RepeaterElement"]'
    ) as HTMLElement;

    if (!closest) {
      return null;
    }

    return closest.dataset.rowId;
  };

  this.on = (...args) => {
    const allowed: string[] = [
      "click",
      "change",
      "update",
      "keyup",
      "mouseenter",
      "mouseleave",
      "focus",
      "blur",
    ];

    const event: string = args[0];

    let callback: Function;
    let delegateTo: string;
    let isDelegate = false;

    if (args.length === 2) {
      callback = args[1];
    } else {
      isDelegate = true;
      delegateTo = args[1];
      callback = args[2];
    }

    if (allowed.indexOf(event) < 0) {
      return null;
    }

    const cb: any = (e) => {
      if (e instanceof ComputedEvent) {
        return;
      }

      if (!isDelegate) {
        callback(t);
        return;
      }

      const target: HTMLElement = e.target;
      let toMatch = "";

      if (delegateTo.startsWith(".")) {
        toMatch = delegateTo;
      } else {
        toMatch = '[data-widget-id$="' + delegateTo + '"]';
      }

      if (target.matches(toMatch)) {
        const delegatePath = target.dataset.widgetId;
        const subComponent = new ComponentContext(view, sheet, delegatePath);
        callback(subComponent);
      } else if (
        !("widgetId" in target.dataset) &&
        target.parentElement?.matches(toMatch)
      ) {
        const delegatePath = target.parentElement.dataset.widgetId;
        const subComponent = new ComponentContext(view, sheet, delegatePath);
        callback(subComponent);
      }
    };

    this.off(event, delegateTo);

    let eventPath: string = path;

    if (delegateTo) {
      eventPath = eventPath + "." + delegateTo;
    }

    if (!sheet.events[eventPath]) {
      sheet.events[eventPath] = {};
    }

    if (!sheet.events[eventPath][event]) {
      sheet.events[eventPath][event] = [];
    }

    sheet.events[eventPath][event].push(cb);

    getElement().addEventListener(event, cb);
  };

  this.off = (event: string, delegateTo: string = null) => {
    let eventPath: string = path;

    if (delegateTo) {
      eventPath = eventPath + "." + delegateTo;
    }

    if (!sheet.events[eventPath]) {
      return null;
    }

    if (!sheet.events[eventPath][event]) {
      return null;
    }

    for (const cb of sheet.events[eventPath][event]) {
      getElement().removeEventListener(event, cb);
    }

    sheet.events[eventPath][event] = [];
  };

  this.setChoices = (choices: any) => {
    const element = getElement();
    const component = getComponent();

    if (!(component instanceof Choice)) {
      return false;
    }

    component.setChoices(choices, element);
    component.reverseTransform(this.value());
  };

  this.setToolTip = (
    text: string,
    placement: TooltipPlacement = TooltipPlacement.Top
  ) => {
    getComponent().setToolTip(text, placement);

    return this;
  };

  this.toggleClass = (className: string) => {
    if (getElement().classList.contains(className)) {
      return this.removeClass(className);
    }

    return this.addClass(className);
  };

  this.removeClass = (className: string) => {
    getElement().classList.remove(className);

    return this;
  };

  this.addClass = (className: string) => {
    getElement().classList.add(className);

    return this;
  };

  this.hasClass = (className: string) => {
    return getElement().classList.contains(className);
  };

  this.getClasses = (): string[] => {
    return [...getElement().classList];
  };

  this.hide = () => {
    const element = getElement();

    try {
      getComponent().hide();
      return this;
    } catch (e) {
      element.classList.add("d-none");
    }
  };

  this.show = () => {
    const element = getElement();

    try {
      getComponent().show();
      return this;
    } catch (e) {
      element.classList.remove("d-none");
    }
  };

  this.visible = () => {
    try {
      return getComponent().isVisible();
    } catch (e) {
      return !getElement().classList.contains("d-none");
    }
  };

  this.sheet = () => {
    return new CharacterSheetContext(view, sheet);
  };

  this.name = () => {
    const component = getComponent();

    if (!component) {
      return null;
    }

    return (component as Component).name;
  };

  this.id = () => {
    const component = getComponent();

    if (component) {
      return (component as Component).id;
    }

    return null;
  };
}
