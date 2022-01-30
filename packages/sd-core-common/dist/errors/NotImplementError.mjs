import { SdError } from "./SdError";
export class NotImplementError extends SdError {
    constructor(message) {
        super("구현되어있지 않습니다" + (message !== undefined ? ": " + message : ""));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90SW1wbGVtZW50RXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXJyb3JzL05vdEltcGxlbWVudEVycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFcEMsTUFBTSxPQUFPLGlCQUFrQixTQUFRLE9BQU87SUFDNUMsWUFBbUIsT0FBZ0I7UUFDakMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztDQUNGIn0=