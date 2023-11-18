""" 
GET Lambda. 

This module contains the GET Lambda function for a URL shortener service. It retrieves items from a DynamoDB table and handles API Gateway requests.

Functions:
- get_all_items(): Get all items from the DynamoDB table.
- get_item_by_slug(slug: str): Get an item from the DynamoDB table by slug.
- lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext): Lambda handler function.
"""

import json
from datetime import datetime, timezone
from http import HTTPStatus
from os import environ
import os
import sys

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
from core_modules import (get_current_time)

APP_NAME = environ.get("APP_NAME") or "url-shortener GET"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)



@app.get("/")
@trace.capture_method
def get_all_items() -> Response:
    """Get all items from the DynamoDB table."""
    try:
        response = table.scan()
        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps(
                {
                    "Count": response["Count"],
                    "Items": response["Items"],
                    "Scanned": response["ScannedCount"],
                }
            ),
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )



@app.get("/<slug>")
@trace.capture_method
def get_item_by_slug(slug: str) -> Response:
    """Get an item from the DynamoDB table by slug. 
    Update the item's requests list with the current request. 
    Then return a 302 redirect to the item's target URL.

    Args:
        slug (str): The slug of the item to retrieve.

    Returns:
        Response: The response containing the item's target URL or an error message.

    Raises:
        ClientError: If there is an error retrieving the item from the DynamoDB table.
    """
    try:
        item = table.get_item(Key={"slug": slug}).get("Item")

        if not item:
            log.error("URL not found")
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                body=json.dumps({"message": "Target URL not found"}),
            )

        referer = app.current_event.multi_value_headers.get("Referer")
        if referer:
            referer = referer[0]
        else:
            referer = None
        user_agent = app.current_event.request_context.identity.user_agent
        source_ip = app.current_event.request_context.identity.source_ip

        table.update_item(
            Key={"slug": slug},
            UpdateExpression="SET #requests = list_append(#requests, :request)",
            ExpressionAttributeNames={"#requests": "requests"},
            ExpressionAttributeValues={
                ":request": [
                    {
                        "ip": source_ip,
                        "userAgent": user_agent,
                        "referer": referer,
                        "timestamp": get_current_time(),
                    }
                ]
            },
        )

        return Response(
            status_code=HTTPStatus.FOUND.value,
            content_type=content_types.APPLICATION_JSON,
            headers={
                "Location": str(item["targetUrl"]),
                "Access-Control-Allow-Origin": "*",
            },
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
