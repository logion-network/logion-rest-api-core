import { requireDefined } from "../src/Assertions.js";

describe("Assertions", () => {

    describe("requireDefined", () => {

        it("throws with null", () => {
            expect(() => requireDefined(null)).toThrow();
        });

        it("throws with undefined", () => {
            expect(() => requireDefined(undefined)).toThrow();
        });

        it("does not see 0 as null or undefined", () => {
            expect(() => requireDefined(0)).not.toThrow();
        });
    });
});
