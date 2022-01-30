export declare function NotifyPropertyChange(): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void;
export interface INotifyPropertyChange {
    onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void;
}
