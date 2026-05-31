import { Component } from "./Component";
import { Container } from "inversify";

export class ContainerAwareComponent extends Component {
  public static readonly isContainerAware: boolean = true;
  protected container: Container;

  public constructor(container: Container) {
    super();

    this.container = container;
  }
}
