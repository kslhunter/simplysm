import { PropertyGetSetDecoratorBase } from "./PropertyGetSetDecoratorBase";
// eslint-disable-next-line @typescript-eslint/naming-convention
export function NotifyPropertyChange() {
    return PropertyGetSetDecoratorBase({
        afterSet: (target, propertyName, oldValue, newValue) => {
            target.onPropertyChange(propertyName, oldValue, newValue);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90aWZ5UHJvcGVydHlDaGFuZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGVjb3JhdG9ycy9Ob3RpZnlQcm9wZXJ0eUNoYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU1RSxnRUFBZ0U7QUFDaEUsTUFBTSxVQUFVLG9CQUFvQjtJQUNsQyxPQUFPLDJCQUEyQixDQUFDO1FBQ2pDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3JELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVELENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDIn0=