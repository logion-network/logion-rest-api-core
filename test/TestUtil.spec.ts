import { validAccountId } from "../src/TestUtil.js";

describe("TestUtil", () => {

    it("provides valid account ID", () => {
        const address = "vQwvFMsZRPEZDaMAZpApQMTgB6qvPSJhEJ2PHjSiwAa16ZsBk";
        const account = validAccountId(address);
        expect(account.address).toBe(address);
        expect(account.type).toBe("Polkadot");
    });
});
