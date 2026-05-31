import { Binding } from "../Binding";

export function BindingContext(binding: Binding) {
  this.add = (
    name: string,
    componentId: string,
    viewId: string,
    callback: Function
  ) => {
    binding.add(name, componentId, viewId, callback);
  };

  this.clear = (componentId: string) => {
    binding.clearByComponent(componentId);
  };

  this.remove = (name: string) => {
    binding.remove(name);
  };
}
