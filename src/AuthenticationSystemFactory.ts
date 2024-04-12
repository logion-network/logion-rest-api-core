import { AuthenticationSystem, defaultSetup, TokenConfig } from "@logion/authenticator";
import { UnauthorizedException } from "dinoloop";
import { injectable } from "inversify";
import { Duration } from "luxon";
import PeerId from "peer-id";

import { PolkadotService } from "./PolkadotService.js";
import { ValidAccountId } from "@logion/node-api";

export function unauthorized(error: string): UnauthorizedException<{ error: string }> {
    return new UnauthorizedException({ error });
}

@injectable()
export class AuthenticationSystemFactory {

    async authenticationSystem(): Promise<AuthenticationSystem> {
        if(!this._authenticationSystem) {
            const api = await this.polkadotService.readyApi();
            const authenticationSystem = defaultSetup({
                api,
                tokenConfig: this.tokenConfig,
                errorFactory: { unauthorized }
            });
            this._authenticationSystem = authenticationSystem;
        }
        return this._authenticationSystem;
    }

    constructor(
        private polkadotService: PolkadotService,
    ) {
        if (process.env.JWT_SECRET === undefined) {
            throw Error("No JWT secret set, please set var JWT_SECRET equal to NODE_SECRET_KEY");
        }
        if (process.env.JWT_ISSUER === undefined) {
            throw Error("No JWT issuer set, please set var JWT_ISSUER equal to NODE_PEER_ID (base58 encoding)");
        }
        if (process.env.JWT_TTL_SEC === undefined) {
            throw Error("No JWT Time-to-live set, please set var JWT_TTL_SEC");
        }

        this.tokenConfig = {
            nodePeerId: PeerId.createFromB58String(process.env.JWT_ISSUER),
            nodeKey: Buffer.from(process.env.JWT_SECRET, "hex"),
            nodeOwner: process.env.OWNER ? ValidAccountId.polkadot(process.env.OWNER) : undefined,
            jwtTimeToLive: Duration.fromObject({ seconds: Number(process.env.JWT_TTL_SEC) }),
        };
    }

    private tokenConfig: TokenConfig;

    private _authenticationSystem: AuthenticationSystem | undefined;

    get nodeOwner(): ValidAccountId | undefined {
        return this.tokenConfig.nodeOwner;
    }
}
