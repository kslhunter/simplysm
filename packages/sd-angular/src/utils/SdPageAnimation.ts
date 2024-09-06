import { animate, query, style, transition, trigger } from "@angular/animations";

export const sdPageAnimation = trigger("sdPageAnimation", [
  transition("* <=> *", [
    query(
      ":enter",
      [
        style({
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }),
      ],
      { optional: true },
    ),
    query(":enter", [style({ opacity: 0 })], { optional: true }),
    query(":enter", [style({ opacity: 0 }), animate(".3s", style({ opacity: 1 }))], { optional: true }),
  ]),
]);
