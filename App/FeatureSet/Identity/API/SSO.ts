import Express, {
    ExpressRequest,
    ExpressResponse,
    ExpressRouter,
    NextFunction,
} from 'CommonServer/Utils/Express';
import BadRequestException from 'Common/Types/Exception/BadRequestException';
import ServerException from 'Common/Types/Exception/ServerException';
import Response from 'CommonServer/Utils/Response';
import ProjectSSO from 'Model/Models/ProjectSso';
import ProjectSSOService from 'CommonServer/Services/ProjectSsoService';
import ObjectID from 'Common/Types/ObjectID';
import xml2js from 'xml2js';
import { JSONObject } from 'Common/Types/JSON';
import logger from 'CommonServer/Utils/Logger';
import Email from 'Common/Types/Email';
import User from 'Model/Models/User';
import UserService from 'CommonServer/Services/UserService';
import AuthenticationEmail from '../Utils/AuthenticationEmail';
import OneUptimeDate from 'Common/Types/Date';
import PositiveNumber from 'Common/Types/PositiveNumber';
import JSONWebToken from 'CommonServer/Utils/JsonWebToken';
import URL from 'Common/Types/API/URL';
import { DashboardRoute } from 'Common/ServiceRoute';
import Route from 'Common/Types/API/Route';
import TeamMember from 'Model/Models/TeamMember';
import TeamMemberService from 'CommonServer/Services/TeamMemberService';
import AccessTokenService from 'CommonServer/Services/AccessTokenService';
import SSOUtil from '../Utils/SSO';
import Exception from 'Common/Types/Exception/Exception';
import Hostname from 'Common/Types/API/Hostname';
import Protocol from 'Common/Types/API/Protocol';
import DatabaseConfig from 'CommonServer/DatabaseConfig';
import CookieUtil from 'CommonServer/Utils/Cookie';
import zlib from 'zlib';

const router: ExpressRouter = Express.getRouter();

router.get(
    '/sso/:projectId/:projectSsoId',
    async (
        req: ExpressRequest,
        res: ExpressResponse,
        next: NextFunction
    ): Promise<void> => {
        try {
            if (!req.params['projectId']) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException('Project ID not found')
                );
            }

            if (!req.params['projectSsoId']) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException('Project SSO ID not found')
                );
            }

            const projectSSO: ProjectSSO | null =
                await ProjectSSOService.findOneBy({
                    query: {
                        projectId: new ObjectID(req.params['projectId']),
                        _id: req.params['projectSsoId'],
                        isEnabled: true,
                    },
                    select: {
                        signOnURL: true,
                        issuerURL: true,
                    },
                    props: {
                        isRoot: true,
                    },
                });

            if (!projectSSO) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException('SSO Config not found')
                );
            }

            // redirect to Identity Provider.

            if (!projectSSO.signOnURL) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException('Sign On URL not found')
                );
            }

            if (!projectSSO.issuerURL) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException('Issuer not found')
                );
            }

            // encode SAMLRequest and redirect to Identity Provider.

            const samlRequest = createSAMLRequest(projectSSO.issuerURL.toString());

            //  DEFLATE-encode SAML message.

            const samleDeflateEncode = zlib.deflateRawSync(samlRequest);

            console.log(samleDeflateEncode);

            const base64Encoded = Buffer.from(samleDeflateEncode).toString('base64');

            console.log(base64Encoded);

            const url = URL.fromString(projectSSO.signOnURL.toString()).addQueryParam(
                "SAMLRequest", base64Encoded
            );

            console.log(url.toString());

            return Response.redirect(
                req,
                res,
                url
            );

        } catch (err) {
            return next(err);
        }
    }
);

const createSAMLRequest = (_issuer: string): string => {
    const samlRequest: string = `<samlp:AuthnRequest
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    ID="${ObjectID.generate()}"
    Version="2.0" IssueInstant="${OneUptimeDate.getCurrentDate().toISOString()}"
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
    <Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">oneuptime</Issuer>
  </samlp:AuthnRequest>`;
    return samlRequest;
}

router.get(
    '/idp-login/:projectId/:projectSsoId',
    async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
        return await loginUserWithSso(req, res);
    }
);

router.post(
    '/idp-login/:projectId/:projectSsoId',
    async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
        return await loginUserWithSso(req, res);
    }
);

type LoginUserWithSsoFunction = (
    req: ExpressRequest,
    res: ExpressResponse
) => Promise<void>;

const loginUserWithSso: LoginUserWithSsoFunction = async (
    req: ExpressRequest,
    res: ExpressResponse
): Promise<void> => {
    try {
        const samlResponseBase64: string = req.body.SAMLResponse;

        if (!samlResponseBase64) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('SAMLResponse not found')
            );
        }

        const samlResponse: string = Buffer.from(
            samlResponseBase64,
            'base64'
        ).toString();

        const response: JSONObject = await xml2js.parseStringPromise(
            samlResponse
        );

        let issuerUrl: string = '';
        let email: Email | null = null;

        if (!req.params['projectId']) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Project ID not found')
            );
        }

        if (!req.params['projectSsoId']) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Project SSO ID not found')
            );
        }

        const projectSSO: ProjectSSO | null = await ProjectSSOService.findOneBy(
            {
                query: {
                    projectId: new ObjectID(req.params['projectId']),
                    _id: req.params['projectSsoId'],
                    isEnabled: true,
                },
                select: {
                    signOnURL: true,
                    issuerURL: true,
                    publicCertificate: true,
                    teams: {
                        _id: true,
                    },
                },
                props: {
                    isRoot: true,
                },
            }
        );

        if (!projectSSO) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('SSO Config not found')
            );
        }

        // redirect to Identity Provider.

        if (!projectSSO.issuerURL) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Issuer URL not found')
            );
        }

        // redirect to Identity Provider.

        if (!projectSSO.signOnURL) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Sign on URL not found')
            );
        }

        if (!projectSSO.publicCertificate) {
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Public Certificate not found')
            );
        }

        try {
            SSOUtil.isPayloadValid(response);

            if (
                !SSOUtil.isSignatureValid(
                    samlResponse,
                    projectSSO.publicCertificate
                )
            ) {
                return Response.sendErrorResponse(
                    req,
                    res,
                    new BadRequestException(
                        'Signature is not valid or Public Certificate configured with this SSO provider is not valid'
                    )
                );
            }

            issuerUrl = SSOUtil.getIssuer(response);
            email = SSOUtil.getEmail(response);
        } catch (err: unknown) {
            if (err instanceof Exception) {
                return Response.sendErrorResponse(req, res, err);
            }
            return Response.sendErrorResponse(req, res, new ServerException());
        }

        if (projectSSO.issuerURL.toString() !== issuerUrl) {
            logger.error(
                'Issuer URL does not match. It should be ' +
                projectSSO.issuerURL.toString() +
                ' but it is ' +
                issuerUrl.toString()
            );
            return Response.sendErrorResponse(
                req,
                res,
                new BadRequestException('Issuer URL does not match')
            );
        }

        // Check if he already belongs to the project, If he does - then log in.

        let alreadySavedUser: User | null = await UserService.findOneBy({
            query: { email: email },
            select: {
                _id: true,
                name: true,
                email: true,
                isMasterAdmin: true,
                isEmailVerified: true,
                profilePictureId: true,
            },
            props: {
                isRoot: true,
            },
        });

        let isNewUser: boolean = false;

        if (!alreadySavedUser) {
            // this should never happen because user is logged in before he signs in with SSO UNLESS he initiates the login though the IDP.

            /// Create a user.

            alreadySavedUser = await UserService.createByEmail({
                email,
                isEmailVerified: true,
                generateRandomPassword: true,
                props: {
                    isRoot: true,
                },
            });

            isNewUser = true;
        }

        // If he does not then add him to teams that he should belong and log in.
        // This should never happen because email is verified before he logs in with SSO.
        if (!alreadySavedUser.isEmailVerified && !isNewUser) {
            await AuthenticationEmail.sendVerificationEmail(alreadySavedUser!);

            return Response.render(
                req,
                res,
                '/usr/src/app/FeatureSet/Identity/Views/Message.ejs',
                {
                    title: 'Email not verified.',
                    message:
                        'Email is not verified. We have sent you an email with the verification link. Please do not forget to check spam.',
                }
            );
        }

        // check if the user already belongs to the project
        const teamMemberCount: PositiveNumber = await TeamMemberService.countBy(
            {
                query: {
                    projectId: new ObjectID(req.params['projectId'] as string),
                    userId: alreadySavedUser!.id!,
                },
                props: {
                    isRoot: true,
                },
            }
        );

        if (teamMemberCount.toNumber() === 0) {
            // user not in project, add him to default teams.

            if (!projectSSO.teams || projectSSO.teams.length === 0) {
                return Response.render(
                    req,
                    res,
                    '/usr/src/app/FeatureSet/Identity/Views/Message.ejs',
                    {
                        title: 'No teams added.',
                        message:
                            'No teams have been added to this SSO config. Please contact your admin and have default teams added.',
                    }
                );
            }

            for (const team of projectSSO.teams) {
                // add user to team
                let teamMember: TeamMember = new TeamMember();
                teamMember.projectId = new ObjectID(
                    req.params['projectId'] as string
                );
                teamMember.userId = alreadySavedUser.id!;
                teamMember.hasAcceptedInvitation = true;
                teamMember.invitationAcceptedAt =
                    OneUptimeDate.getCurrentDate();
                teamMember.teamId = team.id!;

                teamMember = await TeamMemberService.create({
                    data: teamMember,
                    props: {
                        isRoot: true,
                        ignoreHooks: true,
                    },
                });
            }
        }

        const projectId: ObjectID = new ObjectID(
            req.params['projectId'] as string
        );

        const ssoToken: string = JSONWebToken.sign({
            data: {
                userId: alreadySavedUser.id!,
                projectId: projectId,
                name: alreadySavedUser.name!,
                email: email,
                isMasterAdmin: false,
                isGeneralLogin: false,
            },
            expiresInSeconds: OneUptimeDate.getSecondsInDays(
                new PositiveNumber(30)
            ),
        });

        const oneUptimeToken: string = JSONWebToken.signUserLoginToken({
            tokenData: {
                userId: alreadySavedUser.id!,
                email: alreadySavedUser.email!,
                name: alreadySavedUser.name!,
                isMasterAdmin: alreadySavedUser.isMasterAdmin!,
                isGlobalLogin: true, // This is a general login without SSO. So, we will set this to true. This will give access to all the projects that dont require SSO.
            },
            expiresInSeconds: OneUptimeDate.getSecondsInDays(
                new PositiveNumber(30)
            ),
        });

        // Set a cookie with token.
        CookieUtil.setCookie(
            res,
            CookieUtil.getUserTokenKey(),
            oneUptimeToken,
            {
                maxAge: OneUptimeDate.getMillisecondsInDays(
                    new PositiveNumber(30)
                ),
                httpOnly: true,
            }
        );

        CookieUtil.setCookie(
            res,
            CookieUtil.getUserSSOKey(projectId),
            ssoToken,
            {
                maxAge: OneUptimeDate.getMillisecondsInDays(
                    new PositiveNumber(30)
                ),
                httpOnly: true,
            }
        );

        // Refresh Permissions for this user here.
        await AccessTokenService.refreshUserAllPermissions(
            alreadySavedUser.id!
        );

        const host: Hostname = await DatabaseConfig.getHost();
        const httpProtocol: Protocol = await DatabaseConfig.getHttpProtocol();

        return Response.redirect(
            req,
            res,
            new URL(
                httpProtocol,
                host,
                new Route(DashboardRoute.toString()).addRoute(
                    '/' + req.params['projectId']
                )
            )
        );
    } catch (err) {
        logger.error(err);
        Response.sendErrorResponse(req, res, new ServerException());
    }
};

export default router;
