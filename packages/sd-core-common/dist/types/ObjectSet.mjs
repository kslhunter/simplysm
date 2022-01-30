import { ObjectUtil } from "../utils/ObjectUtil";
export class ObjectSet extends Set {
    add(value) {
        if (this.has(value)) {
            return this;
        }
        return super.add(value);
    }
    has(value) {
        for (const item of this) {
            if (value === item || ObjectUtil.equal(value, item)) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT2JqZWN0U2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3R5cGVzL09iamVjdFNldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFakQsTUFBTSxPQUFPLFNBQWEsU0FBUSxHQUFNO0lBQ3RCLEdBQUcsQ0FBQyxLQUFRO1FBQzFCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFZSxHQUFHLENBQUMsS0FBUTtRQUMxQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRTtZQUN2QixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQ25ELE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGIn0=