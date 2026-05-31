import { injectable } from "inversify";

@injectable()
export class UserState {
  public id: number;
  public role: string = null;
  public displayName: string;

  public isLoaded(): boolean {
    return this.role !== null;
  }

  public isGm(): boolean {
    return this.role === "gm" || this.role === "builder";
  }

  public isBuilder(): boolean {
    return this.role === "builder";
  }
}
