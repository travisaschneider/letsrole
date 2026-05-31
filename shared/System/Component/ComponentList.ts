import { Row } from "./Row";
import { Component } from "./Component";
import { Label } from "./Label";
import { NumberInput } from "./NumberInput";
import { TextInput } from "./TextInput";
import { Column } from "./Column";
import { View } from "./View";
import { Checkbox } from "./Checkbox";
import { Container } from "./Container";
import { Repeater } from "./Repeater";
import { Choice } from "./Choice";
import { Textarea } from "./Textarea";
import { SharedAdapter } from "../SharedAdapter";
import { Tab } from "./Tab";
import { Avatar } from "./Avatar";
import { Color } from "./Color";
import { Icon } from "./Icon";
import { Konsole } from "../../Konsole";

const ComponentList = {
  Row: Row,
  Column: Column,
  Label: Label,
  NumberInput: NumberInput,
  TextInput: TextInput,
  Textarea: Textarea,
  View: View,
  Checkbox: Checkbox,
  Choice: Choice,
  Container: Container,
  Repeater: Repeater,
  Tab: Tab,
  Avatar: Avatar,
  Color: Color,
  Icon: Icon,
};

const ComponentCategories = [
  {
    name: "Layout",
    components: [Row, Column, Container],
  },
  {
    name: "Form",
    components: [Label, NumberInput, TextInput, Textarea, Checkbox, Choice],
  },
  {
    name: "Container",
    components: [Repeater, Tab],
  },
  {
    name: "Special",
    components: [Icon, Avatar, Color],
  },
];

const CreateComponent = (name: string): Component => {
  if (ComponentList[name] === undefined) {
    Konsole.error('Unknown component "' + name + '"');
    name = "Label";
  }

  if (ComponentList[name].isContainerAware === true) {
    return new ComponentList[name](SharedAdapter.container);
  }

  return new ComponentList[name]();
};

export { ComponentList, CreateComponent, ComponentCategories };
