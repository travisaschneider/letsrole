import {
  DiceType,
  DiceVisibility,
  RawDiceResult,
  SingleDiceResult,
} from "./DiceData";

export class DiceResult {
  protected _raw: RawDiceResult;
  protected _children: DiceResult[] = [];
  protected _dice: SingleDiceResult[] = [];
  protected _tags: string[] = [];
  protected _visibility: DiceVisibility;
  protected _title: string;
  protected _expression: string;

  protected _hasExtractedDice = false;
  protected _hasExtractedTags = false;
  protected _hasExtractedChildren = false;

  public get title(): string {
    return this._title;
  }

  public get expression(): string {
    return this._expression;
  }

  public get formula(): string {
    return this._expression;
  }

  public get visibility(): DiceVisibility {
    return this._visibility;
  }

  public get type(): DiceType {
    return this._raw.type;
  }

  public get total(): number {
    return this._raw.total;
  }

  public get tags(): string[] {
    return this._raw.tags;
  }

  public get all(): SingleDiceResult[] {
    if (!this._hasExtractedDice) {
      this._dice = this.extractDice(this._raw);
      this._hasExtractedDice = true;
    }

    return this._dice;
  }

  public get allTags(): string[] {
    if (!this._hasExtractedTags) {
      this._tags = this.extractTags(this._raw);
      this._hasExtractedTags = true;
    }

    return this._tags;
  }

  public containsTag(tag: string) {
    if (!this._hasExtractedTags) {
      this._tags = this.extractTags(this._raw);
      this._hasExtractedTags = true;
    }

    return this._tags.indexOf(tag) >= 0;
  }

  public get children(): DiceResult[] {
    if (!this._hasExtractedChildren) {
      this._children = this.parseChildren(this._raw);
      this._hasExtractedChildren = true;
    }

    return this._children;
  }

  public get first(): DiceResult {
    const children: DiceResult[] = this.children;

    if (children[0]) {
      return children[0];
    }

    return null;
  }

  public get last(): DiceResult {
    const children: DiceResult[] = this.children;

    if (children.length > 0) {
      return children[children.length - 1];
    }

    return null;
  }

  public get size(): number {
    if (this.type !== DiceType.Dice) {
      return null;
    }

    return this._raw.size;
  }

  public get dimension(): number {
    if (this.type !== DiceType.Dice) {
      return null;
    }

    return this._raw.dimension;
  }

  public get values(): number[] {
    if (this.type !== DiceType.Dice) {
      return null;
    }

    return this._raw.values;
  }

  public get discarded(): number[] {
    if (this.type !== DiceType.Dice) {
      return null;
    }

    return this._raw.discarded;
  }

  public get left(): DiceResult {
    if (this.type !== DiceType.Comparison) {
      return null;
    }

    return new DiceResult(this._raw.left);
  }

  public get right(): DiceResult {
    if (this.type !== DiceType.Comparison) {
      return null;
    }

    return new DiceResult(this._raw.right);
  }

  public get success(): number {
    if (this.type !== DiceType.Comparison) {
      return null;
    }

    return this._raw.success;
  }

  public get failure(): number {
    if (this.type !== DiceType.Comparison) {
      return null;
    }

    return this._raw.failure;
  }

  public constructor(
    raw: RawDiceResult,
    expression?: string,
    title?: string,
    visibility?: DiceVisibility
  ) {
    this._raw = raw;
    this._expression = expression;
    this._title = title;
    this._visibility = visibility;
  }

  protected parseChildren(result: RawDiceResult): DiceResult[] {
    const parsed: DiceResult[] = [];

    result.children.forEach((child: RawDiceResult) => {
      parsed.push(new DiceResult(child));
    });

    return parsed;
  }

  protected extractDice(result: RawDiceResult): SingleDiceResult[] {
    const dice: SingleDiceResult[] = [];

    if (result.type === DiceType.Dice) {
      result.values.forEach((value) => {
        dice.push({
          dimension: result.dimension,
          value: value,
          discarded: false,
        });
      });

      result.discarded.forEach((value) => {
        dice.push({
          dimension: result.dimension,
          value: value,
          discarded: true,
        });
      });
    }

    if (result.children) {
      result.children.forEach((child) => {
        this.extractDice(child).forEach((die: SingleDiceResult) => {
          dice.push(die);
        });
      });
    }

    return dice;
  }

  protected extractTags(result: RawDiceResult): string[] {
    const tags: string[] = [];

    if (Array.isArray(result.tags)) {
      result.tags.forEach((value: string) => {
        tags.push(value);
      });
    }

    if (result.children) {
      result.children.forEach((child) => {
        this.extractTags(child).forEach((tag) => {
          tags.push(tag);
        });
      });
    }

    return tags;
  }
}

export enum CriticalHitType {
  Critical = "critical",
  Fumble = "fumble",
  Red = "red",
  Orange = "orange",
  Yellow = "yellow",
  Green = "green",
  Cyan = "cyan",
  Magenta = "magenta",
  Pink = "pink",
}
