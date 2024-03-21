import { validAccountId } from "../src/TestUtil.js";

describe("TestUtil", () => {

    it("provides valid account ID", () => {
        const address = "some-address";
        const account = validAccountId(address);
        expect(account.address).toBe(address);
        expect(account.type).toBe("Polkadot");
    });
});
