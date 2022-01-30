import { TimeoutError } from "../errors/TimeoutError";
export class Wait {
    static async until(forwarder, milliseconds, timeout) {
        let currMs = 0;
        while (!(await forwarder())) {
            await Wait.time(milliseconds ?? 100);
            if (timeout !== undefined) {
                currMs += milliseconds ?? 100;
                if (currMs >= timeout) {
                    throw new TimeoutError();
                }
            }
        }
    }
    static async time(millisecond) {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, millisecond);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2FpdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9XYWl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV0RCxNQUFNLE9BQU8sSUFBSTtJQUNSLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQTJDLEVBQUUsWUFBcUIsRUFBRSxPQUFnQjtRQUM1RyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLFNBQVMsRUFBRSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsQ0FBQztZQUVyQyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ3pCLE1BQU0sSUFBSSxZQUFZLElBQUksR0FBRyxDQUFDO2dCQUM5QixJQUFJLE1BQU0sSUFBSSxPQUFPLEVBQUU7b0JBQ3JCLE1BQU0sSUFBSSxZQUFZLEVBQUUsQ0FBQztpQkFDMUI7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQW1CO1FBQzFDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNsQyxVQUFVLENBQ1IsR0FBRyxFQUFFO2dCQUNILE9BQU8sRUFBRSxDQUFDO1lBQ1osQ0FBQyxFQUNELFdBQVcsQ0FDWixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YifQ==