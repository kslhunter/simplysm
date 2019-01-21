export interface ISdNotifyPropertyChange {
  sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void;
}
