""" GET Lambda. """
from os import environ
import json
import boto3
from http import HTTPStatus
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities import parameters
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    Response,
    content_types
)
from botocore.exceptions import ClientError


APP_NAME = environ.get("APP_NAME") or 'url-shortener GET'
TABLE_NAME = environ.get("TABLE_NAME") or 'records'
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)


@app.get('/api/v1/records')
def get_all_items() -> Response:
    """ Get all items from DynamoDB table. """
    try:
        response = table.scan()
        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            body=json.dumps(response)
        )
    except ClientError as error:
        log.error(error.response['Error']['Message'])
        return Response(
            statusCode=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({
                'message': error.response['Error']['Message']
            })
        )


@app.get('/api/v1/records/1/{id}')
def get_item_by_id() -> Response:
    """ Get a item from DynamoDB table. """
    try:
        # get id from path parameters
        id = parameters.get_parameter('id')
        response = table.get_item(Key={'id': id})

        # return status code 302 and set redirect to url
        return Response(
            status_code=HTTPStatus.FOUND.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"redirect": json.dumps(response['Item']['url'])}
        )
    except ClientError as error:
        log.error(error.response['Error']['Message'])
        return Response(
            statusCode=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({
                'message': error.response['Error']['Message']
            })
        )


def lambda_handler(
    event: APIGatewayProxyEvent,
    context: LambdaContext
) -> dict[str, any]:
    """ Lambda handler. """
    return app.resolve(event, context)
