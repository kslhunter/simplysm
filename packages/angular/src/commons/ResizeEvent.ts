// tslint:disable-next-line:interface-name
export interface ResizeEvent extends CustomEvent {
  dimensions: ("width" | "height")[];
}
