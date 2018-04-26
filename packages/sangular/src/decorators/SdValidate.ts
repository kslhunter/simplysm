import {Type} from "@angular/core";
import {ArgumentsException} from "../../../core/src";

// tslint:disable-next-line:variable-name
export const Validate = (params?: PropertyCheckerTypes | PropertyCheckerTypes[] | {
    type?: PropertyCheckerTypes | PropertyCheckerTypes[];
    nullable?: boolean;

    validator?(value: any): boolean;
}) => (target: any, propertyKey: string) => {
    let _val = target[propertyKey];
    const getter = () => _val;
    const setter = (value: any) => {
        let config;
        if (params instanceof Array) {
            config = {type: params};
        }
        else if (params instanceof Type || params === "ThemeString" || params === "SizeString") {
            config = {type: [params]};
        }
        else if (!((params as any).type instanceof Array)) {
            config = {
                ...(params as any),
                type: [(params as any).type]
            };
        }
        else {
            config = params;
        }

        if (value == undefined) {
            if (config.nullable) {
                throw new ArgumentsException({value, nullable: config.nullable});
            }
            _val = value;
            return;
        }

        if (config.type) {
            if (
                !config.type.some((type: any) =>
                    type === value.constructor ||
                    (type === "ThemeString" && ["primary", "warning", "danger", "info", "success"].includes(value)) ||
                    (type === "SizeString" && ["xxs", "xs", "sm", "lg", "xl", "xxl"].includes(value))
                )
            ) {
                throw new ArgumentsException({propertyKey, value, type: config.type});
            }
        }

        if (config.validator) {
            if (!config.validator(value)) {
                throw new ArgumentsException({propertyKey, value, validator: config.validator});
            }
        }

        _val = value;
    };

    setter(target[propertyKey]);

    if (delete target[propertyKey]) {
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });
    }
};

export type PropertyCheckerTypes = Type<any> | "ThemeString" | "SizeString";