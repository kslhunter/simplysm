import * as os from "os";
export class SdError extends Error {
    constructor(arg1, arg2) {
        if (typeof arg1 === "object" || typeof arg2 === "string") {
            super((arg2 ?? "")
                + (typeof arg1 === "object" ? ` => ${arg1.message}`
                    : typeof arg1 === "string" ? ` => ${arg1}`
                        : "처리되지 않은 예외가 발생하였습니다."));
        }
        else {
            super(arg1 ?? "처리되지 않은 예외가 발생하였습니다.");
        }
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
        if (typeof Error.captureStackTrace !== "undefined") {
            Error.captureStackTrace(this, new.target);
        }
        else {
            try {
                throw new Error(this.message);
            }
            catch (err) {
                if (err instanceof Error) {
                    this.stack = err.stack;
                }
                else {
                    throw err;
                }
            }
        }
        if (typeof arg1 === "object" && typeof arg1.stack === "string") {
            this.innerError = arg1;
            this.stack += `${os.EOL}---- inner error stack ----${os.EOL}${arg1.stack}`;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RFcnJvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lcnJvcnMvU2RFcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUV6QixNQUFNLE9BQU8sT0FBUSxTQUFRLEtBQUs7SUFNaEMsWUFBbUIsSUFBcUIsRUFBRSxJQUFhO1FBQ3JELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUN4RCxLQUFLLENBQ0gsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO2tCQUNWLENBQ0EsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQzlDLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxFQUFFO3dCQUN4QyxDQUFDLENBQUMsc0JBQXNCLENBQzdCLENBQ0YsQ0FBQztTQUNIO2FBQ0k7WUFDSCxLQUFLLENBQUMsSUFBSSxJQUFJLHNCQUFzQixDQUFDLENBQUM7U0FDdkM7UUFFRCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDNUIsSUFBSSxPQUFPLEtBQUssQ0FBQyxpQkFBaUIsS0FBSyxXQUFXLEVBQUU7WUFDbEQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDM0M7YUFDSTtZQUNILElBQUk7Z0JBQ0YsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDL0I7WUFDRCxPQUFPLEdBQUcsRUFBRTtnQkFDVixJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7b0JBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztpQkFDeEI7cUJBQ0k7b0JBQ0gsTUFBTSxHQUFHLENBQUM7aUJBQ1g7YUFDRjtTQUNGO1FBRUQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRTtZQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDLEdBQUcsOEJBQThCLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQzVFO0lBQ0gsQ0FBQztDQUNGIn0=