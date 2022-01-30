export class NumberUtil {
    static parseInt(text, radix = 10) {
        if (typeof text === "number")
            return text;
        const txt = text?.replace(/[^0-9-]/g, "")?.trim();
        if (txt === undefined)
            return undefined;
        const result = Number.parseInt(txt, radix);
        if (Number.isNaN(result))
            return undefined;
        return result;
    }
    static parseFloat(text) {
        if (typeof text === "number")
            return text;
        const txt = text?.replace(/[^0-9.-]/g, "")?.trim();
        if (txt === undefined)
            return undefined;
        const result = Number.parseFloat(txt);
        if (Number.isNaN(result))
            return undefined;
        return result;
    }
    static isNullOrEmpty(val) {
        return val == null || val === 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTnVtYmVyVXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9OdW1iZXJVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sT0FBTyxVQUFVO0lBQ2QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFTLEVBQUUsUUFBZ0IsRUFBRTtRQUNsRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVE7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNsRCxJQUFJLEdBQUcsS0FBSyxTQUFTO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDeEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0MsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQzNDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsVUFBVSxDQUFDLElBQVM7UUFDaEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDbkQsSUFBSSxHQUFHLEtBQUssU0FBUztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQzNDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQThCO1FBQ3hELE9BQU8sR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7Q0FDRiJ9