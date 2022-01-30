const symbol = "sd-type-validate";
// eslint-disable-next-line @typescript-eslint/naming-convention
export function PropertyGetSetDecoratorBase(arg) {
    return function (target, propertyName, inputDescriptor) {
        const prevDescriptor = inputDescriptor ?? Object.getOwnPropertyDescriptor(target, propertyName);
        const prevGetter = prevDescriptor?.get;
        const prevSetter = prevDescriptor?.set;
        Reflect.defineMetadata(symbol, target[propertyName], target, propertyName);
        const getter = function () {
            const value = prevGetter !== undefined
                ? prevGetter.bind(this)()
                : Reflect.getMetadata(symbol, this, propertyName);
            if (arg.get !== undefined) {
                arg.get(this, propertyName, value);
            }
            return value;
        };
        const setter = function (value) {
            const prevValue = prevGetter !== undefined
                ? prevGetter.bind(this)()
                : Reflect.getMetadata(symbol, this, propertyName);
            let realValue = value;
            if (arg.beforeSet !== undefined) {
                const beforeSetResult = arg.beforeSet(this, propertyName, prevValue, realValue);
                if (beforeSetResult !== undefined) {
                    realValue = beforeSetResult;
                }
            }
            if (prevSetter !== undefined) {
                prevSetter.bind(this)(realValue);
            }
            else {
                Reflect.defineMetadata(symbol, realValue, this, propertyName);
            }
            if (arg.afterSet !== undefined) {
                arg.afterSet(this, propertyName, prevValue, realValue);
            }
        };
        if (delete target[propertyName]) {
            Object.defineProperty(target, propertyName, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvcGVydHlHZXRTZXREZWNvcmF0b3JCYXNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2RlY29yYXRvcnMvUHJvcGVydHlHZXRTZXREZWNvcmF0b3JCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDO0FBRWxDLGdFQUFnRTtBQUNoRSxNQUFNLFVBQVUsMkJBQTJCLENBQXNDLEdBSWhGO0lBQ0MsT0FBTyxVQUFVLE1BQVMsRUFBRSxZQUFlLEVBQUUsZUFBb0M7UUFDL0UsTUFBTSxjQUFjLEdBQUcsZUFBZSxJQUFJLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEcsTUFBTSxVQUFVLEdBQUcsY0FBYyxFQUFFLEdBQUcsQ0FBQztRQUN2QyxNQUFNLFVBQVUsR0FBRyxjQUFjLEVBQUUsR0FBRyxDQUFDO1FBRXZDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBc0IsQ0FBQyxDQUFDO1FBRXJGLE1BQU0sTUFBTSxHQUFHO1lBQ2IsTUFBTSxLQUFLLEdBQUcsVUFBVSxLQUFLLFNBQVM7Z0JBQ3BDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN6QixDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQXNCLENBQUMsQ0FBQztZQUU5RCxJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssU0FBUyxFQUFFO2dCQUN6QixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDcEM7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLFVBQW1CLEtBQVc7WUFDM0MsTUFBTSxTQUFTLEdBQUcsVUFBVSxLQUFLLFNBQVM7Z0JBQ3hDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN6QixDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQXNCLENBQUMsQ0FBQztZQUU5RCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDdEIsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDaEYsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO29CQUNqQyxTQUFTLEdBQUcsZUFBZSxDQUFDO2lCQUM3QjthQUNGO1lBRUQsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2xDO2lCQUNJO2dCQUNILE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsWUFBc0IsQ0FBQyxDQUFDO2FBQ3pFO1lBRUQsSUFBSSxHQUFHLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQzthQUN4RDtRQUNILENBQUMsQ0FBQztRQUVGLElBQUksT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFO2dCQUMxQyxHQUFHLEVBQUUsTUFBTTtnQkFDWCxHQUFHLEVBQUUsTUFBTTtnQkFDWCxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsWUFBWSxFQUFFLElBQUk7YUFDbkIsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDIn0=