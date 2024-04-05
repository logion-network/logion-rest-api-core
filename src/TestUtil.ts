import { ValidAccountId, LogionNodeApiClass } from "@logion/node-api";
import { ApiPromise } from "@polkadot/api";

export const SS58_PREFIX = 2021;

export function mockLogionNodeApi(): LogionNodeApiClass {
    const api = {
        createType() {
            return;
        },
        runtimeVersion: {
            specName: { toString: () => "logion" },
            specVersion: { toBigInt: () => 3000n },
        },
        consts: {
            system: {
                ss58Prefix: {
                    toNumber: () => SS58_PREFIX
                }
            }
        }
    } as unknown as ApiPromise;
    return new LogionNodeApiClass(api);
}

export function validAccountId(address: string): ValidAccountId {
    return mockLogionNodeApi().queries.getValidAccountId(address, "Polkadot");
}
