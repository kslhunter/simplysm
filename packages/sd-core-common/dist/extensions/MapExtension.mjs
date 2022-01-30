"use strict";
((prototype) => {
    prototype.getOrCreate = function (key, newValue) {
        if (!this.has(key)) {
            if (newValue instanceof Function) {
                this.set(key, newValue());
            }
            else {
                this.set(key, newValue);
            }
        }
        return this.get(key);
    };
})(Map.prototype);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFwRXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2V4dGVuc2lvbnMvTWFwRXh0ZW5zaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFNQSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7SUFDYixTQUFTLENBQUMsV0FBVyxHQUFHLFVBQWlDLEdBQU0sRUFBRSxRQUF1QjtRQUN0RixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQixJQUFJLFFBQVEsWUFBWSxRQUFRLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7YUFDM0I7aUJBQ0k7Z0JBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDekI7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQztJQUN4QixDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMifQ==