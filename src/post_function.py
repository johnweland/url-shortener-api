""" POST Lambda.

This module contains the POST Lambda function for creating shortened URLs.

Functions:
- post_item(): Creates an item in the DynamoDB table.
- lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext): Lambda handler function.
"""

import json
import uuid
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

APP_NAME = environ.get("APP_NAME") or "url-shortener POST"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


@app.post("/")
@trace.capture_method
def post_item() -> Response:
    """POST an item to DynamoDB table.

    This function handles the POST request to create a shortened URL item in the DynamoDB table and returns a 201.
    If the request body is missing a required field, it returns a 400.
    If the item already exists, it returns a 409.

    Returns:
        Response: The HTTP response object.
    """
    event_data = app.current_event.json_body

    slug = event_data.get("slug") or str(uuid.uuid4())[:8]
    target_url = event_data.get("targetUrl")
    created_at = get_current_time()

    required_fields = ["targetUrl"]

    for field in required_fields:
        if field not in event_data:
            log.error(f"The '{field}' field is required.")
            return Response(
                status_code=HTTPStatus.BAD_REQUEST.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps(
                    {"message": f"The '{field}' field is required."}
                ),
            )
    try:
        # check if and item with the same id OR the same url already exists
        if (
            table.get_item(Key={"slug": slug}).get("Item")
            or table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("targetUrl").eq(target_url)
            )["Items"]
        ):
            log.error("Item already exists.")
            return Response(
                status_code=HTTPStatus.CONFLICT.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps({"message": "Item already exists."}),
            )

        item = {
            "slug": slug,
            "targetUrl": target_url,
            "requests": [],
            "createdAt": created_at,
        }
        table.put_item(Item=item)

        return Response(
            status_code=HTTPStatus.CREATED.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps({"message": "Successfully created shortened URL."})
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

    This function is the entry point for the Lambda function.

    Args:
        event (APIGatewayProxyEvent): The event data passed to the Lambda function.
        context (LambdaContext): The runtime information of the Lambda function.

    Returns:
        dict[str, any]: The response from the Lambda function.
    """
    return app.resolve(event=event, context=context)
