""" DELETE Lambda.

This module contains the DELETE Lambda function for deleting an item from a DynamoDB table.

Functions:
- delete_item_by_slug(): Delete an item from the DynamoDB table by slug.
- lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext): Lambda handler function.
"""

import json
from http import HTTPStatus
from os import environ

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    Response,
    content_types,
)
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError

APP_NAME = environ.get("APP_NAME") or "url-shortener DELETE"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


@app.delete("/")
@trace.capture_method
def delete_item_by_slug() -> Response:
    """Delete a item from DynamoDB table.
    This function handles the DELETE request to delete an item from the DynamoDB table.
    It expects a JSON payload with a "slug" field specifying the item to be deleted.

    Returns:
        Code: 204
        Response: The HTTP response object.
    
    Raises:
        ClientError: If there is an error retrieving the item from the DynamoDB table.
    """
    event_data = app.current_event.json_body

    slug = event_data.get("slug")
    if not slug:
        log.error("slug is required.")
        return Response(
            status_code=HTTPStatus.BAD_REQUEST.value,
            content_type=content_types.APPLICATION_JSON,
            body=json.dumps({"message": "slug is required."}),
        )
    try:
        if not table.get_item(Key={"slug": slug}).get("Item"):
            log.error(f"Item with slug /{slug} not found.")
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps({"message": f"Item with a slug of /{slug} not found."}),
            )

        table.delete_item(Key={"slug": slug})

        return Response(
            status_code=HTTPStatus.NO_CONTENT.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps({"message": "Successfully deleted shortened URL."})
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


def lambda_handler(
    event: APIGatewayProxyEvent, context: LambdaContext
) -> dict[str, any]:
    """Lambda handler.

    This is the entry point for the Lambda function.
    It invokes the `resolve` method of the `app` object to handle the incoming event.

    Args:
        event (APIGatewayProxyEvent): The event object representing the incoming API Gateway request.
        context (LambdaContext): The context object representing the runtime information.

    Returns:
        dict[str, any]: The response from the Lambda function.
    """
    return app.resolve(event=event, context=context)
