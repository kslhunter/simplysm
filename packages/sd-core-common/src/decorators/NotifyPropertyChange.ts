import { PropertyGetSetDecoratorBase } from "./PropertyGetSetDecoratorBase";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NotifyPropertyChange(): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyGetSetDecoratorBase({
    afterSet: (target, propertyName, oldValue, newValue) => {
      target.onPropertyChange(propertyName, oldValue, newValue);
    }
  });
}

export interface INotifyPropertyChange {
  onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void;
}
