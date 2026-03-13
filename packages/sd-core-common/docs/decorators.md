# Decorators

Property and class decorator utilities using `reflect-metadata`.

## NotifyPropertyChange

A property decorator that calls `onPropertyChange()` on the containing class whenever the decorated property is set.

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

### INotifyPropertyChange

Interface that classes using `@NotifyPropertyChange()` must implement:

```ts
interface INotifyPropertyChange {
  onPropertyChange<K extends keyof this>(
    propertyName: K,
    oldValue: this[K],
    newValue: this[K],
  ): void;
}
```

---

## PropertyValidate

A property decorator that validates the value on every set. Throws an error if the value does not satisfy the validation definition.

### Usage

```ts
import { PropertyValidate } from "@simplysm/sd-core-common";

class Config {
  @PropertyValidate({ type: Number, notnull: true })
  port: number = 3000;
}
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `def` | `TValidateDef<any>` | Validation definition (see [ObjectUtils validation](utilities.md#validation)). |
| `replacer` | `(value: any) => any` | Optional function to transform the value before validation. |

---

## PropertyGetSetDecoratorBase

A low-level helper function for building custom property decorators that intercept get/set operations using `reflect-metadata`.

### Usage

```ts
import { PropertyGetSetDecoratorBase } from "@simplysm/sd-core-common";

function LogOnSet(): TPropertyDecoratorReturn<any> {
  return PropertyGetSetDecoratorBase({
    afterSet: (target, propertyName, oldValue, newValue) => {
      console.log(`Set ${String(propertyName)}: ${oldValue} -> ${newValue}`);
    },
  });
}
```

### IPropertyGetSetDecoratorBaseParam

```ts
interface IPropertyGetSetDecoratorBaseParam<O, K extends keyof O> {
  beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => O[K] | undefined;
  afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;
  get?: (target: O, propertyName: K, value: O[K]) => void;
}
```

- `beforeSet` -- Called before the value is stored. Return a value to override what gets stored, or `undefined` to keep the original.
- `afterSet` -- Called after the value has been stored.
- `get` -- Called when the property is read.

---

## Type Aliases

```ts
// Return type for class decorators
type TClassDecoratorReturn<T> = (classType: Type<T>) => void;

// Return type for property decorators
type TPropertyDecoratorReturn<T, N = string> = (
  target: T,
  propertyName: N,
  inputDescriptor?: PropertyDescriptor,
) => void;
```
