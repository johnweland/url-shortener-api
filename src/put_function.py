""" PUT Lambda.

This module contains the implementation of a PUT Lambda function for updating an item in a DynamoDB table.
The Lambda function is triggered by an API Gateway REST API.

Functions:
- put_item(): Update an item in the DynamoDB table.
- lambda_handler(event: APIGatewayProxyEvent, context: LambdaContext): Lambda handler function.
"""
import json
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


@app.put("/")
@trace.capture_method
def put_item() -> Response:
    """Update an item in DynamoDB table.

    This function updates an item in a DynamoDB table based on the provided event data.
    It checks for the presence of required fields ('slug' and 'targetUrl') in the event data.
    If any required field is missing, it returns a 400 bad request.
    Otherwise, it constructs the update expression and updates the item in the table.
    If the update is successful, it returns an 200 OK response with a success message.
    If any error occurs during the update, it returns a 500 internal server error response.

    Returns:
        Response: The response object indicating the status and content of the update operation.
    """
    event_data = app.current_event.json_body

    last_updated_at = get_current_time()
    required_fields = ["slug", "targetUrl"]
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
        update_expression = []
        expression_attribute_values = {
            ":lastUpdatedAt": str(last_updated_at)
        }
        separator = ", "

        for attribute in event_data:
            if attribute != "slug":
                update_expression.append(f"{attribute} = :{attribute}")
                expression_attribute_values[f":{attribute}"] = event_data[attribute]

        table.update_item(
            Key={"slug": event_data["slug"]},
            UpdateExpression=(
                "SET lastUpdatedAt = :lastUpdatedAt, " +
                separator.join(update_expression)),
            ExpressionAttributeValues=expression_attribute_values,
        )

        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps({"message": "Successfully updated shortened URL."})
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
    return app.resolve(event, context)
