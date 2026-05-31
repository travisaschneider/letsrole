export class BaseMessage {
  c: string; // controller
  a: string; // action
  [extra: string]: any;
}
