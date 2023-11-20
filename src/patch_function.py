""" 
PATCH Lambda. 

This module contains the PATCH Lambda function for a URL shortener service. It updates the "request" list attribute for a specific item in a DynamoDB table and handles API Gateway requests.

Functions:
- patch_item(): Get all items from the DynamoDB table.
- get_item_by_slug(slug: str): Get an item from the DynamoDB table by slug.
- lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext): Lambda handler function.
"""

import json
import os
import sys
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

sys.path.append(os.path.join(os.path.dirname(__file__)))
from core_modules import get_current_time

APP_NAME = environ.get("APP_NAME") or "url-shortener GET"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


@app.patch("/")
@trace.capture_method
def patch_item() -> Response:
    """PATCH an item in the DynamoDB table by slug.
    This function handles the PATCH request to update the item's requests list with the current request.
    It expects a JSON payload with a "slug" field specifying the item to be patched.

    Returns:
        Code: 200
        Response: The response containing the item's target URL or an error message.

    Raises:
        ClientError: If there is an error retrieving the item from the DynamoDB table.
    """

    event_data = app.current_event.json_body

    required_fields = ["slug", "requestIp", "userAgent"]

    for field in required_fields:
        if field not in event_data:
            log.error(f"The '{field}' field is required.")
            return Response(
                status_code=HTTPStatus.BAD_REQUEST.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps({"message": f"The '{field}' field is required."}),
            )

    slug = event_data.get("slug")
    request_ip = event_data.get("requestIp")
    user_agent = event_data.get("userAgent")
    referer = event_data.get("referer") or None
    try:
        item = table.get_item(Key={"slug": slug}).get("Item")
        if not item:
            log.error("URL not found")
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                body=json.dumps({"message": "Target URL not found"}),
            )

        table.update_item(
            Key={"slug": slug},
            UpdateExpression="SET #requests = list_append(#requests, :request)",
            ExpressionAttributeNames={"#requests": "requests"},
            ExpressionAttributeValues={
                ":request": [
                    {
                        "ip": request_ip,
                        "userAgent": user_agent,
                        "referer": referer,
                        "timestamp": get_current_time(),
                    }
                ]
            },
        )

        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps({"message": "Successfully updated shortened URL."}),
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


@trace.capture_lambda_handler
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
    return app.resolve(event, context)
