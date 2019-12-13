var express = require('express');
var IntegrationService = require('../services/integrationService');
var getUser = require('../middlewares/user').getUser;
var isUserAdmin = require('../middlewares/project').isUserAdmin;
var sendErrorResponse = require('../middlewares/response').sendErrorResponse;
var sendListResponse = require('../middlewares/response').sendListResponse;
var sendItemResponse = require('../middlewares/response').sendItemResponse;


var router = express.Router();

router.post('/:projectId/create', getUser, isUserAdmin, async function (req, res) {
    try {
        let projectId = req.params.projectId;
        let body = req.body;
        let userId = req.user ? req.user.id : null;
    
        let monitorId = body.monitorId;
        let endpoint = body.endpoint;
        let endpointType = body.endpointType;

        if(!projectId) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'projectId missing in body, must be present'
            });
        }

        if(!endpoint) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'endpoint missing in body, must be present'
            });
        }
    
        if(!monitorId) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'monitorId is missing in body, it must be present'
            });
        }

        var existingWebhook = await IntegrationService.findOneBy({
            monitorId,
            'data.endpoint' : endpoint,
            'data.endpointType' : endpointType,
            deleted: { $ne: null },
        });
        if (existingWebhook) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'webhook with url and endpoint type exist.'
            });
        }

        var data = {userId: userId, endpoint, endpointType, monitorId};
        var integrationType = 'webhook';
        var slack = await IntegrationService.create(projectId, userId, data, integrationType);
        return sendItemResponse(req, res, slack);
    } catch(error) {
        return sendErrorResponse(req, res, error);
    }
});

// update webhook
router.put('/:projectId/:integrationId', getUser, isUserAdmin, async function (req, res) {
    try {
        let data = req.body;
        var integrationId = req.params.integrationId;
        data.projectId = req.params.projectId;
        data.userId = req.user ? req.user.id : null;
        data._id = integrationId;
        data.integrationType = 'webhook';

        if(!data.projectId) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'projectId missing in body, must be present'
            });
        }

        if(!data.endpoint) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'endpoint missing in body, must be present'
            });
        }
    
        if(!data.monitorId) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'monitorId missing in body, must be present'
            });
        }

        var existingWebhook = await IntegrationService.findOneBy({
            monitorId: data.monitorId,
            'data.endpoint' : data.endpoint,
            'data.endpointType' : data.endpointType,
            deleted: { $ne: null },
        });
        if (existingWebhook && existingWebhook._id.toString() !== integrationId) {
            return sendErrorResponse( req, res, {
                code: 400,
                message: 'webhook with url and endpoint type exist.'
            });
        }

        var webhook = await IntegrationService.updateOneBy({_id:integrationId},data);
        return sendItemResponse(req, res, webhook);
    } catch(error) {
        return sendErrorResponse(req, res, error);
    }
});

// req => params => {teamId, projectId}
router.delete('/:projectId/delete/:integrationId', getUser, isUserAdmin, async function (req, res) {
    try {
        var projectId = req.params.projectId;
        var integrationId = req.params.integrationId;
        var userId = req.user ? req.user.id : null;
        var data = await IntegrationService.deleteBy({_id: integrationId, projectId: projectId}, userId);
        return sendItemResponse(req, res, data);
    } catch(error) {
        return sendErrorResponse(req, res, error);
    }
});

// req => params => {projectId}
router.get('/:projectId/hooks', getUser, async function (req, res) {
    try {
        var projectId = req.params.projectId;
        var integrationType = 'webhook';
        var integrations = await IntegrationService.findBy({projectId: projectId, integrationType: integrationType}, req.query.skip || 0, req.query.limit || 10);
        var count = await IntegrationService.countBy({projectId: projectId, integrationType: integrationType});
        return sendListResponse(req, res, integrations, count);
    } catch(error) {
        return sendErrorResponse(req, res, error);
    }
});

module.exports = router;
