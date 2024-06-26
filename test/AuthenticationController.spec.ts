import {
    Authenticator,
    Session,
    SessionManager,
    SessionSignature,
    SignedSession,
    Token,
    AuthorityService
} from "@logion/authenticator";
import { UnauthorizedException } from "dinoloop";
import { Container } from "inversify";
import { DateTime } from "luxon";
import { Mock, It } from "moq.ts";
import request from "supertest";

import {
    AuthenticationController,
    AuthenticationService,
    SessionRepository,
    SessionFactory,
    SessionAggregateRoot,
    NewSessionParameters,
    AuthenticateRequestView,
    requireDefined,
} from "../src/index.js";

import {
    setupApp,
    ALICE,
    BOB,
} from "../src/TestApp.js";
import { ValidAccountId } from "@logion/node-api";

const TIMESTAMP = "2021-06-10T16:25:23.668294";
const TOKEN_ALICE = "some-fake-token-for-ALICE";
const TOKEN_BOB = "some-fake-token-for-BOB";
const SESSION_ID = "a4dade1d-f12c-414c-93f7-7f20ce1e2cb8";

describe("AuthenticationController (sign-in)", () => {

    it('should sign-in successfully', async () => {
        const app = setupApp(AuthenticationController, mockDependenciesForSignIn);
        await request(app)
            .post('/api/auth/sign-in')
            .send({
                addresses: [
                    ALICE.toKey(),
                    BOB.toKey(),
                ]
            })
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.sessionId).toBeDefined();
            });
    });

})

describe("AuthenticationController (authentication)", () => {

    const version = "V1";

    it('should authenticate successfully', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, true, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate`)
            .send(authenticateRequest)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.tokens).toBeDefined();
                expect(response.body.tokens[ALICE.toKey()].value).toBe(TOKEN_ALICE);
                expect(response.body.tokens[BOB.toKey()].value).toBe(TOKEN_BOB);
            });
    })

    it('should fail to authenticate on wrong signature', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, false, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Invalid signature");
            });
    })

    it('should fail to authenticate on missing session', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, true, false, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Invalid session");
            });
    })

    it('should fail to authenticate on wrong address type', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![`Unknown:${ ALICE.address }`] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![`Unknown:${ BOB.address }`] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, false, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Error: Unsupported key format");
            });
    })


});

describe("AuthenticationController (authentication v2)", () => {

    const version = "V2";

    it('should authenticate successfully', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, true, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate/v2`)
            .send(authenticateRequest)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.tokens).toBeDefined();
                expect(response.body.tokens[ALICE.toKey()].value).toBe(TOKEN_ALICE);
                expect(response.body.tokens[BOB.toKey()].value).toBe(TOKEN_BOB);
            });
    })

    it('should fail to authenticate on wrong signature', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, false, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate/v2`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Invalid signature");
            });
    })

    it('should fail to authenticate on missing session', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![ALICE.toKey()] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![BOB.toKey()] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, true, false, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate/v2`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Invalid session");
            });
    })

    it('should fail to authenticate on wrong address type', async () => {

        const authenticateRequest: AuthenticateRequestView = {
            signatures: {}
        };
        authenticateRequest.signatures![`Unknown:${ ALICE.address }`] = {
            signature: "signature-ALICE",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        authenticateRequest.signatures![`Unknown:${ BOB.address }`] = {
            signature: "signature-BOB",
            signedOn: TIMESTAMP,
            type: "POLKADOT",
        };
        const app = setupApp(AuthenticationController, (container) => mockDependenciesForAuth(container, false, true, version));
        await request(app)
            .post(`/api/auth/${SESSION_ID}/authenticate/v2`)
            .send(authenticateRequest)
            .expect(401)
            .expect('Content-Type', /application\/json/)
            .then(response => {
                expect(response.body.error).toBe("Error: Unsupported key format");
            });
    })


});

function mockDependenciesForSignIn(container: Container): void {
    const sessionRepository = new Mock<SessionRepository>();
    container.bind(SessionRepository).toConstantValue(sessionRepository.object());

    const sessionFactory = new Mock<SessionFactory>();
    container.bind(SessionFactory).toConstantValue(sessionFactory.object());

    const aliceSession = new Mock<SessionAggregateRoot>();
    aliceSession.setup(instance => instance.userAddress).returns(ALICE.address);

    sessionFactory.setup(instance => instance.newSession(It.Is<NewSessionParameters>(
        params => params.account.equals(ALICE)
    )))
        .returns(aliceSession.object());

    const bobSession = new Mock<SessionAggregateRoot>();
    bobSession.setup(instance => instance.userAddress).returns(BOB.address);

    sessionFactory.setup(instance => instance.newSession(It.Is<NewSessionParameters>(
        params => params.account.equals(BOB)
    )))
        .returns(bobSession.object());

    sessionRepository.setup(instance => instance.save)
        .returns(() => Promise.resolve());
}

function mockDependenciesForAuth(container: Container, verifies: boolean, sessionExists:boolean, version: "V1" | "V2"): void {

    const sessionAlice = new Mock<SessionAggregateRoot>();
    sessionAlice.setup(instance => instance.createdOn).returns(DateTime.now().toJSDate());

    const authenticationService = new Mock<AuthenticationService>();
    container.rebind(AuthenticationService).toConstantValue(authenticationService.object());

    const sessionManager = new Mock<SessionManager>();
    const authenticator = new Mock<Authenticator>();

    const authorityService: AuthorityService = {
        isLegalOfficer(): Promise<boolean> {
            return Promise.resolve(true);
        },
        isLegalOfficerNode(): Promise<boolean> {
            return Promise.resolve(true);
        },
        isLegalOfficerOnNode(): Promise<boolean> {
            return Promise.resolve(false);
        }
    }

    authenticationService.setup(instance => instance.authenticationSystem()).returnsAsync({
        sessionManager: sessionManager.object(),
        authenticator: authenticator.object(),
        authorityService,
    });

    const session = new Mock<Session>();
    session.setup(instance => instance.addresses).returns([ ALICE.address, BOB.address ]);

    if(verifies) {
        const signatures: SessionSignature[] = [
            {
                address: ALICE.address,
                signature: "SIG_ALICE",
                signedOn: requireDefined(DateTime.now().toISO()),
                type: "POLKADOT",
            },
            {
                address: BOB.address,
                signature: "SIG_BOB",
                signedOn: requireDefined(DateTime.now().toISO()),
                type: "POLKADOT",
            }
        ];
        if (version === "V1") {
            sessionManager.setup(instance => instance.signedSessionOrThrow(It.IsAny(), It.IsAny())).returnsAsync({
                session: session.object(),
                signatures
            });
        } else {
            sessionManager.setup(instance => instance.signedSessionOrThrowV2(It.IsAny(), It.IsAny())).returnsAsync({
                session: session.object(),
                signatures
            });
        }
        const tokens: Token[] = [
            {
                type: "Polkadot",
                address: ALICE.address,
                value: TOKEN_ALICE,
                expiredOn: DateTime.now(),
            },
            {
                type: "Polkadot",
                address: BOB.address,
                value: TOKEN_BOB,
                expiredOn: DateTime.now(),
            }
        ];
        authenticator.setup(instance => instance.createTokens(It.Is<SignedSession>(
            args => args.session === session.object() && args.signatures === signatures
        ), It.IsAny())).returnsAsync(tokens);
    } else {
        if (version === "V1") {
            sessionManager.setup(instance => instance.signedSessionOrThrow)
                .returns(() => {
                    throw new UnauthorizedException({ error: "Invalid signature" })
                });
        } else {
            sessionManager.setup(instance => instance.signedSessionOrThrowV2)
                .returns(() => {
                    throw new UnauthorizedException({ error: "Invalid signature" })
                });
        }
    }

    const sessionRepository = new Mock<SessionRepository>();
    if (sessionExists) {
        sessionRepository.setup(instance => instance.find(
            It.Is<ValidAccountId>(accountId => accountId.equals(ALICE)),
            SESSION_ID)
        )
            .returns(Promise.resolve(sessionAlice.object()))
        sessionRepository.setup(instance => instance.find(
            It.Is<ValidAccountId>(accountId => accountId.equals(BOB)),
            SESSION_ID)
        )
            .returns(Promise.resolve(sessionAlice.object()))
    } else {
        sessionRepository.setup(instance => instance.find(
            It.Is<ValidAccountId>(accountId => accountId.equals(ALICE)),
            SESSION_ID)
        )
            .returns(Promise.resolve(null))
        sessionRepository.setup(instance => instance.find(
            It.Is<ValidAccountId>(accountId => accountId.equals(BOB)),
            SESSION_ID)
        )
            .returns(Promise.resolve(null))
    }
    container.bind(SessionRepository).toConstantValue(sessionRepository.object());
    sessionRepository.setup(instance => instance.delete)
        .returns(() => Promise.resolve())

    const sessionFactory = new Mock<SessionFactory>();
    container.bind(SessionFactory).toConstantValue(sessionFactory.object());
}
