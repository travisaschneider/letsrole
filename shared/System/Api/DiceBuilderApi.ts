export class DiceBuilderApi {
  protected base: any;

  public constructor(base?: any) {
    this.base = base;
  }

  public toString() {
    return this.base;
  }

  public reference(reference: string): DiceBuilderReference {
    return new DiceBuilderReference(this).setReference(reference);
  }

  public variable(variable: string): DiceBuilderVariable {
    return new DiceBuilderVariable(this).setVariable(variable);
  }

  public add(value: any): DiceBuilderMath {
    return new DiceBuilderMath(this).setOperation("+", value);
  }

  public minus(value: any): DiceBuilderMath {
    return new DiceBuilderMath(this).setOperation("-", value);
  }

  public multiply(value: any): DiceBuilderMath {
    return new DiceBuilderMath(this).setOperation("*", value);
  }

  public divide(value: any): DiceBuilderMath {
    return new DiceBuilderMath(this).setOperation("/", value);
  }

  public tag(...args): DiceBuilderTag {
    return new DiceBuilderTag(this).setTags(args);
  }

  public compare(
    type: string,
    right: any,
    weight?: string
  ): DiceBuilderCompare {
    return new DiceBuilderCompare(this).setComparison(type, right, weight);
  }

  public round(): DiceBuilderSimpleFunction {
    return new DiceBuilderSimpleFunction(this).setFunction("round");
  }

  public ceil(): DiceBuilderSimpleFunction {
    return new DiceBuilderSimpleFunction(this).setFunction("ceil");
  }

  public floor(): DiceBuilderSimpleFunction {
    return new DiceBuilderSimpleFunction(this).setFunction("floor");
  }

  public keeph(max?: number): DiceBuilderModifier {
    return new DiceBuilderModifier(this).setModifier("keeph", max);
  }

  public keepl(max?: number): DiceBuilderModifier {
    return new DiceBuilderModifier(this).setModifier("keepl", max);
  }

  public remh(max?: number): DiceBuilderModifier {
    return new DiceBuilderModifier(this).setModifier("remh", max);
  }

  public reml(max?: number): DiceBuilderModifier {
    return new DiceBuilderModifier(this).setModifier("reml", max);
  }

  public mul(multiplier: number): DiceBuilderModifier {
    return new DiceBuilderModifier(this).setModifier("mul", multiplier);
  }

  public min(...args): DiceBuilderMinMax {
    return new DiceBuilderMinMax(this).setValues("min", args);
  }

  public max(...args): DiceBuilderMinMax {
    return new DiceBuilderMinMax(this).setValues("max", args);
  }

  public expl(...args): DiceBuilderExplode {
    return new DiceBuilderExplode(this).setValues(false, args);
  }

  public expln(...args): DiceBuilderExplode {
    const limit = args.pop();

    return new DiceBuilderExplode(this).setValues(false, args, limit);
  }

  public expladd(...args): DiceBuilderExplode {
    return new DiceBuilderExplode(this).setValues(true, args);
  }

  public reroll(...args): DiceBuilderReroll {
    return new DiceBuilderReroll(this).setValues(false, args);
  }

  public rerolln(...args): DiceBuilderReroll {
    return new DiceBuilderReroll(this).setValues(true, args);
  }

  public ternary(then: any, otherwise?: any): DiceBuilderTernary {
    return new DiceBuilderTernary(this).setTernary(then, otherwise);
  }

  protected _p(value: string): string {
    if (value.indexOf(" ") === -1) {
      return value;
    }

    return "(" + value + ")";
  }
}

export class DiceBuilderReference extends DiceBuilderApi {
  protected _reference: string;

  public setReference(reference: string): DiceBuilderReference {
    this._reference = reference;

    return this;
  }

  public toString() {
    return "@" + this._reference;
  }
}

export class DiceBuilderVariable extends DiceBuilderApi {
  protected _variable: string;

  public setVariable(variable: string): DiceBuilderVariable {
    this._variable = variable;

    return this;
  }

  public toString() {
    return "$" + this._variable;
  }
}

export class DiceBuilderMath extends DiceBuilderApi {
  protected _value: any;
  protected _operator: string;

  public setOperation(operator: string, value: any): DiceBuilderMath {
    this._value = value;
    this._operator = operator;

    return this;
  }

  public toString() {
    return (
      this._p(this.base.toString()) +
      " " +
      this._operator +
      " " +
      this._value.toString()
    );
  }
}

export class DiceBuilderTag extends DiceBuilderApi {
  protected _tags: string[] = [];

  public setTags(tags: string[]): DiceBuilderTag {
    this._tags = tags;
    return this;
  }

  public toString() {
    if (this._tags.length < 1) {
      return this.base.toString();
    }

    return this._p(this.base.toString()) + "[" + this._tags.join(", ") + "]";
  }
}

export class DiceBuilderCompare extends DiceBuilderApi {
  protected static allowedTypes = ["=", "<", ">", "<=", ">=", "!="];
  protected _type: string;
  protected _right: any;
  protected _weights: string;

  public setComparison(
    type: string,
    right: any,
    weights?: string
  ): DiceBuilderCompare {
    if (DiceBuilderCompare.allowedTypes.indexOf(type) < 0) {
      type = "=";
    }

    this._type = type;
    this._right = right;
    this._weights = weights;

    return this;
  }

  public toString() {
    const b: string = this._p(this.base.toString());
    let c: string = this._type;

    if (this._weights) {
      c += "{" + this._weights + "}";
    }

    return b + " " + c + " " + this._p(this._right.toString());
  }
}

export class DiceBuilderSimpleFunction extends DiceBuilderApi {
  protected _fct: string;

  public setFunction(fct: string): DiceBuilderSimpleFunction {
    this._fct = fct;

    return this;
  }

  public toString() {
    return this._fct + "(" + this.base.toString() + ")";
  }
}

export class DiceBuilderModifier extends DiceBuilderApi {
  protected _fct: string;
  protected _max: number;

  public setModifier(fct: string, max?: number): DiceBuilderModifier {
    this._fct = fct;
    this._max = max;

    return this;
  }

  public toString(): any {
    let b: string = this._p(this.base.toString());

    if (this._max !== null && this._max !== undefined) {
      b += ", " + this._max.toString(10);
    }

    return this._fct + "(" + b + ")";
  }
}

export class DiceBuilderMinMax extends DiceBuilderApi {
  protected _fct: string;
  protected _values: any[] = [];

  public setValues(fct: string, values: any[]): DiceBuilderMinMax {
    this._fct = fct;
    this._values = values;

    return this;
  }

  public toString(): any {
    if (this._values.length < 1) {
      return this.base.toString();
    }

    const strValues: string[] = [];

    for (const i in this._values) {
      strValues.push(this._values[i].toString());
    }

    return (
      this._fct + "(" + this.base.toString() + ", " + strValues.join(", ") + ")"
    );
  }
}

export class DiceBuilderExplode extends DiceBuilderApi {
  protected _add = false;
  protected _values: any[] = [];
  protected _limit: number = null;

  public setValues(
    add: boolean,
    values: any[],
    limit: number = null
  ): DiceBuilderExplode {
    this._add = !!add;
    this._values = values;
    this._limit = limit;

    return this;
  }

  public toString(): any {
    let args = "";

    if (this._values.length) {
      const strValues: string[] = [];

      for (const i in this._values) {
        strValues.push(this._values[i].toString());
      }

      args = ", " + strValues.join(", ");
    }

    if (this._limit !== null) {
      return (
        "expln(" +
        this.base.toString() +
        args +
        ", " +
        this._limit.toString() +
        ")"
      );
    } else {
      return (
        (this._add ? "expladd" : "expl") +
        "(" +
        this.base.toString() +
        args +
        ")"
      );
    }
  }
}

export class DiceBuilderReroll extends DiceBuilderApi {
  protected _limit = false;
  protected _values: any[] = [];

  public setValues(limit: boolean, values: any[]): DiceBuilderReroll {
    this._limit = !!limit;
    this._values = values;

    return this;
  }

  public toString(): any {
    let args = "";

    if (this._values.length) {
      const strValues: string[] = [];

      for (const i in this._values) {
        strValues.push(this._values[i].toString());
      }

      args = ", " + strValues.join(", ");
    }

    return (
      (this._limit ? "rerolln" : "reroll") +
      "(" +
      this.base.toString() +
      args +
      ")"
    );
  }
}

export class DiceBuilderTernary extends DiceBuilderApi {
  protected _then: any;
  protected _otherwise: any;

  public setTernary(then: any, otherwise: any): DiceBuilderTernary {
    this._then = then;
    this._otherwise = otherwise;

    return this;
  }

  public toString(): any {
    let tern: string = this._p(this.base.toString());
    tern += " ? ";
    tern += this._p(this._then.toString());
    tern += " : ";

    if (!this._otherwise) {
      tern += "0";
    } else {
      tern += this._p(this._otherwise.toString());
    }

    return tern;
  }
}
