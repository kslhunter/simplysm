# Decorators

Property and class decorator utilities for intercepting property access, triggering change notifications, and validating values. Built on `reflect-metadata`.

## NotifyPropertyChange

A property decorator that calls `onPropertyChange()` on the containing class whenever the decorated property is set.

```ts
function NotifyPropertyChange(): TPropertyDecoratorReturn<any>
```

### Usage

```ts
import { NotifyPropertyChange, INotifyPropertyChange } from "@simplysm/sd-core-common";

class MyModel implements INotifyPropertyChange {
  @NotifyPropertyChange()
  name: string = "";

  onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void {
    console.log(`${String(propertyName)} changed from ${oldValue} to ${newValue}`);
  }
}

const model = new MyModel();
model.name = "Alice"; // logs: "name changed from  to Alice"
```

## INotifyPropertyChange

Interface that classes using `@NotifyPropertyChange()` must implement.

```ts
interface INotifyPropertyChange {
  onPropertyChange<K extends keyof this>(
    propertyName: K,
    oldValue: this[K],
    newValue: this[K],
  ): void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `onPropertyChange` | `<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]) => void` | Called whenever a `@NotifyPropertyChange()` decorated property is set. Receives the property name, the previous value, and the new value. |

## PropertyGetSetDecoratorBase

A low-level helper function for building custom property decorators that intercept get/set operations using `reflect-metadata`.

```ts
function PropertyGetSetDecoratorBase<O extends object, K extends keyof O>(
  arg: IPropertyGetSetDecoratorBaseParam<O, K>,
): TPropertyDecoratorReturn<O, K>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `IPropertyGetSetDecoratorBaseParam<O, K>` | Configuration object with optional `beforeSet`, `afterSet`, and `get` hooks. |

### Usage

```ts
import { PropertyGetSetDecoratorBase, TPropertyDecoratorReturn } from "@simplysm/sd-core-common";

function LogOnSet(): TPropertyDecoratorReturn<any> {
  return PropertyGetSetDecoratorBase({
    afterSet: (target, propertyName, oldValue, newValue) => {
      console.log(`Set ${String(propertyName)}: ${oldValue} -> ${newValue}`);
    },
  });
}
```

## IPropertyGetSetDecoratorBaseParam

Configuration parameter for `PropertyGetSetDecoratorBase`.

```ts
interface IPropertyGetSetDecoratorBaseParam<O extends object, K extends keyof O> {
  beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => O[K] | undefined;
  afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;
  get?: (target: O, propertyName: K, value: O[K]) => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `beforeSet` | `(target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => O[K] \| undefined` | Called before the value is stored. Return a value to override what gets stored, or `undefined` to keep the original new value. |
| `afterSet` | `(target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void` | Called after the value has been stored. |
| `get` | `(target: O, propertyName: K, value: O[K]) => void` | Called when the property is read, before returning the value. |

## PropertyValidate

A property decorator that validates values when they are set. Throws an error if the value does not match the validation definition.

```ts
function PropertyValidate(
  def: TValidateDef<any>,
  replacer?: TPropertyValidateReplacer,
): TPropertyDecoratorReturn<any>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `def` | `TValidateDef<any>` | Validation definition (type constructor, array of type constructors, or `IValidateDef`). See [validation-types.md](./validation-types.md). |
| `replacer` | `TPropertyValidateReplacer` | Optional function to transform the value before validation. |

### Usage

```ts
import { PropertyValidate } from "@simplysm/sd-core-common";

class Config {
  @PropertyValidate({ type: Number, notnull: true })
  port: number = 3000;
}
```

## TPropertyValidateReplacer

Function type for transforming a value before validation in `PropertyValidate`.

```ts
type TPropertyValidateReplacer = (value: any) => any;
```

## TClassDecoratorReturn

Return type for class decorator functions.

```ts
type TClassDecoratorReturn<T> = (classType: Type<T>) => void;
```

| Type Parameter | Description |
|----------------|-------------|
| `T` | The class type being decorated. |

## TPropertyDecoratorReturn

Return type for property decorator functions.

```ts
type TPropertyDecoratorReturn<T, N = string> = (
  target: T,
  propertyName: N,
  inputDescriptor?: PropertyDescriptor,
) => void;
```

| Type Parameter | Default | Description |
|----------------|---------|-------------|
| `T` | -- | The type of the class containing the property. |
| `N` | `string` | The property name type. |
