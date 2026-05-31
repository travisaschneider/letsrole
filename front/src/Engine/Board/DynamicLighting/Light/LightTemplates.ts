import { DefaultLight } from "./DefaultLight";
import { Light } from "./Light";
import { LightTemplate } from "../../../../../shared/Scene/SceneData";

export const LightTemplates: (typeof Light)[] = [
  DefaultLight,
  /*FireLight,
    EmergencyLight,
    PartyLight,
    AlertLight*/
];

export const getLightClass = (template: LightTemplate): typeof Light => {
  return DefaultLight;
};
