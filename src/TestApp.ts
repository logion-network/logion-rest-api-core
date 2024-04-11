import "./inversify.decorate.js";
import { DateTime } from "luxon";
import {
    AuthenticatedUser,
    AuthenticationSystem,
    Authenticator,
    SessionManager,
    AuthorityService
} from '@logion/authenticator';
import express, { Express } from 'express';
import { Dino } from 'dinoloop';
import { Container } from 'inversify';
import { ApplicationErrorController } from './ApplicationErrorController.js';
import { JsonResponse } from './JsonResponse.js';
import { Mock } from "moq.ts";
import { AuthenticationService } from "./AuthenticationService.js";
import { UnauthorizedException } from "dinoloop/modules/builtin/exceptions/exceptions.js";
import { buildBaseExpress } from "./Express.js";
import { AccountId, AnyAccountId, ValidAccountId } from "@logion/node-api";

export const BOB = ValidAccountId.polkadot("vQvWaxNDdzuX5N3qSvGMtjdHcQdw1TAcPNgx4S1Utd3MTxYeN");
export const ALICE = ValidAccountId.polkadot("vQx5kESPn8dWyX4KxMCKqUyCaWUwtui1isX6PVNcZh2Ghjitr");

export function setupApp<T>(
    controller: Function & { prototype: T; }, // eslint-disable-line @typescript-eslint/ban-types
    mockBinder: (container: Container) => void,
    mock?: AuthenticationServiceMock,
): Express {
    return setupCustomApp(buildBaseExpress, controller, mockBinder, mock);
}

export function setupCustomApp<T>(
    expressFactory: () => Express,
    controller: Function & { prototype: T; }, // eslint-disable-line @typescript-eslint/ban-types
    mockBinder: (container: Container) => void,
    mock?: AuthenticationServiceMock,
): Express {
    const app = expressFactory();
    const dino = new Dino(app, '/api');

    dino.useRouter(() => express.Router());
    dino.registerController(controller);
    dino.registerApplicationError(ApplicationErrorController);
    dino.requestEnd(JsonResponse);

    const container = new Container({ defaultScope: "Singleton" });

    container.bind(AuthenticationService).toConstantValue(mockAuthenticationService(mock ? mock : mockAuthenticationWithCondition(true)));

    mockBinder(container);

    dino.dependencyResolver<Container>(container,
        (injector, type) => {
            return injector.resolve(type);
        });

    dino.bind();

    return app;
}

export interface AuthenticationServiceMock {
    authenticatedUser: () => Promise<AuthenticatedUser>;
    authenticatedUserIs: () => Promise<AuthenticatedUser>;
    authenticatedUserIsOneOf: () => Promise<AuthenticatedUser>;
    nodeOwner: ValidAccountId;
    ensureAuthorizationBearer: () => void;
}

export function mockAuthenticationWithCondition(conditionFulfilled: boolean, account?: AccountId): AuthenticationServiceMock {
    const authenticatedUser = mockAuthenticatedUser(conditionFulfilled, account);
    const ensureAuthorizationBearerMock = () => {
        if (!conditionFulfilled) {
            throw new UnauthorizedException();
        }
    };
    return mockAuthenticationWithAuthenticatedUser(authenticatedUser, ensureAuthorizationBearerMock);
}

export function mockAuthenticationWithAuthenticatedUser(authenticatedUser: AuthenticatedUser, ensureAuthorizationBearer?: () => void): AuthenticationServiceMock {
    return {
        authenticatedUser: () => Promise.resolve(authenticatedUser),
        authenticatedUserIs: throwOrReturn(authenticatedUser.is(null), authenticatedUser),
        authenticatedUserIsOneOf: throwOrReturn(authenticatedUser.isOneOf([]), authenticatedUser),
        nodeOwner: ALICE,
        ensureAuthorizationBearer: ensureAuthorizationBearer ? ensureAuthorizationBearer : () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
    };
}

function throwOrReturn(condition: boolean, authenticatedUser: AuthenticatedUser): () => Promise<AuthenticatedUser> {
    return () => {
        if(condition) {
            return Promise.resolve(authenticatedUser);
        } else {
            throw new UnauthorizedException();
        }
    };
}

function invalidSignature(): Promise<AuthenticatedUser> {
    throw new UnauthorizedException("Invalid Signature");
}

export function mockAuthenticationFailureWithInvalidSignature(): AuthenticationServiceMock {
    return {
        authenticatedUser: invalidSignature,
        authenticatedUserIs: invalidSignature,
        authenticatedUserIsOneOf: invalidSignature,
        ensureAuthorizationBearer: invalidSignature,
        nodeOwner: ALICE,
    }
}

export function mockAuthenticationForUserOrLegalOfficer(isLegalOfficer: boolean, account?: AccountId) {
    const authenticatedUser = new Mock<AuthenticatedUser>();
    const validAccount = account ?
        new AnyAccountId(account.address, account.type).toValidAccountId() :
        ALICE;
    authenticatedUser.setup(instance => instance.address).returns(validAccount.address);
    authenticatedUser.setup(instance => instance.type).returns(validAccount.type);
    authenticatedUser.setup(instance => instance.isPolkadot()).returns(validAccount.type === "Polkadot");
    authenticatedUser.setup(instance => instance.is).returns(account => account !== undefined && account !== null && account.equals(validAccount));
    authenticatedUser.setup(instance => instance.isOneOf).returns(accounts => accounts.some(account => account !== undefined && account !== null && account.equals(validAccount)));
    authenticatedUser.setup(instance => instance.require).returns((predicate) => {
        if(!predicate(authenticatedUser.object())) {
            throw new UnauthorizedException();
        } else {
            return authenticatedUser.object();
        }
    });
    authenticatedUser.setup(instance => instance.isNodeOwner()).returns(isLegalOfficer);
    authenticatedUser.setup(instance => instance.isLegalOfficer()).returnsAsync(isLegalOfficer);
    authenticatedUser.setup(instance => instance.requireLegalOfficerOnNode).returns(() => {
        if (isLegalOfficer) {
            return Promise.resolve(authenticatedUser.object())
        } else {
            throw new UnauthorizedException();
        }
    })
    authenticatedUser.setup(instance => instance.validAccountId).returns(validAccount)
    return mockAuthenticationWithAuthenticatedUser(authenticatedUser.object());
}

function mockAuthenticationService(mock: AuthenticationServiceMock): AuthenticationService {
    const authenticationSystem = mockAuthenticationSystem(mock);
    const authenticationService = new Mock<AuthenticationService>();
    authenticationService.setup(instance => instance.authenticationSystem()).returnsAsync(authenticationSystem);
    authenticationService.setup(instance => instance.authenticatedUserIs).returns(mock.authenticatedUserIs);
    authenticationService.setup(instance => instance.authenticatedUserIsOneOf).returns(mock.authenticatedUserIsOneOf);
    authenticationService.setup(instance => instance.authenticatedUser).returns(mock.authenticatedUser);
    authenticationService.setup(instance => instance.authenticatedUserIsLegalOfficerOnNode).returns(mock.authenticatedUser);
    authenticationService.setup(instance => instance.nodeOwner).returns(mock.nodeOwner);
    authenticationService.setup(instance => instance.ensureAuthorizationBearer).returns(mock.ensureAuthorizationBearer);
    return authenticationService.object();
}

export function mockAuthenticatedUser(conditionFulfilled: boolean, account?: AccountId): AuthenticatedUser {
    const authenticatedUser = new Mock<AuthenticatedUser>();
    const validAccount = account ?
        new AnyAccountId(account.address, account.type).toValidAccountId() :
        ALICE;
    authenticatedUser.setup(instance => instance.address).returns(validAccount.address);
    authenticatedUser.setup(instance => instance.type).returns(validAccount.type);
    authenticatedUser.setup(instance => instance.isPolkadot()).returns(validAccount.type === "Polkadot");
    authenticatedUser.setup(instance => instance.is).returns(() => conditionFulfilled);
    authenticatedUser.setup(instance => instance.isOneOf).returns(() => conditionFulfilled);
    authenticatedUser.setup(instance => instance.require).returns((predicate) => {
        if(!predicate(authenticatedUser.object())) {
            throw new UnauthorizedException();
        } else {
            return authenticatedUser.object();
        }
    });
    authenticatedUser.setup(instance => instance.isNodeOwner).returns(() => conditionFulfilled);
    authenticatedUser.setup(instance => instance.isLegalOfficer()).returnsAsync(conditionFulfilled);
    authenticatedUser.setup(instance => instance.requireLegalOfficerOnNode).returns(() => {
        if (ALICE.equals(account)) {
            return Promise.resolve(authenticatedUser.object());
        } else {
            throw new UnauthorizedException();
        }
    });
    authenticatedUser.setup(instance => instance.validAccountId).returns(validAccount)
    return authenticatedUser.object();
}

export function mockLegalOfficerOnNode(account: AccountId): AuthenticatedUser {
    const authenticatedUser = new Mock<AuthenticatedUser>();
    const validAccount = new AnyAccountId(account.address, account.type).toValidAccountId();
    authenticatedUser.setup(instance => instance.address).returns(validAccount.address);
    authenticatedUser.setup(instance => instance.type).returns(validAccount.type);
    authenticatedUser.setup(instance => instance.isPolkadot()).returns(validAccount.type === "Polkadot");
    authenticatedUser.setup(instance => instance.is).returns(account => account !== undefined && account !== null && account.equals(validAccount));
    authenticatedUser.setup(instance => instance.isOneOf).returns(accounts => accounts.some(account => account !== undefined && account !== null && account.equals(validAccount)));
    authenticatedUser.setup(instance => instance.require).returns((predicate) => {
        if (!predicate(authenticatedUser.object())) {
            throw new UnauthorizedException();
        } else {
            return authenticatedUser.object();
        }
    });
    authenticatedUser.setup(instance => instance.isNodeOwner()).returns(true);
    authenticatedUser.setup(instance => instance.isLegalOfficer()).returnsAsync(true);
    authenticatedUser.setup(instance => instance.requireLegalOfficerOnNode()).returns(Promise.resolve(authenticatedUser.object()));
    authenticatedUser.setup(instance => instance.validAccountId).returns(validAccount)
    return authenticatedUser.object();
}

function mockAuthenticationSystem(mock: AuthenticationServiceMock): AuthenticationSystem {
    const sessionManager = new Mock<SessionManager>();
    sessionManager.setup(instance => instance.createNewSession).returns(addresses => ({
        addresses,
        id: "testSessionId",
        createdOn: DateTime.now(),
    }));

    const authenticator = new Mock<Authenticator>();
    authenticator.setup(instance => instance.ensureAuthenticatedUserOrThrow).returns(() => mock.authenticatedUser());

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
    return {
        sessionManager: sessionManager.object(),
        authenticator: authenticator.object(),
        authorityService,
    };
}

